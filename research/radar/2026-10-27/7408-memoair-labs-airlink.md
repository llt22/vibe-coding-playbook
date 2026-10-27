# MemoAir-labs/Airlink

- 结论：**值得一试**。建议在本机或内网小范围试用：用 Docker 启动一个 AirLink 房间，把 Claude Code 或 Codex 接入共享文档、表格与浏览器，观察“智能体直接编辑同一份实时对象、敏感改动转成人工确认”能否减少提示词复制粘贴和来回等待。理由是 README 给出了可直接照做的 quickstart 和权限、记忆配置线索，但项目仅 v0.2.0、无账号体系、单机单桌面，尚不足以直接采用。
- 原文：https://github.com/MemoAir-labs/Airlink
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-27T00:58:08.391Z

## 是什么

AirLink 是 MemoAir-labs 开源（MIT）的自托管“多人实时房间”：人和多个 AI agent 在同一个房间、同一份事件日志上协作。房间内自带富文本文档、带公式的表格、幻灯片、Excalidraw 画布、共享 Chromium 浏览器、一个完整 Linux 桌面，以及可打断的全双工语音 huddle。agent 以真实光标在文档里和你并排编辑；可以接入 Claude Code、Codex、Gemini CLI、opencode 等本地 CLI，或 Anthropic/OpenAI/Google/OpenRouter/Groq/xAI/Mistral/DeepSeek 的模型，也可通过 MCP 接入自定义 harness。

它主张的差异点是：agent 不看你工作的“副本”或逐步截图，而是直接操作同一份实时结构化状态；每个 agent 按对象分配权限，价格、日期、承诺类改动以“建议”形式提交给人确认；agent 记忆是可读、可版本管理的纯 Markdown 文件夹而非黑盒向量库。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：安装 Docker 与 Node 24；准备一个 LLM key（Anthropic 或 OpenAI）。

1. 安装依赖并进入应用目录。

```sh
npm install
cd apps/airlink
```

2. 复制环境变量模板，并填入 LLM key。

```sh
cp .env.example .env            # add ANTHROPIC_API_KEY or OPENAI_API_KEY
```

3. 启动依赖服务（Postgres、LiveKit、共享浏览器、桌面）。

```sh
docker compose up -d            # Postgres, LiveKit, the shared browser and the desktop
```

4. 启动开发服务器。

```sh
npm run dev                     # → http://localhost:3030
```

5. 验证：用两个浏览器窗口打开 `http://localhost:3030`，各取一个名字，在 `#general` 里打招呼；agent 会回复。底部 dock 可添加 doc、sheet、canvas、slides、browser、desktop 或 huddle。

6. （可选）开启语音：在 Settings 里填入 ElevenLabs 或 OpenAI 的 key，agent 即可在 huddle 中出声；否则 agent 只在聊天中回答。README 称语音需要一个 speech key。

7. （可选）扩展桌面数量：默认为“每服务器一个 Docker 桌面”，README 称设置 E2B key 可获得“每个对象一个桌面”。

8. （可选）基于其 SDK 搭建自己的应用：

```sh
npm create airlink@latest my-app full     # or room-react, agent-node
```

9. （可选）自测性能，按 README 给出的基准脚本：

```sh
cd apps/bench
LIVE_JWT_SECRET=<secret> node src/bench.ts --server ws://localhost:3020 --rooms 1 --clients 2 --seconds 30
LIVE_JWT_SECRET=<secret> node src/load.ts --rooms 50 --clients 10 --rate 5 --seconds 60
LIVE_JWT_SECRET=<secret> node src/video.ts --samples 20
```

10. 安全前提（README 明确要求）：默认只监听 localhost；对外开放前需先阅读 `docs/security.md`，并自建认证网关，因为“当前没有账号体系，任何能访问服务器的人都能用任意名字加入”。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：README 列出可交给 agent 的具体工作：实时填充带公式的预算表格、起草计划文档、在画布上画流程、以共享浏览器做研究（人可随时接管）、在语音 huddle 中旁听并作答、长任务在后台跑完后回报到通话中。这些是“原来只在聊天框里做、现在能直接落到共享工件上”的候选能力。
- **任务匹配**：给出了接入方式与匹配边界——本地 CLI（Claude Code/Codex/Gemini CLI/opencode，从 PATH 取）、多家模型 API、MCP 自定义 harness；并明确对比：截图驱动的 computer-use agent 适合“独自在 VM 里逐步操作”，AirLink 适合“与人同时操作同一份实时结构化状态 + 需要人确认的敏感改动”。语音场景需额外 speech key。
- **条件供给**：需要 Docker、Node 24、至少一个 LLM key；可选 speech key、E2B key；配置入口是 `.env` 与 Settings；权限供给按“每个 agent、每个对象”的 scoped permissions；记忆供给为可读可版本的 Markdown 文件夹；状态供给为单一共享事件日志（每次按键、点击、发言都落到同一条日志）；对外供给前必须先补认证。
- **主动推进**：仅有部分依据——README 提到“长任务在后台运行并回报到通话中”，以及事件日志保存“每次改动及改动者”。除这些之外，未给出基于时间/事件/状态触发的调度配置或示例，不足以据此设计触发器。
- **效果验证**：给出了基础设施层面的可复现基准（见下节命令与数字），但没有给出“工作结果是否改善”的业务指标或案例。

