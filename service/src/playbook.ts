import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { config } from './config.ts';
import type { Item, Playbook, Research, Store } from './db.ts';
import { askJson, describeError, fatal, requireModel } from './llm.ts';
import { commit, day, VERDICTS } from './research.ts';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const Assignment = z.object({
  items: z.array(z.object({ research_id: z.number(), slug: z.string().regex(SLUG_RE).max(60) })),
});

const Synthesis = z.object({
  title: z.string().min(1),
  problem: z.string().min(1),
  first_step: z.string().min(1),
  changes: z.array(z.string()).min(1),
  body: z.string().min(1),
});

const ASSIGN_SYSTEM = `你在把调研结果归并到可执行手册。手册按工作场景组织，一个场景一篇，例如“用 AI 做代码审查”“给编码 agent 管理上下文”“把重复工作流写成 skill”。

输入：一批结论为“建议采用”或“值得一试”的调研（id、标题、结论、做法摘录），以及现有手册目录（slug、标题、解决的问题）。

给每条调研分配一个手册 slug：
- 优先归入现有手册，只要场景相同就合并，哪怕工具不同；只有现有手册都不对口时才新建
- 新 slug 用 ascii 小写短横线，描述场景而不是工具名（写 code-review-with-agents，不写 some-tool-name）
- 同一批里场景相同的调研用同一个新 slug，避免碎片化
- 每条调研都要分配

只输出 JSON：{"items": [{"research_id": 1, "slug": "code-review-with-agents"}]}`;

const SYNTH_SYSTEM = `你在维护一篇 AI 工作方法手册。手册的读者拿到后要能照着做，并明显改善工作方式；它不是资讯汇总，也不是工具介绍。

输入：
- current：这篇手册现有的正文（新手册为空）
- research：本次要合并进来的调研报告（标题、结论、报告正文）

在现有正文基础上改写合并，输出完整的新版本，而不是只写增量：
- title：场景化的中文标题，写工作场景而不是工具名，例如“让编码 agent 在宣布完成前拿出证据”；具体工具作为操作步骤里的做法出现
- problem：一句话，这篇手册解决什么问题
- first_step：一句话，读者现在最该先试的一步
- changes：本次改了什么，每条一句话，例如“新增：用 context-mode 压缩工具输出的步骤”
- body：Markdown 正文，依次包含这些小节：
  ## 解决什么问题
  ## 适用与不适用
  ## 前置条件
  ## 操作步骤（编号；可复制的命令、配置、提示词原样放进代码块；写清每步的前提和预期结果；不同做法可分成“做法 A / 做法 B”并说明怎么选）
  ## 怎么判断变好了（可观察的指标、最小试用方式、试多久）
  ## 常见坑
  ## 证据与来源（每个做法依据哪篇调研、有哪些数据，哪些只是作者主张）

只依据给出的材料，不要编造步骤、命令或数字。现有正文里已有的有效做法要保留；新旧做法冲突时两者都写并说明差异。正文不要写一级标题，也不要写“依据的调研”列表，那部分自动生成。
只输出 JSON：{"title": "...", "problem": "...", "first_step": "...", "changes": ["..."], "body": "## 解决什么问题\\n..."}`;

type Row = Research & { item: Item };

const localDay = (iso: string) => new Date(iso).toLocaleDateString('sv');

