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
  /** 品味来源：这些账号 star 过的仓库每周采一次，用来补“人工策展”这条通道 */
  githubStarredUsers: (process.env.GITHUB_STARRED_USERS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  // OpenAI 兼容接口：LLM_BASE_URL 形如 https://api.example.com/v1
  llmBaseURL: process.env.LLM_BASE_URL ?? '',
  llmApiKey: process.env.LLM_API_KEY ?? '',
  llmModel: process.env.LLM_MODEL ?? '',
  triageBatch: 10,
  /** 自动深入调研：每小时最多处理几条（不设每日上限）、单条最多重试次数 */
  researchPerRun: 5,
  researchMaxAttempts: 3,
  /** 调研报告写到仓库的这个目录；RESEARCH_GIT_COMMIT=0 时只写文件不提交 */
  repoRoot: resolve(ROOT, '..'),
  researchDir: 'research/radar',
  gitCommit: process.env.RESEARCH_GIT_COMMIT !== '0',
  /** 手册：目录、每次最多给多少条调研分配手册、每次最多修订几篇 */
  playbookDir: 'playbooks',
  playbookAssignBatch: 20,
  playbookPerRun: 6,
  /** 本机推送方及其约定周期（小时），超过两个周期没推送时首页标红 */
  pushers: [{ name: 'x', intervalHours: 3 }],
};

/**
 * GitHub Search 的一条查询。“7 天内新建 + 30 星”是刷星模板仓库最密集的池子（实测四分之一是同一模板换皮），
 * 所以新建仓库保留但抬高门槛，另加“在长大的成熟仓库”一组：不限期新建，只看近 30 天有推送和星数。
 */
export type GithubQuery = {
  q: string;
  /** 只保留最近 N 天新建的仓库；不设则不限创建时间 */
  createdDays?: number;
  /** 只保留最近 N 天有推送的仓库 */
  pushedDays?: number;
  /** 覆盖 githubMinStars */
  minStars?: number;
};

/** 发现类查询：新冒头的仓库，创建时间窗口由 createdDays 控制。 */
export const githubQueries: GithubQuery[] = [
  { q: '"claude code"', createdDays: 7, minStars: 50 },
  { q: 'codex agent', createdDays: 7, minStars: 50 },
  { q: 'topic:mcp', createdDays: 7, minStars: 50 },
  { q: 'topic:ai-agents', createdDays: 7, minStars: 50 },
  { q: 'topic:agent-skills', createdDays: 7, minStars: 30 },
  { q: 'coding agent workflow', createdDays: 14, minStars: 50 },
  { q: 'topic:llm-tools', createdDays: 14, minStars: 100 },
];
/** 没有单独指定 minStars 时的下限 */
export const githubMinStars = 50;

/**
 * 成熟项目：不限创建时间，看“最近还在动 + 星数已经站住”的仓库。
 * 只看新建仓库会漏掉真正在长大、被反复引用的项目；这一组是实测里产出质量最高的一条通道。
 */
export const githubActiveQueries: GithubQuery[] = [
  { q: '"claude code"', pushedDays: 30, minStars: 500 },
  { q: 'codex OR opencode OR "coding agent"', pushedDays: 30, minStars: 500 },
  { q: 'topic:ai-agents', pushedDays: 30, minStars: 300 },
  { q: 'topic:agent-skills', pushedDays: 30, minStars: 100 },
  { q: 'topic:claude-skills', pushedDays: 30, minStars: 100 },
  { q: 'topic:mcp', pushedDays: 30, minStars: 300 },
  { q: 'topic:llm-tools', pushedDays: 30, minStars: 200 },
  { q: 'topic:llm-evaluation', pushedDays: 30, minStars: 100 },
  { q: 'topic:llmops', pushedDays: 30, minStars: 100 },
  { q: 'harness OR sandbox "coding agent"', pushedDays: 30, minStars: 100 },
  { q: '"context engineering" OR "spec-driven"', pushedDays: 30, minStars: 100 },
];

/** GitHub trending 页面（无官方 API）。daily 抓新爆的，weekly 抓持续涨的，中文项目单独一页。 */
export const trendingPages = [
  { url: 'https://github.com/trending?since=daily', label: 'daily' },
  { url: 'https://github.com/trending?since=weekly', label: 'weekly' },
  { url: 'https://github.com/trending?since=weekly&spoken_language_code=zh', label: 'weekly-zh' },
];

/** HN Algolia 查询：限近 3 天、分数过阈值的 story。 */
export const hnQueries = ['claude code', 'codex', 'ai agent', 'coding agent', 'agent skills', 'llm', 'mcp', 'cursor'];
export const hnMinPoints = 30;

/** feed 地址均在 2026-10-22 验证返回 RSS/Atom；catalogId 是来源标签（catalog.jsonl 没有对应条目时只影响显示名）。 */
export const feeds = [
  { catalogId: '', url: 'https://claude.dev/rss.xml' },
  { catalogId: '', url: 'https://openai.com/news/rss.xml' },
  { catalogId: 'src-simon-willison-blog', url: 'https://simonwillison.net/atom/everything/' },
  { catalogId: 'src-martin-fowler', url: 'https://martinfowler.com/feed.atom' },
  { catalogId: 'src-latent-space', url: 'https://www.latent.space/feed' },
  { catalogId: 'src-pragmatic-engineer', url: 'https://newsletter.pragmaticengineer.com/feed' },
  { catalogId: 'src-github-engineering', url: 'https://github.blog/engineering/feed/' },
  // 厂商与官方博客：一手基准、发布说明和事故复盘。这几类内容很少出现在 HN 和 X 的时间线里。
  // 2026-11-12 移除 opensource.microsoft.com/blog/feed：本机持续 ECONNRESET（curl 报 SSL connect error），
  // 每轮拖红整个 rss 采集器；恢复可访问后再加回来。
  { catalogId: 'src-wiz-research', url: 'https://www.wiz.io/blog/rss.xml' },
  { catalogId: 'src-github-changelog', url: 'https://github.blog/changelog/feed/' },
];
