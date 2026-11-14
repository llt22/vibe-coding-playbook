import type { Store } from './db.ts';

/** 仓库名归一：去掉大小写和分隔符，换皮模板（ai--manus / ai-manus / ai_manus）会落到同一个名字。 */
export const normRepoName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

const ownerOf = (key: string) => key.slice('github:'.length).split('/')[0] ?? '';
const nameOf = (key: string) => key.slice('github:'.length).split('/')[1] ?? '';

/** 单轮采集里同名仓库出现这么多个不同 owner，就是同一批刷出来的换皮仓库。 */
const BATCH_OWNERS = 3;
/** 同名仓库近 30 天被这么多个不同 owner 用过，整组视为模板农场（阈值高于 skills 这类常见名）。 */
const HISTORY_OWNERS = 8;

/**
 * 刷星模板仓库过滤。实测 github-search 四分之一的结果是同一模板换 owner（2026-11 的 ai--manus 有 44 个 owner），
 * 初筛只能给 1 分，纯浪费模型调用。规则只看“同名不同 owner”，不看描述，避免误伤同名的正经仓库。
 */
export class RepoSpamFilter {
  private owners = new Map<string, Set<string>>();

  constructor(store: Store) {
    for (const r of store.repoNameOwners()) this.learnName(r.name, r.owner);
  }

  learnName(rawName: string, owner: string) {
    const name = normRepoName(rawName);
    if (!name || !owner) return;
    let set = this.owners.get(name);
    if (!set) this.owners.set(name, (set = new Set()));
    set.add(owner.toLowerCase());
  }

  /** 返回这一轮应当丢弃的仓库 key。历史判断用近 30 天见过的同名仓库，批量判断用本轮结果。 */
  drop(keys: string[]): Set<string> {
    const batch = new Map<string, Set<string>>();
    for (const key of keys) {
      const name = normRepoName(nameOf(key));
      if (!name) continue;
      let set = batch.get(name);
      if (!set) batch.set(name, (set = new Set()));
      set.add(ownerOf(key));
    }
    const out = new Set<string>();
    for (const key of keys) {
      const name = normRepoName(nameOf(key));
      if (!name) continue;
      const burst = (batch.get(name)?.size ?? 0) >= BATCH_OWNERS;
      const farm = (this.owners.get(name)?.size ?? 0) >= HISTORY_OWNERS;
      if (burst || farm) out.add(key);
    }
    return out;
  }
}

/** 从一段文本里取完整的 GitHub 仓库链接。X 会把长链接显示成带空格的截断文本，那种取不到，靠采集器抓 DOM 的 href。 */
export function githubLinksIn(text: string): string[] {
  return [...text.matchAll(/https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+/gi)].map((m) => m[0]);
}
