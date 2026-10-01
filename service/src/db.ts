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
  /** 初筛时模型判断是否值得自动深入调研；旧数据为 null */
  deep: number | null;
};

export type Research = {
  id: number;
  item_id: number;
  status: 'pending' | 'done' | 'error';
  attempts: number;
  verdict: string | null;
  conclusion: string | null;
  body: string | null;
  file: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  /** 合并进的手册 slug；未合并为 null */
  playbook: string | null;
  merged_at: string | null;
};

export type Playbook = {
  slug: string;
  title: string;
  problem: string;
  first_step: string;
  body: string;
  file: string;
  created_at: string;
  updated_at: string;
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
CREATE TABLE IF NOT EXISTS research (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL UNIQUE REFERENCES items(id),
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verdict TEXT,
  conclusion TEXT,
  body TEXT,
  file TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS playbooks (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  first_step TEXT NOT NULL,
  body TEXT NOT NULL,
  file TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS playbook_updates (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL REFERENCES playbooks(slug),
  changes TEXT NOT NULL,
  research_ids TEXT NOT NULL,
  created_at TEXT NOT NULL
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
    const cols = (this.db.prepare(`PRAGMA table_info(items)`).all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes('deep')) this.db.exec(`ALTER TABLE items ADD COLUMN deep INTEGER`);
    const rcols = (this.db.prepare(`PRAGMA table_info(research)`).all() as { name: string }[]).map((c) => c.name);
    if (!rcols.includes('playbook')) this.db.exec(`ALTER TABLE research ADD COLUMN playbook TEXT; ALTER TABLE research ADD COLUMN merged_at TEXT`);
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

  lastStart(collector: string): string | null {
    const r = this.db.prepare(`SELECT MAX(started_at) AS t FROM runs WHERE collector=?`).get(collector) as { t: string | null };
    return r.t;
  }

  lastRuns(): Run[] {
    return this.db.prepare(`SELECT * FROM runs WHERE id IN (SELECT MAX(id) FROM runs GROUP BY collector) ORDER BY collector`).all() as Run[];
  }

  recentRuns(limit = 100, offset = 0): Run[] {
    return this.db.prepare(`SELECT * FROM runs ORDER BY id DESC LIMIT ? OFFSET ?`).all(limit, offset) as Run[];
  }

  countRuns(): number {
    return (this.db.prepare(`SELECT COUNT(*) AS n FROM runs`).get() as { n: number }).n;
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

  setTriage(id: number, t: { relevance: number; questions: number[]; reason: string; deep: boolean }) {
    this.db.prepare(`UPDATE items SET triage_status='done', relevance=?, questions=?, reason=?, deep=?, triage_error=NULL WHERE id=?`)
      .run(t.relevance, JSON.stringify(t.questions), t.reason, t.deep ? 1 : 0, id);
    if (t.deep) this.db.prepare(`INSERT OR IGNORE INTO research (item_id, status, created_at, updated_at) VALUES (?, 'pending', ?, ?)`).run(id, now(), now());
  }

  setTriageError(ids: number[], error: string) {
    const stmt = this.db.prepare(`UPDATE items SET triage_status='error', triage_error=? WHERE id=?`);
    for (const id of ids) stmt.run(error, id);
  }

  /** 待调研和失败次数未满的条目，手动加入的（source = 'manual'）最先，其余按相关度优先。 */
  pendingResearch(limit: number, maxAttempts: number): (Research & { item: Item })[] {
    const rows = this.db.prepare(`SELECT r.* FROM research r JOIN items i ON i.id = r.item_id
      WHERE r.status = 'pending' OR (r.status = 'error' AND r.attempts < ?) ORDER BY i.source = 'manual' DESC, i.relevance DESC, r.id LIMIT ?`).all(maxAttempts, limit) as Research[];
    return rows.map((r) => ({ ...r, item: this.db.prepare(`SELECT * FROM items WHERE id=?`).get(r.item_id) as Item }));
  }

  setResearch(id: number, r: { verdict: string; conclusion: string; body: string; file: string | null }) {
    this.db.prepare(`UPDATE research SET status='done', attempts=attempts+1, verdict=?, conclusion=?, body=?, file=?, error=NULL, updated_at=? WHERE id=?`)
      .run(r.verdict, r.conclusion, r.body, r.file, now(), id);
  }

  setResearchError(id: number, error: string) {
    this.db.prepare(`UPDATE research SET status='error', attempts=attempts+1, error=?, updated_at=? WHERE id=?`).run(error, now(), id);
  }

  research(where: string, params: (string | number)[], limit = 200, offset = 0): (Research & { item: Item })[] {
    const rows = this.db.prepare(`SELECT * FROM research WHERE ${where} LIMIT ? OFFSET ?`).all(...params, limit, offset) as Research[];
    return rows.map((r) => ({ ...r, item: this.db.prepare(`SELECT * FROM items WHERE id=?`).get(r.item_id) as Item }));
  }

  items(where: string, params: (string | number)[], limit = 300, offset = 0): Item[] {
    return this.db.prepare(`SELECT * FROM items WHERE ${where} LIMIT ? OFFSET ?`).all(...params, limit, offset) as Item[];
  }

  count(where = '1=1', params: (string | number)[] = []): number {
    return (this.db.prepare(`SELECT COUNT(*) AS n FROM items WHERE ${where}`).get(...params) as { n: number }).n;
  }

  countResearch(where: string, params: (string | number)[] = []): number {
    return (this.db.prepare(`SELECT COUNT(*) AS n FROM research WHERE ${where}`).get(...params) as { n: number }).n;
  }

  playbooks(): Playbook[] {
    return this.db.prepare(`SELECT * FROM playbooks ORDER BY updated_at DESC`).all() as Playbook[];
  }

  playbook(slug: string): Playbook | undefined {
    return this.db.prepare(`SELECT * FROM playbooks WHERE slug=?`).get(slug) as Playbook | undefined;
  }

  /** 保存新版手册、记一条修订记录，并把这些调研标为已合并，在一个事务里完成。 */
  savePlaybook(p: Omit<Playbook, 'created_at' | 'updated_at'>, changes: string[], researchIds: number[]): Playbook {
    const t = now();
    this.db.exec('BEGIN');
    try {
      this.db.prepare(`INSERT INTO playbooks (slug, title, problem, first_step, body, file, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET title=excluded.title, problem=excluded.problem, first_step=excluded.first_step, body=excluded.body, file=excluded.file, updated_at=excluded.updated_at`)
        .run(p.slug, p.title, p.problem, p.first_step, p.body, p.file, t, t);
      this.db.prepare(`INSERT INTO playbook_updates (slug, changes, research_ids, created_at) VALUES (?, ?, ?, ?)`)
        .run(p.slug, JSON.stringify(changes), JSON.stringify(researchIds), t);
      const mark = this.db.prepare(`UPDATE research SET playbook=?, merged_at=? WHERE id=?`);
      for (const id of researchIds) mark.run(p.slug, t, id);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    return this.playbook(p.slug)!;
  }

  playbookUpdates(since: string): { slug: string; changes: string; research_ids: string; created_at: string }[] {
    return this.db.prepare(`SELECT * FROM playbook_updates WHERE created_at >= ? ORDER BY id`).all(since) as { slug: string; changes: string; research_ids: string; created_at: string }[];
  }

  touchPusher(name: string, count: number) {
    this.db.prepare(`INSERT OR REPLACE INTO pushers (name, last_seen_at, last_count) VALUES (?, ?, ?)`).run(name, now(), count);
  }

  pushers(): { name: string; last_seen_at: string; last_count: number }[] {
    return this.db.prepare(`SELECT * FROM pushers ORDER BY name`).all() as { name: string; last_seen_at: string; last_count: number }[];
  }
}
