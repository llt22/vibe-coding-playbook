import OpenAI from 'openai';
import type { z } from 'zod';
import { config } from './config.ts';

let client: OpenAI | undefined;
export const llm = () => (client ??= new OpenAI({ baseURL: config.llmBaseURL, apiKey: config.llmApiKey, maxRetries: 3 }));

export function requireModel() {
  const missing = (['llmBaseURL', 'llmApiKey', 'llmModel'] as const).filter((k) => !config[k]);
  if (missing.length) throw new Error(`未配置模型：.env 缺少 ${missing.map((k) => ({ llmBaseURL: 'LLM_BASE_URL', llmApiKey: 'LLM_API_KEY', llmModel: 'LLM_MODEL' })[k]).join('、')}`);
}

/** 鉴权、参数、模型名错误重试也不会好，调用方应停止本轮；限流和 5xx 已由 SDK 重试过。 */
export const fatal = (e: unknown) => e instanceof OpenAI.AuthenticationError || e instanceof OpenAI.BadRequestError
  || e instanceof OpenAI.PermissionDeniedError || e instanceof OpenAI.NotFoundError;

export const describeError = (e: unknown) =>
  e instanceof OpenAI.APIError ? `API ${e.status ?? '连接失败'}：${e.message.slice(0, 300)}` : (e as Error).message.slice(0, 800);

/** JSON 解析失败时带上出错位置前后的原文，便于判断是转义问题还是截断。 */
function parseError(text: string, e: Error) {
  const pos = Number(/position (\d+)/.exec(e.message)?.[1] ?? text.length);
  return `输出不是合法 JSON（${e.message.slice(0, 120)}，共 ${text.length} 字）：…${text.slice(Math.max(0, pos - 150), pos + 60)}…`;
}

/**
 * 要求模型输出 JSON 并用 schema 校验。模型偶尔输出不合法 JSON（多为字符串里的引号没转义），
 * 这类错误立即重答一次；截断、过滤和接口错误直接抛出。
 */
export async function askJson<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T> {
  let last = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await llm().chat.completions.create({
      model: config.llmModel,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    });
    const choice = res.choices[0];
    if (!choice) throw new Error('模型没有返回结果');
    if (choice.finish_reason === 'length') throw new Error('输出被截断（length）');
    if (choice.finish_reason === 'content_filter') throw new Error('被内容过滤拦截');
    const text = choice.message.content ?? '';
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      last = parseError(text, e as Error);
      continue;
    }
    const parsed = schema.safeParse(json);
    if (parsed.success) return parsed.data;
    const issue = parsed.error.issues[0];
    last = `输出格式不符：${issue?.path.join('.')} ${issue?.message}`;
  }
  throw new Error(`${last}（已重答 1 次）`);
}
