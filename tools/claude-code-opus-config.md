# Opus 5.5 发布后，Claude Code 该怎么配（官方推荐）

> 依据 Claude 官方博客 9 月的两篇新文章和官方文档（文末附链接）。
> 第一节是核心内容，读完就可以动手配置；也可以把整份文档发给 Claude Code，让它按第二节帮你配。

---

## 一、核心内容：为什么换、怎么配

### 为什么推荐换成 Opus 5.5

Opus 5.5 是目前日常开发的最优选择，社区公认有三个优点：

- **快**：媒体实测响应速度比 Opus 5 快 30% 以上；GitHub 的测试者反馈，同样的终端任务，它用不到一半的步数就能完成。
- **强**：官方博客引用测试者反馈，Opus 5.5 在**最低档位**做代码审查，找出的 bug 比 Opus 5 开高档位还多，误报更少。提升最大的是多步骤任务，比如在大仓库里把一个改动一直推进到测试全部通过。
- **省**：单价降了 20%（输入 $4、输出 $20 / 百万 token），缓存读取降了 60%（$0.20）。官方算过，同一个典型任务从 $3.50 降到 $2.40，便宜约 31%。

不过模型好不等于账单低。同一个任务，配置不同，花费可能差好几倍，所以建议大家顺手把下面几项配置也调一下。

### 推荐配置

**一句话：日常用 Opus 5.5 + medium 档；用 API Key、公司网关或中转站的开 1 小时缓存；压缩阈值按自己的习惯选。**

打开 `~/.claude/settings.json`，**合并**下面这几行（不要整个覆盖，原有的 token、网关地址等要保留）：

```json
{
  "model": "opus",
  "effortLevel": "medium",
  "promptCacheTtl": "1h",
  "autoCompactWindow": 190000
}
```

有三点需要按自己的情况处理：