/** 把调研分到手册 slug。模型返回的 id 不在本批里的丢弃；漏分的留到下一轮。 */
async function assign(store: Store, batch: Row[]): Promise<Map<string, Row[]>> {
  const result = await askJson(ASSIGN_SYSTEM, JSON.stringify({
    research: batch.map((r) => ({
      id: r.id, title: r.item.title, conclusion: r.conclusion,
      steps: r.body?.split(/^## 具体做法.*$/m)[1]?.split(/^## /m)[0]?.trim().slice(0, 800) ?? '',
    })),
    playbooks: store.playbooks().map((p) => ({ slug: p.slug, title: p.title, problem: p.problem })),
  }), Assignment);
  const byId = new Map(batch.map((r) => [r.id, r]));
  const groups = new Map<string, Row[]>();
  for (const a of result.items) {
    const r = byId.get(a.research_id);
    if (!r) continue;
    byId.delete(a.research_id);
    groups.set(a.slug, [...(groups.get(a.slug) ?? []), r]);
  }
  return groups;
}

const header = (p: Pick<Playbook, 'title' | 'problem' | 'first_step' | 'updated_at'>) => `# ${p.title}

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：${p.problem}
> 先试这一步：${p.first_step}
> 最近修订：${localDay(p.updated_at)}
`;

function writePlaybook(store: Store, p: Playbook) {
  const sources = store.research(`playbook=? ORDER BY merged_at`, [p.slug]);
  const list = sources.map((r) => `- [${r.item.title}](../${r.file})：${VERDICTS[r.verdict ?? '']}，${r.conclusion}`).join('\n');
  writeFileSync(join(config.repoRoot, p.file), `${header(p)}
${p.body.trim()}

## 依据的调研

${list}
`);
}

function writeIndex(store: Store): string {
  const file = join(config.playbookDir, 'README.md');
  const rows = store.playbooks().map((p) => `| [${p.title}](${p.slug}.md) | ${p.problem} | ${p.first_step} | ${localDay(p.updated_at)} |`);
  writeFileSync(join(config.repoRoot, file), `# 可执行手册

按工作场景组织，每篇给出适用条件、编号步骤、判断标准和常见坑。由 ai-work-radar 把“建议采用 / 值得一试”的调研自动合并进来并持续修订，**均未经实测**；人工验证过的做法在 [experiences/](../experiences/)。

| 手册 | 解决的问题 | 先试这一步 | 最近修订 |
|---|---|---|---|
${rows.join('\n')}
`);
  return file;
}

/** 把未合并的 adopt/try 调研合并进手册并提交。返回合并的调研条数；有手册失败时抛出。 */
export async function runPlaybook(store: Store): Promise<number> {
  requireModel();
  const batch = store.research(`status='done' AND verdict IN ('adopt', 'try') AND playbook IS NULL ORDER BY id`, [], config.playbookAssignBatch);
  if (!batch.length) return 0;
  mkdirSync(join(config.repoRoot, config.playbookDir), { recursive: true });
  const groups = [...(await assign(store, batch))].slice(0, config.playbookPerRun);
  const files: string[] = [];
  const log: string[] = [];
  const errors: string[] = [];
  let merged = 0;
  for (const [slug, rows] of groups) {
    const current = store.playbook(slug);
    try {
      const s = await askJson(SYNTH_SYSTEM, JSON.stringify({
        current: current?.body ?? '',
        research: rows.map((r) => ({ title: r.item.title, conclusion: r.conclusion, body: r.body?.slice(0, 6000) })),
      }), Synthesis);
      const p = store.savePlaybook({ slug, title: s.title, problem: s.problem, first_step: s.first_step, body: s.body, file: join(config.playbookDir, `${slug}.md`) },
        s.changes, rows.map((r) => r.id));
      writePlaybook(store, p);
      files.push(p.file);
      merged += rows.length;
      log.push(`${current ? '修订' : '新建'}《${s.title}》，依据调研 ${rows.map((r) => `#${r.id}`).join(' ')}\n${s.changes.map((c) => `  - ${c}`).join('\n')}`);
    } catch (e) {
      errors.push(`${slug}：${describeError(e)}`);
      if (fatal(e)) break;
    }
  }
  if (files.length) {
    files.push(writeIndex(store));
    commit(files, `docs: 手册${log.length === 1 ? log[0].split('\n')[0] : `修订 ${log.length} 篇`}\n\n${log.join('\n\n')}\n\n由 ai-work-radar 用 ${config.llmModel} 生成`);
  }
  if (errors.length) throw new Error(`${errors.length}/${groups.length} 篇手册合并失败：\n${errors.join('\n')}`);
  return merged;
}

/** 周报：近 7 天手册新增或修改了哪些做法，写到 playbooks/weekly/日期.md。没有修订时不写，返回 0。 */
export function writeDigest(store: Store): number {
  const updates = store.playbookUpdates(new Date(Date.now() - 7 * 86400_000).toISOString());
  if (!updates.length) return 0;
  const bySlug = new Map<string, string[]>();
  for (const u of updates) bySlug.set(u.slug, [...(bySlug.get(u.slug) ?? []), ...(JSON.parse(u.changes) as string[])]);
  const sections = [...bySlug].map(([slug, changes]) => {
    const p = store.playbook(slug)!;
    return `## [${p.title}](../${slug}.md)\n\n先试这一步：${p.first_step}\n\n${changes.map((c) => `- ${c}`).join('\n')}\n`;
  });
  const dir = join(config.playbookDir, 'weekly');
  mkdirSync(join(config.repoRoot, dir), { recursive: true });
  const file = join(dir, `${day()}.md`);
  writeFileSync(join(config.repoRoot, file), `# 手册周报 ${day()}

近 7 天修订了 ${bySlug.size} 篇手册。每篇先看“先试这一步”，挑一个和你手上工作最相关的试一周。所有手册均未经实测。

${sections.join('\n')}`);
  commit([file], `docs: 手册周报 ${day()}（${bySlug.size} 篇）\n\n由 ai-work-radar 用 ${config.llmModel} 生成`);
  return bySlug.size;
}
