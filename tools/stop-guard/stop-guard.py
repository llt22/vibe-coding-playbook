#!/usr/bin/env python3
"""Claude Code Stop hook：判断这次停下该不该停，不该停就拦住并把理由喂回模型。

分三层，越往后越贵，前一层能定的不进下一层：
1. 防死循环：同一轮用户消息里最多拦 MAX_BLOCKS 次。
2. 零成本规则：先看回复末尾的"自检："行（见 CLAUDE.md），写"未完成"直接拦，写"需要你提供"交给模型判；
   其余没有"提问/待续"迹象的直接放行（要凭据、授权这类交给模型判，关键词太容易误放）。
3. 便宜模型（OpenAI 兼容接口，默认复用 DeepSeek）判断剩下拿不准的。

任何异常都放行（不卡住主 agent），但写进日志，保证可观察。
配置：同目录 stop-guard.env（LLM_BASE_URL / LLM_API_KEY / LLM_MODEL，可选 STOP_GUARD_MAX_BLOCKS）。
日志：同目录 logs/stop-guard.jsonl。
"""
import json
import os
import re
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.realpath(__file__))
LOG_DIR = os.path.join(HERE, "logs")
STATE_DIR = os.path.join(HERE, "state")

# 有停早了的迹象：结尾在提问、请确认、预告下一步、说还没做完
SUSPECT = re.compile(
    r"[？?]\s*$|要不要|要我|需要我|是否(需要|继续|要)|可以吗|行吗|好吗|你确认|请确认|确认后|"
    r"你看(看)?[^。\n]{0,6}(怎么样|如何)|接下来我|下一步|我(可以|再|来)接着|稍后|跑完再|完成后再|"
    r"还没(有)?(完成|做完|开始)|未完成|待办|TODO|"
    r"shall i|should i|want me to|would you like|let me know|next step",
    re.I,
)

# 回复末尾的自检行，如"自检：未完成，还差 X"
SELF_CHECK = re.compile(r"^\s*自检[：:]\s*(.+?)\s*$", re.M)

SYSTEM_PROMPT = """你是编码 agent 的"停止守门员"。agent 刚准备结束这一轮、把控制权交还给用户。判断这次停下是否合理。

用户的规则：
- 多步任务应一直做到完成；用户已给出方向后直接执行，不要再请用户复核方案。
- 在工程方案之间做选择、或想问"这样可以吗"时，应先咨询高级顾问（paseo-senior-advisor skill）再自己决定，而不是停下问用户。
- 只有意图、业务含义、凭据、授权这类只有用户能给的，才应该停下直接问用户。
- 清空数据、物理删除、线上变更、force push 前必须停下确认。

把 agent 的最后一条消息归为一类：
A 任务已完成并汇报结果（或本来就是回答问题/解释，无需继续）
B 需要只有用户能给的信息（意图、业务含义、凭据、授权、危险操作确认）
C 在请用户确认工程方案、在方案间选择，或问"要不要我继续/要我现在改吗"
D 任务没做完就停了（还有明确的下一步可以自己做，却结束了）

A、B 应当停；C、D 不应停。拿不准时判 A 或 B（宁可放行）。
只输出 JSON：{"category":"A|B|C|D","reason":"不超过60字；C/D 时写清 agent 接下来应该自己做什么"}"""


def load_env():
    env = {}
    path = os.path.join(HERE, "stop-guard.env")
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip("'\"")
    return {**env, **{k: v for k, v in os.environ.items() if k.startswith("STOP_GUARD_")}}


