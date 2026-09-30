import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { config } from './config.ts';
import type { Item, Store } from './db.ts';
import { QUESTIONS } from './questions.ts';

const Result = z.object({
  results: z.array(z.object({
    id: z.number().int(),
    relevance: z.number().int(),
    questions: z.array(z.number().int()),
    reason: z.string(),
  })),
});

const SYSTEM = `你在为一个长期调研项目做线索初筛。项目研究“怎样在各类工作中把 AI 用到最好”，围绕五个问题：
${Object.entries(QUESTIONS).map(([k, v]) => `${k}. ${v}`).join('\n')}

对每条线索给出：
- relevance：0–3。3 = 可能直接改变某类工作的做法，值得本周就看；2 = 有具体、可落地的新做法或工具，值得记下；1 = 相关但泛泛、重复已知内容或只是新闻；0 = 与 AI 辅助工作无关。
- questions：它主要回答上面哪几个问题（编号，可为空）。
- reason：一句中文，说明它在真实工作里具体能做什么。看不出实际用途、只有宣传或演示的，直接说明并给低分。

只依据给出的标题、摘要和热度判断，不要编造没有给出的信息。每条输入都必须有一条结果，id 与输入一致。`;

const client = new Anthropic({ maxRetries: 3 });

function describe(i: Item) {
  return { id: i.id, source: i.source, title: i.title, url: i.url, summary: i.summary.slice(0, 600), metrics: JSON.parse(i.metrics) };
}

async function triageBatch(store: Store, batch: Item[]) {
  const ids = batch.map((i) => i.id);
  try {
    const res = await client.messages.parse({
      model: config.triageModel,
      max_tokens: 8000,
      output_config: { effort: 'low', format: zodOutputFormat(Result) },
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(batch.map(describe)) }],
    });
    if (res.stop_reason === 'refusal') return store.setTriageError(ids, `模型拒答：${res.stop_details?.category ?? '未知类别'}`);
    if (res.stop_reason === 'max_tokens') return store.setTriageError(ids, '输出被截断（max_tokens）');
    if (!res.parsed_output) return store.setTriageError(ids, '结构化输出解析失败');
    const got = new Map(res.parsed_output.results.map((r) => [r.id, r]));
    for (const item of batch) {
      const r = got.get(item.id);
      if (!r) {
        store.setTriageError([item.id], '模型结果缺少此条');
        continue;
      }
      store.setTriage(item.id, {
        relevance: Math.max(0, Math.min(3, r.relevance)),
        questions: r.questions.filter((q) => q in QUESTIONS),
        reason: r.reason,
      });
    }
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      store.setTriageError(ids, `API ${e.status ?? '连接失败'}：${e.message.slice(0, 300)}`);
      // 鉴权或参数错误重试也不会好，交给调用方停止本轮；限流和 5xx 已由 SDK 重试过
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.BadRequestError || e instanceof Anthropic.PermissionDeniedError) throw e;
      return;
    }
    throw e;
  }
}

/** 初筛待处理和上次失败的条目。返回处理条数；遇到不可恢复错误时抛出，由调度记为失败。 */
export async function runTriage(store: Store, limit = 200): Promise<number> {
  const items = store.pendingTriage(limit);
  for (let i = 0; i < items.length; i += config.triageBatch) {
    await triageBatch(store, items.slice(i, i + config.triageBatch));
  }
  const failed = items.length ? store.count(`triage_status='error' AND id IN (${items.map((i) => i.id).join(',')})`) : 0;
  if (failed) throw new Error(`${failed}/${items.length} 条初筛失败，详见候选池`);
  return items.length;
}
