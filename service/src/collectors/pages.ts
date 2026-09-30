import { getText, itemKey } from '../http.ts';
import type { Collector, RawItem } from './types.ts';

/** 没有 feed 的文章列表页。每张卡片是 <article> 里一个链接、一个标题、一个 <time dateTime>。 */
const PAGES = [
  { name: 'anthropic-engineering', url: 'https://www.anthropic.com/engineering', path: '/engineering/' },
];

const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

export function parseArticleList(html: string, base: string, path: string, source: string): RawItem[] {
  const out: RawItem[] = [];
  for (const [, card] of html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)) {
    const href = card.match(new RegExp(`href="(${path}[^"]+)"`))?.[1];
    const title = card.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/)?.[1];
    const date = card.match(/<time[^>]*dateTime="([^"]+)"/i)?.[1];
    if (!href || !title) continue;
    const url = new URL(href, base).href;
    out.push({ key: itemKey(url), source, title: strip(title), url, published_at: date ? new Date(date).toISOString() : null });
  }
  return out;
}

/** 只收近 14 天的文章；页面结构变了导致一条都解析不出来时报错，而不是当作没有新文章。 */
export const pages: Collector = {
  name: 'pages',
  intervalHours: 12,
  async collect() {
    const cutoff = Date.now() - 14 * 86400_000;
    const out: RawItem[] = [];
    const errors: string[] = [];
    for (const p of PAGES) {
      try {
        const items = parseArticleList(await getText(p.url), p.url, p.path, `web:${p.name}`);
        if (!items.length) throw new Error('页面里没有解析出文章，可能改版了');
        out.push(...items.filter((i) => !i.published_at || Date.parse(i.published_at) >= cutoff));
      } catch (e) {
        errors.push(`${p.url}: ${(e as Error).message}`);
      }
    }
    if (errors.length) throw Object.assign(new Error(errors.join('\n')), { partial: out });
    return out;
  },
};
