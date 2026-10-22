# Show HN: Omnara – Open-source alternative to Claude Managed Agents

- 结论：**值得一试**。建议小范围试用：先用 Omnara Cloud 的 quickstart 跑通一个只读诊断代理，再选低风险 PR 审查或 SRE 排查任务与现有 Claude Code 流程做对照，重点验证远程托管、审批和断点恢复是否减少人工盯守。理由是 README 给出了可复制的配置、CLI/SDK 和自托管步骤，但缺少独立效果数据与成熟度证据，暂不宜全面 adopt。
- 原文：https://github.com/omnara-ai/omnara
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-22T05:51:01.827Z

## 是什么
Omnara 是一个开源的托管代理平台（README 自称 self-hostable alternative to Claude Managed Agents 和 OpenAI Agents API）。它用 API/CLI/SDK/仪表盘启动和监控 AI 代理，代理可使用任意兼容模型、内置/自定义工具/MCP/技能、密钥与权限，并可运行在沙箱或你自己的 macOS/Linux 笔记本、VM、容器上。平台将每个代理的每一步保存到 Postgres，支持断点恢复、事件流、审批、Cron 触发以及 Slack/Discord/GitHub 集成；可自托管（Apache 2.0）或用 Omnara Cloud。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
1. **Cloud 最小启动**（前提：有 Omnara Cloud 账号；Node.js 22 或更新；使用首项目自带的模型 provider 和 sandbox pool）。登录 `app.omnara.com`。将以下配置保存为 `agent.yaml`（原文称首项目自带 `omnara-openrouter` 和 `default-pool`，可直接运行；示例模型名按原文照录）：
```yaml
version: v1
instruction: |
  You are an engineering assistant. Use your machine to run commands.
model:
  provider_config: omnara-openrouter
  name: anthropic/claude-fable-5.1
machine_sources:
  - machine_pool_name: default-pool
```
然后用 CLI 启动；未登录时第一条命令会打开浏览器登录：
```sh
npx omnara agents launch --file agent.yaml --name "Machine assistant" --message "Report this machine's operating system and free disk space."
```
用 `npx omnara agents chat <agent-id>` 在终端对话，或打开 dashboard 观察工具调用并回复。

2. **从 TypeScript SDK 启动**（前提：在 dashboard 创建 API key，导出 `OMNARA_TOKEN`；执行 `npm install @omnara/sdk`；用 `npx omnara config` 获得 org/project ID）。原文示例：
```ts
import { readFile } from 'node:fs/promises'
import { bearerToken, createOmnaraClient, openAgentEventStream, sdk } from '@omnara/sdk'

const client = createOmnaraClient({ auth: bearerToken(process.env.OMNARA_TOKEN!) })
const path = { orgID: 'org_...', projectID: 'proj_...' }

const config = await sdk.createAgentConfig({
  client,
  path,
  body: { source: await readFile('agent.yaml', 'utf8'), source_format: 'yaml' },
})
const launched = await sdk.createAgent({
  client,
  path,
  body: { config: config.data.id, message: "Report this machine's free disk space." },
})

const agentID = launched.data.agent.id
for await (const event of openAgentEventStream({ client, path: { ...path, agentID } })) {
  console.log(event)
}
```

3. **让编码代理代做安装**（前提：编码代理可读取网页并执行）。把下面提示词原样给它：
```text
Help me set up Omnara by following https://www.omnara.com/SKILL.md
```

4. **自托管**（前提：安装 Docker 和 Compose）。执行：
```sh
git clone https://github.com/omnara-ai/omnara.git
cd omnara
docker compose -f compose.yaml --profile app up -d
```
打开 `http://localhost:8000` 并注册；本地开发的验证链接会打印在 `docker compose logs api`，不需要邮件服务。若要从源码构建而不是用发布镜像，执行：
```sh
docker compose --profile app up -d --build
```
新实例还没有模型和机器：在控制台添加 model provider 和 model，在 **Machines** 连接本机，并把两者共享给项目；沙箱还需要实例有 public URL。把 CLI 指向自托管实例并登录：
```sh
npx omnara config --api-url http://localhost:8000/api/v1 --issuer-url http://localhost:8000
npx omnara login
```
在 `agent.yaml` 中使用你的 provider/model 名称，并把 `machine_pool_name` 条目替换为 `machine_name: <your machine>`，然后用上面的 launch 命令启动。注意：本地默认配置故意不安全；真实部署要按 self-hosting guide 和 configuration reference 操作。

5. **设置工具权限与审批**（前提：在平台中可管理工具权限）。README 说明每个工具可设为立即运行、先问人、禁止；平台执行该设置，代理会等待批准或拒绝。具体配置界面/字段未在 README 给出，需按 `docs.omnara.com/tools/permissions` 操作。

6. **接入 MCP 客户端**（前提：客户端支持 OAuth）。原文命令：
```sh
claude mcp add --transport http omnara https://app.omnara.com/mcp
codex mcp add omnara --url https://app.omnara.com/mcp
```
然后在 Claude Code 中用 `/mcp` 登录，在 Codex 中用 `codex mcp login omnara` 登录。Omnara 也在官方 MCP Registry 中列为 `com.omnara/omnara`。

7. **选用示例或触发器扩展**（前提：按 `examples/` 中对应目录的 `agent.yaml` 和 `SKILL.md` 操作；触发器细节需查文档）。README 列出 Slack coding agent、PR review agent、SRE agent、Browser agent、PostHog analytics agent、Reddit/X/LinkedIn signal agent、Video generation agent 等示例。Cron trigger 可按时区给已有代理发消息、从 profile 启动新代理、开新的 Slack/Discord thread；GitHub 代理可在 PR 打开或被提及时启动；Slack/Discord 提及 bot 可在 thread 启动代理。README 没有给出 cron 的完整命令/JSON，只给了 API 链接。