| 项 | 怎么处理 |
|---|---|
| `promptCacheTtl` | 用 API Key、公司网关、中转站、云厂商的**要配**；用 Claude 订阅（Pro/Max）的**不用配**，默认就是 1 小时 |
| `autoCompactWindow` | **自己选**：想省钱、想让模型更专注就写 190000（我的选择）；习惯用满 100 万上下文就删掉这一行。利弊见 [4.1](#41-上下文压缩19-万还是-100-万) |
| `env` 里的 `CLAUDE_CODE_EFFORT_LEVEL` | 有就**删掉**。它会强制覆盖所有档位设置，调什么都不生效 |

### 日常怎么切档位

在会话里输入命令切换：

- 头脑风暴、改名、套模式：`/effort low`
- 日常开发：保持 medium
- **老项目里修 bug**、medium 卡住时：`/effort high`
- 难题需要它全程自主搞定：`/effort max`

以上就是全部需要改的地方。第二节是给 AI 的执行步骤；第三节往后是成本原理和各项取舍的详细说明，供需要时参考。

---

## 二、交给 AI 配置

如果不想手动改，可以把整份文档发给 Claude Code，并说：**「按这份文档第二节帮我配置」**。

### 给 AI 的执行步骤

> 以下内容写给执行配置的 AI。严格按顺序执行，每一步完成后再进行下一步。

1. **读取现有配置**：读取 `~/.claude/settings.json`；不存在就新建一个 `{}`。**全程不要输出任何 token、API Key、密码的值**，汇报时用 `***` 代替。
2. **写入固定项**：合并 `"model": "opus"` 和 `"effortLevel": "medium"`，保留其他所有字段。`effortLevel` 不能写 `max`（会被忽略）。
3. **判断是否需要 1 小时缓存**：如果 `env` 里有 `ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_API_KEY`，或配置了 Bedrock、Vertex 相关变量，说明用户走的是 API、网关或云厂商，合并 `"promptCacheTtl": "1h"`。都没有则说明是订阅用户，不写这一项。
4. **压缩阈值问用户**：问用户选「19 万自动压缩（省钱、模型更专注）」还是「用满 100 万（不打断长任务，但更贵）」。选前者写 `"autoCompactWindow": 190000`；选后者不写，已有则删除。
5. **清理档位覆盖**：
   - `settings.json` 的 `env` 里有 `CLAUDE_CODE_EFFORT_LEVEL` 就删除。
   - 检查 `~/.zshrc`、`~/.bashrc`、`~/.bash_profile`、`~/.zprofile` 里有没有 `export CLAUDE_CODE_EFFORT_LEVEL`，有的话**告诉用户在哪个文件第几行**，由用户决定是否删除，不要自动改 shell 配置。
6. **校验 JSON**：运行 `jq empty ~/.claude/settings.json`，必须没有报错。
7. **CC Switch 用户要同步**：如果存在 `~/.cc-switch/cc-switch.db`，说明用户用 CC Switch 管理供应商。CC Switch 切换供应商时会用数据库里的配置覆盖 `settings.json`，所以要提醒用户在 CC Switch 里把当前供应商的配置同步成同样的字段（或者征得用户同意后，先备份数据库，再更新 `providers` 表中 `is_current=1` 那一行的 `settings_config`）。
8. **验证 1 小时缓存**（只在第 3 步写了 `promptCacheTtl` 时做）：运行

   ```bash
   claude -p "只回复 ok" --append-system-prompt "ttl-check-$(date +%s)" --output-format json 2>/dev/null | jq '.usage.cache_creation'
   ```

   - `ephemeral_1h_input_tokens` 大于 0：1 小时缓存生效。
   - 只有 `ephemeral_5m_input_tokens` 大于 0：网关没有转发 `anthropic-beta` 请求头，告诉用户去找网关管理员。
9. **汇报**：列出改了哪些字段（改前 → 改后）、跳过了什么及原因、第 5 步发现的 shell 配置位置、第 8 步的验证结果。

---

> 以下是成本原理和各项取舍的详细说明。

---

## 三、配置背后的成本原理

### 3.1 三个数字

1. **缓存命中率不同，同一个任务价格差 11 倍。** 同样处理 280 万输入 token（Opus 5.5）：缓存命中 0% 要 **$11.20**，90% 要 $1.62，96% 只要 **$0.99**。
2. **输出比输入贵 5 倍，思考也算输出。** 思考过程哪怕界面只显示摘要，也全额计费。一个任务 6 万输出 token 就是 $1.20，够从缓存里读 600 万 token。
3. **档位开对，难题成功率能多一大截。** Fable 5.1 从 low 调到 max：安全类任务 64% → 87%，硬件类 34% → 75%。代价是 token 用量约为 3 倍（中位数 73k → 222k）。

**花多少钱不看单价，看「轮数 × 上下文长度 × 缓存命中率 + 思考量」。**

### 3.2 钱花在哪

每发一轮对话，Claude Code 都会**把之前的全部上下文重发一遍**。

| 成本来源 | 为什么贵 | 怎么省 |
|---|---|---|
| **轮数** | 每轮重发全部历史；40 轮 × 12 万上下文 ≈ 280 万输入 | 需求一次说清，减少来回 |
| **缓存命中率** | 命中按 5% 价格算，没命中按全价 | 别让缓存过期，别中途换模型 |
| **输出/思考** | 单价是输入的 5 倍 | 按任务选档位，不要一直开最高 |
| **模型** | Fable 单价是 Opus 5.5 的 2.5 倍，子代理默认继承主模型 | 搜索、读日志等杂活交给 Sonnet/Haiku |

参考值：官方统计企业用户平均**每人每活跃日约 $13**，90% 的人低于 $30。明显超出的话，对照上表检查。

### 3.3 每项配置的理由

- **`model: opus`**：日常主力用 Opus 5.5，理由见第一节。
- **`effortLevel: medium`**：官方推荐的默认档，覆盖大部分日常开发。只能填 low / medium / high / xhigh，**填 `max` 无效**（`max` 只能在会话里用 `/effort max` 临时开）。
- **`promptCacheTtl: 1h`**：见 [4.2](#42-缓存时长1-小时还是-5-分钟)。
- **`autoCompactWindow`**：官方没有推荐值，见 [4.1](#41-上下文压缩19-万还是-100-万)。
- **删掉 `CLAUDE_CODE_EFFORT_LEVEL`**：这个环境变量优先级高于所有设置，会强制覆盖所有会话和子代理的档位。

---

## 四、两个需要自己选的项

### 4.1 上下文压缩：19 万还是 100 万

Opus 5.5 有 100 万 token 的上下文窗口。不设 `autoCompactWindow`，要到约 **96.7 万**才自动压缩；设了之后，到你设的值就压缩（把之前的对话总结成摘要，继续干活）。

这一项大家习惯差别很大，没有标准答案：

| | 早压缩（如 19 万） | 用满 100 万（不设） |
|---|---|---|
| **每轮成本** | 低。每轮重发的历史少，按缓存价约 $0.04/轮 | 高。上下文到 80 万时约 $0.16/轮，是 4 倍；缓存一旦过期，重算一次要 $3 左右 |
| **效果** | 上下文短，模型注意力更集中 | 上下文越长，模型越容易忽略或记混前面的细节（业内称为 context rot，上下文腐化） |
| **连续性** | 压缩会丢细节，摘要里没写到的内容模型就不记得了 | 什么都在，适合需要反复对照大量代码和文档的长任务 |
| **适合** | 日常开发、任务边界清晰、习惯勤 `/clear` 的人 | 大型重构、跨很多文件的排查、架构分析、不想被压缩打断的人 |

**我的选择是 19 万**：一是省钱，二是上下文太长时效果会变差，宁可让它压缩成摘要重新聚焦。需要长上下文的任务（比如用 Fable 做架构）单独开，见 5.2。

**已经习惯 100 万的同学**可以保持不设，但建议养成两个习惯：换任务就 `/clear`，在任务间隙主动 `/compact`。

怎么设、怎么临时改：

- 长期生效：settings.json 里写 `autoCompactWindow`（10 万到 100 万之间），或在会话里输入 `/autocompact 190k`（会写回 settings.json）。
- 只对这一次启动生效：`claude --autocompact 1M`，不改保存的设置。
- 恢复默认：删掉这一项，或 `/autocompact auto`。

### 4.2 缓存时长：1 小时还是 5 分钟

**背景**：今年 3 月初，官方在没有公告的情况下把 Claude Code 的默认缓存时长从 1 小时改成了 5 分钟。很多人发现工作方式没变，账单和额度消耗却涨了，GitHub 上有人统计多付了 17%，社区反弹很大。之后官方做了调整，现在的规则是：

| 你怎么用 Claude Code | 默认缓存时长 | 要不要配 |
|---|---|---|
| Claude 订阅（Pro/Max），额度内 | 1 小时 | 不用配 |
| API Key、公司网关、中转站、云厂商 | **5 分钟** | **建议配 `promptCacheTtl: 1h`** |

官方文档原话：*"If you sign in with an API key or use a cloud provider, set `promptCacheTtl` to `1h` to give the main conversation a one-hour cache."*

**怎么取舍**：1 小时缓存的写入更贵（输入价的 2 倍，5 分钟是 1.25 倍）。

- 经常停下来看代码、想方案、开个会再回来：5 分钟缓存早就过期了，回来第一轮要全价重算。**这种节奏配 1 小时更划算，大部分人属于这种。**
- 一直连续快速地发消息，从不停顿超过 5 分钟：1 小时用不上，反而多付写入费。

**走网关或中转站的同学**：1 小时缓存需要网关原样转发 `anthropic-beta` 请求头，配完按第二节第 8 步验证一下。

---

## 五、什么活用什么档位和模型

### 5.1 档位

默认 medium 不动，遇到对应任务时在会话里输入 `/effort xxx` 切换：

| 档位 | 用在什么时候 | 例子 |
|---|---|---|
| `low` | 要快、要来回交互 | 头脑风暴、画草图、改名、套模式 |
| `medium` | **大部分日常开发（默认）** | 实现新功能、常规改动 |
| `high` | 需要仔细验证、边界情况多 | **在老项目里修 bug**、medium 卡住时 |
| `xhigh` | 复杂问题 | 跨模块的疑难问题 |
| `max` | 让它完全自主搞定难题 | 从构建到验证一条龙 |

- medium → high 大约多花 $0.40 思考费，相当于一次 10 轮的返工。**该开 high 的时候别省，返工更贵。**
- Opus 5.5 和 Fable 5.1 用 API Key 或订阅时，**中途切档位不会让缓存失效**，放心切。走 Amazon Bedrock、Google Cloud 时会失效，最好在任务开始时就定好。

### 5.2 模型

- **Sonnet / Haiku**：子代理干杂活，比如搜索、读日志、总结。
- **Opus 5.5**：日常主力，用于开发、调试、代码审查。
- **Fable 5.1**：准确度比成本更重要的难题，比如架构设计。需要长上下文时用 `claude --model fable --autocompact 1M` 启动，只对这次生效，不影响日常的压缩设置。
- **中途用 `/model` 换模型一定会让缓存失效**，下一轮要全价重读整段历史。模型在会话开始时就选好。

### 5.3 可选：给机械性任务配一个低档子代理

新建 `~/.claude/agents/opus-low.md`：

```markdown
---
name: opus-low
description: 范围明确的机械性代码编辑：批量改名、套用已知模式、跨文件的机械替换。需要设计判断或排查根因的任务不要交给它。
model: opus
effort: low
---

严格按给定范围和模式修改，不扩大改动。遇到需要判断的地方停下来汇报，不要猜。
完成后汇报改了哪些文件、跳过了哪些及原因。
```

---

## 六、日常习惯（比配置更重要）

1. **换任务就 `/clear`**，别在一个会话里连做不相关的事。
2. **在任务间隙手动 `/compact`**，别等它在任务中途自动压缩；快结束时别压缩，不划算。走错方向想整段放弃时，用 `/rewind` 回退，比压缩更省。
3. **CLAUDE.md 控制在 200 行以内**，它每轮都跟着重发。
4. **走网关时，别在会话中途连接或断开 MCP 服务**，会让缓存失效。
5. **定期看 `/usage`**：`Prompt cache (main)` 会显示缓存命中率，还会提示上次没命中的可能原因。缓存占比低说明在浪费；输出/输入比过高说明档位太高或在反复重试。
6. Agent Teams（实验功能）的 token 用量约为普通会话的 7 倍，用完及时关掉队友。

---

## 依据

- 官方博客 [What a task costs on Opus 5.5](https://claude.dev/blog/what-a-task-costs-on-opus-5-5/)（2026-09-23）
- 官方博客 [Using Claude Code: Spending your effort](https://claude.dev/blog/spending-your-effort/)（2026-09-25）
- 官方博客 [Getting the most out of Opus 5.5](https://claude.dev/blog/getting-the-most-out-of-opus-5-5/)
- 官方文档 [How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching)
- 3 月缓存时长变更讨论：[GitHub Issue #46829](https://github.com/anthropics/claude-code/issues/46829)
- Opus 5.5 速度评测：[Android Authority](https://www.androidauthority.com/claude-opus-5-5-faster-coding-lower-costs-3714261/)
