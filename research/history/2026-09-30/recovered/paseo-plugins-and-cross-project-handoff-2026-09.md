# Paseo 插件与跨项目接力：九月历史讨论

> 历史恢复，未重新核验插件存在性、维护者归属、功能、安装状态或稳定性。文中“官方”“最实用”“已装”等均是当时 AI 的表述，不代表本次验证。

这份讨论补充了 09-17 的插件清单。用户真正提出的需求是：把在一个项目中形成的上下文带到相关的另一个项目继续工作。后续连续反馈功能消失、会话中心不可见，因此不能只保留助手的完成声明。本次没有检查相关实现或判定故障根因，也没有再次安装插件或修改客户端。

## 用户 · 原会话第 367 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-09-28T02-20-48-738Z_01a0e5d0-9ae2-74dd-9ce7-a793a909dfdd.jsonl:367`。

再多调研，看还有哪些好的插件

## 历史 AI 回答 · 原会话第 380 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-09-28T02-20-48-738Z_01a0e5d0-9ae2-74dd-9ce7-a793a909dfdd.jsonl:380`。

通过对 **Paseo 官方生态**、**`omercnet/awesome-paseo-plugins`** 以及主流社区仓库（`panrafal`、`omercnet`、`gpambrozio` 等）的深度调研，为您系统整理了当前最实用、评价最高的 Paseo 插件体系：

---

### 一、 监控、全局会话与多任务运维（必备核心）

| 插件名 | 来源 | 核心功能与亮点 |
| :--- | :--- | :--- |
| **`agent-monitor`** *(已装)* | `omercnet/paseo-plugins` | **全景状态分桶**：按 Attention / Running / Idle / Closed 分流；**树状项目聚合**；**实时 Diff 统计**（展示 `+新增 -删除` 代码行数）；原生内嵌跳转。 |
| **`agents-dash-list`** *(已装)* | `panrafal/paseo-plugins` | **7 级状态生命周期看板**：Waiting for you / Unread / In progress / Failing / Approved 等；支持多 Host 聚合与一键批量归档。 |
| **`agents-history`** *(已装)* | `panrafal/paseo-plugins` | **会话全文检索引擎**：对本地全部历史会话 Transcript 进行分词排名搜索与正则过滤，支持一键唤醒已归档会话。 |
| **`schedule-runs`** | `panrafal/paseo-plugins` | **定时任务全局监控**：聚合所有 Cron 巡检与自动化计划任务的执行状态、产出及异常历史。 |

---

### 二、 多 Agent 协同、接力与路由增强

| 插件名 | 来源 | 核心功能与亮点 |
| :--- | :--- | :--- |
| **`chat-resume`** | `panrafal/paseo-plugins` | **跨 Provider 自动接力**：当 Claude/Codex 达到每日用量上限（Quota/Rate limit）时，自动生成无缝交接草稿，**一键在同一工作区无缝切给备用模型（如 OMP/DeepSeek）继续干**。 |
| **`profile-routing`** | `panrafal/paseo-plugins` | **智能模型路由器**：充当总管 Agent，分析任务复杂度后自动分发（简单查文件调低成本模型，核心架构重构调顶级大模型）。 |
| **`fresh-worktrees`** | `omercnet/paseo-plugins` | **Git Worktree 自动防落后**：为每个 Agent 创建独立分支时自动 Fast-forward 保持最新，工作区落后远程主分支时顶部显示 `Behind · N` 预警。 |
| **`agent-heartbeats`** | `panrafal/paseo-plugins` | **心跳探活与守护**：在输入框提供 Heartbeat 胶囊，设置定时巡检，防止大任务后台静默挂死。 |

---

### 三、 开发环境与工具链扩展

| 插件名 | 来源 | 核心功能与亮点 |
| :--- | :--- | :--- |
| **`shared-browser`** | `omercnet/paseo-plugins` | **真机双向共享浏览器**：在 Daemon 宿主机启动真实 Chromium，手机/桌面端实时双向投屏与操控，并自动向 Agent 注入标准浏览器 MCP 控制工具。 |
| **`vscode-open-remote`** | `panrafal/paseo-plugins` | **一键唤起本地编辑器**：在输入框提供 **Editor** 胶囊，点击秒级将当前 Agent 的 Worktree 路径在本地 **VS Code** 或 **Cursor** 中打开。 |
| **`skills-usage`** | `panrafal/paseo-plugins` | **Skill 技能快捷盘**：输入框显示当前会话加载的所有 Skill 数量，点击弹窗可直接按关键字搜索并自动填入 `/skill-name`。 |
| **`mermaid`** | `dutchakdev/paseo-plugin-mermaid` | **流程图直接渲染**：将模型输出的 Mermaid 代码在聊天时间线中直接渲染为交互式架构图、时序图。 |

---

### 四、 成本、配额与项目看板

