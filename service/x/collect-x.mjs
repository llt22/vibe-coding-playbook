// X 采集与算法调教联动：用 Ego 搜索 X 推送到 /ingest，并对模型初筛/研报高分推文自动点赞。
// 运行：service/x/run.sh（Ego 的 Node 进程不在当前目录，由 run.sh 注入 service 目录）
const { readFile } = await import('node:fs/promises');
const DIR = '__SERVICE_DIR__';

const env = Object.fromEntries((await readFile(`${DIR}/.env`, 'utf8')).split('\n')
  .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const token = env.INGEST_TOKEN;
if (!token) throw new Error('service/.env 未设置 INGEST_TOKEN');
const endpoint = `http://127.0.0.1:${env.PORT || 4317}/ingest`;

const since = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);
const queries = JSON.parse(await readFile(`${DIR}/x/queries.json`, 'utf8')).queries.map((q) => q.replaceAll('{since}', since));

const extract = () => [...document.querySelectorAll('article[data-testid="tweet"]')].map((a) => {
  const link = [...a.querySelectorAll('a[href*="/status/"]')].find((x) => x.querySelector('time'));
  const count = (id) => Number((a.querySelector(`[data-testid="${id}"]`)?.getAttribute('aria-label') ?? '').replace(/,/g, '').match(/\d+/)?.[0] ?? 0);
  const textEl = a.querySelector('[data-testid="tweetText"]');
  const card = a.querySelector('[data-testid="card.wrapper"]');
  return {
    url: link?.href.replace(/\/(analytics|photo\/\d+)$/, ''),
    published_at: link?.querySelector('time')?.getAttribute('datetime') ?? undefined,
    handle: link?.pathname.split('/')[1],
    text: textEl?.innerText ?? '',
    card: card?.innerText.replace(/\s+/g, ' ').slice(0, 200) ?? '',
    likes: count('like'), reposts: count('retweet'), replies: count('reply'),
  };
}).filter((t) => t.url);

const task = await taskSpace('X radar collect');
const page = task.page('p1');
const byUrl = new Map();
const errors = [];
try {
  for (const q of queries) {
    try {
      await page.goto(`https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query`);
      await page.waitForSelector('article[data-testid="tweet"], [data-testid="emptyState"], [data-testid="primaryColumn"] [data-testid="error-detail"]', { timeout: 25_000 });
      const url = await page.url();
      if (/\/login|\/i\/flow/.test(url)) throw new Error('X 未登录（被重定向到登录页），请在 Ego 里重新登录');
      for (let i = 0; i < 3; i++) {
        for (const t of await page.evaluate(extract)) byUrl.set(t.url, t);
        await page.mouse.move(600, 500);
        await page.mouse.wheel(0, 2500, { label: 'scroll search results' });
        await page.waitForTimeout(1500);
      }
    } catch (e) {
      errors.push(`${q.slice(0, 60)}：${e.message}`);
      if (/未登录/.test(e.message)) break;
    }
    await page.waitForTimeout(3000 + Math.random() * 3000);
  }

  // 联动点赞：根据本地雷达判定的高价值推文（relevance=3 或 adopt/try），在已开启的 Ego 会话里顺带点赞（每轮最多 3 条）
  try {
    const apiBase = endpoint.replace(/\/ingest$/, '');
    const pendingRes = await fetch(`${apiBase}/x/pending-likes?limit=3`, {
      headers: { authorization: `Bearer ${token}` }
    });
    if (pendingRes.ok) {
      const pending = await pendingRes.json();
      for (const item of pending) {
        try {
          await page.goto(item.url);
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(2000);
          const liked = await page.evaluate(() => {
            const main = document.querySelector('article[data-testid="tweet"]');
            if (!main) return false;
            if (main.querySelector('button[data-testid="unlike"]')) return true;
            const btn = main.querySelector('button[data-testid="like"]');
            if (btn) { btn.click(); return true; }
            return false;
          });
          if (liked) {
            await fetch(`${apiBase}/x/mark-liked`, {
              method: 'POST',
              headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
              body: JSON.stringify({ id: item.id })
            });
            console.log(`[自动点赞成功] ${item.title.slice(0, 50)}`);
          }
          await page.waitForTimeout(2000);
        } catch (e) {
          console.error(`[自动点赞失败] ${item.url}:`, e.message);
        }
      }
    }
  } catch (e) {
    console.error('获取待点赞任务失败:', e.message);
  }
} finally {
  await task.finish({ keep: [] });
}

const items = [...byUrl.values()].map((t) => {
  const first = t.text.split('\n').find((l) => l.trim()) ?? t.card ?? '(无正文)';
  return {
    url: t.url,
    title: `@${t.handle}: ${first.slice(0, 100)}`,
    summary: [t.text, t.card && `[链接卡片] ${t.card}`].filter(Boolean).join('\n').slice(0, 1500),
    author: t.handle,
    published_at: t.published_at,
    metrics: { likes: t.likes, reposts: t.reposts, replies: t.replies },
  };
});
const body = { source: 'x', items, ...(errors.length && { error: errors.join('；') }) };
const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
const out = await res.text();
console.log(new Date().toISOString(), `queries=${queries.length} errors=${errors.length} items=${items.length}`, res.status, out);
if (errors.length) console.error(errors.join('\n'));
if (!res.ok || errors.length) process.exitCode = 1;
