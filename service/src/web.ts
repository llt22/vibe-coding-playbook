import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Catalog } from './catalog.ts';
import { config } from './config.ts';
import type { Item, Run, Store } from './db.ts';
import { itemKey } from './http.ts';
import { QUESTIONS } from './questions.ts';
import { ingest, tick, unhealthy } from './scheduler.ts';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const DECISIONS: Record<string, string> = { new: '未决定', adopt: '采纳', watch: '观察', drop: '放弃' };
const CATALOG_STATUS: Record<string, string> = { adopt: '已采用', try: '可试', study: '研读', watch: '观察', avoid: '暂不采用', drop: '不相关' };

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '—');

function page(title: string, body: string) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · AI 工作方法调研</title>
<style>
body{font:14px/1.6 -apple-system,system-ui,sans-serif;margin:0 auto;max-width:1200px;padding:20px;color:#1a1a1a;background:#fafafa}
a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}
nav{margin-bottom:16px;border-bottom:2px solid #e5e7eb;padding-bottom:12px;display:flex;align-items:center;gap:20px}
nav a{font-weight:500}nav a:hover{color:#1e40af}
table{border-collapse:collapse;width:100%;background:#fff;border:1px solid #e5e7eb;box-shadow:0 1px 2px rgba(0,0,0,0.05)}
th{background:#f9fafb;font-weight:600;border-bottom:2px solid #e5e7eb;padding:10px 8px;text-align:left}
td{border-bottom:1px solid #f3f4f6;padding:10px 8px;vertical-align:top}
tr:last-child td{border-bottom:none}tr:hover{background:#f9fafb}
.alert{background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin-bottom:16px;white-space:pre-wrap;border-radius:4px}
.muted{color:#6b7280;font-size:13px}
.err{color:#dc2626;font-weight:500}.ok{color:#16a34a;font-weight:500}
.r3{font-weight:bold;color:#ea580c}.r2{color:#d97706}.r1{color:#65a30d}
form.inline{display:inline}
button{font-size:13px;padding:4px 12px;margin:0 2px;border:1px solid #d1d5db;background:#fff;border-radius:4px;cursor:pointer;color:#374151;font-weight:500}
button:hover{background:#f3f4f6;border-color:#9ca3af}button:active{background:#e5e7eb}
h2{font-size:20px;margin:24px 0 12px;color:#111827}
</style>
<nav><a href="/">今日需关注</a><a href="/candidates">候选池</a><a href="/runs">运行记录</a>
<form class="inline" method="post" action="/run"><button>立即采集</button></form></nav>
${body}</html>`;
}

function alerts(store: Store) {
  const bad = unhealthy(store);
  return bad.length ? `<div class="alert"><b>采集异常</b>\n${bad.map((b) => `${esc(b.name)}：${esc(b.reason)}`).join('\n')}</div>` : '';
}

function heat(i: Item, store: Store) {
  const m = JSON.parse(i.metrics) as Record<string, number>;
  const parts = Object.entries(m).map(([k, v]) => `${k} ${v}`);
  if (i.key.startsWith('github:')) {
    const g = store.starGrowth(i.key.slice(7));
    if (g !== null) parts.push(`7 天 +${g}`);
  }
  return parts.join(' · ');
}

function itemRows(items: Item[], store: Store, catalog: Catalog) {
  if (!items.length) return '<p class="muted">没有符合条件的线索。</p>';
  const rows = items.map((i) => {
    const cat = i.catalog_id ? catalog.byId.get(i.catalog_id) : undefined;
    const triage = i.triage_status === 'known'
      ? `<span class="muted">已在清单：${esc(cat?.name ?? i.catalog_id)}（${esc(CATALOG_STATUS[cat?.status ?? ''] ?? cat?.status)}）</span>`
      : i.triage_status === 'error' ? `<span class="err">初筛失败：${esc(i.triage_error)}</span>`
      : i.triage_status === 'pending' ? '<span class="muted">待初筛</span>'
      : `<span class="r${i.relevance}">${i.relevance}</span> ${esc(i.reason)}<br><span class="muted">${(JSON.parse(i.questions ?? '[]') as number[]).map((q) => esc(QUESTIONS[q]?.split('：')[0])).join('、')}</span>`;
    const buttons = Object.entries(DECISIONS).filter(([k]) => k !== 'new' && k !== i.decision)
      .map(([k, v]) => `<button name="decision" value="${k}">${v}</button>`).join('');
    return `<tr><td><a href="${esc(i.url)}" target="_blank" rel="noreferrer">${esc(i.title)}</a><br><span class="muted">${esc(i.summary.slice(0, 200))}</span></td>
<td>${triage}</td><td class="muted">${esc(i.source)}<br>${esc(heat(i, store))}<br>${time(i.first_seen_at)}</td>
<td>${esc(DECISIONS[i.decision])}<form method="post" action="/items/${i.id}/decision">${buttons}</form></td></tr>`;
  });
  return `<table><tr><th>线索</th><th>初筛</th><th>来源 · 热度 · 发现</th><th>决定</th></tr>${rows.join('')}</table>`;
}

function today(store: Store, catalog: Catalog) {
  const items = store.items(`decision='new' AND triage_status='done' AND relevance >= 2 AND first_seen_at >= datetime('now', '-7 day')
    ORDER BY relevance DESC, first_seen_at DESC`, []);
  const pending = store.count(`triage_status IN ('pending', 'error')`);
  return page('今日需关注', alerts(store)
    + `<h2>今日需关注（${items.length}）</h2><p class="muted">近 7 天、未决定、相关度 ≥ 2。待初筛或初筛失败 ${pending} 条。</p>`
    + itemRows(items, store, catalog));
}

function candidates(store: Store, catalog: Catalog, q: URLSearchParams) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  for (const [k, col] of [['source', 'source'], ['decision', 'decision'], ['triage', 'triage_status']] as const) {
    const v = q.get(k);
    if (v) { where.push(`${col} = ?`); params.push(v); }
  }
  const question = q.get('question');
  if (question) { where.push(`EXISTS (SELECT 1 FROM json_each(questions) WHERE value = ?)`); params.push(Number(question)); }
  const minRel = q.get('min');
  if (minRel) { where.push('relevance >= ?'); params.push(Number(minRel)); }
  const w = where.join(' AND ') || '1=1';
  const items = store.items(`${w} ORDER BY first_seen_at DESC`, params);
  const total = store.count(w, params);
  const sources = (store.db.prepare(`SELECT DISTINCT source FROM items ORDER BY source`).all() as { source: string }[]).map((r) => r.source);
  const select = (name: string, opts: [string, string][]) =>
    `<select name="${name}"><option value="">全部</option>${opts.map(([v, l]) => `<option value="${esc(v)}"${q.get(name) === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const form = `<form>来源 ${select('source', sources.map((s) => [s, s]))}
 决定 ${select('decision', Object.entries(DECISIONS))}
 初筛 ${select('triage', [['done', '已初筛'], ['pending', '待初筛'], ['error', '失败'], ['known', '已在清单']])}
 问题 ${select('question', Object.entries(QUESTIONS).map(([k, v]) => [k, v.split('：')[0]]))}
 相关度 ≥ ${select('min', [['1', '1'], ['2', '2'], ['3', '3']])} <button>筛选</button></form>`;
  return page('候选池', `<h2>候选池（${total}${total > items.length ? `，显示最近 ${items.length}` : ''}）</h2>${form}` + itemRows(items, store, catalog));
}

function runs(store: Store) {
  const row = (r: Run) => `<tr><td>${esc(r.collector)}</td><td>${time(r.started_at)}</td>
<td class="${r.status === 'error' ? 'err' : r.status === 'ok' ? 'ok' : 'muted'}">${r.status}</td><td>${r.fetched}</td><td>${r.new_items}</td>
<td class="err" style="white-space:pre-wrap">${esc(r.error)}</td></tr>`;
  const pushers = store.pushers();
  return page('运行记录', alerts(store)
    + `<h2>推送方心跳</h2>${pushers.length ? `<table><tr><th>名称</th><th>最后推送</th><th>条数</th></tr>${pushers.map((p) => `<tr><td>${esc(p.name)}</td><td>${time(p.last_seen_at)}</td><td>${p.last_count}</td></tr>`).join('')}</table>` : '<p class="muted">还没有推送方。</p>'}`
    + `<h2>最近运行</h2><table><tr><th>采集器</th><th>开始</th><th>状态</th><th>抓取</th><th>新增</th><th>错误</th></tr>${store.recentRuns().map(row).join('')}</table>`);
}

const IngestBody = z.object({
  source: z.string().regex(/^[\w.-]{1,40}$/),
  items: z.array(z.object({
    url: z.string().url(),
    title: z.string().min(1),
    summary: z.string().optional(),
    author: z.string().optional(),
    published_at: z.string().optional(),
    metrics: z.record(z.string(), z.number()).optional(),
  })).max(500),
  /** 推送方自身的部分失败（如某个查询出错），记为本次运行失败，但已收的条目照常入库 */
  error: z.string().max(2000).optional(),
});

async function readBody(req: IncomingMessage, max = 2_000_000): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += c.length;
    if (size > max) throw Object.assign(new Error('请求体过大'), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function send(res: ServerResponse, status: number, body: string, type = 'text/html; charset=utf-8') {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}
const json = (res: ServerResponse, status: number, body: unknown) => send(res, status, JSON.stringify(body), 'application/json');
const redirect = (res: ServerResponse, to: string) => { res.writeHead(303, { location: to }); res.end(); };

export function handler(store: Store, catalog: Catalog) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (req.method === 'POST' && url.pathname === '/ingest') {
        if (!config.ingestToken) return json(res, 503, { error: '服务未设置 INGEST_TOKEN，推送接口未启用' });
        if (!safeEqual(req.headers.authorization ?? '', `Bearer ${config.ingestToken}`)) return json(res, 401, { error: 'token 无效' });
        const parsed = IngestBody.safeParse(JSON.parse(await readBody(req)));
        if (!parsed.success) return json(res, 400, { error: parsed.error.issues });
        const { source, items, error } = parsed.data;
        const run = store.startRun(`ingest:${source}`);
        const added = ingest(store, catalog, items.map((i) => ({ ...i, key: itemKey(i.url), source: `ingest:${source}` })));
        store.finishRun(run, error ? { error: `${error}（已收 ${items.length} 条，新增 ${added}）` } : { fetched: items.length, newItems: added });
        store.touchPusher(source, items.length);
        return json(res, 200, { received: items.length, added });
      }

      if (config.webPassword) {
        const expected = `Basic ${Buffer.from(`radar:${config.webPassword}`).toString('base64')}`;
        if (!safeEqual(req.headers.authorization ?? '', expected)) {
          res.writeHead(401, { 'www-authenticate': 'Basic realm="radar"' });
          return res.end();
        }
      }

      if (req.method === 'GET' && url.pathname === '/') return send(res, 200, today(store, catalog));
      if (req.method === 'GET' && url.pathname === '/candidates') return send(res, 200, candidates(store, catalog, url.searchParams));
      if (req.method === 'GET' && url.pathname === '/runs') return send(res, 200, runs(store));
      if (req.method === 'POST' && url.pathname === '/run') {
        void tick(store, catalog, true);
        return redirect(res, '/runs');
      }
      const m = url.pathname.match(/^\/items\/(\d+)\/decision$/);
      if (req.method === 'POST' && m) {
        const decision = new URLSearchParams(await readBody(req)).get('decision') ?? '';
        if (!(decision in DECISIONS)) return send(res, 400, '非法决定');
        store.decide(Number(m[1]), decision as Item['decision']);
        const back = new URL(req.headers.referer ?? '/', 'http://localhost');
        return redirect(res, back.pathname + back.search);
      }
      send(res, 404, page('未找到', '<p>未找到。</p>'));
    } catch (e) {
      const status = (e as { status?: number }).status ?? (e instanceof SyntaxError ? 400 : 500);
      console.error(req.method, url.pathname, e);
      send(res, status, esc((e as Error).message), 'text/plain; charset=utf-8');
    }
  };
}
