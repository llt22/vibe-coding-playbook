# irraz/vulnerator-ai

- 结论：**值得一试**。把 Hermes + Kali-MCP + vulnerator-mcp 前门的四容器 OODA 结构当成“自主循环 + 工具供给”的模板，先在隔离靶场（--with-juice-shop）跑一轮并对照人工基线，再考虑扩到真实授权目标；它给出了可照做的安装、MCP 配置和运行、干预入口，但默认无任何护栏且完全没有效果数据，不宜直接用于生产。
- 原文：https://github.com/irraz/vulnerator-ai
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-20T16:41:15.590Z

## 是什么

vulnerator-ai 是一个极简的四容器自主渗透测试系统：由 Hermes（nousresearch/hermes-agent，推理模型为 OpenRouter 上的 mistralai/mistral-large）做 OODA（Observe-Orient-Decide-Act）循环的大脑，通过 MCP 直接调用 Kali 容器里的确定性工具（nmap、whatweb、nuclei、ffuf、sqlmap、Prowler 等，端口 :8900）和 playwright-mcp 的真浏览器（headless Chromium，:8931），对目标执行渗透动作。ATT&CK 被当作循环中“Orient（定向）”环节的表达语言。

第四个容器 vulnerator-mcp（:8700 内部）是一个只暴露 run 生命周期的“前门” MCP：外部助手（Claude Code、Kiro、BugTraceAI 等）可以触发、观察、干预、停止一次运行，但拿不到原始 `kali_run`，也不能直接打 `/v1/chat/completions`。设计上刻意没有 core、没有 REST API、没有 UI、没有 gates（无审批环节）。README 明确声明：默认无 scope-guard、无 consent、无 audit、无授权闸门，只能对明确授权的目标使用。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提（全流程共用）：已安装 `docker`、`docker compose` v2、`openssl`；有一个 OpenRouter API key；运行在可隔离、且目标已获书面授权的环境中。

1. 安装器一键起栈（唯一需要你提供的是 OpenRouter key）：

```sh
./install.sh
```

安装器会检查 docker、docker compose v2、openssl，自动生成 `HERMES_API_SERVER_KEY` 与 `VULNERATOR_MCP_INBOUND_TOKEN` 两个 secret token，从模板写出 `.env`，并拉起默认四容器栈（不含 Juice Shop 靶场）。可用参数：`--with-juice-shop`（同时启动 OWASP Juice Shop 练习靶场）、`--no-up`（只写 `.env` 不起容器）、`--force`（覆盖已有 `.env`）。

2. 进入交互式 TUI 驱动 agent（前提：栈已起来）：

```sh
docker compose exec -it ooda-agent hermes chat
```

3. 或者不用安装器、手工配置（前提：能自己生成 32 字节 hex token）：

```sh
cp .env.example .env
# edit .env: set OPENROUTER_API_KEY, and generate the two tokens with `openssl rand -hex 32`:
#   HERMES_API_SERVER_KEY, VULNERATOR_MCP_INBOUND_TOKEN
docker compose up -d --build
```

4. 把 MCP 前门注册到自己常用的编码助手里（stdio 模式，零网络暴露、无需 inbound token）。前提：先在仓库根目录构建一次镜像：

```sh
docker build -f docker/mcp/Dockerfile -t vulnerator-ai-mcp:dev .
```

然后把下面这段加进助手的 `mcpServers` 配置，其中 `HERMES_API_SERVER_KEY` 填安装器写进 `.env` 的值（从文件读，不要打印出来）：

```json
{
  "mcpServers": {
    "vulnerator-mcp": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--add-host", "host.docker.internal:host-gateway",
        "-e", "HERMES_API_SERVER_KEY",
        "-e", "HERMES_API_BASE_URL=http://host.docker.internal:8642",
        "vulnerator-ai-mcp:dev"
      ],
      "env": { "HERMES_API_SERVER_KEY": "<value from .env>" }
    }
  }
}
```

5. 验证栈健康并确认工具面（前提：第 1 步已 up）：

```sh
docker compose ps
```

应当能看到的 MCP 工具是：`health()`、`start_pentest`、`get_run_status`、`stream_run_events`、`steer_run`、`stop_run`——即“查询健康 → 发起一次 run → 轮询状态 → 流式读事件 → 中途转向干预 → 停止”的完整控制面。

