import { config, githubMinStars, githubQueries } from '../config.ts';
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

export const githubSearch: Collector = {
  name: 'github-search',
  intervalHours: 6,
  async collect() {
    const out: RawItem[] = [];
    for (const q of githubQueries) {
      const query = `${q} created:>${daysAgo(7)} stars:>=${githubMinStars}`;
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`;
      const res = await getJson<{ items: SearchRepo[] }>(url, headers());
      for (const r of res.items) {
        out.push({
          key: `github:${r.full_name.toLowerCase()}`,
          source: 'github-search',
          title: r.full_name,
          url: r.html_url,
          summary: r.description ?? '',
          author: r.owner.login,
          published_at: r.created_at,
          metrics: { stars: r.stargazers_count },
        });
      }
    }
    return out;
  },
};

const num = (s: string) => Number(s.replace(/,/g, ''));
const decode = (s: string) =>
  s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

export function parseTrending(html: string): RawItem[] {
  return html.split('<article class="Box-row">').slice(1).map((block) => {
    const repo = block.match(/<h2[^>]*>\s*<a[^>]*href="\/([^"/]+\/[^"/]+)"/)?.[1];
    if (!repo) throw new Error('trending 页面结构变化：找不到仓库链接');
    const desc = block.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? '';
    const stars = block.match(/\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/)?.[1];
    const today = block.match(/([\d,]+) stars today/)?.[1];
    return {
      key: `github:${repo.toLowerCase()}`,
      source: 'github-trending',
      title: repo,
      url: `https://github.com/${repo}`,
      summary: decode(desc),
      author: repo.split('/')[0],
      metrics: { ...(stars ? { stars: num(stars) } : {}), ...(today ? { stars_today: num(today) } : {}) },
    };
  });
}

export const githubTrending: Collector = {
  name: 'github-trending',
  intervalHours: 24,
  async collect() {
    const items = parseTrending(await getText('https://github.com/trending?since=daily'));
    if (items.length === 0) throw new Error('trending 页面解析出 0 条，页面结构可能变化');
    return items;
  },
};
