#!/usr/bin/env python3
"""技术方案 / 接口文档的结构检查。

句子检查器看不到的问题，在这里查：
  1. 开头一大段没有小标题，读者看不出这段在讲什么。
  2. 二级标题下面直接是表格或代码块，没有一句话交代这一节讲什么。
  3. 链接指向本地文件，文档转成在线版或发给别人后会失效。
  4. 还留着占位或中间状态（TODO、待补充、<姓名> 等），不能当定稿发出。

只用于技术方案、接口文档这类给多方读者查阅的文档。博客、随笔开头几段不带小标题是正常写法，不要用这个检查。

用法：
  python3 check_structure.py <文件路径> [--json]
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# 开头（一级标题和第一个二级标题之间）最多允许几个段落块
MAX_INTRO_BLOCKS = 2

LOCAL_LINK = re.compile(r"\]\((?!https?://|mailto:|#)([^)]+)\)")
PLACEHOLDER = re.compile(r"TODO|TBD|FIXME|待补充|待填写?|开发中|<\s*(姓名|联系方式|待定)[^>]*>")
CHECK_OFF = "{/* check:off */}"
CHECK_ON = "{/* check:on */}"


def blocks_of(lines: list[tuple[int, str]]) -> list[tuple[int, str]]:
    """把连续非空行合成段落块，返回 (起始行号, 块类型)。块类型：table / code / list / text。"""
    out: list[tuple[int, str]] = []
    prev_blank = True
    for no, line in lines:
        s = line.strip()
        if not s:
            prev_blank = True
            continue
        if prev_blank:
            if s.startswith("|"):
                kind = "table"
            elif s.startswith("```"):
                kind = "code"
            elif re.match(r"([-*+]|\d+[.、)])\s", s):
                kind = "list"
            else:
                kind = "text"
            out.append((no, kind))
        prev_blank = False
    return out


def check(text: str) -> list[dict]:
    raw = text.splitlines()
    # 去掉代码块内部和 check:off 区块，只保留代码块的开头一行（用来识别「标题下直接是代码」）
    lines: list[tuple[int, str]] = []
    in_code = off = False
    for i, line in enumerate(raw, 1):
        s = line.strip()
        if s == CHECK_OFF:
            off = True
            continue
        if s == CHECK_ON:
            off = False
            continue
        if off:
            continue
        if s.startswith("```"):
            if not in_code:
                lines.append((i, line))
            in_code = not in_code
            continue
        if not in_code:
            lines.append((i, line))

    problems: list[dict] = []

    # 按标题切节
    sections: list[tuple[int, int, str, list[tuple[int, str]]]] = []  # (行号, 级别, 标题, 内容行)
    cur: tuple[int, int, str, list] = (0, 0, "", [])
    for no, line in lines:
        m = re.match(r"(#{1,6})\s+(.*)", line)
        if m:
            sections.append(cur)
            cur = (no, len(m.group(1)), m.group(2).strip(), [])
        else:
            cur[3].append((no, line))
    sections.append(cur)

    # 1. 开头没有小标题：文件开头或一级标题之后、第一个二级标题之前的段落块
    intro: list[tuple[int, str]] = []
    for no, level, title, body in sections:
        if level >= 2:
            break
        intro += body
    intro_blocks = blocks_of(intro)
    if len(intro_blocks) > MAX_INTRO_BLOCKS:
        problems.append({
            "line": intro_blocks[MAX_INTRO_BLOCKS][0],
            "message": f"开头有 {len(intro_blocks)} 段没有小标题，读者一眼看不出在讲什么。"
                       f"开头只留一两句说明这份文档讲什么、写给谁，其余内容放进带标题的小节",
        })

    # 2. 二级标题下面直接是表格或代码块
    for no, level, title, body in sections:
        if level != 2:
            continue
        b = blocks_of(body)
        if b and b[0][1] in ("table", "code"):
            what = "表格" if b[0][1] == "table" else "代码块或图"
            problems.append({
                "line": no,
                "message": f"「{title}」下面直接是{what}，先写一句交代这一节讲什么",
            })

    # 3. 本地文件链接；4. 占位与中间状态
    for no, line in lines:
        if line.strip().startswith("```"):
            continue
        for m in LOCAL_LINK.finditer(line):
            problems.append({
                "line": no,
                "message": f"链接指向本地文件「{m.group(1)}」，转成在线文档或发给别人后会失效，改成文档名或在线链接",
            })
        m = PLACEHOLDER.search(line)
        if m:
            problems.append({
                "line": no,
                "message": f"还有占位或中间状态「{m.group()}」，定稿前要填上或删掉",
            })

    return problems


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--json"]
    as_json = "--json" in sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    path = Path(args[0])
    problems = check(path.read_text(encoding="utf-8"))
    if as_json:
        print(json.dumps({"passed": not problems, "failures": problems}, ensure_ascii=False))
    else:
        if not problems:
            print(f"[通过] {path}")
        else:
            print(f"[未过] {path}")
            for p in problems:
                print(f"      - 结构 (第 {p['line']} 行): {p['message']}")
    return 0 if not problems else 1


if __name__ == "__main__":
    raise SystemExit(main())
