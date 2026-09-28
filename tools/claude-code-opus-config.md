# Opus 5.5 发布后，Claude Code 该怎么配（官方推荐）

> 依据 Claude 官方博客 9 月的新文章和官方文档（文末附链接）。
> 读完第一节就可以动手，后面是取舍说明。

---

## 一、核心内容：为什么换、怎么配

### 为什么换成 Opus 5.5

- **快**：媒体实测响应比 Opus 5 快 30% 以上；GitHub 的测试者反馈，同样的终端任务，它用不到一半的步数就能完成。
- **强**：官方博客引用测试者反馈，Opus 5.5 开**最低档位**做代码审查，找出的 bug 比 Opus 5 开高档位还多，误报更少。
- **省**：单价降了 20%（输入 $4、输出 $20 / 百万 token），缓存读取降了 60%（$0.20）。同一个典型任务从 $3.50 降到 $2.40。

但模型好不等于账单低。同一个任务，配置不同，花费能差好几倍。

### 推荐配置

**一句话：日常用 Opus 5.5 + medium 档；用 API Key、公司网关或中转站的开 1 小时缓存；压缩阈值按习惯选。**

打开 `~/.claude/settings.json`，**合并**下面几行（不要整个覆盖，原有的 token、网关地址等要保留）：

```json
{
  "model": "opus",
  "effortLevel": "medium",
  "promptCacheTtl": "1h",
  "autoCompactWindow": 190000
}
```

| 项 | 怎么处理 |
|---|---|
| `promptCacheTtl` | 用 API Key、公司网关、中转站、云厂商的**要配**；Claude 订阅（Pro/Max）**不用配**，默认就是 1 小时 |
| `autoCompactWindow` | **自己选**：省钱、让模型更专注就写 190000（我的选择）；想用满 100 万就删掉这行。见 [2.2](#22-上下文压缩19-万还是-100-万) |
| `env` 里的 `CLAUDE_CODE_EFFORT_LEVEL` | 有就**删掉**，它会强制覆盖所有档位设置 |

### 日常怎么切档位

默认 medium 不动，遇到对应任务时在会话里输入 `/effort xxx`：

| 档位 | 用在什么时候 |
|---|---|
| `low` | 头脑风暴、改名、套模式，要快、要来回交互 |
| `medium` | **大部分日常开发（默认）** |
| `high` | **老项目里修 bug**、边界情况多、medium 卡住时 |
| `xhigh` | 跨模块的疑难问题 |
| `max` | 让它从构建到验证完全自主搞定难题 |

- medium → high 大约多花 $0.40 思考费，相当于一次 10 轮的返工。**该开 high 别省，返工更贵。**
- 用 API Key 或订阅时，中途切档位不会让缓存失效；走 Bedrock、Google Cloud 会失效，最好开局定好。

---

## 二、为什么这样配

### 2.1 钱花在哪

每发一轮对话，Claude Code 都会**把之前的全部上下文重发一遍**，所以花多少钱看的是「轮数 × 上下文长度 × 缓存命中率 + 思考量」：

- **缓存命中率**：同样 280 万输入 token，命中 0% 要 $11.20，96% 只要 $0.99，差 11 倍。别让缓存过期。
- **思考算输出**：输出单价是输入的 5 倍，思考过程哪怕只显示摘要也全额计费。按任务选档位，别一直开最高。
- **换模型让缓存失效**：中途 `/model` 换模型，下一轮要全价重读整段历史。模型开局就选好。
- **轮数**：40 轮 × 12 万上下文 ≈ 280 万输入。需求一次说清，减少来回。

参考值：官方统计企业用户平均**每人每活跃日约 $13**，90% 的人低于 $30。

### 2.2 上下文压缩：19 万还是 100 万

Opus 5.5 有 100 万上下文窗口。不设 `autoCompactWindow`，要到约 96.7 万才自动压缩；设了就到设定值压缩（把之前的对话总结成摘要继续干活）。官方没有推荐值：

| | 早压缩（如 19 万） | 用满 100 万（不设） |
|---|---|---|
| **每轮成本** | 低，约 $0.04/轮 | 80 万上下文时约 $0.16/轮；缓存过期重算一次约 $3 |
| **效果** | 上下文短，注意力更集中 | 越长越容易忽略或记混前面的细节（上下文腐化） |
| **连续性** | 压缩会丢摘要里没写到的细节 | 什么都在 |
| **适合** | 日常开发、任务边界清晰 | 大型重构、跨很多文件排查、架构分析 |

我选 19 万；社区里 20 万到 30 万也很常见，按任务长度取。习惯 100 万的同学，建议换任务就 `/clear`，任务间隙主动 `/compact`。

会话里用 `/autocompact 190k` 修改（写回 settings.json），`/autocompact auto` 恢复默认；只想这次启动用满，就 `claude --autocompact 1M`。

### 2.3 缓存时长：1 小时还是 5 分钟

| 你怎么用 Claude Code | 默认缓存时长 | 要不要配 |
|---|---|---|
| Claude 订阅（Pro/Max），额度内 | 1 小时 | 不用配 |
| API Key、公司网关、中转站、云厂商 | **5 分钟** | **建议配 `promptCacheTtl: 1h`** |

1 小时缓存写入更贵（输入价的 2 倍，5 分钟是 1.25 倍）。经常停下来看代码、想方案、开会再回来的，5 分钟早就过期，**配 1 小时更划算，大部分人属于这种**；一直连续快速发消息、从不停顿超过 5 分钟的，才不用配。

走网关或中转站的，需要网关原样转发 `anthropic-beta` 请求头。配完可以验证：

```bash
claude -p "只回复 ok" --append-system-prompt "ttl-check-$(date +%s)" --output-format json 2>/dev/null | jq '.usage.cache_creation'
```

`ephemeral_1h_input_tokens` 大于 0 就是生效了；只有 `ephemeral_5m_input_tokens` 大于 0，说明网关没转发请求头，找网关管理员。

### 2.4 模型怎么选

- **Opus 5.5**：日常主力，开发、调试、代码审查。
- **Sonnet / Haiku**：子代理干杂活，搜索、读日志、总结。子代理默认继承主模型，杂活显式指定小模型。
- **Fable 5.1**：准确度比成本更重要的难题，如架构设计，单价是 Opus 5.5 的 2.5 倍。需要长上下文时 `claude --model fable --autocompact 1M` 单独启动。

---

## 三、日常习惯（比配置更重要）

1. **换任务就 `/clear`**，别在一个会话里连做不相关的事。
2. **任务间隙手动 `/compact`**，别等它在任务中途自动压缩；走错方向想整段放弃时用 `/rewind`，比压缩更省。
3. **CLAUDE.md 控制在 200 行以内**，它每轮都跟着重发。
4. **定期看 `/usage`**：`Prompt cache (main)` 显示缓存命中率和上次没命中的可能原因。

> 用 omp（oh-my-pi）的同学，配置方式不同，见 vibe-coding-playbook 的 [tools/agent-tools.md](agent-tools.md) OMP 一节。

---

## 依据

- 官方博客 [What a task costs on Opus 5.5](https://claude.dev/blog/what-a-task-costs-on-opus-5-5/)（2026-09-23）
- 官方博客 [Using Claude Code: Spending your effort](https://claude.dev/blog/spending-your-effort/)（2026-09-25）
- 官方博客 [Getting the most out of Opus 5.5](https://claude.dev/blog/getting-the-most-out-of-opus-5-5/)
- 官方文档 [How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching)
- Opus 5.5 速度评测：[Android Authority](https://www.androidauthority.com/claude-opus-5-5-faster-coding-lower-costs-3714261/)
