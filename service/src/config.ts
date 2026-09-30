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
  // OpenAI 兼容接口：LLM_BASE_URL 形如 https://api.example.com/v1
  llmBaseURL: process.env.LLM_BASE_URL ?? '',
  llmApiKey: process.env.LLM_API_KEY ?? '',
  llmModel: process.env.LLM_MODEL ?? '',
  triageBatch: 10,
  /** 自动深入调研：每小时最多处理几条、每 24 小时上限、单条最多重试次数 */
  researchPerRun: 3,
  researchPerDay: 8,
  researchMaxAttempts: 3,
  /** 调研报告写到仓库的这个目录；RESEARCH_GIT_COMMIT=0 时只写文件不提交 */
  repoRoot: resolve(ROOT, '..'),
  researchDir: 'research/radar',
  gitCommit: process.env.RESEARCH_GIT_COMMIT !== '0',
  /** 本机推送方及其约定周期（小时），超过两个周期没推送时首页标红 */
  pushers: [{ name: 'x', intervalHours: 3 }],
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

/** feed 地址已在 2026-09-30 验证可访问；catalogId 对应 catalog.jsonl 里的信源条目，不在清单里的留空、来源名用域名。 */
export const feeds = [
  { catalogId: '', url: 'https://claude.dev/rss.xml' },
  { catalogId: '', url: 'https://openai.com/news/rss.xml' },
  { catalogId: 'src-simon-willison-blog', url: 'https://simonwillison.net/atom/everything/' },
  { catalogId: 'src-martin-fowler', url: 'https://martinfowler.com/feed.atom' },
  { catalogId: 'src-latent-space', url: 'https://www.latent.space/feed' },
  { catalogId: 'src-pragmatic-engineer', url: 'https://newsletter.pragmaticengineer.com/feed' },
  { catalogId: 'src-github-engineering', url: 'https://github.blog/engineering/feed/' },
];
