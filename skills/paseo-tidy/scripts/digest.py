#!/usr/bin/env python3
"""列出某个工作区的 Paseo 会话并给出内容摘要，供整理时判断去留和标题。

用法: digest.py [cwd] [--all]
  cwd    工作区目录，默认当前目录
  --all  已归档的会话也输出内容摘要（默认只列标题）
"""
import glob, json, os, re, subprocess, sys

HOME = os.path.expanduser('~')
NOISE = ('[Image', '[Request interrupted', '<task-notification', '<chat-history-summary',
         'This session is being continued', 'Base directory for this skill', '<command-', '<local-command',
         '<paseo-system', '<cross-session-message', 'Another Claude session sent a message')


def load_agents(cwd):
    out = []
    for f in glob.glob(f'{HOME}/.paseo/agents/*/*.json'):
        try:
            d = json.load(open(f))
        except Exception as e:
            print(f'!! 读不了 {f}: {e}', file=sys.stderr)
            continue
        if os.path.realpath(d.get('cwd', '')) == cwd:
            out.append(d)
    return sorted(out, key=lambda d: d.get('lastActivityAt') or '')


def text_of(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return ' '.join(x.get('text', '') for x in content if isinstance(x, dict) and x.get('type') == 'text')
    return ''


def claude_digest(session_id):
    files = glob.glob(f'{HOME}/.claude/projects/*/{session_id}.jsonl')
    if not files:
        return None
    users, last_ai, source = [], '', None
    with open(files[0]) as fh:  # 会话文件可能几十 MB，逐行读
        for line in fh:
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d.get('isSidechain'):
                continue
            t = text_of(d.get('message', {}).get('content')).strip()
            if d.get('type') == 'user' and t:
                if source is None and t.startswith('<chat-history-summary>'):
                    m = re.search(r'Source agent: (.+)', t)
                    source = m.group(1).strip() if m else ''
                if not t.startswith(NOISE):
                    users.append(t)
            elif d.get('type') == 'assistant' and t:
                last_ai = t
    return users, last_ai, source


def logs_digest(agent_id):
    """非 Claude 会话（codex/omp）没有 jsonl，用 paseo logs。"""
    r = subprocess.run(['paseo', 'logs', agent_id], capture_output=True, text=True)
    if r.returncode != 0:
        return None
    # Claude 会话每段都有 [User]/[Assistant] 前缀；codex 的回复不带前缀，
    # 直接跟在 [User] 首行后面，或在工具调用后以 "---" 单独一行开头
    blocks, cur = [], None
    for line in r.stdout.splitlines():
        m = re.match(r'^\[(\w+)\] ?(.*)', line)
        if m:
            cur = [m.group(1), m.group(2)]
            blocks.append(cur)
            if cur[0] == 'User':
                cur = ['Assistant', '']
                blocks.append(cur)
        elif line.strip() == '---' and cur and cur[0] not in ('User', 'Assistant'):
            cur = ['Assistant', '']
            blocks.append(cur)
        elif cur:
            cur[1] += '\n' + line
    users = [b[1].strip() for b in blocks if b[0] == 'User' and not b[1].startswith(NOISE)]
    ais = [b[1].strip() for b in blocks if b[0] == 'Assistant' and b[1].strip()]
    return users, (ais[-1] if ais else ''), source_of(r.stdout)


def source_of(text):
    m = re.search(r'Source agent: (.+)', text)
    return m.group(1).strip() if m else None


def short(s, n):
    s = re.sub(r'\s+', ' ', s)
    return s if len(s) <= n else s[:n] + '…'


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    show_all = '--all' in sys.argv
    cwd = os.path.realpath(args[0] if args else os.getcwd())
    me = os.environ.get('PASEO_AGENT_ID', '')
    agents = load_agents(cwd)
    if not agents:
        sys.exit(f'没有找到 cwd={cwd} 的 Paseo 会话')
    by_id = {a['id']: a for a in agents}

    try:
        ws_names = {w['workspaceId']: w.get('title') or w.get('displayName') or ''
                    for w in json.load(open(f'{HOME}/.paseo/projects/workspaces.json'))}
    except Exception as e:
        print(f'!! 读不了工作区列表: {e}', file=sys.stderr)
        ws_names = {}

    ws_count = {}
    for a in agents:
        if not a.get('archivedAt'):
            w = ws_names.get(a.get('workspaceId'), a.get('workspaceId') or '?')
            ws_count[w] = ws_count.get(w, 0) + 1
    print(f'目录: {cwd}')
    print(f'会话: {len(agents)} 个，未归档 {sum(not a.get("archivedAt") for a in agents)} 个')
    print(f'工作区: {"、".join(f"{w}({n})" for w, n in ws_count.items()) or "（无）"}\n')

    active = [a for a in agents if not a.get('archivedAt')]
    archived_list = [a for a in agents if a.get('archivedAt')]
    active.sort(key=lambda a: (a.get('workspaceId') or '', a.get('lastActivityAt') or ''))
    for a in active + (archived_list if show_all else []):
        archived = bool(a.get('archivedAt'))
        tag = '已归档' if archived else (a.get('lastStatus') or '?')
        mark = ' ←本会话' if a['id'] == me else ''
        print(f"### {a['id'][:7]} [{tag}] {a.get('provider')} "
              f"建 {(a.get('createdAt') or '')[:16]} 末 {(a.get('lastActivityAt') or '')[:16]}{mark}")
        print(f"  标题: {a.get('title')}")
        print(f"  工作区: {ws_names.get(a.get('workspaceId'), '?')} ({a.get('workspaceId')})")
        labels = a.get('labels') or {}
        for k in ('paseo.parent-agent-id', 'worker'):
            if labels.get(k):
                p = by_id.get(labels[k])
                print(f"  {k}: {labels[k][:7]} {p.get('title') if p else '（不在本工作区）'}")
        if labels.get('role'):
            print(f"  role: {labels['role']}")
        sid = (a.get('persistence') or {}).get('sessionId')
        dg = claude_digest(sid) if a.get('provider') == 'claude' and sid else logs_digest(a['id'])
        if dg is None:
            print('  !! 找不到会话内容\n')
            continue
        users, last_ai, source = dg
        if source:
            print(f'  接续自: {short(source, 80)}')
        print(f'  用户消息 {len(users)} 条')
        head, tail = users[:3], users[-4:] if len(users) > 7 else users[3:]
        for u in head:
            print(f'  U< {short(u, 140)}')
        if len(users) > 7:
            print('  …')
        for u in tail:
            print(f'  U> {short(u, 140)}')
        print(f'  AI末: {short(last_ai, 500)}\n')


    if not show_all and archived_list:
        print(f'—— 已归档 {len(archived_list)} 个（--all 看内容）——')
        for a in archived_list:
            print(f"  {a['id'][:7]} 归档于 {(a.get('archivedAt') or '')[:10]}  {short(a.get('title') or '', 60)}")


if __name__ == '__main__':
    main()
