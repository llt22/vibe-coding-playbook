#!/usr/bin/env python3
"""整机扫描：列出本机所有未归档 paseo 会话的摘要，按 项目/工作区 分组。
用法: digest_all.py [--project NAME] [--json]
"""
import glob, json, os, re, subprocess, sys
from collections import defaultdict

HOME = os.path.expanduser('~')
NOISE = ('[Image', '[Request interrupted', '<task-notification', '<chat-history-summary',
         'This session is being continued', 'Base directory for this skill', '<command-', '<local-command',
         '<paseo-system', '<cross-session-message', 'Another Claude session sent a message',
         '<new-memories>', '<project-memory>')


def text_of(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return ' '.join(x.get('text', '') for x in content if isinstance(x, dict) and x.get('type') == 'text')
    return ''


def claude_events(session_id):
    files = glob.glob(f'{HOME}/.claude/projects/*/{session_id}.jsonl')
    if not files:
        return None
    ev, source = [], None
    with open(files[0]) as fh:
        for line in fh:
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d.get('isSidechain'):
                continue
            t = text_of(d.get('message', {}).get('content')).strip()
            if not t:
                continue
            if d.get('type') == 'user':
                if source is None and t.startswith('<chat-history-summary>'):
                    m = re.search(r'Source agent: (.+)', t)
                    source = m.group(1).strip() if m else ''
                if not t.startswith(NOISE):
                    ev.append(('user', t))
            elif d.get('type') == 'assistant':
                ev.append(('ai', t))
    return ev, source


def logs_events(agent_id):
    r = subprocess.run(['paseo', 'logs', agent_id], capture_output=True, text=True)
    if r.returncode != 0:
        return None
    ev, cur = [], None
    for line in r.stdout.splitlines():
        m = re.match(r'^\[(\w+)\] ?(.*)', line)
        if m:
            kind = 'user' if m.group(1) == 'User' else 'ai'
            cur = [kind, m.group(2)]
            ev.append(cur)
            if kind == 'user':
                cur = ['ai', '']
                ev.append(cur)
        elif line.strip() == '---' and cur and cur[0] == 'ai':
            cur = ['ai', '']
            ev.append(cur)
        elif cur:
            cur[1] += '\n' + line
    out = [(k, v.strip()) for k, v in ev if v.strip()]
    out = [(k, v) for k, v in out if k == 'ai' or not v.startswith(NOISE)]
    m = re.search(r'Source agent: (.+)', r.stdout)
    return out, (m.group(1).strip() if m else None)


def short(s, n):
    s = re.sub(r'\s+', ' ', s or '')
    return s if len(s) <= n else s[:n] + '…'


def main():
    only = None
    if '--project' in sys.argv:
        only = sys.argv[sys.argv.index('--project') + 1]
    prj = {p['projectId']: (p.get('customName') or p.get('displayName') or p.get('rootPath'))
           for p in json.load(open(f'{HOME}/.paseo/projects/projects.json'))}
    ws = {w['workspaceId']: w for w in json.load(open(f'{HOME}/.paseo/projects/workspaces.json'))}
    me = os.environ.get('PASEO_AGENT_ID', '')
    agents = []
    for f in glob.glob(f'{HOME}/.paseo/agents/*/*.json'):
        try:
            d = json.load(open(f))
        except Exception:
            continue
        if d.get('archivedAt'):
            continue
        agents.append(d)
    groups = defaultdict(list)
    for a in agents:
        w = ws.get(a.get('workspaceId'))
        proj = prj.get(w.get('projectId'), '?') if w else f'（孤儿）{a.get("cwd","")}'
        if only and proj != only:
            continue
        groups[(proj, a.get('workspaceId'))].append(a)

    for (proj, wid) in sorted(groups, key=lambda k: (k[0], str(k[1]))):
        w = ws.get(wid)
        print(f'\n######## {proj} / {(w.get("title") or w.get("displayName")) if w else "（工作区已删除）"} ({wid})')
        for a in sorted(groups[(proj, wid)], key=lambda d: d.get('lastActivityAt') or ''):
            sid = (a.get('persistence') or {}).get('sessionId')
            dg = claude_events(sid) if a.get('provider') == 'claude' and sid else logs_events(a['id'])
            mark = ' ←本会话' if a['id'] == me else ''
            print(f"\n## {a['id'][:7]} [{a.get('lastStatus')}] {a.get('provider')} 建 {(a.get('createdAt') or '')[:10]} 末 {(a.get('lastActivityAt') or '')[:16]}{mark}"
                  f"{' BG' if a.get('background') else ''}")
            print(f"   标题: {a.get('title')}")
            labels = a.get('labels') or {}
            for k in ('paseo.parent-agent-id', 'role', 'worker'):
                if labels.get(k):
                    print(f"   {k}: {labels[k]}")
            if dg is None:
                print('   !! 无会话内容')
                continue
            ev, source = dg
            users = [t for k, t in ev if k == 'user']
            ais = [t for k, t in ev if k == 'ai']
            if source:
                print(f'   接续自: {short(source, 70)}')
            print(f'   用户 {len(users)} 条 | 末事件={"user" if ev and ev[-1][0]=="user" else "ai"}')
            for u in users[:2]:
                print(f'   U< {short(u, 120)}')
            if len(users) > 2:
                for u in users[-2:]:
                    print(f'   U> {short(u, 120)}')
            if ais:
                print(f'   AI末: {short(ais[-1], 300)}')


if __name__ == '__main__':
    main()
