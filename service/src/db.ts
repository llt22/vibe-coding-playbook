import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RawItem } from './collectors/types.ts';

export type Item = {
  id: number;
  key: string;
  source: string;
  title: string;
  url: string;
  summary: string;
  author: string | null;
  published_at: string | null;
  first_seen_at: string;
  metrics: string;
  catalog_id: string | null;
  triage_status: 'pending' | 'done' | 'error' | 'known';
  relevance: number | null;
  questions: string | null;
  reason: string | null;
  triage_error: string | null;
  decision: 'new' | 'adopt' | 'watch' | 'drop';
};

export type Run = {
  id: number;
  collector: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'ok' | 'error';
  fetched: number;
  new_items: number;
  error: string | null;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  author TEXT,
  published_at TEXT,
  first_seen_at TEXT NOT NULL,
  metrics TEXT NOT NULL DEFAULT '{}',
  catalog_id TEXT,
  triage_status TEXT NOT NULL DEFAULT 'pending',
  relevance INTEGER,
  questions TEXT,
  reason TEXT,
  triage_error TEXT,
  decision TEXT NOT NULL DEFAULT 'new',
  decided_at TEXT
);
CREATE INDEX IF NOT EXISTS items_triage ON items(triage_status);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY,
  collector TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  fetched INTEGER NOT NULL DEFAULT 0,
  new_items INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
CREATE INDEX IF NOT EXISTS runs_collector ON runs(collector, started_at);
CREATE TABLE IF NOT EXISTS star_snapshots (
  repo TEXT NOT NULL,
  day TEXT NOT NULL,
  stars INTEGER NOT NULL,
  PRIMARY KEY (repo, day)
);
CREATE TABLE IF NOT EXISTS pushers (
  name TEXT PRIMARY KEY,
  last_seen_at TEXT NOT NULL,
  last_count INTEGER NOT NULL
);
`;

const now = () => new Date().toISOString();

export class Store {
  db: DatabaseSync;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL;' + SCHEMA);
    // 进程被杀时遗留的 running 记录不会再结束，标成失败以免页面误以为仍在运行
    this.db.prepare(`UPDATE runs SET status='error', finished_at=?, error='进程中断' WHERE status='running'`).run(now());
  }

  startRun(collector: string): number {
    const r = this.db.prepare(`INSERT INTO runs (collector, started_at, status) VALUES (?, ?, 'running')`).run(collector, now());
    return Number(r.lastInsertRowid);
  }

  finishRun(id: number, result: { fetched: number; newItems: number } | { error: string }) {
    if ('error' in result) {
      this.db.prepare(`UPDATE runs SET finished_at=?, status='error', error=? WHERE id=?`).run(now(), result.error, id);
    } else {
      this.db.prepare(`UPDATE runs SET finished_at=?, status='ok', fetched=?, new_items=? WHERE id=?`)
        .run(now(), result.fetched, result.newItems, id);
    }
  }

  lastSuccess(collector: string): string | null {
    const r = this.db.prepare(`SELECT MAX(started_at) AS t FROM runs WHERE collector=? AND status='ok'`).get(collector) as { t: string | null };
    return r.t;
  }

  lastRuns(): Run[] {
    return this.db.prepare(`SELECT * FROM runs WHERE id IN (SELECT MAX(id) FROM runs GROUP BY collector) ORDER BY collector`).all() as Run[];
  }

  recentRuns(limit = 100): Run[] {
    return this.db.prepare(`SELECT * FROM runs ORDER BY id DESC LIMIT ?`).all(limit) as Run[];
  }

  /** 新 key 插入并返回 true；已有 key 只刷新热度和摘要。 */
  upsert(item: RawItem, catalogId: string | null): boolean {
    const existing = this.db.prepare(`SELECT id FROM items WHERE key=?`).get(item.key);
    const metrics = JSON.stringify(item.metrics ?? {});
    if (existing) {
      this.db.prepare(`UPDATE items SET metrics=?, summary=CASE WHEN ?<>'' THEN ? ELSE summary END WHERE key=?`)
        .run(metrics, item.summary ?? '', item.summary ?? '', item.key);
      return false;
    }
    this.db.prepare(`INSERT INTO items (key, source, title, url, summary, author, published_at, first_seen_at, metrics, catalog_id, triage_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(item.key, item.source, item.title, item.url, item.summary ?? '', item.author ?? null, item.published_at ?? null,
        now(), metrics, catalogId, catalogId ? 'known' : 'pending');
    return true;
  }

  snapshotStars(repo: string, stars: number) {
    this.db.prepare(`INSERT OR REPLACE INTO star_snapshots (repo, day, stars) VALUES (?, ?, ?)`).run(repo, now().slice(0, 10), stars);
  }

  /** 与 7 天前（或最早快照）相比的星数增长；快照不足两天时返回 null。 */
  starGrowth(repo: string): number | null {
    const rows = this.db.prepare(`SELECT day, stars FROM star_snapshots WHERE repo=? AND day >= date('now', '-7 day') ORDER BY day`).all(repo) as { day: string; stars: number }[];
    return rows.length < 2 ? null : rows[rows.length - 1].stars - rows[0].stars;
  }

  pendingTriage(limit: number): Item[] {
    return this.db.prepare(`SELECT * FROM items WHERE triage_status IN ('pending', 'error') ORDER BY id LIMIT ?`).all(limit) as Item[];
  }

  setTriage(id: number, t: { relevance: number; questions: number[]; reason: string }) {
    this.db.prepare(`UPDATE items SET triage_status='done', relevance=?, questions=?, reason=?, triage_error=NULL WHERE id=?`)
      .run(t.relevance, JSON.stringify(t.questions), t.reason, id);
  }

  setTriageError(ids: number[], error: string) {
    const stmt = this.db.prepare(`UPDATE items SET triage_status='error', triage_error=? WHERE id=?`);
    for (const id of ids) stmt.run(error, id);
  }

  decide(id: number, decision: Item['decision']) {
    this.db.prepare(`UPDATE items SET decision=?, decided_at=? WHERE id=?`).run(decision, now(), id);
  }

  items(where: string, params: (string | number)[], limit = 300): Item[] {
    return this.db.prepare(`SELECT * FROM items WHERE ${where} LIMIT ?`).all(...params, limit) as Item[];
  }

  count(where = '1=1', params: (string | number)[] = []): number {
    return (this.db.prepare(`SELECT COUNT(*) AS n FROM items WHERE ${where}`).get(...params) as { n: number }).n;
  }

  touchPusher(name: string, count: number) {
    this.db.prepare(`INSERT OR REPLACE INTO pushers (name, last_seen_at, last_count) VALUES (?, ?, ?)`).run(name, now(), count);
  }

  pushers(): { name: string; last_seen_at: string; last_count: number }[] {
    return this.db.prepare(`SELECT * FROM pushers ORDER BY name`).all() as { name: string; last_seen_at: string; last_count: number }[];
  }
}
