# stop-guard

Claude Code 的 Stop hook：防止 agent 任务没做完就停下来问"要不要继续""这样可以吗"。

## 怎么判断

agent 每次准备结束一轮时触发，分三层，越往后越贵，前一层能定的不进下一层：

1. **防死循环**：同一轮用户消息里已经拦过 `STOP_GUARD_MAX_BLOCKS` 次（默认 2），直接放行。
2. **零成本规则**（正则，不发请求）：
   - 最后一段在要密码、授权，或确认删除、force push 这类危险操作 → 放行；
   - 没有提问、请确认、"下一步"、"还没完成"这类迹象 → 放行。
3. **便宜模型**（OpenAI 兼容接口，默认复用 DeepSeek）：剩下拿不准的，把消息归为 A 已完成、B 需用户提供、C 请用户确认方案、D 没做完就停。C、D 拦住，并把模型给的"接下来该做什么"喂回 agent。

出错、超时、缺配置一律放行，不卡住主 agent，但会写进日志。

## 安装

```bash
mkdir -p ~/.claude/hooks/stop-guard
cp tools/stop-guard/stop-guard.py ~/.claude/hooks/stop-guard/
cp tools/stop-guard/stop-guard.env.example ~/.claude/hooks/stop-guard/stop-guard.env
# 编辑 stop-guard.env，填 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
```

在 `~/.claude/settings.json` 里注册：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "python3 ~/.claude/hooks/stop-guard/stop-guard.py", "timeout": 30 }
        ]
      }
    ]
  }
}
```

改了仓库里的脚本后，要重新 `cp` 一次才生效。

## 日志

`~/.claude/hooks/stop-guard/logs/stop-guard.jsonl`，每次判断一行：

- `decision`：`allow` 放行 / `block` 拦住
- `by`：`limit` 防死循环、`rule` 规则、`llm` 模型、`error` 出错放行
- `category`、`reason`：模型的分类和理由；`ms`：模型耗时
- `msg`：agent 最后一条消息的末尾 160 字

跑一段时间后看两件事：
- `"by":"llm"` 有多少条，据此估算成本；
- 拦错或漏拦的样本，据此调整规则或提示词。

## 限制

- 模型会判错。拿不准时按提示词倾向放行，所以漏拦比误拦多。
- 同一轮最多拦 2 次，是硬上限。
- 对话片段会发到配置的模型服务。不想让数据离开本机，就把接口换成本机模型。
