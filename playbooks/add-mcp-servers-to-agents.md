# 给代理接入第三方工具集：先隔离试用，再用回执、清单和对照决定去留

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：面对一条“安装/注册命令就完事”的第三方工具供给路径，怎么在不污染主力环境的前提下完成接入、核对真实工具清单、冒烟测试和对照验证，并据证据决定“继续试”还是“只当思路参考”。
> 先试这一步：挑一条有现成安装命令的路径（做法 A 的 jevcrawl，或做法 D1 的 `pip install cli-anything-hub`，或做法 G 的 `npx github:fzn0x/idx stocks quote BBCA`），在隔离环境里先跑通安装与通路自检，再核对工具清单，最后和现有做法做一次对照。
> 最近修订：2026-10-18

## 解决什么问题

把第三方工具集以 MCP 或 CLI 形式接给代理时，常见供给方式是一句注册/安装命令就完事：能不能用、多出哪些工具、花了多少钱、和现有做法比是不是真的更好，全靠感觉。本章解决的是：怎么在不污染主力环境的前提下，完成接入、核对工具清单、冒烟测试和对照验证，并据证据决定“继续试”还是“只当思路参考”。

现在有六条路径。REA 接 Hermes（本地 MCP，原文只给一条命令、能力清单被截断、没有验证方式）；jevcrawl 接 Claude Code / Cursor（本地 MCP，有可直接照做的安装命令、参数默认值、输出字段和一份基准数据）；arcmira（远程 MCP，不给细粒度工具而是让模型写程序调用，有 OAuth 与 Bearer key 两条接入路径、方法表、示例程序、credits 计量规则和错误码，但数据覆盖与说话人/赞助识别准确性全是厂商自述，且有付费计划与预算门槛）；CLI-Anything / CLI-Hub（把桌面软件、代码库、内部工具包装成 agent-native CLI，有现成 harness 注册表、meta-skill 和生成流水线，但所有效果数据均为项目自述、无第三方复现）；reason network（团队 agent 横向通信，Reason CLI 首次运行相关命令时自动下载固定版本、校验 checksum 的构建并配好 MCP server `reason-network` 与三个工具 `list_team`、`send_message`、`check_inbox`，可用 `reason network who` 看谁在线、`reason network <session> "..."` 让两个 session 直接问答，但 README 没有任何效果数据，且强依赖 Reason workspace 与团队整体部署）；idx（安装包名 `ihsg-cli`、命令 `idx`，单个 Rust 静态二进制，一份数据三种界面——终端表格、`-o json`、MCP server `idx mcp`（23 个工具），数据源全部免费且无需 API key，`idx mcp setup <客户端>` 会把二进制的绝对路径直接填进配置；但它是印尼股市（IDX / IHSG）专用工具，领域窄，调研只给出结构与命令，没有效果数据）。

几条 MCP 路径的差别值得先分清：REA 与 jevcrawl 把第三方包拉到本机执行（`npx` / `uvx`），安全纪律靠隔离环境；arcmira 是远程服务器，本地不落包，但你自己写的程序会在厂商的 Cloudflare Dynamic Worker 隔离沙箱里执行，沙箱里程序不持有密钥（由父级出站代理注入凭证），出站只允许 `GET https://api.arcmira.com/v1/*`，写工具额外允许 `/v1/monitors` 与 `/v1/trackers` 的 POST/PATCH、永不 DELETE；idx 也是本地 MCP，但它不是运行时把第三方包拉下来执行，而是先装一个自包含的静态二进制，再由这个二进制自己起 MCP server（`idx mcp`）——没有运行时包依赖，也没有云端沙箱边界，边界变成“你装的是哪个二进制、它会向哪些数据源发请求”。CLI 路径多出“上游软件依赖”和“生成物自带测试”两个变量。reason network 不是给单个代理补外部数据能力，而是把团队里每个人电脑上的编码 agent session 连成一张网：同 Wi-Fi 直连，跨公网走 iroh，直连失败时经中继（中继只看到加密字节）；只有团队成员能连，且一台电脑只能代表它自己的主人说话；状态存放在 `~/.reason/network`。

## 适用与不适用

适用：

- 本机已有可用的 MCP 客户端：Claude Code、Claude Desktop、Cursor，或 Hermes CLI（终端里 `hermes` 命令存在）。
- 宿主支持远程 MCP / custom connector：Claude Code、Codex、Claude Desktop、claude.ai、ChatGPT、Cursor、Gemini CLI。
- 愿意并且能够在隔离环境（容器、虚拟机或专用账号）里先跑第三方包。
- 目标是“让代理一次性获得一整套外部工具 / 一类新能力”，例如站内多跳资料检索，或把 GIMP、Blender、LibreOffice 等软件变成可反复调用的 CLI。
- 需要反复调用外部软件、需要可复现操作的任务：CLI 的结构化、可组合、自描述和 JSON 输出更适合 agent。
- 需要在 YouTube 视频与直播的转录内容里检索：谁在什么时间说了什么（带时间戳链接）、某个话题在哪些节目里被讨论、某个品牌赞助了哪些节目、谁在推荐某个实体（并区分自然推荐与赞助口播）——这条走 arcmira。
- 团队里每个人都在用 Reason CLI、且成员都在同一个 Reason workspace，想让一个 session 直接问另一个 session、减少人工中转：这条走 reason network。
- 想把同一份数据同时供给人（终端表格）、脚本（JSON）和 agent（MCP），且要求三者字段口径一致：这条走 idx，它的 MCP 工具返回与 `-o json` 完全相同的 envelope，学会 CLI 的 agent 就已经会用工具。
- 需要离线/弱网仍可用，并且要求“来源没返回的字段就是 `null`、不做估算”：idx 按端点的 TTL 缓存，支持 `idx --offline` 与 `IDX_OFFLINE=1`。
- 想验证“把现成 CLI 包成 MCP 工具供 agent 调用”这一模式是否真的省事：idx 不做任何包装，装完用 `idx mcp setup <客户端>` 注册即可。

不适用：

- 不能隔离、必须直接在主力工作目录上试用。
- 需要稳定可复现的生产接入。
- 你依赖“139 个工具”的完整清单来规划任务：原文在列举处被截断，完整清单不可见。
- 目标站点需要 JavaScript 渲染、需要登录、或有付费墙 / CAPTCHA：jevcrawl 这几项都不做。
- 需要细粒度工具清单来规划任务：arcmira 只暴露 4 个工具（`arcmira_describe`、`arcmira_execute_read`、`arcmira_execute_write`、`arcmira_feedback`），能力表在 `arcmira_describe` 返回的客户端方法参考里（约 23,000 字符），要先读它而不是猜工具名。
- 不想开账号、不想设预算：arcmira 的 Premium 转录、赞助数据等能力会被付费计划 gate 拦住；README 没有给出免费额度上限，只说 “Plan limits apply”。
- 需要一个“可删除”的持续跟踪生命周期：arcmira 的 monitor 不提供删除，只能 `paused`；`monitors.attachTrackers` 迁移 tracker 需用户先同意。
- 所选 CLI harness 包装的是真实软件时，你不想先安装上游桌面软件：大量 harness 依赖上游软件。
- 你在 Windows 上且没有 Git for Windows（含 `bash`/`cygpath`）或 WSL：Claude Code 路径会报 `cygpath: command not found`。
- 团队不在 Reason workspace，或找不到第二个人配合：reason network 退化为思路研读，单人无法自测出“团队通信”的价值。
- 需要效果数据、手动配置 MCP 的方法或提示词层面的指引：reason network 的 README 都没有给。
- 你的目标不是印尼股市：idx 是领域专用工具，可照抄的是它的供给结构（一份数据三种界面、`mcp setup` 自动填绝对路径、统一的 envelope 与退出码），不是行情本身。
- 需要该工具的效果数据或前后对比：本次给出的调研正文在第 9 步后被截断，未见效果数据或对比指标。

## 前置条件

通用：

- 一个隔离环境：容器、虚拟机或专用账号，避免第三方工具直接接触主力工作目录。
- 到包分发源的网络出口（npx 走 npm registry，uvx 走对应源，pip 走 Python 包源）。

REA / Hermes 路径：

- Hermes CLI 可用：终端里 `hermes` 命令存在。原文默认读者已具备 Hermes 环境，但没有写安装前提，需自行确认。
- Node.js / npx 运行环境可用，因为命令用 `npx` 拉包。

jevcrawl 路径：

- 从 `https://console.typesafe.ai/` 申请一个 Jev API key（付费服务，README 给出 `jev-1.13.0` 输入 token 单价 $0.042/百万）。
- 本机已装 uv（`https://docs.astral.sh/uv/`）。
- 到 `api.typesafe.ai` 的网络出口。
- 页面文本（段落、链接标签、URL）会被发送到 TypeSafe 打分 —— 先确认你的目标站点内容允许外发。

arcmira 路径：

- 一个 Arcmira 账号，可从网页注册，也可以纯 API 注册（见做法 E 第 3 步）。
- MCP 宿主为 Claude Code / Codex / Claude Desktop / claude.ai / ChatGPT / Cursor / Gemini CLI 之一。
- 付费计划与 on-demand 预算：决定哪些能力可用（Premium 转录、赞助数据等会被 gate 拦住）。预算在 dashboard 里设，工具本身不接受金额参数。README 未给出免费额度上限，只说明 “Plan limits apply”。
- 到 `https://mcp.arcmira.com/mcp` 与 `https://api.arcmira.com` 的网络出口。

CLI-Anything / CLI-Hub 路径：

- Python 3.10+。
- 若所选 harness 包装的是真实软件（GIMP / Blender / LibreOffice 等），需先自行安装该上游软件。
- 若走 meta-skill，需要支持 SKILL 的 agent（OpenClaw、Nanobot、Claude Code、Codex、Reasonix、Antigravity 等）。
- 若走 Claude Code 生成器，需已装 Claude Code；Windows 需先装 Git for Windows（含 `bash`/`cygpath`）或使用 WSL，否则会报 `cygpath: command not found`。
- 若走 Cursor，需已装 Cursor 并 clone 仓库；默认装到 `~/.cursor/plugins/local/cli-anything`（可用 `CURSOR_PLUGINS_HOME` 覆盖，指向名为 `plugins` 的目录）。

reason network 路径：

