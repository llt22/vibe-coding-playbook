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

const TABS = [['/', '手册'], ['/research', '调研证据'], ['/candidates', '全部线索'], ['/runs', '运行记录']] as const;

/** 样式沿用 shadcn/ui 默认 neutral 主题的变量和组件外观（卡片、徽章、表格），随系统切换深色。 */
function page(title: string, body: string, tab = '') {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · AI 工作方法手册</title>
<style>
:root{--radius:.625rem;--background:oklch(1 0 0);--foreground:oklch(.145 0 0);--card:oklch(1 0 0);--primary:oklch(.205 0 0);--primary-foreground:oklch(.985 0 0);
--muted:oklch(.97 0 0);--muted-foreground:oklch(.556 0 0);--accent:oklch(.97 0 0);--destructive:oklch(.577 .245 27.325);--border:oklch(.922 0 0);--ring:oklch(.708 0 0);
--green:oklch(.627 .194 149.214);--blue:oklch(.546 .245 262.881);--violet:oklch(.541 .281 293.009);--amber:oklch(.666 .179 58.318)}
@media (prefers-color-scheme:dark){:root{--background:oklch(.145 0 0);--foreground:oklch(.985 0 0);--card:oklch(.205 0 0);--primary:oklch(.922 0 0);--primary-foreground:oklch(.205 0 0);
--muted:oklch(.269 0 0);--muted-foreground:oklch(.708 0 0);--accent:oklch(.269 0 0);--destructive:oklch(.704 .191 22.216);--border:oklch(1 0 0/10%);--ring:oklch(.556 0 0);
--green:oklch(.723 .219 149.579);--blue:oklch(.707 .165 254.624);--violet:oklch(.702 .183 293.541);--amber:oklch(.769 .188 70.08)}}
*{box-sizing:border-box}
body{margin:0;background:var(--background);color:var(--foreground);font:14px/1.65 ui-sans-serif,-apple-system,"PingFang SC",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:960px;margin:0 auto;padding:24px 16px 64px;overflow-wrap:anywhere}
a{color:inherit;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--border)}a:hover{text-decoration-color:currentColor}
header{position:sticky;top:0;z-index:10;background:color-mix(in oklch,var(--background) 85%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
header .in{max-width:960px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
header b{font-weight:600}
.tabs{display:inline-flex;max-width:100%;gap:2px;padding:3px;background:var(--muted);border-radius:var(--radius);overflow-x:auto}
.tabs a{padding:4px 12px;border-radius:calc(var(--radius) - 2px);text-decoration:none;color:var(--muted-foreground);font-weight:500;white-space:nowrap}
.tabs a.on{background:var(--background);color:var(--foreground);box-shadow:0 1px 2px rgb(0 0 0/.08)}
h1,h2,h3{letter-spacing:-.01em;line-height:1.3}
h1{font-size:24px;font-weight:600;margin:8px 0 12px}h2{font-size:18px;font-weight:600;margin:28px 0 12px}
.lead{color:var(--muted-foreground);margin:0 0 20px}
.muted{color:var(--muted-foreground);font-size:13px}
.card{background:var(--card);border:1px solid var(--border);border-radius:calc(var(--radius) + 4px);padding:16px 20px;margin-bottom:12px;box-shadow:0 1px 2px rgb(0 0 0/.04)}
.card h3{font-size:16px;font-weight:600;margin:0 0 6px}.card h3 a{text-decoration:none}.card h3 a:hover{text-decoration:underline}
.card p{margin:6px 0}
.badge{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:calc(var(--radius) - 4px);padding:0 8px;font-size:12px;font-weight:500;line-height:20px;white-space:nowrap;vertical-align:2px;text-decoration:none}
.alert{border:1px solid color-mix(in oklch,var(--destructive) 40%,transparent);color:var(--destructive);background:color-mix(in oklch,var(--destructive) 6%,var(--background));border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;white-space:pre-wrap}
.alert.warn{border-color:color-mix(in oklch,var(--amber) 40%,transparent);color:inherit;background:color-mix(in oklch,var(--amber) 8%,var(--background))}
.err{color:var(--destructive);font-weight:500}.ok{color:var(--green);font-weight:500}
.r3{font-weight:600;color:var(--destructive)}.r2{color:var(--amber);font-weight:500}.r1{color:var(--muted-foreground)}
.v-adopt{color:var(--green)}.v-try{color:var(--blue)}.v-study{color:var(--violet)}.v-watch{color:var(--amber)}.v-drop{color:var(--muted-foreground)}
.table{border:1px solid var(--border);border-radius:var(--radius);overflow-x:auto;background:var(--card)}
table{border-collapse:collapse;width:100%;min-width:640px}
th{text-align:left;font-weight:500;color:var(--muted-foreground);padding:10px 12px;border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top}tr:last-child td{border-bottom:0}tbody tr:hover,tr:hover td{background:color-mix(in oklch,var(--muted) 50%,transparent)}
.report{background:var(--card);border:1px solid var(--border);border-radius:calc(var(--radius) + 4px);padding:4px 24px 16px}
.report h2{font-size:17px;padding-top:8px;border-top:1px solid var(--border)}.report h2:first-child{border-top:0}
.report pre{background:var(--muted);border-radius:var(--radius);padding:12px 14px;overflow:auto;font-size:13px}
code{font:12.5px ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--muted);padding:1px 5px;border-radius:4px}pre code{background:none;padding:0}
form{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:0 0 16px}
select,button{font:inherit;font-size:13px;height:32px;padding:0 10px;border:1px solid var(--border);border-radius:calc(var(--radius) - 2px);background:var(--background);color:inherit}
button{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary);font-weight:500;cursor:pointer}button:hover{opacity:.9}
@media (max-width:640px){main{padding:16px 12px 48px}.card{padding:14px 16px}.report{padding:4px 16px 12px}h1{font-size:20px}}
</style>
<header><div class="in"><b>AI 工作方法手册</b><nav class="tabs">${TABS.map(([href, label]) => `<a href="${href}"${tab === href ? ' class="on"' : ''}>${label}</a>`).join('')}</nav></div></header>
<main>${body}</main></html>`;
}

function alerts(store: Store) {
  const bad = unhealthy(store);
  return bad.length ? `<div class="alert"><b>采集异常</b><br>${bad.map((b) => `${esc(b.name)}：${esc(b.reason)}`).join('<br>')}</div>` : '';
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
  return `<div class="table"><table><tr><th>线索</th><th>初筛</th><th>来源 · 热度 · 发现</th><th>深入调研</th></tr>${rows.join('')}</table></div>`;
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
  const list = store.playbooks();
  const pending = store.research(`status='done' AND verdict IN ('adopt', 'try') AND playbook IS NULL`, []).length;
  const cards = list.map((p) => `<div class="card"><h3><a href="/playbooks/${esc(p.slug)}">${esc(p.title)}</a></h3>
<p>${esc(p.problem)}</p><p><span class="badge">先试这一步</span> ${esc(p.first_step)}</p><span class="muted">最近修订 ${time(p.updated_at)} · 依据 ${store.research('playbook = ?', [p.slug]).length} 篇调研 · ${esc(p.file)}</span></div>`).join('');
  return page('手册', `<h1>可执行手册</h1>` + alerts(store)
    + `<p class="lead">按工作场景组织的可执行手册：适用条件、编号步骤、判断标准、常见坑。模型把“建议采用 / 值得一试”的调研每天合并进来并持续修订${pending ? `，待合并 ${pending} 篇` : ''}。均未经实测，人工验证过的做法在仓库 experiences/。</p>`
    + (cards || '<p class="muted">还没有手册。有“建议采用 / 值得一试”的调研后，每天自动合并生成。</p>'), '/');
}

function playbookPage(store: Store, slug: string) {
  const p = store.playbook(slug);
  if (!p) return null;
  const sources = store.research('playbook = ? ORDER BY merged_at', [slug]);
  return page(p.title, `<h1>${esc(p.title)} <span class="badge muted">未经实测</span></h1>
<p class="lead">${esc(p.problem)}</p>
<div class="alert warn">由模型根据自动调研合并生成，步骤尚未有人实际跑过。</div>
<div class="card"><span class="badge">先试这一步</span> ${esc(p.first_step)}</div>
<p class="muted">最近修订 ${time(p.updated_at)} · ${esc(p.file)}</p>
<div class="report">${md(p.body)}<h3>依据的调研</h3><ul>${sources.map((r) => `<li><a href="/research/${r.id}">${esc(r.item.title)}</a>：${esc(r.conclusion)}</li>`).join('')}</ul></div>`, '/');
}

function evidence(store: Store) {
  const since = new Date(Date.now() - 14 * 86400_000).toISOString();
  const done = store.research(`status = 'done' AND updated_at >= ? ORDER BY updated_at DESC`, [since]);
  const failed = store.research(`status = 'error' ORDER BY updated_at DESC`, []);
  const queued = store.research(`status = 'pending'`, []).length;
  const week = store.count(`first_seen_at >= datetime('now', '-7 day')`);
  const deep = store.count(`deep = 1 AND first_seen_at >= datetime('now', '-7 day')`);
  const groups = Object.entries(VERDICTS).map(([k, label]) => {
    const list = done.filter((r) => r.verdict === k);
    if (!list.length) return '';
    return `<h2><span class="badge v-${k}">${label}</span> ${list.length} 条</h2>` + list.map((r) => `<div class="card"><h3><a href="/research/${r.id}">${esc(r.item.title)}</a></h3>
${esc(r.conclusion)}<br><span class="muted">${esc(r.item.source)} · ${time(r.updated_at)} · <a href="${esc(r.item.url)}" target="_blank" rel="noreferrer">原文</a>${r.file ? ` · ${esc(r.file)}` : ''}</span></div>`).join('');
  }).join('');
  const failures = failed.length ? `<h2>调研失败（${failed.length}）</h2>` + failed.map((r) => `<div class="card"><a href="${esc(r.item.url)}" target="_blank" rel="noreferrer">${esc(r.item.title)}</a><br>${researchStatus(r)}</div>`).join('') : '';
  return page('调研证据', `<h1>调研证据</h1>` + alerts(store)
    + `<p class="lead">每条线索的调研报告，是手册的素材。近 7 天采集 ${week} 条，模型挑出 ${deep} 条深入调研；近 14 天完成 ${done.length} 条，排队 ${queued} 条。每小时最多调研 ${config.researchPerRun} 条、每天最多 ${config.researchPerDay} 条，报告同时提交到仓库 ${esc(config.researchDir)}/。</p>`
    + (groups || '<p class="muted">还没有完成的调研。模型初筛时会自动挑选值得深入的线索。</p>') + failures, '/research');
}

function report(store: Store, id: number) {
  const r = store.research('id = ?', [id], 1)[0];
  if (!r || r.status !== 'done') return null;
  return page(r.item.title, `<h1>${esc(r.item.title)}</h1>
<p><span class="badge v-${esc(r.verdict)}">${esc(VERDICTS[r.verdict ?? ''])}</span> ${esc(r.conclusion)}</p>
${r.playbook ? `<p>已合并进手册 <a href="/playbooks/${esc(r.playbook)}">${esc(store.playbook(r.playbook)?.title ?? r.playbook)}</a></p>` : ''}
<p class="muted"><a href="${esc(r.item.url)}" target="_blank" rel="noreferrer">原文</a> · ${esc(r.item.source)} · 初筛：${esc(r.item.reason)} · ${time(r.updated_at)}${r.file ? ` · ${esc(r.file)}` : ''}</p>
<div class="report">${md(r.body ?? '')}</div>`, '/research');
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
  return page('全部线索', `<h1>全部线索（${total}${total > items.length ? `，显示最近 ${items.length}` : ''}）</h1>${form}` + itemRows(items, store, catalog), '/candidates');
}

function runs(store: Store) {
  const row = (r: Run) => `<tr><td>${esc(r.collector)}</td><td>${time(r.started_at)}</td>
<td class="${r.status === 'error' ? 'err' : r.status === 'ok' ? 'ok' : 'muted'}">${r.status}</td><td>${r.fetched}</td><td>${r.new_items}</td>
<td class="err" style="white-space:pre-wrap">${esc(r.error)}</td></tr>`;
  const pushers = store.pushers();
  return page('运行记录', `<h1>运行记录</h1>` + alerts(store)
    + `<h2>推送方心跳</h2>${pushers.length ? `<div class="table"><table><tr><th>名称</th><th>最后推送</th><th>条数</th></tr>${pushers.map((p) => `<tr><td>${esc(p.name)}</td><td>${time(p.last_seen_at)}</td><td>${p.last_count}</td></tr>`).join('')}</table></div>` : '<p class="muted">还没有推送方。</p>'}`
    + `<h2>最近运行</h2><div class="table"><table><tr><th>采集器</th><th>开始</th><th>状态</th><th>抓取</th><th>新增</th><th>错误</th></tr>${store.recentRuns().map(row).join('')}</table></div>`, '/runs');
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
      if (req.method === 'GET' && url.pathname === '/research') return send(res, 200, evidence(store));
      if (req.method === 'GET' && url.pathname === '/candidates') return send(res, 200, candidates(store, catalog, url.searchParams));
      if (req.method === 'GET' && url.pathname === '/runs') return send(res, 200, runs(store));
      const m = url.pathname.match(/^\/research\/(\d+)$/);
      const pb = url.pathname.match(/^\/playbooks\/([a-z0-9-]+)$/);
      const html = req.method !== 'GET' ? null : m ? report(store, Number(m[1])) : pb ? playbookPage(store, pb[1]) : null;
      if (html) return send(res, 200, html);
      send(res, 404, page('未找到', '<h1>未找到</h1>'));
    } catch (e) {
      const status = (e as { status?: number }).status ?? (e instanceof SyntaxError ? 400 : 500);
      console.error(req.method, url.pathname, e);
      send(res, status, esc((e as Error).message), 'text/plain; charset=utf-8');
    }
  };
}
