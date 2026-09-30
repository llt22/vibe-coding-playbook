import { config } from './config.ts';
import type { Catalog } from './catalog.ts';
import { githubSearch, githubTrending } from './collectors/github.ts';
import { hn } from './collectors/hn.ts';
import { rss } from './collectors/rss.ts';
import type { Collector, RawItem } from './collectors/types.ts';
import type { Store } from './db.ts';
import { runTriage } from './triage.ts';

export const collectors: Collector[] = [githubSearch, githubTrending, hn, rss];
export const TRIAGE = 'triage';

/** 写入条目并记星数快照，返回新增条数。 */
export function ingest(store: Store, catalog: Catalog, items: RawItem[]): number {
  let added = 0;
  for (const item of items) {
    if (store.upsert(item, catalog.byKey.get(item.key)?.id ?? null)) added++;
    if (item.key.startsWith('github:') && item.metrics?.stars !== undefined) store.snapshotStars(item.key.slice(7), item.metrics.stars);
  }
  return added;
}

async function runCollector(store: Store, catalog: Catalog, c: Collector) {
  const run = store.startRun(c.name);
  try {
    const items = await c.collect();
    store.finishRun(run, { fetched: items.length, newItems: ingest(store, catalog, items) });
  } catch (e) {
    const partial = (e as { partial?: RawItem[] }).partial ?? [];
    const added = ingest(store, catalog, partial);
    const note = partial.length ? `（其余来源成功 ${partial.length} 条，新增 ${added}）` : '';
    store.finishRun(run, { error: (e as Error).message + note });
    console.error(`[${c.name}]`, (e as Error).message);
  }
}

async function triage(store: Store) {
  if (store.count(`triage_status IN ('pending', 'error')`) === 0) return;
  const run = store.startRun(TRIAGE);
  try {
    const n = await runTriage(store);
    store.finishRun(run, { fetched: n, newItems: 0 });
  } catch (e) {
    store.finishRun(run, { error: (e as Error).message });
    console.error('[triage]', (e as Error).message);
  }
}

const due = (store: Store, c: Collector) => {
  const last = store.lastSuccess(c.name);
  return !last || Date.now() - Date.parse(last) >= c.intervalHours * 3600_000;
};

let busy = false;

/** 执行到期的采集器，再初筛。force 时忽略周期全部执行。 */
export async function tick(store: Store, catalog: Catalog, force = false) {
  if (busy) return;
  busy = true;
  try {
    for (const c of collectors) if (force || due(store, c)) await runCollector(store, catalog, c);
    await triage(store);
  } finally {
    busy = false;
  }
}

/** 最近一次失败，或超过两个周期没有成功运行，视为异常。 */
export function unhealthy(store: Store): { name: string; reason: string }[] {
  const last = new Map(store.lastRuns().map((r) => [r.collector, r]));
  const out: { name: string; reason: string }[] = [];
  // 推送方：启用推送接口后按约定周期检查心跳
  const pushers = config.ingestToken ? config.pushers.map((p) => ({ name: `ingest:${p.name}`, intervalHours: p.intervalHours })) : [];
  for (const c of [...collectors, ...pushers, { name: TRIAGE, intervalHours: 0 }]) {
    const r = last.get(c.name);
    if (r?.status === 'error') out.push({ name: c.name, reason: r.error ?? '未知错误' });
    else if (c.intervalHours) {
      const ok = store.lastSuccess(c.name);
      if (!ok) out.push({ name: c.name, reason: '从未成功运行' });
      else if (Date.now() - Date.parse(ok) > 2 * c.intervalHours * 3600_000) out.push({ name: c.name, reason: `超过 ${2 * c.intervalHours} 小时没有成功运行` });
    }
  }
  return out;
}
