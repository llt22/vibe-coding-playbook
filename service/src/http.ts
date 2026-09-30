const UA = 'ai-work-radar/0.1 (+https://github.com/llt22/vibe-coding-playbook)';

export async function get(url: string, headers: Record<string, string> = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { 'user-agent': UA, ...headers }, signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    // undici 的 "fetch failed" 不含原因，真正的错误（超时、DNS、TLS）在 cause 里
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    throw new Error(`${url}: ${(e as Error).message}${cause ? `（${cause.code ?? ''} ${cause.message ?? ''}）` : ''}`);
  }
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new Error(`${res.status} ${url}: ${body}`);
  }
  return res;
}

export const getJson = async <T>(url: string, headers?: Record<string, string>) => (await get(url, headers)).json() as Promise<T>;
export const getText = async (url: string, headers?: Record<string, string>) => (await get(url, headers)).text();

/** 去掉跟踪参数和结尾斜杠，作为非 GitHub 线索的去重 key。 */
export function canonicalUrl(raw: string): string {
  const u = new URL(raw);
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (/^(utm_|ref$|source$|s$|t$)/.test(k)) u.searchParams.delete(k);
  return (u.origin + u.pathname).replace(/\/$/, '') + (u.search || '');
}

/** github.com/owner/repo[/...] → owner/repo，否则 null。 */
export function githubRepo(raw: string): string | null {
  const m = raw.match(/^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/i);
  if (!m || ['orgs', 'topics', 'features', 'trending', 'sponsors', 'marketplace'].includes(m[1].toLowerCase())) return null;
  return `${m[1]}/${m[2].replace(/\.git$/, '')}`.toLowerCase();
}

export function itemKey(url: string): string {
  const repo = githubRepo(url);
  return repo ? `github:${repo}` : canonicalUrl(url);
}