## 对应的研究问题
- **能力发现**：原文列出可交给代理的具体工作：Slack/Discord/GitHub 问题修复并开 PR、PR 审查并留 inline findings、SRE 5xx 调查、浏览器长任务、PostHog 分析日报、Reddit/X/LinkedIn 信号摘要、短视频生成；另有 shell、文件、网页搜索/抓取、向人提问等内置工具。这给出“可 delegation 的工作清单”，但没有系统回答“还有哪些没想到”。
- **任务匹配**：适合需要跨机器、跨用户、由 app/Slack/GitHub/定时触发的云代理；模型可用 OpenAI Responses、OpenAI Chat Completions、Anthropic Messages 兼容端点（OpenAI、Anthropic、OpenRouter、Bedrock、LiteLLM、Ollama 等）；运行位置可选 11 家沙箱或自有机器；子代理用 fresh context，技能/记忆按需加载。README 对比表还明确：n8n/Zapier 适合可预测步骤自动化，Omnara 加开放代理；Mastra/LangChain/OpenAI Agents SDK 把逻辑放代码，Omnara 加托管、状态、机器、权限、集成；Claude Code/Codex/OpenCode 等是单终端/单机 agent loop，Omnara 加云服务化。
- **条件供给**：需要模型 provider 与密钥、机器（装 `omnarad` daemon）或沙箱、组织/项目、密钥管理/RBAC、工具（内置/MCP/自定义）、技能、记忆、权限审批、事件流/webhook；自托管还需 Docker Compose、Postgres、Redis、blob storage，沙箱需公网 URL。反馈通过 dashboard/chat/streaming/webhook/审批完成。
- **主动推进**：Cron trigger 可按时区给已有代理发消息、从 profile 启动新代理、开新的 Slack/Discord thread；GitHub PR 打开或被提及时启动代理；Slack/Discord 提及 bot 可在 thread 启动代理；durable state 让代理在崩溃/重启/机器断连后继续。
- **效果验证**：每一步事件存入 Postgres，可查询做 analytics、evals、训练数据集；事件可流式接收或 webhook；dashboard 可看 tool calls。原文没有给出效果指标、基准或案例数据，因此只能验证“运行可观测性”，不能据此证明任务结果改善。

## 与已有做法的关系
- **Claude Code（adopt）**：README 明确把 Claude Code 归为 agent harness，适合终端/单机 agent loop；Omnara 补云托管、跨机器、跨用户、Slack/GitHub/定时触发。两者互补：可继续用 Claude Code 做本地开发，同时把需要长期运行/远程监督的代理放到 Omnara；也可用 `claude mcp add ...` 让 Claude Code 作为 MCP 客户端管理 Omnara 代理。
- **Cursor（watch）**：README 把 Cursor 列为可连接 Omnara MCP 的客户端之一（支持 OAuth 时）。关系是 Cursor 可作为前端/控制端，不是被替代。
- **Mastra（drop）**：README 将 Mastra 列为 agent framework，适合把 agent 逻辑写进应用代码；Omnara 加托管、状态、机器、权限、集成，属于运行层，不是框架替代。
- **OpenCode（watch）**：README 将 OpenCode 列为 agent harness，和 Claude Code 类似；Omnara 加云服务化与跨机器/触发器。
- 清单中没有 Claude Managed Agents 或 OpenAI Agents API 条目；Omnara 的直接对标对象是这两个托管平台。

## 证据与局限
- 证据：README 给出可复制的 `agent.yaml`、CLI 命令、TypeScript SDK 代码、Docker Compose 自托管命令、MCP 接入命令、示例目录和功能清单；有架构说明（API/Postgres/Workers/Machines）、对比表、定价与许可。
- 局限：只有 README/项目自述，没有独立评测、用户案例、性能数据、成本数据、失败率；Show HN 51 points/15 comments 只是早期关注信号。权限具体配置、cron trigger 的完整参数、memory/subagents 配置、示例内容等只给链接，本次材料未包含，不能照抄完整配置。自托管本地默认不安全；生产需按 self-hosting guide/configuration reference。沙箱需 public URL。Cloud 示例模型名按原文，实际使用要确认 provider 可用模型。
- 适用条件：有工程运维能力、需要长期运行/多机器/多入口代理的团队；简单一次性任务不必上平台。

## 怎么试、怎么验证
1. **最小跑通**：用 Cloud quickstart 在半小时内跑通 `agent.yaml`、launch、chat/dashboard；确认能看到 tool calls、能发消息、能触发审批（若把工具设为先问人）。记录启动耗时、首次有效输出耗时、人工介入次数、失败/重试次数。
2. **真实任务对照**：选一个低风险、可回滚的任务，例如对一个小型 PR 做只读审查，或对一个测试环境做 5xx 排查；用 `examples/pr-review-agent` 或 `examples/sre-agent` 的 `agent.yaml` + `SKILL.md` 部署，权限设为只读或需人工批准。与现有 Claude Code 本地流程对照 5–10 次（次数可按团队规模调整）。
3. **指标**：运行可靠性看断连/重启后能否从 event log 恢复、事件流是否完整、审批是否送达；协作效率看从发起到首个有用结果的时间、人工盯守/介入分钟数、来回消息次数、审批等待时间；结果质量看任务完成率、PR 审查有效发现数/误报数、SRE 是否定位根因、返工率；成本看 token/沙箱/机器时长和实际账单；可审计性看 Postgres/event log 能否重建每一步、webhook 是否可用于自动记录。若人工介入不低于基线、结果质量无提升或运维成本过高，就不进入下一阶段。