| 插件名 | 来源 | 核心功能与亮点 |
| :--- | :--- | :--- |
| **`session-usage` / `usage-monitor`** | `panrafal` / `ABorakati` | **Token 与成本透视表**：按 Provider、模型、项目统计 Token/缓存命中/折合费用，并展示各模型剩余额度可用时长。 |
| **`pr-radar` / `github-board`** | `omercnet` / `gpambrozio` | **GitHub 侧边栏看板**：自动同步待处理 PR、CI 检查报错，支持点击一键拉起 Agent 去修复报错。 |
| **`task-link`** | `panrafal/paseo-plugins` | **工单联动**：自动识别分支名或任务中的工单号（Jira、Notion、Linear），在顶部生成可直接点击跳转的工单胶囊。 |

---

### 五、 体验与主题美化

| 插件名 | 来源 | 核心功能与亮点 |
| :--- | :--- | :--- |
| **`reasoning-display`** | `mcowger/paseo-plugins` | **思考链优化**：将模型内部的 Thinking / CoT 过程收纳为美观的可折叠 Markdown 原生卡片。 |
| **`catppuccin-theme` / `paseo-dracula`** | `sleeyax` / `omercnet` | 为桌面和 Web 端注入经典暗黑/明亮主题配色。 |

---

### 💡 针对“项目多、多任务并发”的推荐安装组合

1. **看会话与多任务**：`agent-monitor` + `agents-dash-list` *(当前已就绪)*
2. **快速开代码排查**：`vscode-open-remote`（一键唤起 VS Code/Cursor）
3. **防止额度断档**：`chat-resume`（用量超限自动排队/切备用模型）
4. **长耗时/网页端任务**：`shared-browser`（随时在手机/桌面看 Agent 实时操作的浏览器）

如需安装上述列表中的任一插件，随时告诉我即可直接为您接入！

## 用户 · 原会话第 383 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-09-28T02-20-48-738Z_01a0e5d0-9ae2-74dd-9ce7-a793a909dfdd.jsonl:383`。

chat-resume 本身不就是分叉的功能吗

## 历史 AI 回答 · 原会话第 384 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-09-28T02-20-48-738Z_01a0e5d0-9ae2-74dd-9ce7-a793a909dfdd.jsonl:384`。

您理解得很准，它的底层确实利用了类似“分叉会话（Fork / Handover Draft）”的机制，但它和 Paseo 原生 **Fork** 解决的痛点和触发场景有所不同：

---

### 一、 核心区别对比

| 维度 | Paseo 原生 Fork 功能 | `chat-resume` 插件 |
| :--- | :--- | :--- |
| **触发意图** | **主动探索不同路线**：想在某个历史回复点尝试另一种改法、或者回退重试。 | **被动接力与救场**：会话因**额度耗尽、限流或意外中断**卡住，需要救活。 |
| **触发位置** | 用户在聊天记录的任意中间轮次点击 "Fork"。 | 会话顶部/输入框自动弹出救场胶囊（Pill）。 |
| **跨 Provider 能力** | 通常在同一种 Provider 下分叉分支。 | **支持跨模型/跨 Provider 无缝交接**：例如 Claude 额度用完了，自动提取未完成的上下文和工作区状态，一键切给 Codex 或 OMP 继续干。 |
| **定时自动恢复** | 无时间感知，需人工手动再次发起。 | **额度刷新定时器**：识别 Claude 的重置时间（如 3 小时后），支持配置“额度重置时自动叫醒继续跑”。 |
| **异常恢复** | 不感知进程崩溃。 | 如果是 Daemon 重启或 Provider 意外挂掉，自动识别断点并提供一键 **Continue**。 |

---

### 二、 总结

* **原生 Fork**：类似于 Git 中的 `git checkout -b new-branch`，是您主动去开辟方案 B；
* **`chat-resume`**：类似于**断点续传 + 跨模型接力棒**，专为“打大任务打到一半大模型被限流/挂掉”时的自动化恢复而设计。

## 用户 · 原会话第 387 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-09-28T02-20-48-738Z_01a0e5d0-9ae2-74dd-9ce7-a793a909dfdd.jsonl:387`。

实际上我有这个的需求，就是现在分叉只能分叉到当前项目，实际上有时间我在两个相关的项目里面的其中一个讨论，最后要把会话直接分到到相关的另一个项目

## 用户 · 原会话第 494 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-09-28T02-20-48-738Z_01a0e5d0-9ae2-74dd-9ce7-a793a909dfdd.jsonl:494`。

跨项目分叉 这个功能又没了，是我更新版本导致的吗

## 用户 · 原会话第 513 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-09-28T02-20-48-738Z_01a0e5d0-9ae2-74dd-9ce7-a793a909dfdd.jsonl:513`。

分叉到项目，又看不到了

## 用户 · 原会话第 691 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-09-28T02-20-48-738Z_01a0e5d0-9ae2-74dd-9ce7-a793a909dfdd.jsonl:691`。

你怎么改的？我会话中心都看不见了。

## 本次归纳的研究问题

1. 会话、产物和未完成任务怎样在项目间交接，才能减少人工复述？
2. 插件推荐是否提供了实际使用证据，还是只汇总功能宣称？
3. 工具升级之后配套能力是否仍然可用，维护成本是否抵消提效？

以上是从用户需求和失败反馈提出的问题，不预设某个插件已经解决。
