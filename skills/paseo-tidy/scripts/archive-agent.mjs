// 直接调 daemon 归档指定 agent（绕过 CLI 对 background/子会话的过滤）
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RES = '/Applications/Paseo.app/Contents/Resources/app.asar/node_modules/@getpaseo/cli/dist';
const { connectToDaemon } = await import(`${RES}/utils/client.js`);
const { selectDaemonTarget } = await import(`${RES}/utils/daemon-target.js`);

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('用法: paseo-archive-agent.mjs <agentId...>');
  process.exit(2);
}
const home = process.env.PASEO_HOME || path.join(os.homedir(), '.paseo');
const agentsDir = path.join(home, 'agents');

const resolve = (prefix) => {
  const matches = [];
  for (const dir of fs.readdirSync(agentsDir)) {
    const full = path.join(agentsDir, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.startsWith(prefix) && f.endsWith('.json')) matches.push(path.join(full, f));
    }
  }
  if (matches.length !== 1) throw new Error(`找到 ${matches.length} 个匹配 ${prefix}`);
  return { file: matches[0], rec: JSON.parse(fs.readFileSync(matches[0], 'utf8')) };
};

const client = await connectToDaemon({ target: selectDaemonTarget({}, process.env) });
try {
  for (const prefix of ids) {
    const { file, rec } = resolve(prefix);
    if (rec.lastStatus === 'running') throw new Error(`${rec.id.slice(0, 7)} 正在运行，跳过`);
    await client.archiveAgent(rec.id);
    const after = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`${rec.id.slice(0, 7)} archivedAt=${after.archivedAt}  ${rec.title}`);
  }
} finally {
  await client.close().catch(() => {});
}
