#!/usr/bin/env python3
"""检查长文写作简报是否满足对应文体的最低输入要求。"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

VALID_MODES = {"教程", "实测", "观点", "调研", "随笔"}
COMMON_FIELDS = {"mode", "reader", "outcome", "scope"}
MODE_FIELDS = {
    "教程": {"prerequisites", "completion_test"},
    "实测": {"criteria", "failed_attempts", "limitations"},
    "观点": {"claim", "evidence", "reasoning", "counterargument", "limitations"},
    "调研": {"claim", "sources", "source_conflicts", "uncertainties"},
    "随笔": {"event", "concrete_details", "voice_samples"},
}
PLACEHOLDERS = {"", "[]", "{}", "待补充", "暂无", "tbd", "todo", "null", "none", "未知"}
KEY = re.compile(r"^([a-z_]+):(?:\s*(.*))?$")
LIST_ITEM = re.compile(r"^\s+-\s+(.+)$")


def parse_brief(text: str) -> dict[str, list[str]]:
    values: dict[str, list[str]] = {}
    current: str | None = None
    in_code = False

    for raw in text.splitlines():
        stripped = raw.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            continue
        if not stripped or stripped.startswith("#"):
            continue

        key_match = KEY.match(stripped)
        if key_match:
            current = key_match.group(1)
            value = (key_match.group(2) or "").strip().strip('"\'')
            values[current] = [] if value in ("", "[]") else [value]
            continue

        item_match = LIST_ITEM.match(raw)
        if item_match and current:
            values.setdefault(current, []).append(item_match.group(1).strip())

    return values


def has_value(values: dict[str, list[str]], key: str) -> bool:
    items = values.get(key, [])
    return any(item.strip().lower() not in PLACEHOLDERS for item in items)


def main() -> int:
    parser = argparse.ArgumentParser(description="检查长文写作简报")
    parser.add_argument("path", help="YAML 风格的写作简报路径")
    parser.add_argument("--json", action="store_true", help="输出机器可读 JSON")
    args = parser.parse_args()

    try:
        text = Path(args.path).read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        print(f"无法读取写作简报。{error}", file=sys.stderr)
        return 2

    values = parse_brief(text)
    mode_values = values.get("mode", [])
    mode = mode_values[0] if mode_values else ""
    failures: list[str] = []

    if mode not in VALID_MODES:
        failures.append(f"mode 必须是：{'、'.join(sorted(VALID_MODES))}。当前值为“{mode or '空'}”。")
        required = COMMON_FIELDS
    else:
        required = COMMON_FIELDS | MODE_FIELDS[mode]

    for field in sorted(required):
        if not has_value(values, field):
            failures.append(f"缺少有效字段：{field}")

    if mode in {"观点", "调研"} and has_value(values, "evidence"):
        if len(values.get("evidence", [])) < 2:
            failures.append("观点或调研长文至少需要两条相互独立的 evidence。")

    if args.json:
        print(json.dumps({
            "mode": mode,
            "failures": failures,
            "passed": not failures,
        }, ensure_ascii=False, indent=2))
    else:
        print(f"文体：{mode or '未填写'}，问题 {len(failures)} 处")
        for failure in failures:
            print(f"- {failure}")
        if not failures:
            print("写作简报字段完整，可以开始写作。")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