def log(entry):
    os.makedirs(LOG_DIR, exist_ok=True)
    entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S"), **entry}
    with open(os.path.join(LOG_DIR, "stop-guard.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def block_count(session, reset):
    """同一轮用户消息里已经拦了几次。stop_hook_active=false 说明是新一轮，清零。"""
    os.makedirs(STATE_DIR, exist_ok=True)
    path = os.path.join(STATE_DIR, re.sub(r"[^\w-]", "_", session or "unknown"))
    if reset:
        if os.path.exists(path):
            os.remove(path)
        return 0, path
    try:
        return int(open(path).read().strip() or 0), path
    except (FileNotFoundError, ValueError):
        return 0, path


def last_user_text(transcript_path, limit=1500):
    """从 transcript 里取最近一条用户手打的消息（跳过工具结果），给模型当背景。取不到就返回空。"""
    if not transcript_path or not os.path.exists(transcript_path):
        return ""
    with open(transcript_path, "rb") as f:
        f.seek(0, 2)
        f.seek(max(0, f.tell() - 2_000_000))
        lines = f.read().decode("utf-8", "ignore").splitlines()
    for line in reversed(lines):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        if d.get("type") != "user" or d.get("isMeta"):
            continue
        c = (d.get("message") or {}).get("content")
        if isinstance(c, list):
            c = "".join(b.get("text", "") for b in c if isinstance(b, dict) and b.get("type") == "text")
        if isinstance(c, str) and c.strip() and not c.lstrip().startswith("<"):
            return c.strip()[-limit:]
    return ""


def ask_llm(env, user_text, message):
    base = env.get("LLM_BASE_URL", "").rstrip("/")
    key, model = env.get("LLM_API_KEY", ""), env.get("LLM_MODEL", "")
    if not (base and key and model):
        raise RuntimeError("stop-guard.env 缺少 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL")
    content = f"用户最近的要求：\n{user_text or '（未取到）'}\n\nagent 的最后一条消息：\n{message[-4000:]}"
    body = json.dumps({
        "model": model,
        "temperature": 0,
        "max_tokens": 200,
        "reasoning_effort": "none",  # 思考型模型会把 max_tokens 耗在推理上，content 为空
        "response_format": {"type": "json_object"},
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": content}],
    }).encode()
    req = urllib.request.Request(
        f"{base}/chat/completions", data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=float(env.get("STOP_GUARD_TIMEOUT", 20))) as r:
        text = json.load(r)["choices"][0]["message"]["content"]
    m = re.search(r"\{.*\}", text, re.S)
    verdict = json.loads(m.group(0) if m else text)
    if verdict.get("category") not in ("A", "B", "C", "D"):
        raise ValueError(f"模型返回的分类不合法：{text[:200]}")
    return verdict


def say(text, **extra):
    """把判定结论显示在用户界面上（systemMessage），block 时附带 decision/reason。"""
    print(json.dumps({"systemMessage": f"[stop-guard] {text}", **extra}, ensure_ascii=False))


def main():
    inp = json.load(sys.stdin)
    session = inp.get("session_id", "")
    message = (inp.get("last_assistant_message") or "").strip()
    env = load_env()
    max_blocks = int(env.get("STOP_GUARD_MAX_BLOCKS", 2))
    base = {"session": session[:8], "msg": message[-160:]}

    count, state = block_count(session, reset=not inp.get("stop_hook_active"))
    if count >= max_blocks:
        log({**base, "decision": "allow", "by": "limit", "blocks": count})
        return say(f"放行 · 已连续拦截 {count} 次，达到上限")
    if not message:
        log({**base, "decision": "allow", "by": "rule", "why": "无文本"})
        return say("放行 · 规则：无文本")
    checks = SELF_CHECK.findall(message[-600:])
    check = checks[-1] if checks else ""
    if check.startswith("未完成"):
        open(state, "w").write(str(count + 1))
        log({**base, "decision": "block", "by": "self-check", "blocks": count + 1, "check": check})
        return say(
            f"拦截 · 自检写了{check}（第 {count + 1}/{max_blocks} 次）",
            decision="block",
            reason=(
                f"[stop-guard] 你的自检写的是「{check}」，请继续把剩下的做完。"
                "如果确实做不下去，说明阻塞原因，并把自检改成「需要你提供 Y」。"
            ),
        )
    # 自检行挂在末尾会挡住"以问号结尾"等规则，先去掉再判
    tail = SELF_CHECK.sub("", message).strip()[-600:]
    if not check.startswith("需要你提供") and not SUSPECT.search(tail):
        log({**base, "decision": "allow", "by": "rule", "why": "无停早迹象"})
        return say("放行 · 规则：无停早迹象")

    t0 = time.time()
    verdict = ask_llm(env, last_user_text(inp.get("transcript_path")), message)
    ms = int((time.time() - t0) * 1000)
    cat, why = verdict["category"], verdict.get("reason", "")
    if cat in ("A", "B"):
        log({**base, "decision": "allow", "by": "llm", "ms": ms, **verdict})
        return say(f"放行 · 模型判 {cat}（{ms}ms）：{why}")

    open(state, "w").write(str(count + 1))
    log({**base, "decision": "block", "by": "llm", "ms": ms, "blocks": count + 1, **verdict})
    say(
        f"拦截 · 模型判 {cat}（{ms}ms，第 {count + 1}/{max_blocks} 次）：{why}",
        decision="block",
        reason=(
            f"[stop-guard] 这次不该停（{cat}）：{why}\n"
            "请直接继续执行。需要在工程方案间选择时，按 paseo-senior-advisor skill 咨询后自己决定；"
            "只有意图、业务含义、凭据、授权才停下问用户。如果确实已经完成，简要说明结果后结束。"
        ),
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # 守门员自己出错不能卡住主 agent：放行，但留痕
        try:
            log({"decision": "allow", "by": "error", "error": f"{type(e).__name__}: {e}"[:300]})
        except Exception:
            pass
        say(f"出错已放行：{type(e).__name__}: {e}"[:300])
    sys.exit(0)