- 你使用 Reason CLI 与 Reason workspace，且团队其他成员也在同一个 Reason workspace 里。README 称 “Everyone in your Reason workspace is on the same network”。
- 每台机器上的 daemon、MCP server `reason-network` 及三个工具权限可用；Reason CLI 会在首次运行相关命令时自动下载一个固定版本、校验过 checksum 的构建并配置好。
- 网络可达：同 Wi-Fi 直连，或经 iroh 跨公网，或经中继兜底。
- 本机状态目录 `~/.reason/network` 可用。
- 各 session 维护好自己的 title 和 todo，因为这是别人判断“你在做什么”的唯一信息来源。

idx 路径：

- Node/npm（用于 `npx github:fzn0x/idx ...` 零安装试用或 `npm install -g github:fzn0x/idx`），或 Rust 1.88+（`cargo install ihsg-cli`），或 Linux/macOS 直接跑 install.sh；Windows 且无 npm 时从 releases 页下载 `idx-<version>-x86_64-pc-windows-msvc.zip`。
- npm 12 需要加 `--allow-git=all`。npm 安装的只是一个小启动器，第一次运行 `idx` 时会下载对应平台的预编译二进制并用 release 的 `SHA256SUMS` 校验——这一步决定了你信任的到底是什么。
- 一个支持 MCP 的客户端（README 列出了 Claude Code、Codex、Gemini CLI、GitHub Copilot CLI、VS Code、Factory Droid、Qwen Code、Claude Desktop、Meta Muse Code、Cline / Roo Code / Kilo Code、Cursor / Windsurf / JetBrains / Warp / Trae / Augment、OpenCode、Crush、Continue、Zed、Google Antigravity、Kiro、Goose、Mistral Vibe 等）。
- 只支持远程 URL 的产品（ChatGPT、Claude.ai、Perplexity、Devin、Manus）需要一条 HTTPS 隧道把 `idx mcp --http ...` 暴露出去，请求头用 `Authorization: Bearer T`。
- 想用离线模式，前提是之前至少成功取过一次（缓存按端点的 TTL 生效）。

另外，REA 侧需要自己查 Hermes 自身文档，找到“查看已注册 MCP 服务器 / 枚举工具”的命令，因为原文没有给出这个命令。

## 操作步骤

做法 A 与做法 B 适用于“文档里给了安装命令、参数默认值和输出字段”和“只有一条注册命令、清单不完整”的本地 MCP 工具集；做法 E 适用于远程 MCP，且它的调用方式不是一堆工具名，而是让模型写程序；做法 C 是不接入，只留思路；做法 D 是用 CLI-Anything / CLI-Hub 把软件包成 agent-native CLI，适用于需要反复调用外部软件、需要可复现操作的任务；做法 F 适用于团队都在 Reason workspace、想让各人的 agent session 直接互相问答或通知；做法 G 适用于“工具本身就已经是 CLI、并且自带 MCP server”，你想验证“把现成 CLI 包成 MCP 工具供 agent 调用”这一模式是否省事——它不做任何包装，装完用 `idx mcp setup <客户端>` 注册即可。先做 A 或 D1：它们能在半天内给出可观察的结论，也顺带把隔离环境、基线记录这套流程跑通；若你已有支持远程 MCP 的宿主且目标就是这类“口语内容”检索，直接做 E；若团队已在 Reason 且找得到第二个人，可做 F；若你只想用最小成本看清“CLI 与 MCP 共用一份输出”的结构，做 G 的第 1、3、4 步即可。

### 做法 A：接入有完整参数与回执的工具集（以 jevcrawl 为例）

1. 申请 key，确认外发边界。

   从 `https://console.typesafe.ai/` 申请一个 Jev API key（付费服务）。页面文本（段落、链接标签、URL）会被发送到 TypeSafe 打分。

   前提：确认你的目标站点内容允许外发。预期结果：拿到 key，并明确列出哪些站点不能碰。

2. 装成 Claude Code 的 MCP server。原文原样命令：

```bash
claude mcp add jevcrawl -e TYPESAFE_API_KEY=<your key> -- uvx jevcrawl
```

   预期结果：jevcrawl 作为 MCP server 写入 Claude Code 配置。

3. 或写进其他 MCP 客户端的配置文件（Claude Desktop、Cursor 等，`mcpServers` 段）：

```json
{
  "mcpServers": {
    "jevcrawl": {
      "command": "uvx",
      "args": ["jevcrawl"],
      "env": { "TYPESAFE_API_KEY": "<your key>" }
    }
  }
}
```

4. 自检配置：

```bash
uvx jevcrawl doctor
```

   预期结果：doctor 报告通路正常。这一步是后面所有验证的前提。

5. 用一句自然语言提示词验证通路：

```
Use jevcrawl to find which Python version added the walrus operator, starting from docs.python.org
```

   预期结果：代理不需要用户点名工具，就自动调用 jevcrawl 并返回带出处的原文段落。README 提到会加载 skills 的 agent 还可以用仓库里的 `skills/jevcrawl/SKILL.md`。

6. 或者不走 MCP，直接用 CLI：

```bash
uv tool install jevcrawl
# 或 pip install jevcrawl

jevcrawl crawl https://docs.python.org/3/ --goal "What does the walrus operator do?" [--json]
jevcrawl scrape https://example.com/help/returns [--goal "..."] [--json]
jevcrawl map https://example.com --goal "..." [--limit 20]
jevcrawl doctor
```

   三个工具的用途：`crawl(goal, start_url, max_pages=30, max_seconds=120, return_tokens=4000, max_decision_usd=0.05)` 用于答案可能在几层链接之下的情况，返回相关段落；`scrape(url, goal=None)` 用于已知单个页面，带 goal 只返回相关段落，不带 goal 返回全部内容且不调用 Jev；`map(start_url, goal, limit=50, max_pages=10)` 只返回排序后的 URL 列表，用来决定 scrape 哪些。

7. 按需设置环境变量。

| 环境变量 | 含义 | 默认值 |
|---|---|---|
| `TYPESAFE_API_KEY` | Jev API key（必需） | 无 |
| `JEVCRAWL_BASE_URL` | Jev 兼容端点 | `https://api.typesafe.ai` |
| `JEVCRAWL_MODEL` | 模型 id | `jev-1.13.0`（固定版本，阈值按版本校准） |
| `JEVCRAWL_CACHE_DIR` | 答案缓存目录 | `~/.jevcrawl/cache` |

   其余（阈值、每页链接数、并发）在 `jevcrawl/config.py` 有实测默认值；Python 调用方可以传自己的 `Config`。

8. 用预算参数和回执字段核对每次调用。

   - 每次调用都被 `max_pages`、`max_seconds`、`max_decision_usd`、`return_tokens` 限定；`max_decision_usd` 是硬上限，可能超限的请求根本不会发出，爬取以 `budget` 结束。
   - 用 `stopped_because`（`answered` / `frontier_empty` / `max_pages` / `max_seconds` / `budget` / `auth_error`）判断这次是找到了答案还是撞到上限。
   - 同一 goal 同一页面的 Jev 结果会缓存到本地，重复不花钱。
   - 需要 JS 的页面不会被执行，URL 会列在 `stats.needs_js_urls` 里。
   - 返回结构还包含 `blocks`（相关段落，按相关性排序，带 `url`、`heading_path`、`char_start`/`char_end`、`relevance`）、`uncertain`（边缘段落）、`pages`（含 `text_sha256`）和 `stats`（`pages_fetched`、`tokens_raw`、`tokens_returned`、`jev_calls`、`cache_hits`、`jev_cost_usd`、`model`、`degraded`、`needs_js_urls`、`stopped_because`、`elapsed_seconds`）。预期失败以 `{"error": "<code>", "message": "<what to do>"}` 返回，不会往 agent 会话里抛异常。

   预期结果：每次爬取都有一份可直接读的回执，而不是只能看答案对不对。

9. 观察降级行为。

   连续三次 Jev 请求失败后，爬取转为广度优先继续，所有 block 以未打分形式放进 `uncertain`，并置 `stats.degraded`。原文没有提到定时或事件触发的机制。

   预期结果：知道系统降级时你看到的是什么，不至于把“降级后的结果”当成“打了分的结果”。

### 做法 B：接入只有一条命令、清单不完整的工具集（以 REA 接入 Hermes 为例）

1. 准备隔离环境并确认前提。在容器、虚拟机或专用账号中打开终端，确认 `hermes` 命令存在、`npx` 可用、能访问 npm registry。预期结果：后续命令能在不接触主力工作目录的环境中执行。

2. 注册 REA MCP 服务器。原文原样命令：

```
hermes mcp add rea --command npx --args -y rea-agents@6.3.0 mcp
```

   参数含义（按命令字面）：服务器名 `rea`；启动方式 `--command npx`；参数 `--args -y rea-agents@6.3.0 mcp`，即用 npx 自动确认安装并运行 `rea-agents` 的 6.3.0 版本、以 `mcp` 子命令启动。前提：npm registry 可访问；首次运行 npx 会拉取并执行第三方包。预期结果：命令完成注册，`rea` 成为一个名为 `rea` 的 MCP 服务器；是否真的出现要下一步核对。

3. 核对注册与工具清单。原文没有给出查看已注册 MCP 服务器或工具列表的具体命令，需要查阅 Hermes 自身文档（例如对应的 list / 工具枚举命令），确认 `rea` 是否出现在列表中。预期结果：记录到 `rea` 是否存在、实际工具数量和名称。作者声称会有 139 个工具，这一数量原文未验证，只作为核对参照。

4. 做低风险冒烟测试。在 Hermes 会话中提一个需要外部工具的自然语言请求，观察代理会不会自动选中 rea 提供的工具。原文列举的第一个能力是“反编译一个应用”，可优先用这个做冒烟测试；但原文在列举此处被截断，后续能力未知。前提：使用自有的示例应用或可回退的低风险对象。预期结果：记录代理是否在不需要用户点名工具的情况下自动调用 rea 工具。

5. 与未挂载时做对照。对同一任务，在不挂载 rea 的情况下再跑一次，比较代理能否自主选用工具、需要多少人工干预、步骤数和耗时。预期结果：得到一组“挂载 vs 未挂载”的对照记录。

6. 版本与安全检查。`rea-agents@6.3.0` 是原文写死的版本号，实际使用时应确认是否为当前可用版本。注意首次运行 npx 拉取第三方包的权限与安全边界；原文未讨论这一点。预期结果：记录实际拉取到的版本、权限范围，以及是否出现越权访问、读取工作目录之外的文件、或执行非预期命令。

### 做法 E：接入远程 MCP，用“写程序”的方式调用（以 arcmira 为例）

做法 E 与 A/B 的区别：A/B 把第三方包装到本机执行，E 是远程 MCP，本地不落包，但调用方式不是一堆细粒度工具，而是让模型写一段 async 函数体交给 `arcmira_execute_read` / `arcmira_execute_write` 在沙箱里执行。E 有两条接入路径（OAuth 无 key / Bearer key），三条以上命令任选其一即可。

