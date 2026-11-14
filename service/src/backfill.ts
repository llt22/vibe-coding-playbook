/**
 * 一次性补算“有趣度”：给历史线索（默认只补仓库）打 interesting 分。
 * 只更新 interesting，不动 relevance / reason / deep，也不会往调研队列里加东西。
 * 用法：pnpm backfill [天数，默认 60]
 */
import { z } from 'zod';
import { config } from './config.ts';
import { Store } from './db.ts';
import type { Item } from './db.ts';
import { askJson, fatal, requireModel } from './llm.ts';

const Result = z.object({ results: z.array(z.object({ id: z.number().int(), interesting: z.number().int() })) });

const SYSTEM = `你在给一批线索补一个评分：interesting，0–3，只问“这条线索本身值不值得看”，与研究主题无关。
3 = 新做法、新工具、少见的思路，或做得漂亮、读了能学到东西的开源项目，即使跟 AI 辅助工作关系不大；
2 = 有独到之处，值得点开；
1 = 常见内容，看一眼无妨；
0 = 看与不看没损失（空壳、宣传、模板、纯转载）。
只看具体程度和新鲜度，不看星数热度，也不因为“跟 AI 工作方法无关”而降分。每条输入都要有一条结果，id 与输入一致。
只输出 JSON：{"results": [{"id": 1, "interesting": 2}]}`;

const describe = (i: Item) => ({ id: i.id, title: i.title, summary: i.summary.slice(0, 400), metrics: JSON.parse(i.metrics) });

async function main() {
  requireModel();
  const store = new Store(config.dbPath);
  const days = Number(process.argv[2]) || 60;
  const pending = store.db.prepare(
    `SELECT * FROM items WHERE key LIKE 'github:%' AND interesting IS NULL AND triage_status = 'done'
     AND first_seen_at >= datetime('now', ?) ORDER BY first_seen_at DESC`,
  ).all(`-${days} day`) as Item[];
  console.log(`待补 ${pending.length} 条`);
  const update = store.db.prepare(`UPDATE items SET interesting = ? WHERE id = ?`);
  let done = 0;
  for (let i = 0; i < pending.length; i += 20) {
    const batch = pending.slice(i, i + 20);
    try {
      const data = await askJson(SYSTEM, JSON.stringify(batch.map(describe)), Result);
      const got = new Map(data.results.map((r) => [r.id, r.interesting]));
      for (const item of batch) {
        const v = got.get(item.id);
        if (v === undefined) continue;
        update.run(Math.max(0, Math.min(3, v)), item.id);
        done++;
      }
      console.log(`  ${Math.min(i + 20, pending.length)}/${pending.length}`);
    } catch (e) {
      console.error(`  第 ${i / 20 + 1} 批失败：${(e as Error).message.slice(0, 200)}`);
      if (fatal(e)) throw e;
    }
  }
  console.log(`补完 ${done} 条`);
}

await main();
