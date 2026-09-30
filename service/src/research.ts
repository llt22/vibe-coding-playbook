import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { Catalog } from './catalog.ts';
import { config } from './config.ts';
import type { Item, Store } from './db.ts';
import { getText, githubRepo } from './http.ts';
import { QUESTIONS } from './questions.ts';
import { askJson, describeError, fatal, requireModel } from './llm.ts';

export const VERDICTS: Record<string, string> = { adopt: '建议采用', try: '值得一试', study: '值得研读', watch: '继续观察', drop: '不值得跟进' };

const Result = z.object({
  verdict: z.enum(Object.keys(VERDICTS) as [string, ...string[]]),
  conclusion: z.string().min(1),
  body: z.string().min(1),
});

const SYSTEM = `你在为一个长期调研项目做深度调研。项目研究“怎样在各类工作中把 AI 用到最好”，围绕五个问题：
${Object.entries(QUESTIONS).map(([k, v]) => `${k}. ${v}`).join('\n')}

调研的最终产出是可执行手册：别人拿到后能照着做、并明显改善工作方式。你的报告是写手册的素材，重点是把原文里可照做的东西提炼出来，而不是转述资讯。

输入是一条初筛认为值得深入的线索：标题、链接、初筛理由、原文（可能被截断，也可能抓取失败），以及原文里提到的、项目清单中已有的条目及其状态。

请读原文，输出：
- verdict：adopt（建议直接采用）/ try（值得小范围试）/ study（思路值得研读，不必用这个具体东西）/ watch（有潜力但还不成熟）/ drop（没有实质内容或与研究无关）。
  adopt 和 try 会被写进手册，所以只有原文给出了可照做的具体步骤、配置或流程时才能给；只有观点、宣传或新闻、提炼不出步骤的，最多给 study 或 watch。
- conclusion：一到两句中文结论，先说该怎么做，再说理由
- body：Markdown 调研报告，中文，包含这些小节：
  ## 是什么
  ## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
  ## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
  ## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
  ## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
  ## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

只依据给出的材料，不要编造原文没有的数字、步骤或结论。原文抓取失败或内容太少时，如实说明只能依据摘要判断，并据此降低 verdict。
只输出 JSON：{"verdict": "try", "conclusion": "...", "body": "## 是什么\\n..."}`;