6. 让编码助手代跑安装（README 给出的可原样粘贴提示词，前提：助手在仓库内有 shell 权限）：

```text
You are setting up the "vulnerator-ai" repo for me. Do the following, in order:

1. From the repo root, run the installer:  ./install.sh
   It is interactive and will ask for ONE value, OPENROUTER_API_KEY — ask me for it
   and pass it through (or run it non-interactively as
   `OPENROUTER_API_KEY=<the key> ./install.sh`). The installer auto-generates the two
   secret tokens (HERMES_API_SERVER_KEY, VULNERATOR_MCP_INBOUND_TOKEN), writes the .env,
   and brings the default 4-container stack up (no Juice Shop lab). Do NOT invent or ask
   me for the two tokens — the installer makes them.

2. Wait until the stack is healthy, then verify with:  docker compose ps

3. Register the local MCP server (stdio mode — zero network surface, no inbound token).
   First build the image once:
       docker build -f docker/mcp/Dockerfile -t vulnerator-ai-mcp:dev .
   Then add this entry to my assistant's MCP config (mcpServers), filling HERMES_API_SERVER_KEY
   with the value the installer wrote into the repo's .env (read it from there, do not print it):
       { ... }

4. Confirm the MCP tools are available (health(), start_pentest, get_run_status,
   stream_run_events, steer_run, stop_run). Then tell me it's ready and remind me this engine
   has NO scope-guard/consent/audit by default: it must be used only against authorized targets.
```

（第 3 步的 JSON 块原文即为上文第 4 步那段 `mcpServers` 配置。）

7. 护栏按需开启，且要理解其边界：README 只提供两个 opt-in 控制项——针对 `kali_run`/`kali_exec` 的确定性 scope-guard，以及 MCP inbound token；并明确说这两者都不是 consent、也不是防火墙。细节在 `docs/security.md`。使用前必须先明确授权范围，把环境隔离。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现（AI 已能做哪些还没想到交给它的工作）**：原文把“决定跑哪条命令 → 直接执行 → 读回结果 → 继续下一轮”整段交给模型，不再由人逐条点工具；浏览器侧的操作交给 playwright-mcp，使 agent 能覆盖需要真实渲染的 Web 面。这属于“把工具编排权整体让渡给 agent”的例子。
- **任务匹配（什么工作适合怎样的模型、工具和协作方式）**：分工非常清楚——推理由 Hermes + mistral-large（OpenRouter）承担；执行由 Kali 容器里的确定性工具承担；浏览器由 playwright-mcp 承担；外部助手（Claude Code / Kiro / BugTraceAI）只做控制面的触发/观察/干预/停止。即“会判断的模型 + 不会乱来的确定性工具 + 只暴露生命周期的前门”。`docs/configuration.md` 另提到支持本地 Ollama 推理，说明模型可替换。
- **条件供给（需要哪些信息、工具、权限、反馈）**：需要 OpenRouter key、安装器自动生成的两个 token、Docker 运行时；工具供给通过 MCP 服务器（kali-mcp :8900、playwright-mcp :8931）以离散工具的形式暴露；权限供给刻意收窄——“前门只暴露 runs 生命周期，绝不暴露原始 `kali_run` 或 `/v1/chat/completions`”；反馈供给靠 `get_run_status` + `stream_run_events` 的事件流，加上 `steer_run`/`stop_run` 的中途干预通道；判断所需的结构化词汇由 ATT&CK 提供。
- **主动推进（时间/事件/状态触发并持续完成）**：OODA 循环本身是自驱动的——agent 自己决定下一步并直接执行，不需要人逐步点击；`start_pentest` 发起后可由 `stream_run_events` 持续观察。但 README **没有**给出任何基于时间、事件或外部状态的触发器、调度器或定时机制，循环的持续只来自模型自身的 OODA 迭代。这一条只能算部分有依据。
- **效果验证（怎样判断确实改善了结果）**：原文提供的是产出物层面的抓手——`docs/design.md` 有 findings-store schema，`docs/example-report.md` 是一份脱敏样例交付物，可以拿来比对“agent 跑出来的东西长什么样、是否可直接交付”。没有任何准确率、耗时、成本或对比基线的数据。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：README 明确把 Claude Code 列为 vulnerator-mcp 的 MCP 客户端之一，即用 Claude Code 去触发/观察/干预 Hermes 的 run。对本项目清单而言，这是给已 adopt 的 Claude Code 增加一种“只当控制面、不当执行体”的用法范式。
- **Hermes（watch）**：本项目里 Hermes 就是 OODA 大脑（`nousresearch/hermes-agent`，保持 `:8642` 的 OpenAI 兼容 API 常驻）。这条线索可以看作 Hermes 从“对话型 agent”变成“循环驱动器 + MCP 工具编排器”的具体落地样本，是清单中 Hermes 条目的加深材料。
- **Cursor（watch）**：README 在“让 AI 助手帮你装”一节把 Cursor 与 Claude Code、Kiro 并列，作为可粘贴安装提示词的 shell 助手；并未给出 Cursor 在本架构中的特殊配置。

