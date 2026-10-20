#!/usr/bin/env python3
"""write-post 技能回归评测套件 (Eval-First)。

验证 check_prose.py 与 check_translationese.py 是否能准确拦截反模式坏样本，
并放行符合阮一峰风格的标准正样本。
"""

import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROSE_SCRIPT = HERE / "check_prose.py"
TRANSLATIONESE_SCRIPT = HERE / "check_translationese.py"

TESTS = [
    {
        "name": "test_colon_announcement",
        "description": "拦截报幕式空转冒号",
        "text": "这个项目的核心思路其实很简单：我们必须在两天内完成重构并上线测试环境。",
        "checker": "prose",
        "expect_passed": False,
        "expect_keyword": "中文冒号",
    },
    {
        "name": "test_pseudo_cleft",
        "description": "拦截翻案句（不是……而是……）",
        "text": "写代码的关键并不是为了炫耀语法技巧，而是为了真正解决生产环境里的性能瓶颈。",
        "checker": "prose",
        "expect_passed": False,
        "expect_keyword": "翻案句",
    },
    {
        "name": "test_weak_verbs",
        "description": "拦截弱动词组合（进行了……）",
        "text": "开发团队在昨天下午对老旧的服务模块进行了深度的代码重构与性能排查。",
        "checker": "translationese",
        "expect_passed": False,
        "expect_keyword": "弱动词",
    },
    {
        "name": "test_pseudo_jargon",
        "description": "拦截 -性/-度 伪术语",
        "text": "经过优化后，这套组件的可读性和知名度得到了显著提升。",
        "checker": "translationese",
        "expect_passed": False,
        "expect_keyword": "伪术语",
    },
    {
        "name": "test_english_colon_after_han",
        "description": "拦截紧跟中文的英文冒号（报幕换成半角也要拦）",
        "text": "这件事的道理很简单:我们必须在周五之前把服务迁走，不然下周的账单会翻倍。",
        "checker": "prose",
        "expect_passed": False,
        "expect_keyword": "英文冒号",
    },
    {
        "name": "test_colon_in_titles_and_times",
        "description": "放行英文标题、书名号、链接文字和时间里的冒号",
        "text": "参考资料里有一篇 Using Claude Code: Spending your effort，还有一本《镜子与城堡：相处全书》。另一篇是 [Cross-Model Review: Claude or Codex](https://example.com)。实际从 10:35 跑到 12:43，只用了两个多钟头。",
        "checker": "prose",
        "expect_passed": True,
    },
    {
        "name": "test_ignore_block",
        "description": "放行 check:off 区块里故意举的反例",
        "text": "下面这张表列的是常见毛病。\n\n{/* check:off */}\n\n| 毛病 | 例子 |\n| --- | --- |\n| 路标词 | 说白了，先说结论：我们要赋能业务 |\n| 翻案句 | 不是 A，而是 B |\n\n{/* check:on */}\n\n照着这张表改，稿子会顺很多。",
        "checker": "both",
        "expect_passed": True,
    },
    {
        "name": "test_quoted_mention",
        "description": "放行引号里提到的禁用词（提到不等于使用）",
        "text": "检查脚本扫完那篇文章，开头有一句“先说结论”，中间还有“赋能”和“抓手”，这几个词都在清单上。",
        "checker": "prose",
        "expect_passed": True,
    },
    {
        "name": "test_title_bait",
        "description": "拦截替读者下结论的标题",
        "text": "---\ntitle: 用了这个插件，代码审查竟然好懂多了\n---\n\n我在两个仓库里试了这个插件，各跑了一周。",
        "checker": "prose",
        "expect_passed": False,
        "expect_keyword": "标题",
    },
    {
        "name": "test_internet_meme",
        "description": "拦截装活人的网梗",
        "text": "我把配置改完以后跑了一遍，这次直接起飞，构建时间从十分钟降到了三分钟。",
        "checker": "prose",
        "expect_passed": False,
        "expect_keyword": "网梗",
    },
    {
        "name": "test_smoke_test_not_meme",
        "description": "放行“冒烟测试”这类技术词",
        "text": "发布前只跑了一个安装冒烟测试，它通过了，但完整的测试套件其实一直在失败。",
        "checker": "prose",
        "expect_passed": True,
    },
    {
        "name": "test_fake_uplift",
        "description": "拦截结尾假升华",
        "text": "这套流程我们用了两周，人工介入从每天五次降到了一次。\n\n未来已来，每个团队都应该拥抱这种工作方式。",
        "checker": "prose",
        "expect_passed": False,
        "expect_keyword": "升华",
    },
    {
        "name": "test_ruanyf_good_case",
        "description": "放行符合阮一峰规范的标准正样本（短句、客观事实、无冒号、无弱动词）",
        "text": """---
title: 测试短文
description: 记录一次简单的测试过程。
date: 2026-10-03
---

最近几天，我在测试一个开源工具。

它的用法很简单。在命令行里敲下一行命令，就能在本地把服务跑起来。

遇到报错的时候，它直接打印出具体的错误码，不需要人工去翻日志。

我试了三次，感觉确实很省事。
""",
        "checker": "both",
        "expect_passed": True,
    },
]


def run_check(script_path: Path, text: str) -> tuple[int, str]:
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".md", delete=False) as f:
        f.write(text)
        tmp_name = f.name
    try:
        res = subprocess.run(
            [sys.executable, str(script_path), tmp_name],
            capture_output=True,
            text=True,
        )
        return res.returncode, res.stdout + res.stderr
    finally:
        Path(tmp_name).unlink(missing_ok=True)


def main() -> int:
    print("=" * 60)
    print("正在运行 write-post 技能回归评测套件 (Eval-First)...")
    print("=" * 60)

    failed = 0
    for t in TESTS:
        name = t["name"]
        desc = t["description"]
        checker = t["checker"]
        expect_passed = t["expect_passed"]

        scripts_to_run = []
        if checker in ("prose", "both"):
            scripts_to_run.append(("check_prose", PROSE_SCRIPT))
        if checker in ("translationese", "both"):
            scripts_to_run.append(("check_translationese", TRANSLATIONESE_SCRIPT))

        case_ok = True
        err_msg = ""

        for script_name, script_path in scripts_to_run:
            code, out = run_check(script_path, t["text"])
            passed = (code == 0)

            if expect_passed:
                if not passed:
                    case_ok = False
                    err_msg = f"{script_name} 误判拦截！输出：\n{out}"
                    break
            else:
                if passed:
                    case_ok = False
                    err_msg = f"{script_name} 未能成功拦截坏样本！输出：\n{out}"
                    break
                if "expect_keyword" in t and t["expect_keyword"] not in out:
                    case_ok = False
                    err_msg = f"{script_name} 拦截原因未匹配预期关键词 '{t['expect_keyword']}'。输出：\n{out}"
                    break

        if case_ok:
            print(f"[PASS] {name} ({desc})")
        else:
            print(f"[FAIL] {name} ({desc}) -> {err_msg}")
            failed += 1

    print("=" * 60)
    if failed == 0:
        print(f"全部 {len(TESTS)} 项回归评测通过！规则拦截与放行符合预期。")
        return 0
    else:
        print(f"评测失败：{failed} 项测试未通过。")
        return 1


if __name__ == "__main__":
    sys.exit(main())