1. 偷懒路径：让 coding agent 自装。把这段原样丢给 agent：

```text
Fetch and execute the appropriate instructions to set me up for Arcmira from https://arcmira.com/agent-setup/prompt.md
```

2. 标准路径：用宿主登录（OAuth）添加远程 MCP，无 key。服务器对无凭证请求返回 401 + OAuth 挑战，宿主自行注册、打开 arcmira.com 登录授权，token 自动刷新，可在 Settings → Connected apps 撤销。

```bash
claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp
```

```bash
codex mcp add arcmira --url https://mcp.arcmira.com/mcp
```

   Claude Desktop、claude.ai、ChatGPT、Cursor：把 URL 作为 custom connector / MCP server 添加，不带 header，按提示登录。逐宿主步骤见 `https://arcmira.com/agent-setup`。预期结果：宿主里出现 arcmira 这个远程 MCP，凭证由宿主管理、可在 Settings → Connected apps 撤销。

3. 备用路径：用 Bearer key（适用于不支持该登录流程的客户端）。key 形如 `arc_sk_...`，来自 https://arcmira.com；计划与 scope 决定每个工具返回什么。没有账号也没有浏览器时，可纯 API 注册：

```bash
curl -X POST "https://api.arcmira.com/v1/signups?src=mcp-tool" \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@example.com"}'

curl -X POST "https://api.arcmira.com/v1/signups/verify" \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@example.com","code":"482913"}'
```

   带 key 的命令行与 JSON 配置：

```bash
claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp --header "Authorization: Bearer $ARCMIRA_API_KEY"
```

```json
{
  "mcpServers": {
    "arcmira": {
      "url": "https://mcp.arcmira.com/mcp",
      "headers": { "Authorization": "Bearer arc_sk_..." }
    }
  }
}
```

   预期结果：拿到 key 并接上。401 响应体在 `error.data.unlock.action` 里带了注册调用，agent 可据此自行开户并重连。发现端点：`https://mcp.arcmira.com/.well-known/oauth-protected-resource`、`https://api.arcmira.com/.well-known/oauth-authorization-server`。

4. 连上后先要参考手册，别猜方法签名。让 agent 调用 `arcmira_describe`（可用 `topic` 只取某个方法及其示例）拿到 id 规则、方法表、参数与返回字段、可运行示例、常见坑、计量与监控规则、错误码。预期结果：你和 agent 手上有一份可核对的方法清单（`resolve` / `search` / `mentions` / `momentum` / `sponsors` / `recommendations` / `episodes` / `transcript` / `occurrences` / `quote` / `status` / `monitors.*`），而不是靠试错。

5. 遵守 id 规则：先用 `resolve` 拿 id，再用 id 查询。过滤器只接受原样 id；把名字当 id 传入会在发网络请求前抛 `id_required`。`resolve` 返回 `best`（唯一）/ `suggested`（有一个更合适，需说明假设与理由）/ `ask`（多个候选，交给用户选）。可直接照抄的示例程序：

```javascript
const r = await arcmira.resolve("Linear");
const e = r.best ?? r.suggested;
if (!e) return { ask: r.ask };
const m = await arcmira.momentum(e.id);
return { entity: e.name, id: e.id, assumed: Boolean(r.suggested), why: r.suggested?.evidence ?? null, verdict: m.verdict, last30: m.volume.mentions_30d, prior30: m.volume.mentions_prior_30d, as_of: m.as_of };
```

   预期结果：返回里能看到实体 id、是否做了假设（`assumed`）与理由，以及 momentum 的 `verdict`、`volume.mentions_30d`、`volume.mentions_prior_30d`、`as_of`；遇到多候选时程序把 `ask` 交回给用户。

6. 需要整段转录（含无字幕视频）时用 Premium 质量，并处理「还没转好」的情况。`arcmira_execute_read` 内一次 Premium 读取：

```javascript
const t = await arcmira.transcript("cdLeJU_1UH8", { quality: "premium" });
return t.state === "ready" ? t.lines : { state: t.state, eta_seconds: t.eta_seconds, note: t.note };
```

   若视频尚未转录，`GET /v1/transcripts/{video_id}?quality=premium` 会启动转录并返回 `202` 与 `Retry-After`；按 `Retry-After` 重读直到程序进行到第 22 秒，重读不会重复计费；仍 `pending` 则结果带 `eta_seconds`，下一次程序再读即可拿到内容。失败会返回 `state` 为 `failed` 或 `refunded` 及原因，除非传 `retry: true`（只在用户要求时传）否则不会重开。预期结果：不会把“还在转”误判成失败，也不会无意中重复付费。

7. 先查价再跑贵操作。`arcmira.quote(video)` 返回整段 Premium 读取会用多少 credits（以及 on-demand 美分），本身不计费。计量规则：搜索按返回结果中超出前 5 条的每条 passage 收 4 credits；字幕读取按其窗口每开始的 15 分钟收 4 credits；Premium 转录按整段视频每开始的 15 分钟收 300 credits；`momentum` 每次调用 10 credits；`start` / `end` 不会降低 Premium 计费。预期结果：贵操作开跑前就有一份成本预估。

8. 预算由 dashboard 控制，工具本身不接受金额参数。先在控制台设 on-demand 预算；被计划或预算拦住时，工具返回 `isError: true` 与错误码之一：`paid_plan_required`、`quota_exceeded`、`spend_limit_exceeded`、`member_limit`、`fair_use_cap`、`on_demand_paused`，并附 `message` 说明触发了什么、什么能解除，以及可选的 `unlock`。程序里应按 `code` 分支处理。预期结果：被拦住时你拿到的是可读原因和解除办法，而不是一个空结果。

9. 用示例提示词快速验证接通。README 给的原句：

- Which brands sponsor both TBPN and the All-In Podcast?
- How hot is Linear, the project management tool, on the spoken web right now?
- Find a moment on TBPN from the last 90 days where someone talks about stablecoins, and quote it.
- Who is speaking in the first minute of the latest TBPN episode, according to the Premium transcript?
- On TBPN, how many episodes mentioned Cursor in July versus August?

   可直接用的初始 id：TBPN 频道 `UC-DRzaGnL_vtBUpCFH5M0tg`，All-In Podcast `UCESLZhusAkFfsNsApnjF_Cg`，Ramp `ent_14`。预期结果：代理能写出一段程序完成一次检索，并给出带时间戳的可点引用。

10. 要「持续盯着」就建 monitor（必须走写工具 `arcmira_execute_write`）。`monitors.create({ name, notify_frequency, notify_emails?, notify_slack?, ... })`、`monitors.update(id, { ..., paused? })`、`monitors.addEntities(id, entityIds, { personMatchMode? })`（一次最多 90 个 id）、`monitors.addName(id, [{ name, type, personMatchMode? }])`（跟踪尚未被索引的名字，节目用其 `UC` id）、`monitors.attachTrackers(id, trackerIds)`（迁移别的 monitor 的 tracker，需用户先同意）。不提供删除；`integrations.slack()` 查看已连 Slack 及默认投递频道。预期结果：监控对象、通知频率与投递方式明确，且你清楚退出方式是 `paused` 而不是删除。

11. 可选：装插件，拿到 6 个任务技能。

```bash
claude plugin marketplace add arcmira/mcp
claude plugin install arcmira@arcmira
```

   技能为 `arcmira`（总入口与 id 规则）、`sponsor-research`、`company-watch`、`find-quotes`、`person-research`、`compare-shows`。每个技能都从名字出发、必要时返回 `ask`、说明假设并报出所用实体，结尾都带 monitor 与 feedback 建议。Gemini CLI 用：

```bash
gemini extensions install https://github.com/arcmira/mcp
```

   （根扩展只装 `arcmira` 技能，不含 5 个可选任务技能。）其他情况可用 `npx skills add arcmira/mcp` 装技能。

12. 保持更新。远程 MCP 本身不需要更新（宿主每次连接拉取工具与说明，`arcmira_describe` 每次带版本行）。预期结果：行为与参考手册不符时，先看版本行，再判断是不是自己猜错了签名。调研原文在“Claude Code 第三方 marketpla…”处被截断，该部分细节未知。

### 做法 C：不实际接入，只当作“用 MCP 批量接工具”的思路参考

当出现以下任一情况时选做法 C：注册失败，或注册后工具无法被代理实际调用；无法提供隔离环境；需要完整的工具清单、权限说明和失败排查步骤，而原文只给了一条命令（或命令之外的能力清单被截断）。对 arcmira 来说，同样的降级条件表现为：没有账号或不想设预算、宿主既不支持该登录流程又没有 Bearer key、以及你需要的说话人 / 赞助识别准确性无法在厂商自述之外得到佐证。对 reason network 来说，降级条件是：团队不在 Reason workspace、找不到第二个人配合，或你需要的效果数据在 README 中完全没有。对 idx 来说，降级条件是：你的目标领域不是印尼股市，你只是想把它的结构（一份数据三种界面、`mcp setup` 自动填绝对路径、统一 envelope 与退出码）当作自己工具的参照。

做法：不把工具挂到任何工作环境，只记录“用 MCP 协议把外部工具集一次性喂给代理”这一供给方式（以及“只给 4 个工具、让模型写程序调用”这一变体，“用 MCP 把团队 agent 连成网”的三工具接口 `list_team` / `send_message` / `check_inbox`，和“CLI 与 MCP 共用同一份 JSON envelope、工具报错带回 exit_code”这两个设计点），作为后续遇到类似工具集时的参考。

### 做法 D：用 CLI-Anything / CLI-Hub 把软件包成 agent-native CLI

做法 D 与 A/B/E 的区别：A/B 走本地 MCP 服务器接工具集、E 走远程 MCP 写程序调用；D 走 CLI harness，让 agent 用命令行驱动软件。CLI-Hub 注册表有现成 harness，也可用 `/cli-anything` 为内部工具生成新 CLI。选 D 当你要反复调用外部软件、需要可复现操作，而且目标软件有现成 harness 或愿意让编码 agent 生成。先做 D1，成本最低。

#### D1：直接用现成 CLI（5 分钟路径）

前提：Python 3.10+；若所选 harness 包装的是真实软件（GIMP / Blender / LibreOffice 等），需先自行安装该上游软件。

1. 安装 CLI-Hub 包管理器：

```bash
pip install cli-anything-hub
```

   预期结果：`cli-hub` 命令可用。

2. 浏览与搜索注册表：

