import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Catalog } from './catalog.ts';
import { config } from './config.ts';
import type { Item, Research, Run, Store } from './db.ts';
import { itemKey } from './http.ts';
import { QUESTIONS } from './questions.ts';
import { VERDICTS } from './research.ts';
import { ingest, unhealthy } from './scheduler.ts';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
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
.card{background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;margin-bottom:10px}
.card h3{font-size:15px;margin:0 0 4px}.report{background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px 24px}
.report pre{background:#f3f4f6;padding:8px;overflow:auto}.v-adopt{color:#16a34a}.v-try{color:#2563eb}.v-study{color:#7c3aed}.v-watch{color:#d97706}.v-drop{color:#6b7280}
button{font-size:13px;padding:4px 12px;margin:0 2px;border:1px solid #d1d5db;background:#fff;border-radius:4px;cursor:pointer;color:#374151;font-weight:500}
button:hover{background:#f3f4f6;border-color:#9ca3af}button:active{background:#e5e7eb}
h2{font-size:20px;margin:24px 0 12px;color:#111827}
</style>
<nav><a href="/">调研结论</a><a href="/candidates">全部线索</a><a href="/runs">运行记录</a>
<span class="muted">全自动：定时采集 → 模型初筛 → 模型挑选并深入调研 → 报告写入仓库</span></nav>
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
    const r = store.research('item_id = ?', [i.id], 1)[0];
    return `<tr><td><a href="${esc(i.url)}" target="_blank" rel="noreferrer">${esc(i.title)}</a><br><span class="muted">${esc(i.summary.slice(0, 200))}</span></td>
<td>${triage}</td><td class="muted">${esc(i.source)}<br>${esc(heat(i, store))}<br>${time(i.first_seen_at)}</td>
<td>${r ? researchStatus(r) : '<span class="muted">—</span>'}</td></tr>`;
  });
  return `<table><tr><th>线索</th><th>初筛</th><th>来源 · 热度 · 发现</th><th>深入调研</th></tr>${rows.join('')}</table>`;
}

function researchStatus(r: Research) {
  if (r.status === 'done') return `<a class="v-${esc(r.verdict)}" href="/research/${r.id}">${esc(VERDICTS[r.verdict ?? ''] ?? r.verdict)}</a>`;
  if (r.status === 'pending') return '<span class="muted">排队中</span>';
  return `<span class="err">失败 ${r.attempts}/${config.researchMaxAttempts}：${esc(r.error?.slice(0, 120))}</span>`;
}

/** 极简 Markdown：标题、列表、粗体、行内代码、代码块、链接。模型输出先转义再替换，不会注入 HTML。 */
function md(src: string) {
  const inline = (t: string) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  const out: string[] = [];
  let list = false;
  for (const block of src.split(/^```[^\n]*\n([\s\S]*?)^```$/m).map((b, i) => [b, i % 2] as const)) {
    if (block[1]) { out.push(`<pre>${esc(block[0])}</pre>`); continue; }
    for (const line of block[0].split('\n')) {
      const li = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);
      if (!li && list) { out.push('</ul>'); list = false; }
      const h = line.match(/^(#{1,4})\s+(.*)/);
      if (h) out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`);
      else if (li) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(li[1])}</li>`); }
      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
    if (list) { out.push('</ul>'); list = false; }
  }
  return out.join('\n');
}

function home(store: Store) {
  const since = new Date(Date.now() - 14 * 86400_000).toISOString();
  const done = store.research(`status = 'done' AND updated_at >= ? ORDER BY updated_at DESC`, [since]);
  const failed = store.research(`status = 'error' ORDER BY updated_at DESC`, []);
  const queued = store.research(`status = 'pending'`, []).length;
  const week = store.count(`first_seen_at >= datetime('now', '-7 day')`);
  const deep = store.count(`deep = 1 AND first_seen_at >= datetime('now', '-7 day')`);
  const groups = Object.entries(VERDICTS).map(([k, label]) => {
    const list = done.filter((r) => r.verdict === k);
    if (!list.length) return '';
    return `<h2 class="v-${k}">${label}（${list.length}）</h2>` + list.map((r) => `<div class="card"><h3><a href="/research/${r.id}">${esc(r.item.title)}</a></h3>
${esc(r.conclusion)}<br><span class="muted">${esc(r.item.source)} · ${time(r.updated_at)} · <a href="${esc(r.item.url)}" target="_blank" rel="noreferrer">原文</a>${r.file ? ` · ${esc(r.file)}` : ''}</span></div>`).join('');
  }).join('');
  const failures = failed.length ? `<h2>调研失败（${failed.length}）</h2>` + failed.map((r) => `<div class="card"><a href="${esc(r.item.url)}" target="_blank" rel="noreferrer">${esc(r.item.title)}</a><br>${researchStatus(r)}</div>`).join('') : '';
  return page('调研结论', alerts(store)
    + `<p class="muted">近 7 天采集 ${week} 条，模型挑出 ${deep} 条深入调研；近 14 天完成 ${done.length} 条，排队 ${queued} 条。每小时最多调研 ${config.researchPerRun} 条、每天最多 ${config.researchPerDay} 条，报告同时提交到仓库 ${esc(config.researchDir)}/。</p>`
    + (groups || '<p class="muted">还没有完成的调研。模型初筛时会自动挑选值得深入的线索。</p>') + failures);
}

function report(store: Store, id: number) {
  const r = store.research('id = ?', [id], 1)[0];
  if (!r || r.status !== 'done') return null;
  return page(r.item.title, `<h2>${esc(r.item.title)}</h2>
<p><b class="v-${esc(r.verdict)}">${esc(VERDICTS[r.verdict ?? ''])}</b>：${esc(r.conclusion)}</p>
<p class="muted"><a href="${esc(r.item.url)}" target="_blank" rel="noreferrer">原文</a> · ${esc(r.item.source)} · 初筛：${esc(r.item.reason)} · ${time(r.updated_at)}${r.file ? ` · ${esc(r.file)}` : ''}</p>
<div class="report">${md(r.body ?? '')}</div>`);
}

function candidates(store: Store, catalog: Catalog, q: URLSearchParams) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  for (const [k, col] of [['source', 'source'], ['triage', 'triage_status']] as const) {
    const v = q.get(k);
    if (v) { where.push(`${col} = ?`); params.push(v); }
  }
  const question = q.get('question');
  if (question) { where.push(`EXISTS (SELECT 1 FROM json_each(questions) WHERE value = ?)`); params.push(Number(question)); }
  const minRel = q.get('min');
  if (minRel) { where.push('relevance >= ?'); params.push(Number(minRel)); }
  if (q.get('deep')) where.push('deep = 1');
  const w = where.join(' AND ') || '1=1';
  const items = store.items(`${w} ORDER BY first_seen_at DESC`, params);
  const total = store.count(w, params);
  const sources = (store.db.prepare(`SELECT DISTINCT source FROM items ORDER BY source`).all() as { source: string }[]).map((r) => r.source);
  const select = (name: string, opts: [string, string][]) =>
    `<select name="${name}"><option value="">全部</option>${opts.map(([v, l]) => `<option value="${esc(v)}"${q.get(name) === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const form = `<form>来源 ${select('source', sources.map((s) => [s, s]))}
 初筛 ${select('triage', [['done', '已初筛'], ['pending', '待初筛'], ['error', '失败'], ['known', '已在清单']])}
 问题 ${select('question', Object.entries(QUESTIONS).map(([k, v]) => [k, v.split('：')[0]]))}
 相关度 ≥ ${select('min', [['1', '1'], ['2', '2'], ['3', '3']])}
 <label><input type="checkbox" name="deep" value="1"${q.get('deep') ? ' checked' : ''}> 只看模型选中深入的</label> <button>筛选</button></form>`;
  return page('全部线索', `<h2>全部线索（${total}${total > items.length ? `，显示最近 ${items.length}` : ''}）</h2>${form}` + itemRows(items, store, catalog));
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

      if (req.method === 'GET' && url.pathname === '/') return send(res, 200, home(store));
      if (req.method === 'GET' && url.pathname === '/candidates') return send(res, 200, candidates(store, catalog, url.searchParams));
      if (req.method === 'GET' && url.pathname === '/runs') return send(res, 200, runs(store));
      const m = url.pathname.match(/^\/research\/(\d+)$/);
      const html = req.method === 'GET' && m ? report(store, Number(m[1])) : null;
      if (html) return send(res, 200, html);
      send(res, 404, page('未找到', '<p>未找到。</p>'));
    } catch (e) {
      const status = (e as { status?: number }).status ?? (e instanceof SyntaxError ? 400 : 500);
      console.error(req.method, url.pathname, e);
      send(res, status, esc((e as Error).message), 'text/plain; charset=utf-8');
    }
  };
}
