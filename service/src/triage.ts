import { z } from 'zod';
import { config } from './config.ts';
import type { Item, Store } from './db.ts';
import { askJson, describeError, fatal, requireModel } from './llm.ts';
import { QUESTIONS } from './questions.ts';

const Result = z.object({
  results: z.array(z.object({
    id: z.number().int(),
    relevance: z.number().int(),
    interesting: z.number().int(),
    questions: z.array(z.number().int()),
    reason: z.string(),
    deep: z.boolean(),
  })),
});

const SYSTEM = `你在为一个长期调研项目做线索初筛。项目研究“怎样在各类工作中把 AI 用到最好”，围绕五个问题：
${Object.entries(QUESTIONS).map(([k, v]) => `${k}. ${v}`).join('\n')}

关注的是“人怎样和 AI 一起工作”：编程智能体的用法、工作流、上下文与工具供给、评测与验证、团队实践、工具之间的对比和迁移经验。
AI 驱动的具体应用本身（生成视频、游戏、图片、营销内容等）不是研究对象，除非它展示了可迁移的工作方法；这类 relevance 最多给 1。
但 relevance 只管“能不能改变工作方式”，不要用它否定“东西本身有没有意思”：后者看下面的 interesting。

对每条线索给出：
- relevance：0–3。3 = 可能直接改变某类工作的做法，值得本周就看；2 = 有具体、可落地的新做法或工具，值得记下；1 = 相关但泛泛、重复已知内容、只是新闻或产品发布；0 = 与 AI 辅助工作无关。
- interesting：0–3，独立的第二条轴，跟上面的研究问题无关，只问“这条线索本身值不值得看”。3 = 新做法、新工具、少见的思路，或做得漂亮、读了能学到东西的开源项目——即使跟 AI 辅助工作关系不大；2 = 有独到之处；1 = 常见内容；0 = 看与不看没损失。看具体程度和新鲜度，不看热度，也不因为“不是本次研究的主题”而降分。
- questions：它主要回答上面哪几个问题（编号，可为空）。
- reason：一句中文，说明它在真实工作里具体能做什么，或者（interesting 高而 relevance 低时）它为什么有意思。看不出实际用途、只有宣传或演示的，直接说明并给低分。
- deep：是否值得自动深入调研。两种情形给 true：(a) relevance ≥ 2，且读完原文很可能提炼出可照做的步骤、配置或流程（或有说服力的数据）；(b) interesting = 3 且是仓库或长文，能写成“它做了什么、怎么用起来、值不值得试”的研读报告。纯新闻、产品发布、融资、观点帖、没有细节的短推为 false。宁缺毋滥。

只依据给出的标题、摘要和热度判断，不要编造没有给出的信息。每条输入都必须有一条结果，id 与输入一致。
只输出 JSON，格式：{"results": [{"id": 1, "relevance": 2, "interesting": 1, "questions": [1, 3], "reason": "...", "deep": false}]}`;

function describe(i: Item) {
  return { id: i.id, source: i.source, title: i.title, url: i.url, summary: i.summary.slice(0, 1200), metrics: JSON.parse(i.metrics) };
}

async function triageBatch(store: Store, batch: Item[]) {
  const ids = batch.map((i) => i.id);
  let data;
  try {
    data = await askJson(SYSTEM, JSON.stringify(batch.map(describe)), Result);
  } catch (e) {
    store.setTriageError(ids, describeError(e));
    if (fatal(e)) throw e;
    return;
  }
  const got = new Map(data.results.map((r) => [r.id, r]));
  for (const item of batch) {
    const r = got.get(item.id);
    if (!r) {
      store.setTriageError([item.id], '模型结果缺少此条');
      continue;
    }
    store.setTriage(item.id, {
      relevance: Math.max(0, Math.min(3, r.relevance)),
      interesting: Math.max(0, Math.min(3, r.interesting)),
      questions: r.questions.filter((q) => q in QUESTIONS),
      reason: r.reason,
      deep: r.deep,
    });
  }
}

/** 初筛待处理和上次失败的条目。返回处理条数；遇到不可恢复错误时抛出，由调度记为失败。 */
export async function runTriage(store: Store, limit = 200): Promise<number> {
  requireModel();
  const items = store.pendingTriage(limit);
  for (let i = 0; i < items.length; i += config.triageBatch) {
    await triageBatch(store, items.slice(i, i + config.triageBatch));
  }
  const failed = items.length ? store.count(`triage_status='error' AND id IN (${items.map((i) => i.id).join(',')})`) : 0;
  if (failed) throw new Error(`${failed}/${items.length} 条初筛失败，详见候选池`);
  return items.length;
}