```bash
cli-hub list
cli-hub search image
```

   预期结果：列出或搜索到可用 harness。

3. 查看某个 CLI 的详情：

```bash
cli-hub info gimp
```

4. 安装：

```bash
cli-hub install gimp
```

5. 启动试用：

```bash
cli-hub launch gimp
```

6. 需要时更新/卸载：`cli-hub update <name>`、`cli-hub uninstall <name>`。

   命令速查：`list` 浏览、`search <query>` 关键词搜索、`info <name>` 查看单个、`install <name>` 安装、`update <name>` 更新、`uninstall <name>` 卸载、`launch <name> [args...]` 运行。

   预期结果：跑通一条真实重复任务，并记录与不用 CLI 时的差异。

#### D2：让 agent 自己发现并安装 CLI

前提：使用支持 SKILL 的 agent（OpenClaw、Nanobot、Claude Code、Codex、Reasonix、Antigravity 等）。

1. 安装 meta-skill：

```bash
npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y
```

2. 用提示词把“选工具”交给 agent：

```text
Find appropriate CLI software in CLI-Hub and complete the task: ...
```

   预期结果：agent 自行搜索、安装并启动合适 CLI，再完成任务。

#### D3：用 Claude Code 生成一个新 CLI

前提：Python 3.10+；目标软件或源码在本机或可在线获取；已装 Claude Code。Windows 需先装 Git for Windows（含 `bash`/`cygpath`）或使用 WSL，否则会报 `cygpath: command not found`。

1. 添加 marketplace：

```bash
/plugin marketplace add HKUDS/CLI-Anything
```

2. 安装插件：

```bash
/plugin install cli-anything
```

3. 一条命令生成完整 CLI（跑完 7 阶段：分析 → 设计 → 实现 → 制定测试计划 → 写测试 → 文档 → 发布）：

```bash
/cli-anything ./gimp
```

   预期结果：生成带 REPL/JSON 输出/undo-redo 的 Click CLI、测试、文档，并生成 `setup.py`、装到 PATH。

4. 迭代补全能力（可多次运行，增量且非破坏性）：

```bash
/cli-anything:refine ./gimp
/cli-anything:refine ./gimp "I want more CLIs on image batch processing and filters"
```

5. 排错顺序：先 `/reload-plugins`；再 `/help cli-anything` 确认插件已加载；必要时重装 marketplace 与插件；确认加载后再试入口命令。旧版本若不识别 `/cli-anything`，改用 `/cli-anything:cli-anything`；辅助命令保持 `:subcommand` 形式（如 `/cli-anything:refine`）。

   预期结果：生成物可用 `/cli-anything:test`、`/cli-anything:validate` 做校验；README 称流水线自带 TEST.md（unit + E2E 测试计划）。

#### D4：其他宿主的最小安装动作

- Cursor（前提：已装 Cursor，并已 clone 仓库）：

```bash
git clone https://github.com/HKUDS/CLI-Anything.git
bash CLI-Anything/cursor-plugin/scripts/install.sh
```

Windows PowerShell：

```powershell
.\CLI-Anything\cursor-plugin\scripts\install.ps1
```

默认装到 `~/.cursor/plugins/local/cli-anything`（可用 `CURSOR_PLUGINS_HOME` 覆盖，指向名为 `plugins` 的目录）；升级用 `--force` / `-Force`。在 Cursor 里执行 **Developer: Reload Window**，然后：

```text
/cli-anything ./gimp
/cli-anything-refine ./shotcut "picture-in-picture workflows"
/cli-anything-test ./libreoffice
/cli-anything-validate ./libreoffice
/cli-anything-list
```

消费者侧（与生成器插件独立）：

```bash
npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y
pip install cli-anything-hub
```

- Pi Coding Agent：clone 后 `bash .pi-extension/cli-anything/install.sh`（卸载加 `--uninstall`），装到 `~/.pi/agent/extensions/cli-anything/`，`/reload` 或重启生效；命令有 `/cli-anything`、`/cli-anything:refine`、`/cli-anything:test`、`/cli-anything:validate`、`/cli-anything:list`。

- OpenCode：`cp CLI-Anything/opencode-commands/*.md ~/.config/opencode/commands/`，并把 `HARNESS.md` 复制到同目录（命令会引用它，必须在同一目录）；旧版目录名为 `command/`。

- OpenClaw：`mkdir -p ~/.openclaw/skills/cli-anything` 后把 `openclaw-skill/SKILL.md` 复制进去，会话里用 `@cli-anything build a CLI for ./gimp`。

- Codex：`bash CLI-Anything/codex-skill/scripts/install.sh`（Windows 用 `install.ps1`），装到 `$CODEX_HOME/skills/cli-anything`（未设置时 `~/.codex/skills/cli-anything`），安装器会把 `HARNESS.md`、命令规范、按需加载的指南与脚本一并放入 `references/`、`scripts/`。

- Qodercli：`bash CLI-Anything/qoder-plugin/setup-qodercli.sh` 注册到 `~/.qoder.json`，新开会话后用 `/cli-anything ./gimp`。

预期结果：对应宿主能加载 CLI-Anything 命令/skill，并按 D3 的生成或 D1 的消费方式使用。

### 做法 F：把团队里各人的 agent session 连成一张网（以 reason network 为例）

选 F 的条件：团队里每个人都在用 Reason CLI、且成员都在同一个 Reason workspace，你想让一个 session 直接问另一个 session、减少人工中转。它与 A/B/E 的区别：不是给单个代理加外部数据工具，而是把不同人电脑上的编码 agent 连成一张可寻址、可发消息的网。README 没有给出任何效果数据，且强依赖 Reason 产品与团队整体部署，所以只建议小范围试用；若团队不在这个生态里，只把它的三工具接口和状态来源设计当思路参考。

1. 初始化本机 agent 接线。Reason CLI 会在首次运行相关命令时自动下载一个固定版本、校验过 checksum 的构建并配置好。原文原样命令：

```sh
reason network
```

   前提：你使用 Reason CLI 与 Reason workspace，且团队其他成员也在同一个 Reason workspace 里。预期结果：本机 daemon、MCP server 与 hooks 配好。

2. 看谁在线、各自的 session 正在做什么：

```sh
reason network who
```

   预期结果：列出团队成员的 session 及其当前任务。session“在做什么”来自它自己的 title 和 todo list，agent 不需要主动汇报状态；所以要让这套东西好用，agent 的会话标题和 todo 得是有意义的。

3. 直接向某个 teammate 的某个 session 提问，并等它回答（示例中的 `alice/api-claude` 是「某人/某个 session」的寻址形式）：

```sh
reason network alice/api-claude "did the token format change?"
```

   预期结果：对端 session 收到消息并返回回答。适合同步问答的 agent：Claude Code、Codex、opencode、pi 和 Reason，它们会在会话中途收到消息，空闲的会被唤醒；已经打开的 Claude session 不需要重启就能加入。

4. 只发不等（通知类）：

```sh
reason network send alice/api-claude "heads up: main is red"
```

   预期结果：消息发出但不等回答。适合异步通知的 agent：Cursor、Gemini 和 Copilot 在下一步才收到消息，只适合 `send` 这种“不指望立刻回应”的用法。

5. 需要时把本机的 agent 重新接线一遍：

```sh
reason network setup
```

   预期结果：重新配置本机接线。

6. Agent 侧不再需要额外接入脚本。MCP server 名为 `reason-network`，对 agent 暴露三个工具：`list_team`、`send_message`、`check_inbox`。预期结果：agent 可以通过这三个工具看团队、发消息、查收件箱；但原文没有给出手动配置 MCP 的方法，也没有提示词层面的指引——agent 侧怎么用那三个工具，原文未展开。

7. 理解网络与安全模型。连接方式是点对点：同 Wi-Fi 直连，跨公网走 iroh，直连失败时经中继（中继只看到加密字节）。只有团队成员能连，且一台电脑只能代表它自己的主人说话。发给离线者的消息会排队，等对方回来再发。状态存放在 `~/.reason/network`。预期结果：知道消息在什么路径上走、谁能看到、离线消息会不会补发。

8. 若要从源码自建或跑测试（README 的 Build 段）：

```sh
cargo fmt && cargo clippy --all-targets -- -D warnings && cargo test
cargo build && python3 tests/e2e/two_machines.py   # two machines over iroh (needs internet)
python3 tests/e2e/hooks.py && python3 tests/e2e/guided.py
```

   `v*` tag 会构建 Reason CLI 所安装的 macOS 和 Linux 包。

9. 最小试用：找 2 名已经在用 Reason 的同事，各自装好 Reason CLI、确认在同一个 workspace。两人各开一个 Claude Code session（因为它是投递体验最好、最可能成功的一档），分别跑 `reason network who` 互相确认能看到对方的 session 和当前在做的事；然后由 A 用 `reason network <b的session> "..."` 提一个只有 B 的 agent 凭自己会话上下文才能回答的问题（例如「你当前分支上 token 格式改了吗」）。预期结果：端到端拿到回答，并记下与“人来转述”基线的差异。

### 做法 G：接入“现成 CLI 自带 MCP server”的工具（以 idx / ihsg-cli 为例）

选 G 的条件：工具本身就已经是 CLI，并且自带 MCP server，你不想做任何包装，只想验证“把现成 CLI 包成 MCP 工具供 agent 调用”这一模式是否省事。它与 A/B 的区别：A/B 是本机 MCP 服务器在运行时用 `npx` / `uvx` 拉第三方包执行，G 是先装一个自包含的静态二进制，由它自己起 MCP server，没有运行时包依赖。它与 D 的区别：D 是用 CLI-Anything 把软件**包装**成 CLI，G 是软件**本来就是** CLI。它与 E 的区别：G 的数据与计算都在本地（或直连公开数据源），不经过厂商沙箱。**注意领域**：idx 是印尼股市（IDX / IHSG）工具，值得试的是流程与结构，不是行情本身；本次调研正文在第 9 步后被截断，未见效果数据或对比指标。

1. 零安装先跑通（前提：Node/npm 可用）。

```sh
npx github:fzn0x/idx stocks quote BBCA
```

   预期结果：不改动环境就能看到一份行情输出，确认这个二进制在本机能跑、能取到数据。

2. 正式安装（四选一）。

