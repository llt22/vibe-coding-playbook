#!/usr/bin/env python3
"""查本站文章里的翻译腔和结构上的 AI 味。

翻译腔规则出自余光中、思果，见 references/translationese.md。结构规则出自
lieflat-less-ai-tone 的实测（AI 是人类的 2 倍以上才收）和 humanizer、shuorenhua，
见 references/ai-flavor.md。check_prose.py 已经查的（借喻场、连词密度、名词化、
“说白了”类起手式）这里不重复。

只报警，不自动改。命中的地方要回到原句判断：引原话、举反例、说本义时可以保留。

用法
  python3 check_translationese.py 文章.mdx            # 查翻译腔
  python3 check_translationese.py --strip 文章.mdx    # 只输出去掉 frontmatter、import、代码块、JSX 标签后的正文
  python3 check_translationese.py --skip-tables ...   # 不查表格行（表格里放的是故意举的反例时用）
  python3 check_translationese.py --stats 目录或文件...  # 统计每条规则每千字命中几次，用人类文章测误报

故意举的反例用 {/* check:off */} 和 {/* check:on */} 包起来，两个检查器都会跳过。
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

HAN = r"[一-鿿]"

# (类别, 正则, 是否硬性)。硬性项默认必须改掉，提醒项结合语境判断。
RULES: list[tuple[str, str, bool]] = [
    ("弱动词加抽象名词：进行/加以/予以，直接用动词", r"(进行|加以|予以)(了)?" + HAN, True),
    ("弱动词加抽象名词：做出/作出贡献、反应、决定……，直接用动词", r"(做出|作出|作了)(了)?[^。，；]{0,8}(贡献|反应|决定|努力|回应|调整|改变|判断|选择|评价|承诺|解释|说明|让步|牺牲|奋斗|分析|研究)", True),
    ("造成……死亡/伤亡/损失，直接说死了几个人、亏了多少", r"造成[^。，；]{0,12}(死亡|伤亡|损失|影响)", True),
    ("“人们”，改成大家、人人、很多人", r"人们", True),
    ("-性/-度 伪术语，改回形容词或动词", r"(可读性|可看性|可听性|可玩性|知名度|满意度|活跃度|难度很高)", True),
    ("“成功地”多余，做成了就是成功了", r"成功地", True),
    ("“由于……使得”，因果交代过头", r"由于[^。]{0,30}使得", True),
    ("“基于这个原因”，改成因此、所以", r"基于(这个|此)原因", True),
    ("“作为……之一的”把主语压在底下", r"作为[^。，]{0,20}之一的", True),
    ("“有很多……存在”，改成……很多", r"有[^。，]{0,10}存在", True),
    ("存在着/具有着/有着，用“有”或“富于”", r"(存在着|具有着|是具有|有着)", True),
    ("“截至目前为止”，改成迄今、到现在", r"截至目前为止", True),
    ("“最……之一”，改成“一大……”或直说", r"最[^。，；]{1,12}之一", True),
    ("“一定的”程度/贡献，改成略有、颇有、有限度地", r"(一定的|一定)(程度|贡献|影响|作用|帮助)", True),
    ("“有关于”，删掉", r"有关于", True),
    ("句末蛇足：……的发生/的原因/的存在", r"(的发生|的原因|的存在)(?=[。！？])", True),
    ("“作为一个……”，改成做、身为", r"作为一(个|名|位)", True),
    ("“给予”，多数可以换成具体动词", r"给予", False),
    ("先报题再打冒号（英文 colon 的用法），直接说", r"(一句话|总结一下|道理不难|结论是|原因是|答案是|问题是|关键是|好消息是|坏消息是)：", True),
    ("英文式开场：有意思的是 / 值得一提的是 / 需要注意的是", r"(有意思的是|有趣的是|值得一提的是|需要注意的是|值得注意的是|不可否认的是)", True),
    ("“当……时/的时候”，多数可以删掉“当”", r"当[^。，；]{1,25}(时|的时候)", False),
    ("“作为”，看能不能删", r"作为", False),
    ("“之一”，看能不能直说", r"之一", False),
    ("话题壳：对于……来说/就……而言，把对象直接放到主语位", r"(对于|对)[^。，；]{1,15}(来说|而言)|就[^。，；]{1,12}而言|(^|[。！？])关于[^。，；]{1,12}，", False),
    ("句首连接词当路标：然而/此外/因此……，挪到主语后或删掉", r"(^|[。！？]\s*)(然而|此外|因此|与此同时|换言之|总而言之|综上所述)，", False),
    ("拟人喻体：把工具比作理想化的人，改成它实际做了什么", r"(像|相当于|好比|宛如)(是)?(一个|一位|一名)[^。，；]{0,10}(导师|秘书|助手|顾问|管家|审查员|实习生|教练|伙伴|向导|守门人|保姆|副驾驶|搭档)", False),
    ("读者认证语：替读者下结论，删掉", r"你已经(超过|领先|比)|超过了?(90%|百分之九十|大多数|绝大多数)的人|完全不用担心|不用担心|放心吧|相信我", False),
    ("跟假想的反对者辩论，直接说自己的判断", r"有人(可能|也许)?会(说|问|觉得|认为)|你(可能|也许)会(问|说|想|觉得)|这并不意味着|这不是说", False),
    ("写文章本身而不写主题：下面我们来/本文将/下表对比了，删掉直接写", r"(?<![“\"])(本文(将|会|要)|(下面|接下来)(我们)?(来|将|就)|下面是|以下是|如下所示|下表(对比|列出|总结|汇总)了)", False),
    ("……的作用是/的方式是，名词当主语", r"的(作用|方式|过程|结果|目的)(主要)?是", False),
    ("“一种/一个”加抽象名词，看能不能删量词", r"一(种|个)" + HAN + r"{0,4}(的)?(方式|方法|态度|感觉|现象|过程|状态|体验|能力)", False),
]

# 段首评论语：非首段以它开头又没有回指上文的词，读者得回上一段找它在说什么
COMMENT_OPENER = re.compile(r"^(听起来|看起来|看上去|听上去|说到底|换句话说|意味着|不难看出|回过头看|问题在于|原因在于|结果是|更重要的是|关键在于|真正的)")
ANAPHOR = re.compile(r"^(这|那|其|此|上面|前面|刚才|以上|该|它|他们|它们|同样|类似|相比|反过来|但|不过|所以|于是|而)")
LIST_LINE = re.compile(r"^\s*([-*+]|\d+[.、)]|\|)")

DE_LIMIT = 3  # 一句里“的”达到这个数就提醒
DE_PER_100 = 5  # 全文每百字“的”超过这个数就提醒。余光中数过，《红楼梦》、钱钟书每百字约 4 个


def strip_post(text: str) -> str:
    """去掉不属于正文的部分，保留行号对应关系（被去掉的行留空）。"""
    lines = text.split("\n")
    out: list[str] = []
    in_front = in_code = in_off = False
    for i, line in enumerate(lines):
        if re.search(r"\{/\*\s*check:off\s*\*/\}", line):
            in_off = True
        if in_off:
            if re.search(r"\{/\*\s*check:on\s*\*/\}", line):
                in_off = False
            out.append("")
            continue
        if i == 0 and line.strip() == "---":
            in_front = True
            out.append("")
            continue
        if in_front:
            if line.strip() == "---":
                in_front = False
            out.append("")
            continue
        if line.lstrip().startswith("```"):
            in_code = not in_code
            out.append("")
            continue
        if in_code or line.startswith("import "):
            out.append("")
            continue
        line = re.sub(r"`[^`]*`", "", line)
        # 引号里的词按“提到”处理：引原话、举反例时不报
        line = re.sub(r"“[^”]{0,80}”|\"[^\"]{0,80}\"|「[^」]{0,80}」", "“”", line)
        line = re.sub(r"<[^>]+>", "", line)
        line = re.sub(r"\]\([^)]*\)", "]", line)
        out.append(line)
    return "\n".join(out)


def structure_hits(lines: list[str]) -> list[tuple[int, str, bool, str]]:
    """跨行的结构检查，返回 (行号, 类别, 是否硬性, 摘录)。

    相邻句同一个骨架、顿号罗列试过，拿人类文章测，人类命中比本站文章还多，没有收。
    """
    hits: list[tuple[int, str, bool, str]] = []
    prose_seen = 0
    for i, line in enumerate(lines):
        text = line.strip()
        if not re.search(HAN, text) or text.startswith(("#", "|", ">", "!")) or LIST_LINE.match(line):
            continue
        # 空转句引出列表：这一行以冒号结尾，下一个非空行是列表或表格
        if re.search(r"[：:]\s*$", text):
            nxt = next((l for l in lines[i + 1 :] if l.strip()), "")
            if LIST_LINE.match(nxt):
                hits.append((i + 1, "空转句引出列表：冒号前这半句有内容就把冒号改成句号，没内容就删掉", True, re.split(r"[。！？]", text)[-1][-30:]))
        if prose_seen and COMMENT_OPENER.match(text) and not ANAPHOR.match(text):
            hits.append((i + 1, "段首评论没有回指：补一个“这”，或点明说的是什么", False, text[:30]))
        prose_seen += 1
    return hits


def check(body: str, skip_tables: bool) -> tuple[list[tuple[int, str, bool, str]], int]:
    found: list[tuple[int, str, bool, str]] = []
    lines = body.split("\n")
    for lineno, line in enumerate(lines, 1):
        if not re.search(HAN, line):
            continue
        if skip_tables and line.lstrip().startswith("|"):
            continue
        for label, pattern, is_hard in RULES:
            for m in re.finditer(pattern, line):
                found.append((lineno, label, is_hard, line[max(0, m.start() - 12) : m.end() + 12].strip()))
        for sentence in re.split(r"[。！？；]", line):
            if sentence.count("的") >= DE_LIMIT:
                found.append((lineno, f"一句里 {sentence.count('的')} 个“的”，拆开或删几个", False, sentence.strip()[:40]))
    if skip_tables:
        lines = ["" if l.lstrip().startswith("|") else l for l in lines]
    found += structure_hits(lines)
    return found, len(re.findall(HAN, body))


def stats(paths: list[str]) -> int:
    files = [f for p in paths for f in (sorted(Path(p).rglob("*")) if Path(p).is_dir() else [Path(p)]) if f.suffix in {".md", ".mdx", ".txt"}]
    counts: dict[str, int] = {}
    han_total = 0
    for f in files:
        found, han = check(strip_post(f.read_text(encoding="utf-8")), False)
        han_total += han
        for _, label, is_hard, _ in found:
            key = ("硬 " if is_hard else "软 ") + re.sub(r"\d+ 个", "N 个", label.split("：")[0].split("，")[0])
            counts[key] = counts.get(key, 0) + 1
    print(f"{len(files)} 篇，汉字 {han_total}")
    for key, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {n * 1000 / han_total:6.2f}/千字  {n:4d}  {key}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="查本站文章里的翻译腔")
    parser.add_argument("path", nargs="+")
    parser.add_argument("--stats", action="store_true", help="统计每条规则每千字命中次数，用来拿人类文章测误报")
    parser.add_argument("--strip", action="store_true", help="只输出正文，可以接着交给 check_prose.py")
    parser.add_argument("--skip-tables", action="store_true", help="不查表格行")
    parser.add_argument("--json", action="store_true", help="输出机器可读的 JSON 格式")
    args = parser.parse_args()

    if args.stats:
        return stats(args.path)
    try:
        text = Path(args.path[0]).read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        print(f"无法读取稿件。{error}", file=sys.stderr)
        return 2

    body = strip_post(text)
    if args.strip:
        sys.stdout.write(body)
        return 0

    found, han = check(body, args.skip_tables)
    hard = [f"  第 {n} 行 [{label}] …{ctx}…" for n, label, h, ctx in sorted(found) if h]
    soft = [f"  第 {n} 行 [{label}] …{ctx}…" for n, label, h, ctx in sorted(found) if not h]
    de = body.count("的") * 100 / han if han else 0
    if de > DE_PER_100:
        soft.insert(0, f"  全文每百字 {de:.1f} 个“的”，超过 {DE_PER_100}，整篇过一遍能删的“的”")
    if args.json:
        import json
        data = {
            "han_count": han,
            "de_per_100": round(de, 2) if han else 0,
            "hard_count": len(hard),
            "soft_count": len(soft),
            "hard_errors": [
                {"line": n, "label": label, "context": ctx}
                for n, label, h, ctx in sorted(found) if h
            ],
            "soft_warnings": [
                {"line": n, "label": label, "context": ctx}
                for n, label, h, ctx in sorted(found) if not h
            ],
            "passed": len(hard) == 0
        }
        if de > DE_PER_100:
            data["soft_warnings"].insert(0, {"line": 0, "label": "连环的", "context": f"全文每百字 {de:.1f} 个“的”，超过 {DE_PER_100}"})
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 1 if hard else 0

    print(f"汉字数 {han}，每百字“的” {de:.1f} 个，硬性 {len(hard)} 处，提醒 {len(soft)} 处")
    if hard:
        print("\n需要改")
        print("\n".join(hard))
    if soft:
        print("\n回到原句判断")
        print("\n".join(soft))
    return 1 if hard else 0


if __name__ == "__main__":
    sys.exit(main())
