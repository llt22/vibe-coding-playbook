#!/usr/bin/env python3
"""综合文本检查：运行翻译腔、文风与 STE 步骤检查器。

用法：
  python3 check.py <文件路径>...
  python3 check.py draft.md
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROSE_SCRIPT = HERE / "check_prose.py"
TRANSLATIONESE_SCRIPT = HERE / "check_translationese.py"
STE_SCRIPT = HERE / "check_ste.py"


def check_file(path: Path) -> tuple[bool, list[str]]:
    if not path.exists():
        return False, [f"文件不存在: {path}"]

    problems: list[str] = []

    # 1. check_translationese
    res_tr = subprocess.run(
        [sys.executable, str(TRANSLATIONESE_SCRIPT), "--json", str(path)],
        capture_output=True,
        text=True,
    )
    try:
        data_tr = json.loads(res_tr.stdout)
        for err in data_tr.get("hard_errors", []):
            problems.append(
                f"翻译腔 (第 {err.get('line', '?')} 行): {err.get('label', '')} —— …{err.get('context', '')}…"
            )
        for fail in data_tr.get("failures", []):
            problems.append(f"翻译腔: {fail}")
    except json.JSONDecodeError:
        err_msg = (res_tr.stderr or res_tr.stdout).strip()[:200]
        problems.append(f"check_translationese 运行异常: {err_msg}")

    # 2. check_prose
    res_pr = subprocess.run(
        [sys.executable, str(PROSE_SCRIPT), "--json", str(path)],
        capture_output=True,
        text=True,
    )
    try:
        data_pr = json.loads(res_pr.stdout)
        for fail in data_pr.get("failures", []):
            problems.append(f"文风硬伤: {fail}")
    except json.JSONDecodeError:
        err_msg = (res_pr.stderr or res_pr.stdout).strip()[:200]
        problems.append(f"check_prose 运行异常: {err_msg}")

    # 3. check_ste：只检查 Markdown 编号步骤或 ste:on/off 显式区块
    res_ste = subprocess.run(
        [sys.executable, str(STE_SCRIPT), "--json", str(path)],
        capture_output=True,
        text=True,
    )
    try:
        data_ste = json.loads(res_ste.stdout)
        for fail in data_ste.get("failures", []):
            problems.append(
                f"STE (第 {fail.get('line', '?')} 行): {fail.get('message', '')} —— …{fail.get('context', '')}…"
            )
    except json.JSONDecodeError:
        err_msg = (res_ste.stderr or res_ste.stdout).strip()[:200]
        problems.append(f"check_ste 运行异常: {err_msg}")

    passed = len(problems) == 0
    return passed, problems


def main() -> int:
    if len(sys.argv) < 2:
        print("用法: python3 check.py <文件路径>...")
        return 1

    targets = [Path(p) for p in sys.argv[1:]]
    bad_count = 0

    for target in targets:
        if target.is_dir():
            files = sorted(target.glob("*.md")) + sorted(target.glob("*.mdx"))
        else:
            files = [target]

        for f in files:
            passed, problems = check_file(f)
            if passed:
                print(f"[通过] {f}")
            else:
                bad_count += 1
                print(f"[未过] {f}")
                for p in problems:
                    print(f"      - {p}")

    return 1 if bad_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
