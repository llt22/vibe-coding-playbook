// 把会话移到同项目的另一个工作区：先归档，再带 workspaceId 重新导入。
// daemon 发现同一 provider 会话已有归档记录时，会原地恢复这条记录并改 workspaceId，
// 所以会话 ID、标题、历史都不变。paseo CLI 的 import 没开放 --workspace，这里直接调客户端。
// 用法: move.sh <agentId 或前缀> <workspaceId>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RES = '/Applications/Paseo.app/Contents/Resources/app.asar/node_modules/@getpaseo/cli/dist';
const { connectToDaemon } = await import(`${RES}/utils/client.js`);
const { selectDaemonTarget } = await import(`${RES}/utils/daemon-target.js`);

const [idArg, workspaceId] = process.argv.slice(2);
if (!idArg || !workspaceId) {
  console.error('用法: move.sh <agentId> <workspaceId>');
  process.exit(2);
}

const home = process.env.PASEO_HOME || path.join(os.homedir(), '.paseo');
const agentsDir = path.join(home, 'agents');
const matches = [];
for (const dir of fs.readdirSync(agentsDir)) {
  const full = path.join(agentsDir, dir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) {
    if (f.startsWith(idArg) && f.endsWith('.json')) matches.push(path.join(full, f));
  }
}
if (matches.length !== 1) {
  console.error(`找到 ${matches.length} 个匹配 ${idArg} 的会话，需要唯一匹配`);
  process.exit(1);
}
const rec = JSON.parse(fs.readFileSync(matches[0], 'utf8'));
const sessionId = rec.persistence?.sessionId;
if (!sessionId) {
  console.error(`${rec.id} 没有 persistence.sessionId，无法导入`);
  process.exit(1);
}
if (rec.workspaceId === workspaceId) {
  console.log(`${rec.id.slice(0, 7)} 已经在 ${workspaceId}`);
  process.exit(0);
}
if (rec.lastStatus === 'running') {
  console.error(`${rec.id.slice(0, 7)} 正在运行，归档会打断它，先等它停下`);
  process.exit(1);
}

const client = await connectToDaemon({ target: selectDaemonTarget({}, process.env) });
try {
  if (!rec.archivedAt) await client.archiveAgent(rec.id);
  const agent = await client.importAgent({ provider: rec.provider, sessionId, cwd: rec.cwd, workspaceId });
  const after = JSON.parse(fs.readFileSync(matches[0], 'utf8'));
  if (agent.id !== rec.id || after.workspaceId !== workspaceId) {
    throw new Error(`导入结果不符：agent=${agent.id} workspace=${after.workspaceId}`);
  }
  console.log(`${rec.id.slice(0, 7)} ${rec.workspaceId} → ${workspaceId}  ${rec.title}`);
} finally {
  await client.close().catch(() => {});
}
