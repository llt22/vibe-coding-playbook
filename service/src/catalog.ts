import { readFileSync } from 'node:fs';
import { itemKey } from './http.ts';

export type CatalogEntry = { id: string; name: string; kind: string; status: string; url?: string | null; aliases?: string[] };

export function loadCatalog(path: string) {
  const entries: CatalogEntry[] = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  const byKey = new Map<string, CatalogEntry>();
  const byId = new Map<string, CatalogEntry>();
  for (const e of entries) {
    byId.set(e.id, e);
    if (!e.url) continue;
    // 指向仓库子目录的条目（如某个示例扩展）只代表那一部分，不能把整个仓库标成已在清单
    if (/^https?:\/\/(?:www\.)?github\.com\/[^/]+\/[^/]+\/(?:tree|blob)\//i.test(e.url)) continue;
    try {
      byKey.set(itemKey(e.url), e);
    } catch {
      // 清单里个别 url 不是合法地址（历史材料原样保留），只是无法用于比对，不影响启动
    }
  }
  return { entries, byKey, byId };
}

export type Catalog = ReturnType<typeof loadCatalog>;