const html2text = (html: string) => html
  .replace(/<(script|style|noscript|svg|nav|footer|header)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<\/(p|div|h\d|li|pre|tr|br)>|<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();

/** 取原文。返回文本和获取说明；失败时降级为只用摘要，并在报告里写明，而不是假装读过原文。 */
async function source(item: Item): Promise<{ text: string; note: string }> {
  const repo = githubRepo(item.url);
  try {
    if (repo) {
      // raw 没有匿名 API 每小时 60 次的限流；README 不叫 README.md 时再走 API
      const raw = await getText(`https://raw.githubusercontent.com/${repo}/HEAD/README.md`).catch(() => null);
      if (raw) return { text: raw, note: '依据仓库 README' };
      const headers: Record<string, string> = { accept: 'application/vnd.github.raw' };
      if (config.githubToken) headers.authorization = `Bearer ${config.githubToken}`;
      return { text: await getText(`https://api.github.com/repos/${repo}/readme`, headers), note: '依据仓库 README' };
    }
    // X 帖子页面需要登录且靠脚本渲染，采集时已经保存了正文和卡片
    if (/^https?:\/\/(x|twitter)\.com\//.test(item.url)) return { text: item.summary, note: '依据推文正文（采集时保存）' };
    const text = html2text(await getText(item.url));
    if (text.length < 500) return { text: item.summary, note: `原文页面只解析出 ${text.length} 字，改用摘要` };
    return { text, note: '依据原文' };
  } catch (e) {
    return { text: item.summary, note: `原文获取失败（${(e as Error).message.slice(0, 200)}），只依据摘要` };
  }
}

/** 原文里提到的清单条目（按名称匹配），让模型对照已有结论。 */
function related(catalog: Catalog, text: string) {
  const lower = text.toLowerCase();
  return catalog.entries.filter((e) => e.name.length >= 4 && lower.includes(e.name.toLowerCase()))
    .slice(0, 20).map((e) => ({ name: e.name, kind: e.kind, status: e.status }));
}

async function researchOne(item: Item, catalog: Catalog) {
  const src = await source(item);
  const data = await askJson(SYSTEM, JSON.stringify({
    title: item.title, url: item.url, source: item.source, metrics: JSON.parse(item.metrics),
    triage_reason: item.reason, source_note: src.note, text: src.text.slice(0, 30_000), catalog_related: related(catalog, src.text),
  }), Result);
  return { ...data, note: src.note };
}

// 本地日期（sv 区域格式即 YYYY-MM-DD），目录和周报按本机日期归档
export const day = () => new Date().toLocaleDateString('sv');

/** 报告写到 research/radar/日期/，返回相对仓库根目录的路径。 */
function writeReport(item: Item, r: z.infer<typeof Result> & { note: string }): string {
  const slug = item.title.toLowerCase().replace(/^@[\w]+:\s*/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'item';
  const dir = join(config.researchDir, day());
  mkdirSync(join(config.repoRoot, dir), { recursive: true });
  let file = join(dir, `${item.id}-${slug}.md`);
  if (existsSync(join(config.repoRoot, file))) file = join(dir, `${item.id}-${slug}-${Date.now()}.md`);
  const md = `# ${item.title}

- 结论：**${VERDICTS[r.verdict]}**。${r.conclusion}
- 原文：${item.url}
- 来源：${item.source}，初筛相关度 ${item.relevance}，${r.note}
- 调研：自动，模型 ${config.llmModel}，${new Date().toISOString()}

${r.body.trim()}
`;
  writeFileSync(join(config.repoRoot, file), md);
  return file;
}

/** 只提交本次写的文件（git commit -- 路径），不带上工作区里别人暂存的改动。失败时抛出，由调度记为失败。 */
export function commit(files: string[], message: string) {
  if (!config.gitCommit || !files.length) return;
  const git = (...args: string[]) => execFileSync('git', ['-C', config.repoRoot, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    git('add', '--', ...files);
    git('commit', '-m', message, '--', ...files);
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    throw new Error(`报告已写入但 git 提交失败：${(err.stderr || err.message).trim().slice(0, 300)}`);
  }
}

/** 调研一批模型标记为 deep 的条目。返回处理条数；有条目失败或提交失败时抛出，由调度记为失败。 */
export async function runResearch(store: Store, catalog: Catalog): Promise<number> {
  requireModel();
  const quota = config.researchPerDay - store.researchedSince(new Date(Date.now() - 86400_000).toISOString());
  const batch = quota > 0 ? store.pendingResearch(Math.min(config.researchPerRun, quota), config.researchMaxAttempts) : [];
  const files: string[] = [];
  const titles: string[] = [];
  const errors: string[] = [];
  for (const r of batch) {
    try {
      const result = await researchOne(r.item, catalog);
      const file = writeReport(r.item, result);
      store.setResearch(r.id, { verdict: result.verdict, conclusion: result.conclusion, body: result.body, file });
      files.push(file);
      titles.push(`${VERDICTS[result.verdict]}：${r.item.title.slice(0, 60)}`);
    } catch (e) {
      const msg = describeError(e);
      store.setResearchError(r.id, msg);
      errors.push(`${r.item.title.slice(0, 40)}：${msg}`);
      if (fatal(e)) break;
    }
  }
  commit(files, `docs: 自动调研 ${files.length} 条\n\n${titles.map((t) => `- ${t}`).join('\n')}\n\n由 ai-work-radar 用 ${config.llmModel} 生成`);
  if (errors.length) throw new Error(`${errors.length}/${batch.length} 条调研失败：\n${errors.join('\n')}`);
  return batch.length;
}