```sh
cargo install ihsg-cli                    # crates.io，从源码构建，需 Rust 1.88+
npm install -g github:fzn0x/idx           # npm，直接从仓库安装
curl -fsSL https://raw.githubusercontent.com/fzn0x/idx/main/install.sh | sh   # Linux, macOS
```

   Windows 无 npm 时从 releases 页下载 `idx-<version>-x86_64-pc-windows-msvc.zip`。npm 安装的是一个小的启动器，第一次运行 `idx` 会下载对应平台的预编译二进制并用 release 的 `SHA256SUMS` 校验。npm 12 需要加 `--allow-git=all`。

   预期结果：`idx` 命令可用；同时你清楚这个二进制从哪来、有没有被校验。

3. 先用 JSON 模式核对输出契约（前提：已安装并在 PATH 上）。

```sh
idx -o json stocks quote BBCA | jq '.data[0] | {price, change_pct, pe_trailing, dividend_yield_pct}'
```

   约定：stdout 只放一个 JSON 文档，其余全部走 stderr；envelope 里带 `provider`、`fetched_at`、`cached`、`stale`、`warnings`；来源没返回的字段是 `null`，不做估算。退出码有语义：`0` 正常、`2` 用法错、`3` 网络/来源错、`4` 未找到、`5` 离线缓存未命中、`6` 配置错。字段定义用 `idx schema quotes`（还有 `history`/`fundamental`/`bandar`/`ownership-*` 等）查看。

   预期结果：你在接 MCP 之前就知道“成功长什么样、失败怎么区分”，而不是接完再猜。

4. 启动 MCP server。

```sh
idx mcp                            # stdio
idx mcp --http 127.0.0.1:8765 --token T --allowed-host '*'
idx mcp setup --list               # 列出所有支持的客户端
idx mcp setup codex                # 打印：codex mcp add idx -- /abs/path/idx mcp
idx mcp setup muse                 # 打印 Meta Muse Code 需要的 settings.json 片段
```

   关键点：`idx mcp setup <client>` 会把二进制的**绝对路径**填进配置输出——README 明说理由是 GUI 应用通常不继承 shell 的 `PATH`。

   预期结果：拿到一条可直接粘贴的注册命令或配置片段，而不是自己手写路径。

5. 按你手上的客户端挑一条注册（README 给出的原样命令/配置）。

```sh
# Claude Code
claude mcp add --scope user idx -- idx mcp
# OpenAI Codex（CLI / IDE 扩展 / app）
codex mcp add idx -- idx mcp
# Gemini CLI
gemini mcp add -s user idx idx mcp
# GitHub Copilot CLI
copilot mcp add idx -- idx mcp
# VS Code（Copilot agent mode）
code --add-mcp '{"name":"idx","command":"idx","args":["mcp"]}'
# Factory Droid
droid mcp add idx "idx mcp"
# Qwen Code
qwen mcp add idx idx mcp
```

```json
// Claude Desktop: claude_desktop_config.json
{"mcpServers": {"idx": {"command": "idx", "args": ["mcp"]}}}
```

```json
// Meta Muse Code: ~/.config/muse/settings.json
{"schema_version": 1, "mcp_servers": {"idx": {"transport": "stdio", "command": "idx", "args": ["mcp"], "mode": "optional"}}}
```

```json
// Cline / Roo Code / Kilo Code：MCP Servers → Configure，type 必须为 stdio
{"mcpServers": {"idx": {"command": "idx", "args": ["mcp"], "type": "stdio"}}}
```

```json
// Cursor / Windsurf / JetBrains / Warp / Trae / Augment：粘贴到 MCP 设置里
{"mcpServers": {"idx": {"command": "idx", "args": ["mcp"]}}}
```

```json
// OpenCode: opencode.json
{"mcp": {"idx": {"type": "local", "command": ["idx", "mcp"], "enabled": true}}}
```

```json
// Crush: crush.json
{"mcp": {"idx": {"type": "stdio", "command": "idx", "args": ["mcp"]}}}
```

```toml
# OpenAI Codex 的配置文件写法：~/.codex/config.toml
[mcp_servers.idx]
command = "idx"
args = ["mcp"]
```

```yaml
# Continue: ~/.continue/mcpServers/idx.yaml（`idx mcp setup continue` 会打印）
```

   - Zed：`settings.json` → `"context_servers": {"idx": {"command": "idx", "args": ["mcp"], "env": {}}}`
   - Google Antigravity：`~/.gemini/config/mcp_config.json` → `mcpServers.idx`，`command` 用绝对路径，不要写 `type` 字段
   - Kiro：`~/.kiro/settings/mcp.json`，或 `kiro-cli mcp add --name idx --command idx --args mcp`
   - Goose：`goose configure` → Add Extension → Command-line Extension → `idx mcp`
   - Mistral Vibe：`~/.vibe/config.toml` → `[[mcp_servers]]`，`name = "idx"`、`transport = "stdio"`、`command`、`args`

   预期结果：注册完成后，去客户端里确认 `idx` 真的出现、工具数真的可枚举——这一步和做法 B 第 3 步一样，不能跳过。

6. 只支持远程 URL 的产品（ChatGPT、Claude.ai、Perplexity、Devin、Manus）：把 HTTP 形态放在 HTTPS 隧道后面，再作为 connector 添加，请求头 `Authorization: Bearer T`：

```sh
idx mcp --http 127.0.0.1:8765 --token T --allowed-host '*'
# connector 地址：https://<host>/mcp
```

   预期结果：远程客户端能连上，且你清楚是隧道在暴露你的本机服务、token 是唯一门禁。

7. 离线 / 弱网（前提：之前至少成功取过一次，缓存按端点的 TTL 生效）。

```sh
idx --offline stocks quote BBCA     # 或 IDX_OFFLINE=1
idx cache stats
```

   预期结果：离线时命中缓存返回数据并置 `cached` / `stale`；未命中则退出码为 `5`，而不是静默返回空值。

8. 让 agent 直接用工具（23 个工具，`idx_brief` 是一把起手的那个）：`idx_brief`、`idx_market`、`idx_quote`、`idx_history`、`idx_profile`、`idx_financials`、`idx_earnings`、`idx_dividends`、`idx_returns`、`idx_fundamental`、`idx_technical`、`idx_compare`、`idx_screen`、`idx_news`、`idx_sentiment`、`idx_broker`、`idx_bandar`、`idx_bandar_screen`、`idx_ownership_ticker`、`idx_ownership_entity`、`idx_ownership_changes`、`idx_ownership_foreign`、`idx_ownership_releases`。筛选示例：

```sh
idx stocks screen -f "pe<15,roe>15,sector=financial"
idx bandar screen --preset quiet-accumulation
idx bandar screen -f 'acc>=5,fpct>=5,gain<0'
```

   预期结果：agent 用 `idx_brief` 起手就能拿到一屏概览，而不是自己拼十几次调用。

9. 照抄它的三个工具设计约束（这是本路径里最可迁移的部分）。

   - 23 个工具用“每个 harness 都接受的那一子集”的类型化输入 schema（不用 nullable 类型数组，不用 `format`/`default` 关键字），每个工具配一段话描述。
   - 工具返回与 `-o json` 完全相同的 envelope，因此“学会 CLI 的 agent 就已经会用工具”。
   - 失败以工具错误返回 `{error: {code, message}, exit_code}`，把 CLI 的退出码语义带进 MCP。

   预期结果：你自己的内部工具也能做到“一份数据三种界面、口径一致、失败可分”。

10. 需要“上游数据自动保持新鲜”时，参考它的仓库做法。GitHub Actions `ownership.yml` 在 08:17 / 14:17 / 20:17 WIB 抓取 IDX 页面、下载新的“Pemegang Saham di Atas 1%”工作簿、用 `idx` 导入验证可解析，并把文件和 `index.json` 发布到 `ownership-data` release；因为 idx.co.id 会拦截云网络（含 GitHub 自己的 runner），任务跑在自托管 runner 上（把仓库变量 `OWNERSHIP_RUNNER` 设为 `self-hosted`），跑在 GitHub runner 上时保留镜像并在最新登记表超过 45 天时变红。终端侧 Worker 每 30 分钟检查 `index.json`、校验 SHA-256、每分钟把一个 part 装进 D1，只在新月份全部行数到齐且数量匹配后才算“出现”；Worker 没有任何写端点。本地用 `idx ownership import --latest` 优先读 idx.co.id，被 Cloudflare 拒绝则从镜像下载并校验 SHA-256，`IDX_OWNERSHIP_SOURCE=mirror` 直接跳过 idx.co.id。

    预期结果：你要迁移的是这套结构（定时抓取 → 可解析性校验 → 发布 → 带校验的消费），不是印尼股市本身。

11. 与未挂载时做对照。接好之后跑一条你本来就要做的真实任务，再不挂 MCP 用原方式做同一件事，比较调用次数、人工步骤数、耗时、以及 agent 是不是自己选对了工具。前提：使用可回退的低风险任务。预期结果：得到一组“挂载 vs 未挂载”的对照记录，而不是只凭感觉说“接上真方便”。

## 怎么判断变好了

可观察指标：

- 通路：`uvx jevcrawl doctor` 是否报通路正常；`rea` 是否出现在 Hermes 的服务器列表中；CLI-Hub 的 `cli-hub info`、`install`、`launch` 是否成功；arcmira 的 `arcmira_describe` 是否返回方法表与版本行；reason network 的 `reason network who` 是否稳定列出对方 session 及其当前任务；idx 的 `idx mcp setup <client>` 是否打印出可直接使用的绝对路径，客户端里 `idx` 是否出现且工具数可枚举。
- 上下文压缩：`tokens_raw` 对 `tokens_returned`。jevcrawl README 的演示是 docs.python.org 示例抓 6 页，80,034 tokens 压到 1,873 tokens，$0.0069，8.3 秒。
- 成本与停止原因：`jev_cost_usd`、`stopped_because`、`degraded`、`needs_js_urls`。
- 任务效果：是否抓到含答案的页面、答案是否正确，外加每次任务成本、每个正确答案成本、耗时。
- REA 侧：代理能否在不需要用户点名工具的情况下自动调用 rea 的工具；同一任务与未挂载时相比，人工步骤数和耗时是否减少。
- arcmira 侧：`resolve` 是否返回 `best` / `suggested` / `ask` 而不是抛 `id_required`；`arcmira.quote` 的预估与实际消耗是否对得上；被拦住时是否拿到 `paid_plan_required` / `quota_exceeded` / `spend_limit_exceeded` / `member_limit` / `fair_use_cap` / `on_demand_paused` 这类可按 `code` 分支的错误码；Premium 未就绪时是否按 `Retry-After` 重读并最终拿到内容，而不是判失败；monitor 建好后 `notify_frequency` 与投递渠道是否按预期生效。
- CLI-Anything 侧：agent 是否自主发现、安装并启动合适 CLI；生成流水线是否产出 TEST.md、`/cli-anything:test` 与 `/cli-anything:validate` 是否通过；README 自报 2,461 个测试通过、pytest 100%、多语言/多 harness 覆盖率，但这是项目自述，不是第三方复现。
- reason network 侧：`who` 能否稳定列出对方 session 及其当前任务（验证 title / todo 作为状态来源是否够用）；端到端拿到回答的时延，对比“人来转述”的基线；一次协作中人工中转的次数是否下降；消息在哪几个 agent 上是中途可见、哪几个要等到下一步，是否与 README 描述一致（验证任务匹配的那条判据）；关掉一端后发消息、再重连，消息是否补发到（验证离线排队）。
- idx 侧：stdout 是否只输出一个 JSON 文档（把 stderr 单独接走，管道里仍然可解析）；envelope 里的 `provider`、`fetched_at`、`cached`、`stale`、`warnings` 是否符合预期；来源未返回的字段是 `null` 而不是被估算；退出码是否严格按 `0/2/3/4/5/6` 语义返回（用它做脚本分支，而不是解析报错文本）；`idx --offline` 是否命中缓存、未命中是否返回 `5`；agent 是否用 `idx_brief` 起手；工具失败时拿到的是不是 `{error: {code, message}, exit_code}`。
- 安全负向指标：是否出现越权访问、读取工作目录之外的文件、或执行非预期命令；出现即回滚并降级为 study。

