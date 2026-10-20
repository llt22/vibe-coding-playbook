#!/usr/bin/env python3
"""检查说明文中的中文 STE 规则。

默认检查 Markdown 编号步骤。需要检查没有编号的说明段落时，用
``<!-- ste:on -->`` 与 ``<!-- ste:off -->`` 圈定范围。
普通观点、体验和叙事不受此检查器约束。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

STE_ON = "<!-- ste:on -->"
STE_OFF = "<!-- ste:off -->"
NUMBERED_STEP = re.compile(r"^(\s*)\d+[.)、]\s+(.+?)\s*$")
SENTENCE_SPLIT = re.compile(r"[。！？!?；;]+")
HAN = re.compile(r"[\u4e00-\u9fff]")
PASSIVE = re.compile(r"(?:被|由)[^，。；\n]{0,18}(?:处理|删除|创建|修改|更新|执行|调用|生成|发送|保存|关闭|打开|安装|配置|检查|读取|写入|移动|复制|上传|下载|重启|启动|停止|替换|转换)(?:了|为|成|掉)?")
AMBIGUOUS_START = re.compile(r"^(?:它|这个|该项|该步骤|上述内容|这样|然后这样|接着这样)(?:会|要|应|需要|可以|再|就|将|，|。)")
ACTION = re.compile(r"(?:打开|关闭|安装|配置|填写|输入|运行|执行|检查|确认|复制|粘贴|创建|删除|修改|更新|保存|发送|上传|下载|读取|写入|移动|替换|选择|点击|进入|返回|重启|启动|停止|等待|记录|查看|连接|登录|提交|导出|导入|添加|移除|设置|切换|调用|生成|验证|测试)")
CONNECTOR = re.compile(r"(?:，|、|并且|并|然后|随后|再|接着|同时|之后|最后)")


@dataclass
class Finding:
    line: int
    rule: str
    message: str
    context: str


def read_text(path: str) -> str:
    if path == "-":
        return sys.stdin.read()
    return Path(path).read_text(encoding="utf-8")


def han_count(text: str) -> int:
    return len(HAN.findall(text))


def strip_inline_markup(text: str) -> str:
    text = re.sub(r"`[^`]+`", "代码", text)
    text = re.sub(r"\[([^]]+)]\([^)]*\)", r"\1", text)
    text = re.sub(r"[*_~]", "", text)
    return text.strip()


def extract_targets(text: str) -> tuple[list[tuple[int, str]], list[Finding]]:
    targets: list[tuple[int, str]] = []
    findings: list[Finding] = []
    in_code = False
    explicit = False

    for line_no, raw in enumerate(text.splitlines(), 1):
        stripped = raw.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        if stripped == STE_ON:
            explicit = True
            continue
        if stripped == STE_OFF:
            explicit = False
            continue

        match = NUMBERED_STEP.match(raw)
        if match:
            step = strip_inline_markup(match.group(2))
            # 普通编号观点不属于操作说明。显式区块、动作步骤和含糊步骤才进入检查。
            if explicit or ACTION.match(step) or AMBIGUOUS_START.match(step):
                targets.append((line_no, step))
            continue

        if explicit and stripped and not stripped.startswith(("#", ">", "- ", "* ", "|")):
            findings.append(Finding(
                line_no,
                "missing-numbered-step",
                "STE 区块里的操作说明必须使用编号步骤。",
                strip_inline_markup(stripped)[:80],
            ))
            targets.append((line_no, strip_inline_markup(stripped)))

    return targets, findings


def check_step(line_no: int, text: str) -> list[Finding]:
    findings: list[Finding] = []
    sentences = [part.strip() for part in SENTENCE_SPLIT.split(text) if part.strip()]

    for sentence in sentences:
        length = han_count(sentence)
        if length > 36:
            findings.append(Finding(
                line_no,
                "long-step-sentence",
                f"步骤句有 {length} 个汉字，超过 36。拆成两个编号步骤或两个短句。",
                sentence[:80],
            ))

    passive = PASSIVE.search(text)
    if passive:
        findings.append(Finding(
            line_no,
            "passive-voice",
            "步骤隐藏了执行者。直接写谁执行动作。",
            passive.group(0),
        ))

    if AMBIGUOUS_START.search(text):
        findings.append(Finding(
            line_no,
            "ambiguous-reference",
            "步骤以含糊指代开头。把“它/这个/该项”换成具体名称。",
            text[:80],
        ))

    actions = ACTION.findall(text)
    if len(actions) >= 3 and CONNECTOR.search(text):
        findings.append(Finding(
            line_no,
            "multiple-actions",
            f"同一步包含 {len(actions)} 个动作（{'、'.join(actions[:6])}）。每个编号只保留一个主要动作。",
            text[:80],
        ))

    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="检查说明文中的中文 STE 规则")
    parser.add_argument("path", help="Markdown 或文本路径。使用 - 从标准输入读取")
    parser.add_argument("--json", action="store_true", help="输出机器可读 JSON")
    args = parser.parse_args()

    try:
        text = read_text(args.path)
    except (OSError, UnicodeError) as error:
        print(f"无法读取稿件。{error}", file=sys.stderr)
        return 2

    targets, findings = extract_targets(text)
    for line_no, step in targets:
        findings.extend(check_step(line_no, step))

    if args.json:
        payload = {
            "step_count": len(targets),
            "failure_count": len(findings),
            "failures": [asdict(item) for item in findings],
            "passed": not findings,
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(f"检查步骤 {len(targets)} 条，问题 {len(findings)} 处")
        for item in findings:
            print(f"- 第 {item.line} 行 [{item.rule}] {item.message} …{item.context}…")
        if not findings:
            print("未发现 STE 步骤问题。")

    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