## 与已有做法的关系

- **Claude Code（adopt）**：AirLink 明确支持把 `PATH` 上的 Claude Code 作为 agent 接入，属于“给已有 adopt 工具加一层共享实时工作区与人机权限闸门”的组合方式，而非替代。
- **OpenCode（watch）**：README 将 opencode 列为可直接接入的 CLI harness 之一。
- **DeepSeek（try）**：README 将 DeepSeek 列为支持的模型提供方之一，可作为低成本模型接入共享房间。
- **Cursor（watch）**：清单中的 Cursor 属编辑器内 agent；AirLink 的对照对象是“computer-use agent / 托管 VM”，与 Cursor 不构成直接替代，最多是协作形态上的另一种选择。

## 证据与局限

- **给出的数据**：性能基准表（Apple M3 单机，“真实客户端、真实 Yjs 更新、真实 Chrome”）：按键到其他参与者 p50 2 ms / p99 10 ms；agent 编辑到人看到 p50 42 ms / p99 61 ms；50 房间 × 10 客户端、约 2,500 updates/s 时 p50 1–2 ms、p99 9–48 ms；10,000 条更新的房间冷启动 61 ms；共享浏览器滚动到新像素 127 ms。首页另标称 p99 按键 10 ms、agent 编辑 42 ms、单台笔记本 500 个在线客户端。以上均为作者自测、单机环境，非第三方复现。
- **只是作者主张**：“agent 进入工作本身”“人机看同一状态”的价值判断；对比表中“computer-use agent 每步数秒、AirLink 42 ms”等，除上述自测外无独立验证；无任何用户案例、前后对比或业务收益数据。
- **成熟度与条件限制**（README 自述）：v0.2.0，首次公开发布于 2026 年 10 月，大量代码由 Claude Code 写成；尚无账号体系，能访问服务器者可用任意名字加入；每服务器一个 Docker 桌面（多桌面需 E2B key）；语音需 ElevenLabs/OpenAI key，且其中一个语音模型（LiveKit end-of-turn）适用 LiveKit Model License 而非 MIT。
- **材料局限**：本次仅有 README 正文，文中链接的 `docs/agents.md`、`docs/security.md`、`docs/architecture.md` 等未提供，因此权限模型、MCP 接入细节、记忆文件结构的具体格式无法核实，只能依据摘要级描述。仓库 star 数为 34，社区验证有限。

## 怎么试、怎么验证

**最小试用**：按 quickstart 在本机起一个房间；邀请 1 名同事；接入 1 个本地 CLI agent（Claude Code）+ 1 个 API 模型 agent；选一件真实的小任务，例如“填一份带公式的季度预算表 + 在画布上画对应的流程 + 用共享浏览器查两个价格来源”。全程不要复制粘贴，让人直接在房间里用光标和聊天驱动 agent。

**判断是否改善的指标**：

1. 完成同一任务所需的“人工搬运次数”（把 agent 输出复制回工作文件的次数）——目标是降到 0。
2. 端到端耗时与等待时间占比（人发出请求到看见改动落到自己屏幕的时间）。
3. agent 编辑的接受率：被保留 vs 被回退/重写的改动比例。
4. 敏感字段（价格、日期、承诺）是否 100% 走“建议—人工接受”，记录越权改动次数。
5. 权限收敛情况：为每个 agent 配置对象级权限后，是否仍出现不该改的对象被改。
6. 记忆可用性：打开 Markdown 记忆文件夹，能否读懂并手工修正 agent 的既有认知。
7. 安全底线：在未加认证网关前确认服务仅监听 localhost。

**上线门槛**：只有当上述 1–4 项相对现有“聊天框 + 手工粘贴”流程有可见改善，且 5、7 无事故时，才考虑扩大范围；扩大前必须先补认证与网络暴露方案。