对照试验设计（借用 jevcrawl README 的基准设计）：所有系统从站点首页出发、同样的 30 页预算、同一个问题，抓到的内容交给同一个回答 LLM，由同一个 judge 打分，只让爬虫这个变量变。CLI-Anything 没有对比性指标（用了 CLI 之后任务成功率/耗时变化），原文没有给；arcmira 同样没有给出对比性指标，只有厂商自述的数据覆盖与识别准确性；reason network 也没有任何效果数据、性能数字、前后对比或用户案例；idx 本次给出的调研正文在第 9 步后被截断，未见效果数据或对比指标。这几条只能先用流程内建测试和真实重复任务做前后对照（做法 G 第 11 步）。

可参考的作者自测数据（非独立验证）：

- 50 个 WebWalkerQA 任务（2026-10-12，回答模型 `claude-opus-5-5`，judge `claude-sonnet-5-5`）：jevcrawl 答对 40%、找到答案页 54%、$0.025/任务；“Claude 逐个挑链接”为 30% / 33% / $0.194；广度优先为 8% / 11% / $0.228。
- 每正确答答案成本：jevcrawl $0.06、“Claude 挑链接” $0.65、广度优先 $2.85。
- 与 Crawl4AI 0.9.4 的对照（20 个任务，2026-10-13，只比“是否抓到 gold page”，不接 LLM）：答案页 10 次 vs 5 次；全部答案页 5 vs 2；中位爬取时间 29s vs 43s；站点加载失败 0 vs 3；jevcrawl 找到 6 个 Crawl4AI 错过的答案页，Crawl4AI 找到 1 个 jevcrawl 错过的。
- CLI-Anything README 自报：2,461 个测试通过、pytest 100%、多语言/多 harness 的覆盖率；demos 声称能产出 CAD 模型、3D 场景、图表、游戏内容、字幕等真实产物。均无第三方复现。
- reason network：README 没有给出任何效果数据、指标或案例；仓库 33 stars，成熟度无从判断。
- idx：本次给出的调研正文只给出安装命令、MCP 注册方式、输出契约与仓库的数据流水线描述，未见效果数据、性能数字或对比指标。

最小试用方式（半天内可完成）：

1. 准备一个真实问题，条件是答案埋在目标站点首页几跳之下、且该站点不依赖 JS 渲染。
2. 记下当前基线：用你现在的方式（让模型自己抓、或现有爬虫如 Crawl4AI）跑同一个问题，保存它喂给 LLM 的原始上下文和最终答案。
3. 按做法 A 接好 MCP，用 `uvx jevcrawl doctor` 确认通路，然后跑：

```bash
jevcrawl crawl <start_url> --goal "<你的问题>" --json
```

4. 再换一个“答案就在已知单页上”的问题，跑 `jevcrawl scrape <url> --goal "..."`，确认这种场景不会浪费 Jev 调用、也不需要多页爬。
5. 把两份产出的答案交给同一个评审（人或另一个模型）做对照打分 —— 原文在这里被截断，评审的具体口径需要用自己的流程补上。
6. REA 侧的最小试用：在隔离环境执行注册命令 → 枚举工具清单并记录 → 挑一个低风险、可回退的任务做冒烟测试 → 与不挂载 rea 时的同一任务做对照。
7. CLI-Anything 侧的最小试用：在隔离环境 `pip install cli-anything-hub` → `cli-hub list/search/info/install/launch` 一个现成 harness → 接进 agent 跑一条真实重复任务 → 记下未接时的基线并对照；确认真有用后，再考虑用 `/cli-anything` 为内部工具生成新 CLI，并用 `/cli-anything:test`、`/cli-anything:validate` 检查生成物。
8. arcmira 侧的最小试用：在 Claude Code 用 `claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp` 接入（或改用带 Bearer key 的 JSON 配置）→ 调 `arcmira_describe` 读方法表 → 照 README 的“先 `resolve` 后查询”示例程序跑一次 → 从上面 5 条示例提示词里挑一条验证接通 → 对贵操作先 `arcmira.quote` 再跑。
9. reason network 侧的最小试用：找 2 名已经在用 Reason 的同事，各自装好 Reason CLI、确认在同一个 workspace。两人各开一个 Claude Code session，分别跑 `reason network who` 互相确认能看到对方的 session 和当前在做的事；然后由 A 用 `reason network <b的session> "..."` 提一个只有 B 的 agent 凭自己会话上下文才能回答的问题。若团队不在 Reason workspace，或找不到第二个人配合，本线索就退化为思路研读——可以借鉴它的 MCP 三工具接口设计（`list_team` / `send_message` / `check_inbox`）和“状态来自 session 自己的 title 和 todo、不需要 agent 主动汇报”这一条，自建轻量版本。
10. idx 侧的最小试用：`npx github:fzn0x/idx stocks quote BBCA` 零安装跑通 → `npm install -g github:fzn0x/idx`（npm 12 加 `--allow-git=all`）或 `cargo install ihsg-cli` → `idx -o json stocks quote BBCA | jq ...` 核对 envelope 与退出码 → `idx mcp setup <你手上的客户端>` 拿到注册命令并接进 agent → 让 agent 用 `idx_brief` 跑一次 → `idx --offline stocks quote BBCA` 与 `idx cache stats` 验证离线路径。若你的目标领域不是印尼股市，就只抄第 3、4、9 步的结构（统一 envelope、`mcp setup` 自动填绝对路径、失败带回 exit_code），把这条记为 study。

试多久：jevcrawl 侧原文说最小试用半天内可完成；REA 侧原文没有给出时间或次数建议，以完成一轮“注册 → 枚举 → 冒烟 → 对照”为准；CLI-Anything 侧原文未给固定时长，以跑通一条真实重复任务并留下一组对照为准；arcmira 侧调研只建议“小范围试用”，也没有给固定时长或次数，以“示例提示词跑通 + `resolve` 路径走通 + `quote` 预估与实际对得上”为一轮；reason network 侧 README 没有效果数据，以 2 人配合跑通一轮 who → 问答 → send → 离线补发为准；idx 侧调研未给时长，以“零安装跑通 → JSON 契约核对 → MCP 注册 → agent 一次调用 → 离线一次”为一轮。在得到明确正负结果前，不要扩展到长期使用或生产环境。

## 常见坑

