import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

export const config = {
  port: Number(process.env.PORT ?? 4317),
  host: process.env.HOST ?? '127.0.0.1',
  webPassword: process.env.WEB_PASSWORD ?? '',
  ingestToken: process.env.INGEST_TOKEN ?? '',
  dbPath: process.env.DB_PATH ?? resolve(ROOT, 'data/radar.db'),
  catalogPath: resolve(ROOT, '../research/catalog/catalog.jsonl'),
  githubToken: process.env.GITHUB_TOKEN ?? '',
  triageModel: process.env.TRIAGE_MODEL ?? 'claude-opus-5-5',
  triageBatch: 10,
};

/** GitHub Search 查询：限近 7 天新建、星数过阈值，按星数排序。 */
export const githubQueries = [
  '"claude code"',
  'codex agent',
  'topic:mcp',
  'topic:ai-agents',
  'topic:agent-skills',
  'coding agent workflow',
];
export const githubMinStars = 30;

/** HN Algolia 查询：限近 3 天、分数过阈值的 story。 */
export const hnQueries = ['claude code', 'codex', 'ai agent', 'llm', 'mcp', 'cursor'];
export const hnMinPoints = 30;

/** feed 地址已在 2026-09-30 验证可访问；catalogId 对应 catalog.jsonl 里的信源条目。 */
export const feeds = [
  { catalogId: 'src-simon-willison-blog', url: 'https://simonwillison.net/atom/everything/' },
  { catalogId: 'src-martin-fowler', url: 'https://martinfowler.com/feed.atom' },
  { catalogId: 'src-latent-space', url: 'https://www.latent.space/feed' },
  { catalogId: 'src-pragmatic-engineer', url: 'https://newsletter.pragmaticengineer.com/feed' },
  { catalogId: 'src-github-engineering', url: 'https://github.blog/engineering/feed/' },
];
