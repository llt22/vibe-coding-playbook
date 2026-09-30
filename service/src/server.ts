import { createServer } from 'node:http';
import { loadCatalog } from './catalog.ts';
import { config } from './config.ts';
import { Store } from './db.ts';
import { tick, unhealthy } from './scheduler.ts';
import { handler } from './web.ts';

const local = ['127.0.0.1', 'localhost', '::1'].includes(config.host);
// 家里内网直接访问即可；只有暴露到公网时才需要设 WEB_PASSWORD
if (!local && !config.webPassword) console.warn(`监听 ${config.host} 且未设 WEB_PASSWORD：同一网络内的设备都能访问网页`);

const store = new Store(config.dbPath);
const catalog = loadCatalog(config.catalogPath);
console.log(`清单 ${catalog.entries.length} 条，可比对地址 ${catalog.byKey.size} 个`);

if (process.argv.includes('--once')) {
  // 手动跑一轮：忽略周期执行全部采集器和初筛，然后打印异常并退出
  await tick(store, catalog, true);
  const bad = unhealthy(store);
  for (const b of bad) console.error(`异常 ${b.name}：${b.reason}`);
  console.log(`候选池共 ${store.count()} 条`);
  process.exit(bad.length ? 1 : 0);
}

createServer(handler(store, catalog)).listen(config.port, config.host, () => {
  console.log(`http://${config.host}:${config.port}`);
  if (!config.ingestToken) console.warn('未设置 INGEST_TOKEN，/ingest 推送接口不可用');
});

const loop = () => tick(store, catalog).catch((e) => console.error('[tick]', e));
void loop();
setInterval(loop, 60_000);