- 把“注册成功”当成“验证完成”。REA 侧原文没有给出 list / 枚举命令，必须查 Hermes 文档自行补上；jevcrawl 侧至少还有 `uvx jevcrawl doctor` 这一步；arcmira 侧至少还有 `arcmira_describe` 和一条示例提示词；reason network 侧至少还有 `reason network who` 和一次真实问答；idx 侧至少还要去客户端里确认 `idx` 出现、工具数可枚举，并用 `idx_brief` 真跑一次。
- 把名字当 id 传。arcmira 的过滤器只接受原样 id，传名字会在发网络请求前抛 `id_required`；必须先 `resolve`，并在 `suggested` 时说明假设与理由、在 `ask` 时把候选交回用户。
- 连上就开始猜方法签名。先调 `arcmira_describe`（需要时用 `topic` 只取一个方法及其示例），把 id 规则、参数与返回字段、计量规则、错误码一次读全。
- 不看清计量规则就批量跑。搜索按超出前 5 条的每条 passage 收 4 credits；字幕读取按其窗口每开始的 15 分钟收 4 credits；Premium 转录按整段视频每开始的 15 分钟收 300 credits；`momentum` 每次 10 credits；`start` / `end` 不降低 Premium 计费。贵操作前先 `arcmira.quote`（本身不计费）。
- 以为工具有预算参数。arcmira 的预算在 dashboard 设，工具不接受金额参数；被拦住时按返回的 `code` 分支处理（`paid_plan_required`、`quota_exceeded`、`spend_limit_exceeded`、`member_limit`、`fair_use_cap`、`on_demand_paused`），别把拦截当成“没有数据”。
- 把“还在转”当成失败。Premium 转录未就绪时返回 `202` + `Retry-After`，按它重读不重复计费；仍 `pending` 会带 `eta_seconds`；`failed` / `refunded` 除非传 `retry: true`（只在用户要求时传）不会重开。
- 建了 monitor 就以为能删。arcmira 的 monitor 不提供删除，只能 `paused`；`monitors.attachTrackers` 迁移 tracker 需用户先同意；`monitors.addEntities` 一次最多 90 个 id。
- 把厂商自述当独立证据。arcmira 的数据覆盖与说话人 / 赞助识别准确性全是厂商自述，且有付费计划与 on-demand 预算门槛（README 未给免费额度上限，只说 “Plan limits apply”）。
- 把“安装成功”当成“任务有效”。CLI-Hub 装完 harness 后，要接进 agent 跑一条真实重复任务，确认真有用再考虑用 `/cli-anything` 生成新 CLI。
- 把作者自测当独立证据。jevcrawl 的 50 和 20 个任务样本都很小；原文自己写出的判断是“成本差距大而稳定，准确率差距没那么稳定”。CLI-Anything 的所有效果数据均为项目自述、无第三方复现；reason network 则连效果数据都没有；idx 本次给出的调研正文未包含效果数据。
- 在主力环境里直接跑第三方包。REA 命令字面依赖 `npx`、jevcrawl 依赖 `uvx`、CLI-Hub 依赖 `pip`，都会拉取并执行第三方包；REA 原文完全没讨论安全边界、权限范围、失败排查或离线可用性。arcmira 不往本地落包，但你的程序会在厂商的 Cloudflare Dynamic Worker 沙箱里执行，出站只允许 `GET https://api.arcmira.com/v1/*`（写工具额外允许 `/v1/monitors` 与 `/v1/trackers` 的 POST/PATCH，永不 DELETE）——这既是安全设计，也意味着能力边界。idx 是第三种形态：不自带沙箱的静态二进制直连公开数据源，边界由你自己评估。
- 忽略版本写死。`rea-agents@6.3.0` 是原文写死的版本；jevcrawl 的 `jev-1.13.0` 也是固定版本，阈值按版本校准，换模型需重新评估。arcmira 是远程 MCP、本身不需要更新，但宿主每次连接都会拉取工具与说明，`arcmira_describe` 带版本行；行为不符时先看版本行。
- 以为 jevcrawl 能爬任何站点。它不执行 JavaScript（需 JS 的 URL 会列在 `stats.needs_js_urls`），不读 `robots.txt`，除了一次抓 4 页外不做限速，站点条款与合规由使用者自负；不登录、不绕付费墙和 CAPTCHA。
- 忽略内容外发。jevcrawl 会把页面文本（段落、链接标签、URL）发送到 TypeSafe 打分；API key 只从环境变量读，不落盘、不写日志。
- 把 401 当成故障。arcmira 对无凭证请求返回 401 + OAuth 挑战，这是登录/开户路径；401 响应体里 `error.data.unlock.action` 带了注册调用，agent 可据此自行开户并重连。
- 忽略上游软件依赖。大量 CLI harness 包装的是真实桌面软件（GIMP / Blender / LibreOffice 等），不先装上游软件，`cli-hub launch` 不会产生有效结果。
- Windows 上直接跑 Claude Code 生成路径。Windows 需先装 Git for Windows（含 `bash`/`cygpath`）或使用 WSL，否则会报 `cygpath: command not found`。
- OpenCode 命令引用的 `HARNESS.md` 没和命令放同一目录。命令会引用它，必须在同一目录；旧版目录名为 `command/`。
- 旧版 Claude Code 不识别 `/cli-anything`。改用 `/cli-anything:cli-anything`；辅助命令保持 `:subcommand` 形式（如 `/cli-anything:refine`）。
- 给 GUI 客户端手写相对路径或 `idx`。GUI 应用通常不继承 shell 的 `PATH`，所以 idx 才提供 `idx mcp setup <client>` 并把二进制**绝对路径**填进配置；自己手写命令名会在 GUI 里连不上，而且报错通常看不出是这个原因。
- 从 stdout 以外的地方捞数据。idx 的约定是 stdout 只放一个 JSON 文档、其余全部走 stderr；把 stderr 混进管道解析，或从日志里抠字段，会得到看似随机的结果。
- 把 `null` 当 0、或当成“该自己补一个”。idx 对来源未返回的字段就写 `null`，不做估算；看到 `null` 要按“没有这个数据”处理，并去看 `warnings`。
- 不看退出码。idx 用退出码分语义（`0` 正常、`2` 用法错、`3` 网络/来源错、`4` 未找到、`5` 离线缓存未命中、`6` 配置错）；靠解析错误文本做分支，换个版本就碎。
- npm 12 不加 `--allow-git=all`。用 npm 从仓库安装时会卡住或失败。
- 以为 npm 安装直接给你一个二进制。npm 装的是小启动器，第一次运行 `idx` 才下载对应平台的预编译二进制并用 release 的 `SHA256SUMS` 校验；这一步没跑通，后面所有 `idx mcp` 都不成立。
- 在云 runner 上抓取会拦截云网络的数据源。idx 的 ownership 流水线跑在自托管 runner 上，因为 idx.co.id 会拦截云网络（含 GitHub 自己的 runner）；换成云 runner 会失败，作者的做法是保留镜像、并在最新登记表超过 45 天时让任务变红。
- 以为发布端 Worker 能写。那个 Worker 没有任何写端点；校验靠 SHA-256，且只有新月份全部行数到齐且数量匹配才算“出现”。
- 把 idx 当通用工具。它是印尼股市（IDX / IHSG）专用工具，领域窄；调研的结论是“先试流程而不是直接写进手册”。
- 误把传播数据当效果证据。Matthew 的 REA 帖子 230 万次浏览是曝光量，不是任何效果证据。
- 用被截断的能力清单去规划任务。REA 原文只列到“反编译一个应用”就被截断，后续能力未知；arcmira 调研在“Claude Code 第三方 marketpla…”处被截断，该部分细节未知；idx 的调研正文在第 9 步后被截断，后续内容未知。
- 把“139 个工具”当成事实。数量只是作者主张。
- 没有隔离就上线。只要出现越权访问、读取工作目录之外的文件或执行非预期命令，就应回滚并降级为 study。
- 期待接入 MCP 本身带来主动推进。原文只给出单次调用的边界与状态；定时或事件触发的机制，jevcrawl 与 REA 两侧的原文都没有提到。arcmira 有部分依据（monitor 的 `notify_frequency` 与 Slack/邮件投递），但它需要你先建 monitor、且不支持删除；CLI-Anything 仅在 meta-skill 自主发现安装、Unreal Insights 后台捕获会话控制上有部分依据；reason network 的触发是消息事件驱动的——发给离线者的消息会等待并在其回来时发出，空闲的 session 会被消息唤醒，不支持投递的 agent 会在下一步拿到消息，未提及定时触发或状态触发；idx 的仓库用定时 Actions + 每 30 分钟的 Worker 保持上游数据新鲜，但那是它自己维护数据源的做法，不是这个工具自身会主动推进你的任务。
- 团队不在 Reason workspace 却想试 reason network。它强依赖 Reason CLI 和 Reason workspace，不是通用方案；团队不在这个生态里就用不上。
- 单人自测 reason network。它要求团队整体部署，单人无法自测出“团队通信”的价值。
- 不看 session title/todo 就想让 `who` 有用。状态来自 session 自己的 title 和 todo，agent 不主动汇报；标题和 todo 没意义时，别人看不出你在做什么。
- 把 reason network 的 README 自述当成独立验证。投递时机、离线排队、唤醒空闲 session 等行为均来自 README 自述，未经独立验证。

## 证据与来源

