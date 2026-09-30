import { XMLParser } from 'fast-xml-parser';
import { feeds } from '../config.ts';
import { getText, itemKey } from '../http.ts';
import type { Collector, RawItem } from './types.ts';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
const arr = <T>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
const text = (x: unknown): string => (typeof x === 'string' ? x : typeof x === 'object' && x && '#text' in x ? String(x['#text']) : '');
const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);

type Entry = Record<string, any>;

export function parseFeed(xml: string, source: string): RawItem[] {
  const doc = parser.parse(xml);
  const rssItems: Entry[] = arr(doc.rss?.channel?.item);
  const atomItems: Entry[] = arr(doc.feed?.entry);
  if (!doc.rss && !doc.feed) throw new Error('不是 RSS 或 Atom');
  const items = rssItems.map((i) => ({
    title: text(i.title), url: text(i.link), summary: text(i.description), date: i.pubDate, author: text(i['dc:creator']),
  })).concat(atomItems.map((e) => ({
    title: text(e.title),
    url: arr<Entry>(e.link).find((l) => !l.rel || l.rel === 'alternate')?.href ?? '',
    summary: text(e.summary) || text(e.content),
    date: e.published ?? e.updated,
    author: text(e.author?.name),
  })));
  return items.filter((i) => i.url).map((i) => ({
    key: itemKey(i.url),
    source,
    title: strip(i.title),
    url: i.url,
    summary: strip(i.summary),
    author: i.author || null,
    published_at: i.date ? new Date(i.date).toISOString() : null,
  }));
}

/** 只收近 14 天的文章，避免第一次运行把整个 feed 历史灌进候选池。 */
export const rss: Collector = {
  name: 'rss',
  intervalHours: 6,
  async collect() {
    const cutoff = Date.now() - 14 * 86400_000;
    const out: RawItem[] = [];
    const errors: string[] = [];
    for (const f of feeds) {
      try {
        const items = parseFeed(await getText(f.url), `rss:${f.catalogId}`);
        out.push(...items.filter((i) => !i.published_at || Date.parse(i.published_at) >= cutoff));
      } catch (e) {
        errors.push(`${f.url}: ${(e as Error).message}`);
      }
    }
    // 单个 feed 失败不丢弃其余结果，但整次运行仍记为失败，页面能看到是哪个 feed
    if (errors.length) throw Object.assign(new Error(errors.join('\n')), { partial: out });
    return out;
  },
};