清单中没有与本项目同类的“OODA 自主循环 + MCP 工具供给”条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**给出的事实/可核验内容**：四容器架构与端口（kali-mcp :8900、playwright-mcp :8931、Hermes :8642、vulnerator-mcp 内部 :8700）；Kali 工具清单（nmap、whatweb、nuclei、ffuf、sqlmap、Prowler 等）；`install.sh` 的行为（检查 docker/compose v2/openssl、自动生成两个 token、写 `.env`、起四容器）；三个可选 flag；TUI 命令；stdio 模式的 `mcpServers` 配置；六个 MCP 工具名；两个 opt-in 控制项及其“不是 consent/不是防火墙”的边界说明；MIT 许可。有 OWASP Juice Shop 练习靶场和 `docs/example-report.md` 样例交付物，说明作者至少跑通过一次成型的流程。

**没有给出的**：任何量化结果——没有漏洞发现数、误报率、单次运行耗时、token 成本、与人工渗透的对比基线；没有测试方法或评测脚本；没有任何用户案例。stars 仅 32，属于早期项目。README 自称“deliberately minimal”，可推断文档深度有限（详细内容被推到 `docs/` 下，本次材料未包含）。

**属于作者主张的**：“OODA + ATT&CK 作为定向语言”是有效组织方式；“无 core、无 REST API、无 UI、无 gates”的极简设计更优；直接让 agent 对 MCP 说话优于加一层 API。这些都没有对照实验支撑。

**适用条件与风险**：默认完全无护栏，Hermes 想到什么就对目标执行什么；scope-guard 是确定性拦截 `kali_run`/`kali_exec` 的选项，但不等于授权审查。因此只能用于明确书面授权、网络隔离、可随时断网的环境，且建议先只打 Juice Shop 这类本地靶场。此外整套栈依赖外部模型 API（OpenRouter）与 Docker，运行成本与可复现性受模型版本影响。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天内可完成）**：

1. `./install.sh --with-juice-shop`，只起本地靶场，不接任何真实资产。
2. `docker compose ps` 确认四容器（加靶场）健康。
3. `docker compose exec -it ooda-agent hermes chat` 或按第 4 步注册 MCP 后用助手调 `start_pentest`，目标限定为本地 Juice Shop。
4. 用 `stream_run_events` 全程记录事件流，中途用一次 `steer_run` 改变方向，用 `stop_run` 结束。
5. 对照实验：同一台机器上人工用同样的 Kali 工具（nmap/nuclei/ffuf）跑一遍同样的靶场，产出同样形态的简报。
6. 把 agent 的产出与 `docs/example-report.md` 的结构逐条比对，看缺哪一节。

**判断有没有改善的指标（都能从事件流与产出物里数出来）**：

- 一轮 OODA 循环能否在无人干预下走完（干预次数越少越好，但至少要能干预成功）；
- 单位时间内有效动作占比：事件流里“真正跑了新信息量的命令”vs“重复/无效命令”；
- 覆盖率：靶场已知可发现的问题里，agent 报告出多少（对照组为人工基线）；
- 误报率：报告条目中被人工判定为不成立的占比；
- 交付可用度：报告能直接进 `docs/example-report.md` 结构的比例，需要人工补写的段落数；
- 成本：单次运行的模型调用量与耗时；
- 边界合规：全程是否只触碰授权目标（把 scope-guard 打开再跑一次作为对照，确认拦截生效）。

**淘汰判据**：如果 agent 在靶场上连一轮完整循环都走不完，或者有效动作占比明显低于人工基线、误报率高到需要逐条复核，那它对本项目就只值 study（借架构思路），不值得进手册当操作流程。
