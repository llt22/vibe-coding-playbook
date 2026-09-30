import { hnMinPoints, hnQueries } from '../config.ts';
import { getJson, itemKey } from '../http.ts';
import type { Collector, RawItem } from './types.ts';

type Hit = { objectID: string; title: string; url: string | null; author: string; points: number; num_comments: number; created_at: string };

export const hn: Collector = {
  name: 'hn',
  intervalHours: 3,
  async collect() {
    const since = Math.floor(Date.now() / 1000) - 3 * 86400;
    const out: RawItem[] = [];
    for (const q of hnQueries) {
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=story`
        + `&numericFilters=${encodeURIComponent(`created_at_i>${since},points>=${hnMinPoints}`)}&hitsPerPage=50`;
      const res = await getJson<{ hits: Hit[] }>(url);
      for (const h of res.hits) {
        const discussion = `https://news.ycombinator.com/item?id=${h.objectID}`;
        const target = h.url || discussion;
        out.push({
          key: itemKey(target),
          source: 'hn',
          title: h.title,
          url: target,
          summary: `HN 讨论：${discussion}`,
          author: h.author,
          published_at: h.created_at,
          metrics: { points: h.points, comments: h.num_comments },
        });
      }
    }
    return out;
  },
};
