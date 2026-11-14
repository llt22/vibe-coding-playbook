import { config, githubActiveQueries, githubMinStars, githubQueries, trendingPages } from '../config.ts';
import type { GithubQuery } from '../config.ts';
import { getJson, getText } from '../http.ts';
import type { Collector, RawItem } from './types.ts';

type SearchRepo = {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  created_at: string;
  owner: { login: string };
};

const headers = () => ({
  accept: 'application/vnd.github+json',
  ...(config.githubToken ? { authorization: `Bearer ${config.githubToken}` } : {}),
});

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);

/** 有 token 时限额高，查询之间不用等；匿名每分钟只有 10 次搜索，必须留间隔。 */
const searchGap = () => (config.githubToken ? 1200 : 7000);

const toItem = (r: SearchRepo, source: string): RawItem => ({
  key: `github:${r.full_name.toLowerCase()}`,
  source,
  title: r.full_name,
  url: r.html_url,
  summary: r.description ?? '',
  author: r.owner.login,
  published_at: r.created_at,
  metrics: { stars: r.stargazers_count },
});

/** 一条查询定义 → GitHub 搜索表达式：关键词 + 时间窗口 + 星数下限，按星数排序取前 30。 */
export function buildQuery(def: GithubQuery): string {
  return [
    def.q,
    def.createdDays ? `created:>${daysAgo(def.createdDays)}` : '',
    def.pushedDays ? `pushed:>${daysAgo(def.pushedDays)}` : '',
    `stars:>=${def.minStars ?? githubMinStars}`,
  ].filter(Boolean).join(' ');
}

async function searchAll(defs: GithubQuery[], source: string, sort: 'stars' | 'updated' = 'stars'): Promise<RawItem[]> {
  const out: RawItem[] = [];
  for (const [i, def] of defs.entries()) {
    if (i) await new Promise((r) => setTimeout(r, searchGap()));
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(buildQuery(def))}&sort=${sort}&order=desc&per_page=30`;
    const res = await getJson<{ items: SearchRepo[] }>(url, headers());
    out.push(...res.items.map((r) => toItem(r, source)));
  }
  return out;
}

/** 新冒头的仓库：按创建时间窗口 + 星数下限，6 小时一轮。 */
export const githubSearch: Collector = {
  name: 'github-search',
  intervalHours: 6,
  collect: () => searchAll(githubQueries, 'github-search'),
};

/**
 * 成熟项目：不限创建时间，看近 30 天还在动、星数已经站住的项目。
 * 按最近推送排序而不是星数：按星数排每天返回同一批顶星仓库，去重后天天 0 条新增。
 */
export const githubActive: Collector = {
  name: 'github-active',
  intervalHours: 24,
  collect: () => searchAll(githubActiveQueries, 'github-active', 'updated'),
};

const num = (s: string) => Number(s.replace(/,/g, ''));
const decode = (s: string) =>
  s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

/** 解析 trending 页面。daily 页写“stars today”，weekly 页写“stars this week”。 */
export function parseTrending(html: string): RawItem[] {
  return html.split('<article class="Box-row">').slice(1).map((block) => {
    const repo = block.match(/<h2[^>]*>\s*<a[^>]*href="\/([^"/]+\/[^"/]+)"/)?.[1];
    if (!repo) throw new Error('trending 页面结构变化：找不到仓库链接');
    const desc = block.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? '';
    const stars = block.match(/\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/)?.[1];
    const gained = block.match(/([\d,]+)\s+stars\s+(today|this week)/);
    return {
      key: `github:${repo.toLowerCase()}`,
      source: 'github-trending',
      title: repo,
      url: `https://github.com/${repo}`,
      summary: decode(desc),
      author: repo.split('/')[0],
      metrics: {
        ...(stars ? { stars: num(stars) } : {}),
        ...(gained ? { [gained[2] === 'today' ? 'stars_today' : 'stars_week']: num(gained[1]) } : {}),
      },
    };
  });
}

/** 三个 trending 页面：daily 抓当天爆的，weekly 抓持续涨的，中文项目单独一页。单个页面失败不拖垮其他页面。 */
export const githubTrending: Collector = {
  name: 'github-trending',
  intervalHours: 24,
  async collect() {
    const byKey = new Map<string, RawItem>();
    const errors: string[] = [];
    for (const page of trendingPages) {
      try {
        for (const item of parseTrending(await getText(page.url))) {
          const prev = byKey.get(item.key);
          if (!prev) byKey.set(item.key, item);
          else {
            prev.metrics = { ...prev.metrics, ...item.metrics };
            if (!prev.summary) prev.summary = item.summary;
          }
        }
      } catch (e) {
        errors.push(`${page.label}：${(e as Error).message}`);
      }
    }
    const items = [...byKey.values()];
    if (items.length === 0) throw new Error(`trending 全部页面解析失败：${errors.join('；')}`);
    if (errors.length) throw Object.assign(new Error(errors.join('；')), { partial: items });
    return items;
  },
};

/**
 * 品味来源：固定账号 star 过的仓库，每天一轮。这批账号的 star 动作相当于人工策展，
 * 补上“关键词搜不到、星数涨得慢”的仓库——也就是自己刷 X 时才会遇到的那类。
 */
export const githubStarred: Collector = {
  name: 'github-starred',
  intervalHours: 24,
  async collect() {
    const out: RawItem[] = [];
    const errors: string[] = [];
    let ok = 0;
    for (const [i, user] of config.githubStarredUsers.entries()) {
      if (i) await new Promise((r) => setTimeout(r, config.githubToken ? 500 : 2500));
      try {
        const res = await getJson<SearchRepo[]>(
          `https://api.github.com/users/${encodeURIComponent(user)}/starred?sort=created&direction=desc&per_page=30`,
          headers(),
        );
        ok++;
        for (const r of res) {
          const item = toItem(r, 'github-starred');
          out.push({ ...item, summary: [r.description ?? '', `@${user} 星标`].filter(Boolean).join(' · ') });
        }
      } catch (e) {
        errors.push(`@${user}：${(e as Error).message}`);
      }
    }
    if (!ok) throw new Error(`starred 全部失败：${errors.join('；')}`);
    if (errors.length) throw Object.assign(new Error(errors.join('；')), { partial: out });
    return out;
  },
};