- 做法 A / B / C 依据的调研：REA / Hermes 路径可核查内容为“REA 设置菜单已支持 Claude Code 和 Codex”这一事实陈述，以及一条完整可复制的接入命令 `hermes mcp add rea --command npx --args -y rea-agents@6.3.0 mcp`。只是作者主张、未经原文验证：接入后代理会多出 139 个工具；“反编译一个应用”等具体能力清单，且原文在列举处被截断。传播数据：Matthew 的 REA 帖子 230 万次浏览，这是曝光量，不是效果证据。该调研的判断是原文只给了一种接入形态、没有验证方式，因此只建议给到“试”，而不是“采用”。
- 做法 A 依据的调研（仓库 RayenMlayeh/jevcrawl，Apache-2.0，Python 3.11+，README 页显示 37 stars）：可直接照做的是安装命令、参数默认值、输出字段与环境变量表。数据均为作者自测：50 个 WebWalkerQA 任务（2026-10-12，回答模型 `claude-opus-5-5`，judge `claude-sonnet-5-5`）jevcrawl 40% / 54% / $0.025，Claude 逐个挑链接 30% / 33% / $0.194，广度优先 8% / 11% / $0.228；每正确答答案成本 $0.06 / $0.65 / $2.85；与 Crawl4AI 0.9.4 的 20 任务对照（2026-10-13）答案页 10 vs 5、全部答案页 5 vs 2、中位爬取时间 29s vs 43s、站点加载失败 0 vs 3；docs.python.org 示例 80,034 tokens → 1,873 tokens，$0.0069，8.3 秒。作者主张（无独立验证）：找到答案页的概率约 2 倍于 Crawl4AI、比 LLM 驱动爬取快 2 倍、天然抗 prompt injection（页面文本只作为数据字段被打分，问句是 jevcrawl 写死的固定字符串）、引文逐字可溯源。原文自陈局限：样本小；Crawl4AI 驱动真实浏览器而 jevcrawl 不执行 JavaScript；不读 `robots.txt`、除一次抓 4 页外不限速、站点条款与合规自负、不登录不绕付费墙和 CAPTCHA；页面文本会发送到 TypeSafe。
- 做法 E 依据的调研：arcmira/mcp。可核查的是 README / 调研给出的接入与使用方法：`claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp`、`codex mcp add arcmira --url https://mcp.arcmira.com/mcp`、带 `Authorization: Bearer $ARCMIRA_API_KEY` 的命令行与 `mcpServers` JSON 配置、纯 API 注册的两个 `/v1/signups` 调用、`arcmira.com/agent-setup`、`arcmira/mcp` 插件与 `gemini extensions install https://github.com/arcmira/mcp`、`npx skills add arcmira/mcp`，以及 4 个工具（`arcmira_describe` 约 23,000 字符且不计量、`arcmira_execute_read`、`arcmira_execute_write`、`arcmira_feedback`）、客户端方法表、`id_required` 与 `resolve` 的 `best` / `suggested` / `ask` 语义、Premium 转录的 `202` + `Retry-After` 与 `failed` / `refunded` / `retry: true` 行为、credits 计量规则（搜索超出前 5 条每条 passage 4 credits；字幕每开始 15 分钟 4 credits；Premium 转录每开始 15 分钟 300 credits；`momentum` 每次 10 credits；`start`/`end` 不减 Premium 计费）、错误码清单、monitor 方法集（不提供删除）、沙箱出站白名单与永不 DELETE。厂商自述、无第三方复现：数据覆盖与说话人 / 赞助识别准确性。该调研的结论是先在 Claude Code 里用一条命令接入（或改用带 Bearer key 的 JSON 配置），再照“先 resolve 后查询”的示例做小范围试用；因为仓库给出了可直接复制的安装命令、方法表、示例代码和 credits/限额规则，属于能立刻落地的工具供给，但准确性主张全是厂商自述、且有付费计划与预算门槛，不足以直接采纳。README 未给出免费额度上限，只说明 “Plan limits apply”。
- 做法 D 依据的调研：HKUDS/CLI-Anything。可核查的是 README 给出的安装与使用命令：`pip install cli-anything-hub`、`cli-hub list/search/info/install/update/uninstall/launch`、`npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y`、`/plugin marketplace add HKUDS/CLI-Anything`、`/plugin install cli-anything`、`/cli-anything`、`:refine`、`:test`、`:validate`，以及各宿主安装脚本。作者主张（无第三方复现）：CLI 是人和 agent 的通用接口；7 阶段流水线能自动生成带 REPL/JSON 输出/undo-redo 的 Click CLI、测试、文档并发布；README 自报 2,461 个测试通过、pytest 100%、多语言/多 harness 覆盖率；demos 声称能产出 CAD 模型、3D 场景、图表、游戏内容、字幕等真实产物；建议小范围试用，先用 `cli-hub` 装一个现成 harness 接进 agent 跑一条真实重复任务，确认真有用后再考虑用 `/cli-anything` 为内部工具生成新 CLI。原文也明确：大量 harness 依赖上游桌面软件；Windows 需 Git for Windows 或 WSL；生成流水线有 TEST.md 与 `/cli-anything:test`、`/cli-anything:validate`，但没有对比性指标（用了 CLI 之后任务成功率/耗时变化）。
- 做法 F 依据的调研：reason-machines/reason-network。原文给出的、可直接照做的部分：安装方式（Reason CLI 自动下载校验后的固定构建）、四条 CLI 命令（`reason network`、`reason network who`、`reason network <session> "..."`、`reason network send <session> "..."`，以及 `reason network setup`）、MCP server 名 `reason-network` 与三个工具名 `list_team` / `send_message` / `check_inbox`、按 agent 区分的投递时机（Claude Code、Codex、opencode、pi、Reason 会话中途可收消息且空闲会被唤醒；Cursor、Gemini、Copilot 下一步才收到）、网络与安全模型（P2P / iroh / 中继只看到密文、仅团队成员可连、一台机器只代表本人）、状态目录 `~/.reason/network`、源码构建与测试命令。只是作者主张、没有数据支撑的部分：整套“团队协作因此变好”的说法；README 没有任何使用数据、性能数字、前后对比或用户案例。仓库 33 stars，成熟度无从判断。适用条件与局限：强依赖 Reason CLI 和 Reason workspace，不是通用方案；要求团队整体部署，单人无法自测出“团队通信”的价值；README 没有给出手动配置 MCP 的方法，也没有提示词层面的指引；投递时机、离线排队、唤醒空闲 session 等行为均来自 README 自述，未经独立验证。
- 做法 G 依据的调研：fzn0x/idx（安装包名 `ihsg-cli`，命令 `idx`）。可核查的是 README / 调研给出的命令与约定：三/四种安装方式（`cargo install ihsg-cli` 需 Rust 1.88+、`npm install -g github:fzn0x/idx`、install.sh、Windows releases zip）、npm 12 需 `--allow-git=all`、npm 启动器首次运行下载预编译二进制并用 release 的 `SHA256SUMS` 校验、`idx -o json` 的 envelope 字段（`provider`、`fetched_at`、`cached`、`stale`、`warnings`）、缺失字段为 `null` 不估算、退出码 `0/2/3/4/5/6` 语义、`idx schema quotes` 等字段定义入口、`idx mcp` 的 stdio 与 `--http 127.0.0.1:8765 --token T --allowed-host '*'` 形态、`idx mcp setup --list` / `idx mcp setup <client>`（打印绝对路径，理由是 GUI 不继承 `PATH`）、各客户端注册命令与配置片段（Claude Code / Codex / Gemini CLI / Copilot CLI / VS Code / Droid / Qwen Code / Claude Desktop / Meta Muse Code / Cline-Roo-Kilo / Cursor-Windsurf-JetBrains-Warp-Trae-Augment / OpenCode / Crush / Codex config.toml / Continue / Zed / Antigravity / Kiro / Goose / Mistral Vibe）、面向只支持远程 URL 产品的 HTTPS 隧道 + Bearer 做法、离线命令 `idx --offline` / `IDX_OFFLINE=1` 与 `idx cache stats`、23 个工具名与筛选语法示例、工具设计约束（用每个 harness 都接受的类型化输入 schema、工具返回与 `-o json` 同一 envelope、失败以 `{error: {code, message}, exit_code}` 返回）、仓库的数据保鲜流水线（Actions 定时抓取、因 idx.co.id 拦截云网络而跑在自托管 runner、Worker 每 30 分钟校验 SHA-256 后装入 D1、Worker 无写端点、`idx ownership import --latest` 与 `IDX_OWNERSHIP_SOURCE=mirror`）。调研未给出的部分：效果数据、性能数字、前后对比；该调研正文在第 9 步后被截断，后续内容未知。调研的判断是“值得小范围试”——照 README 装起来并用 `idx mcp setup <客户端>` 注册进你已在用的 agent，用来验证“把现成 CLI 包成 MCP 工具供 agent 调用”这一模式是否真的省事；它本身是印尼股市工具、领域窄，所以先试流程而不是直接写进手册。
- 与已有清单的关系：Claude Code 为 adopt；jevcrawl 以 MCP server 形式接入 Claude Code 是给已采用工具加装“站内多跳检索”能力的一条路径；Cursor 为 watch，README 明确支持，配置方式就是上面的 `mcpServers` JSON；arXiv（source，try）是基准所用 WebWalkerQA 的来源（arXiv 2501.07572，Wu et al., Alibaba Tongyi Lab, ACL 2025）。清单中 Claude Code 已内置对 REA 的接入，Hermes 为 watch，本条线索给出一条手动让它获得外部工具集的路径；清单中没有与 REA / rea-agents 直接对应的条目，也没有与 jevcrawl 或 Crawl4AI 这类具体爬虫方案直接对应的条目。HKUDS/CLI-Anything 在清单中为 watch，本报告建议上调为 try；Claude Code 是它的一等公民宿主，Cursor、OpenClaw、OpenCode、goose、Hermes 为 watch 且是它支持的宿主/同类接入点；GitHub Copilot 为 drop，本报告未给出具体安装路径；SkillHub 为 study，与 `npx skills add ... --skill <name> -g -y` 的 skill 分发方式相关。清单中没有覆盖“多 agent 跨机通信 / 用 MCP 把团队的 agent 连成一张网”的条目，reason network 补的是这一块；它的三个 MCP 工具设计（`list_team` / `send_message` / `check_inbox`）可以脱离本产品，作为自建同类能力时的接口参照。idx 这类“现成 CLI 自带 MCP server、一份数据三种界面”的供给方式在清单中没有直接对应条目；可迁移的是它的 `mcp setup` 自动填绝对路径、统一 envelope 与退出码、以及 Worker/Actions 的数据保鲜结构。
- 尚未覆盖的部分：MCP 六条线索都只给出有限的接入形态 —— REA 与 jevcrawl 是 MCP 服务器 + 代理，arcmira 是远程 MCP + 写程序沙箱，CLI-Anything 给的是 CLI harness 形态，reason network 给的是团队 agent 横向通信形态，idx 给的是“CLI 与 MCP 共用一份 JSON 契约”的形态。它们都没有讨论哪类任务适合哪个模型，也没有比较 Claude Code / Codex / Hermes 三者在同一工具集下的差异；没有涉及反馈信号、上下文信息、权限回收机制（arcmira 有 `arcmira_feedback`、`settings → Connected apps` 撤销与 monitor `paused` 等零散机制，但未系统化）；除单次调用边界与停止原因外，未提任何由时间、事件或状态触发的主动推进能力（arcmira 的 monitor 通知、CLI-Anything 的 meta-skill 自主发现安装与 Unreal Insights 后台捕获会话控制、reason network 的消息事件驱动与离线排队、idx 仓库的定时 Actions 与 30 分钟 Worker 只是部分依据）。

## 依据的调研

- [@BkashJosi: REA 的设置菜单中列出了 Claude Code 和 Codex。Hermes 不在其中。🪽](../research/radar/2026-10-12/2718-rea-claude-code-codex-hermes.md)：值得一试，可以小范围试：在隔离环境里用作者给出的一行命令把 rea-agents 作为 MCP 服务器挂到 Hermes，再核对工具清单并跑一个低风险任务验证；因为原文只给了这一条可复制的接入命令，工具数量与能力都还只是作者主张，且原文在工具清单处被截断。
- [RayenMlayeh/jevcrawl](../research/radar/2026-10-14/3198-rayenmlayeh-jevcrawl.md)：值得一试，按 README 给出的两条 MCP 配置把 jevcrawl 挂到 Claude Code/Cursor，先用 1–2 个真实的多跳查资料任务与现有抓取方式做对照；理由是它提供了可直接照做的安装命令、参数默认值和输出字段，成本/耗时对比具体，但基准样本小、依赖付费 Jev API、不执行 JavaScript，适合小范围试而非直接替换。
- [HKUDS/CLI-Anything](../research/radar/2026-10-15/3558-hkuds-cli-anything.md)：值得一试，建议小范围试用：先用 `cli-hub` 装一个现成 harness 接进 agent 跑一条真实重复任务，确认真有用后再考虑用 `/cli-anything` 为内部工具生成新 CLI——它把“给 AI 提供工具入口”变成了可复制的命令与流程，但所有效果数据均为项目自述、无第三方复现，且大量 harness 依赖上游桌面软件。
- [arcmira/mcp](../research/radar/2026-10-17/4078-arcmira-mcp.md)：值得一试，先在 Claude Code 里用一条命令接入这个远程 MCP（或改用带 Bearer key 的 JSON 配置），再照 README 的「先 resolve 后查询」示例程序做小范围试用；理由是仓库给出了可直接复制的安装命令、方法表、示例代码和 credits/限额规则，属于能立刻落地的工具供给，但数据覆盖与说话人/赞助识别准确性全是厂商自述，且有付费计划与预算门槛，不足以直接采纳。
- [reason-machines/reason-network](../research/radar/2026-10-17/4174-reason-machines-reason-network.md)：值得一试，若团队已经在用 Reason CLI 并且成员都在同一 workspace，可以小范围试用 reason network：用 `reason network who` 和 `reason network <session> "..."` 让两个 agent session 直接互相问答，观察是否减少人工中转。理由是原文给出了可复制的安装命令、CLI 命令和 MCP 工具名，但完全没有效果数据，且强依赖 Reason 产品与团队整体部署。
- [fzn0x/idx](../research/radar/2026-10-18/4493-fzn0x-idx.md)：值得一试，值得小范围试：照 README 把 idx 装起来并用 `idx mcp setup <客户端>` 注册进你已在用的 agent，用来验证「把现成 CLI 包成 MCP 工具供 agent 调用」这一模式是否真的省事；它本身是印尼股市工具，领域窄，先试流程而不是直接写进手册。
