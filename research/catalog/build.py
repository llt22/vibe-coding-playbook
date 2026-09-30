"""由 catalog.jsonl 生成可读视图。修改条目后运行：python3 research/catalog/build.py"""
import json
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).parent
HISTORY = '../history/2026-09-30/'

QUESTIONS = {
    1: '能力发现：AI 已经能做哪些还没想到交给它的工作',
    2: '任务匹配：什么工作适合怎样的模型、工具和协作方式',
    3: '条件供给：需要提供哪些信息、工具、权限和反馈',
    4: '主动推进：哪些工作可由时间、事件或状态触发并持续完成',
    5: '效果验证：怎样判断确实改善了结果',
}
KINDS = {'tool': '工具', 'method': '方法', 'practice': '实践', 'concept': '概念与问题', 'case': '案例', 'source': '信源'}
STATUS = {'adopt': '已采用', 'try': '可试', 'study': '研读', 'watch': '观察', 'avoid': '暂不采用', 'drop': '不相关'}
EVIDENCE = {'user-tested': '实测', 'discussed': '讨论', 'lead-only': '线索'}
REQUIRED = {'id', 'name', 'kind', 'status', 'priority', 'evidence', 'summary', 'sources'}

HEADER = '<!-- 由 build.py 从 catalog.jsonl 生成，请勿手改 -->\n\n'


def load():
    rows = [json.loads(line) for line in (HERE / 'catalog.jsonl').read_text().splitlines() if line.strip()]
    ids = Counter(r['id'] for r in rows)
    errors = [f'重复 id：{k}' for k, v in ids.items() if v > 1]
    for r in rows:
        if REQUIRED - r.keys():
            errors.append(f"{r.get('id')} 缺字段：{REQUIRED - r.keys()}")
        if r['kind'] not in KINDS or r['status'] not in STATUS or r['evidence'] not in EVIDENCE:
            errors.append(f"{r['id']} 枚举值非法")
        errors += [f"{r['id']} 引用不存在的 {x}" for x in r.get('related') or [] if x not in ids]
        errors += [f"{r['id']} 来源不存在：{s}" for s in r['sources']
                   if not (HERE / HISTORY / s.split('#')[0]).exists()]
    if errors:
        raise SystemExit('\n'.join(errors))
    return rows


def cell(text):
    return (text or '').replace('|', '\\|').replace('\n', ' ')


def name(r):
    return f"[{cell(r['name'])}]({r['url']})" if r.get('url') else cell(r['name'])


def source_links(r):
    files = dict.fromkeys(s.split('#')[0] for s in r['sources'])
    return ' '.join(f"[{Path(p).stem}]({HISTORY}{p})" for p in files)


def table(rows, cols):
    head = '| ' + ' | '.join(c for c, _ in cols) + ' |\n|' + '---|' * len(cols) + '\n'
    return head + ''.join('| ' + ' | '.join(f(r) for _, f in cols) + ' |\n' for r in rows)


BASE_COLS = [
    ('名称', name),
    ('状态', lambda r: STATUS[r['status']]),
    ('证据', lambda r: EVIDENCE[r['evidence']] + (' ⚠️' if r.get('reverify') else '')),
    ('说明', lambda r: cell(r['summary'])),
    ('来源', source_links),
]


def write_priority(rows):
    out = [HEADER, '# 优先处理：按研究问题分组的 P1 条目\n\n',
           '⚠️ 表示需要重新核实：没有本机实测，或材料内存在冲突。一条可能同时出现在多个问题下。\n\n']
    p1 = [r for r in rows if r['priority'] == 1]
    for q, title in QUESTIONS.items():
        sel = sorted((r for r in p1 if q in r.get('research_questions', [])), key=lambda r: (r['kind'], r['id']))
        out += [f'## {q}. {title}（{len(sel)}）\n\n', table(sel, [('类型', lambda r: KINDS[r['kind']])] + BASE_COLS), '\n']
    (HERE / 'priority.md').write_text(''.join(out).rstrip() + '\n')


def write_index(rows):
    out = [HEADER, '# 全部条目\n\n按类型、状态分组。`drop` 条目只保留在 catalog.jsonl，不在此列出。\n\n']
    by_kind = defaultdict(list)
    for r in rows:
        if r['status'] != 'drop':
            by_kind[r['kind']].append(r)
    for kind, label in KINDS.items():
        out.append(f'## {label}（{len(by_kind[kind])}）\n\n')
        for status, slabel in STATUS.items():
            sel = sorted((r for r in by_kind[kind] if r['status'] == status), key=lambda r: (r['priority'], r['id']))
            if sel:
                out += [f'### {slabel}（{len(sel)}）\n\n',
                        table(sel, [('P', lambda r: str(r['priority']))] + BASE_COLS[:1] + BASE_COLS[2:]), '\n']
    (HERE / 'index.md').write_text(''.join(out).rstrip() + '\n')


def write_reverify(rows):
    sel = sorted((r for r in rows if r.get('reverify') or r.get('conflicts')), key=lambda r: (r['priority'], r['kind'], r['id']))
    out = [HEADER, f'# 待核实清单（{len(sel)}）\n\n',
           '需要联网复查或本机验证的条目：P1 且未实测，或历史材料内有数字、事实、评级冲突。按优先级排序。\n\n',
           table(sel, [('P', lambda r: str(r['priority'])), ('名称', name), ('状态', lambda r: STATUS[r['status']]),
                       ('冲突或疑点', lambda r: cell(r.get('conflicts') or r.get('caveats') or '')), ('来源', source_links)])]
    (HERE / 'reverify.md').write_text(''.join(out))


def stats(rows):
    kinds = Counter(r['kind'] for r in rows)
    status = Counter(r['status'] for r in rows)
    ev = Counter(r['evidence'] for r in rows)
    print(f'{len(rows)} 条')
    print('类型', {KINDS[k]: kinds[k] for k in KINDS})
    print('状态', {STATUS[k]: status[k] for k in STATUS})
    print('证据', {EVIDENCE[k]: ev[k] for k in EVIDENCE})
    print('P1', sum(r['priority'] == 1 for r in rows), '待核实', sum(bool(r.get('reverify') or r.get('conflicts')) for r in rows))


if __name__ == '__main__':
    rows = load()
    write_priority(rows)
    write_index(rows)
    write_reverify(rows)
    stats(rows)
