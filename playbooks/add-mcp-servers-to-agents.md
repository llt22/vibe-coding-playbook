# 把第三方工具接给代理前，先隔离、核对清单并做对照试用

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：这篇手册解决的是：如何在不污染主力环境、不越过数据外发边界的前提下，把第三方 MCP、CLI 或技能接入代理，核对工具清单、做冒烟测试和对照验证，并据证据决定继续、参考还是停止。
> 先试这一步：先选一个低风险真实任务，在容器、虚拟机或专用账号里按做法 A 或 D1 跑通“接入→核对工具清单→冒烟→与未挂载对照”这一轮。
> 最近修订：2026-10-20

## 解决什么问题

把第三方工具集以 MCP、CLI 或技能形式接给代理时，常见供给方式是一句注册/安装命令就完事：能不能用、多出哪些工具、花了多少钱、数据发到哪里、和现有做法比是不是真的更好，全靠感觉。本章解决的是：怎么在不污染主力环境、不越过数据外发边界的前提下，完成接入、核对工具清单、冒烟测试和对照验证，并据证据决定“继续试”“只当思路参考”还是“停止”。现在覆盖 11 条工具路径：jevcrawl、REA/Hermes、arcmira、CLI-Anything/CLI-Hub、reason network、idx、Blender 扩展、jevreel、WhatsApp MCP、im-mcp、claude-security-scan；做法 C 是不接入的降级做法。新增的两条私人消息路径（WhatsApp MCP、im-mcp）有一个共同前提：先只读、只用自己的个人账号、只在一台机器上试；发送、多人共享、媒体转写都不在范围内。新增的 claude-security-scan 路径也要先只读、只对一个低风险域、确认脱敏和“未能确认”标注可靠后再扩大。

## 适用与不适用

适用：

- 通用：本机有可用的 MCP 客户端；愿意在容器、虚拟机或专用账号里先跑第三方包；目标是让代理获得一整套外部工具或一类新能力；需要反复调用外部软件、需要可复现操作；愿意做“挂载 vs 未挂载”的对照。
- jevcrawl：站内多跳资料检索，答案埋在首页几跳之下，且目标站点不依赖 JavaScript 渲染。
- REA/Hermes：已有 Hermes CLI，想试一条 `npx` 拉起的 MCP 工具集；但原文只给一条命令、能力清单被截断，只适合试。
- arcmira：要在 YouTube 视频与直播转录里检索谁在什么时间说了什么、品牌赞助、谁在推荐某个实体；接受远程 MCP + 写程序调用；有付费计划与预算。
- CLI-Anything：要反复调用 GIMP、Blender、LibreOffice 等软件，愿意先装上游软件；或想让编码 agent 为内部工具生成 CLI。
- reason network：团队里每个人都在用 Reason CLI、成员都在同一个 Reason workspace，想让一个 session 直接问另一个 session。
- idx：目标就是印尼股市，或想照抄它的结构——“一份数据三种界面”、`mcp setup` 自动填绝对路径、统一 envelope 与退出码。
- Blender 扩展：Windows x64 + Blender 4.2+，想让 AI 在场景里做可回退操作，并要审批、取消、命名撤销与视口截图。
- jevreel：有一段本地或 URL 视频，要在里面找“某个瞬间在哪儿”；接受底层 Jev 图像能力仍是实验性、验证只基于单个测试视频。
- J WhatsApp MCP：个人 WhatsApp 账号，只做只读检索、摘要、补看群聊、给未命名聊天补名；愿意在自己的 Cloudflare 付费 Workers 上部署；能接受非官方协议和违反 WhatsApp 条款的风险；一个部署只对应一个账号和一个 owner。
- K im-mcp：Windows x64 或 macOS，微信 4.x / 钉钉 7.x，客户端已登录；要给 agent 补一段私有沟通上下文；只读检索；能接受本地数据库解密后明文落盘、强依赖客户端版本。
- claude-security-scan：已安装 Claude Code、git、bash；Python 3.11+；能访问 GitHub；想用一句自然语言或定时任务做跨 Mac 本体、本地 git 仓库、GitHub、Vercel/公开站点、AWS、GCP、Azure、Cloudflare、Supabase、Gmail 的只读例行检查；愿意按域准备只读登录；接受缺工具或权限时进入“未能确认”而不是“无问题”；想按重要度、领域、NEW 过滤报告。

不适用：

- 通用：不能隔离、必须直接在主力工作目录上试用；需要稳定可复现的生产接入；依赖被截断的完整工具清单来规划任务；需要量化效果数据但原文只有作者自述。
- jevcrawl：目标站点需要 JavaScript、需要登录、有付费墙/CAPTCHA；这些它都不做。
- arcmira：不想开账号、不想设预算；需要可删除的持续跟踪生命周期（monitor 只能 `paused`，不提供删除）。
- CLI-Anything：所选 harness 包装真实软件但你不想装上游软件；Windows 上没有 Git for Windows（含 `bash`/`cygpath`）或 WSL。
- reason network：团队不在 Reason workspace，或找不到第二个人配合；单人无法自测出“团队通信”的价值。
- idx：目标不是印尼股市；它领域窄，值得抄的是供给结构，不是行情本身。
- Blender 扩展：不在 Windows x64 / Blender 4.2+；把“Python 工具验证”当安全沙箱；需要量化效果证据。
- jevreel：需要成熟、有独立验证的图像理解能力；不装 FFmpeg、不用 Python 3.11+ 或不用 uv；需要向量检索式的跨大库存量查询。
- J WhatsApp MCP：要发送消息、多人共享、媒体转写；用免费 Cloudflare 计划（README 要求 Workers Paid，免费计划未验证）；不能接受非官方协议与条款风险；希望一个部署服务多个账号或多个 owner。
- K im-mcp：Linux（原文未提支持）；微信/钉钉版本不在支持表；Windows 没有管理员终端或微信未登录；macOS 4.1+ 没有 64 位 hex passphrase；不能接受本地解密明文落盘；需要 README 未给出的定时/事件触发实现；需要效果指标而只有兼容性验证表。
- claude-security-scan：需要攻击性测试（暴力、模糊测试）；需要 Google Workspace 整体管理设置（需 Admin API 委派，不在范围）；AWS 只默认东京和弗吉尼亚，其他区域需配置；不能接受第三方技能读取多账户敏感信息；要求有检出率、误报率或独立评测；不能先在隔离或低风险环境试；只依赖 README 的只读与脱敏设计而未经代码级验证。

## 前置条件

通用：

- 一个隔离环境：容器、虚拟机或专用账号，避免第三方工具直接接触主力工作目录。
- 到包分发源与目标服务的网络出口。
- 一个可回退的低风险真实任务，用来做冒烟测试和对照。

jevcrawl：TypeSafe Jev API key（付费，`jev-1.13.0` 输入 token 单价 $0.042/百万）；本机已装 uv；到 `api.typesafe.ai` 的网络出口；确认页面文本允许外发到 TypeSafe。

REA/Hermes：`hermes` 命令存在；Node.js/npx 可用；能访问 npm registry；在隔离环境执行。

arcmira：Arcmira 账号；MCP 宿主为 Claude Code / Codex / Claude Desktop / claude.ai / ChatGPT / Cursor / Gemini CLI 之一；付费计划与 on-demand 预算（README 只说 “Plan limits apply”，未给免费额度上限）；到 `https://mcp.arcmira.com/mcp` 与 `https://api.arcmira.com` 的网络出口。

CLI-Anything：Python 3.10+；若 harness 包装真实软件，先装该上游软件；meta-skill 需要支持 SKILL 的 agent；Claude Code 生成器需已装 Claude Code，Windows 需 Git for Windows 或 WSL；Cursor 需已装 Cursor 并 clone 仓库。

reason network：使用 Reason CLI 与 Reason workspace，团队其他成员也在同一个 workspace；每台机器上的 daemon、MCP server `reason-network` 与三个工具权限可用；网络可达（同 Wi-Fi 直连、iroh 跨公网、或中继兜底）；`~/.reason/network` 可用。各 session 要维护有意义的 title 和 todo。

idx：Node/npm，或 Rust 1.88+，或 Linux/macOS 直接跑 install.sh；Windows 无 npm 时从 releases 下载 `idx-<version>-x86_64-pc-windows-msvc.zip`；npm 12 需 `--allow-git=all`；支持 MCP 的客户端；只支持远程 URL 的产品需要 HTTPS 隧道；离线模式要求之前至少成功取过一次。

Blender 扩展：Windows x64、Blender 4.2+；从 Releases 下载 `mcp-for-blender-pro.zip`；支持 tool calling 的模型与 provider 凭证；资产工作流可能需要 Poly Haven / Sketchfab / Poly Pizza 的 key；使用 Studio 或外部客户端时保持 Blender 打开。

jevreel：Python 3.11+、FFmpeg 在 PATH；TypeSafe API key（无 key 时，不带时间线的索引、zoom、字幕和 query 仍可用）；插件方式需要 uv 与 FFmpeg，本地语音转写默认不含；视频为本地文件或 URL，或旁有 `.srt`/`.vtt` 字幕；自定义问题要写成 lens TOML。

J WhatsApp MCP：Cloudflare 账户（README 要求 Workers Paid；免费计划未验证，作者建议删掉 `limits` 块并预期首次导入不稳定）；Node 20+；自己的手机和 WhatsApp 账号；只读个人账号；创建 `OAUTH_KV` 并把 id 填进 `wrangler.jsonc`；设置至少 12 字符的 `OWNER_PASSWORD`；可选 `PIN`（32+ 随机字符）开启调试路由。

K im-mcp：Windows x64 或 macOS（Apple Silicon / Intel），原文未提 Linux；微信 4.x（实测 `4.1.15.13` Windows、`4.1.35.15` macOS ARM64、`4.1.15`(270115) macOS x86_64），兼容 3.9.x；钉钉 7.x（实测 `7.6.0.x`，另有 7.5.x / 7.0.x）；Windows 初始化需管理员终端且微信已登录（扫描 `Weixin.exe` 内存取密钥）；macOS 4.1+ 需 64 位 hex passphrase；已安装 uv；客户端支持 MCP 配置。默认落盘 `~/.wechat_mcp/`、`~/.dingtalk_mcp/`，可用 `--output` / `--output-dir` 改。

claude-security-scan：Claude Code、git、bash；Python 3.11+；能访问 GitHub。把仓库克隆到 `~/.claude/skills/security-scan`，并安装 gitleaks 与 osv-scanner（`scripts/install-tools.sh`，SHA256 验证）。按域准备只读登录：`gh auth login`、`vercel login`、`aws configure` 或 `aws sso login`、`gcloud auth login`（viewer）、`az login`（Reader）、`CLOUDFLARE_API_TOKEN` 只读、`supabase login`、`SUPABASE_ACCESS_TOKEN`、`gog auth add you@example.com`；命令里的 `...` 要换成自己的只读 token。无配置也能运行；需要限制范围时把 `config.example.toml` 复制到 `~/.config/security-scan/config.toml` 后编辑。AWS 默认只查东京 `ap-northeast-1` 和弗吉尼亚 `us-east-1`，其他区域要在 `[aws] regions` 中追加。报告保存在 `reports/<日時>/report.html`，本机权限 700，含弱点清单，注意共享。

## 操作步骤

先做 A 或 D1：它们能在半天内给出可观察结论，也顺带把隔离环境、基线记录这套流程跑通。若目标就是私人消息只读检索，再考虑 J 或 K；不要从发送、多人共享或媒体转写开始。若你已有支持远程 MCP 的宿主且目标就是口语内容检索，直接做 E；团队已在 Reason 且找得到第二个人，可做 F；只想用最小成本看清“CLI 与 MCP 共用一份输出”的结构，做 G 的第 1、3、4 步；手上就有 Windows x64 + Blender 4.2+，做 H 的第 1–4 步；有一段本地短视频要检索，做 I 的第 1–3 步；有个人 WhatsApp 且接受条款风险，做 J 的 1–8 步；要在本机补微信/钉钉沟通上下文，做 K 的 1–6 步；想做跨系统的例行只读安全检查，做 L 的 1–8 步，先 `--demo`，再只对一个低风险域 `--skip repos`。

### 做法 A：接入有完整参数与回执的工具集（以 jevcrawl 为例）

1. 申请 key，确认外发边界。页面文本（段落、链接标签、URL）会被发送到 TypeSafe 打分。预期结果：拿到 key，并列出哪些站点不能碰。

2. 装成 Claude Code 的 MCP server：

```bash
claude mcp add jevcrawl -e TYPESAFE_API_KEY=<your key> -- uvx jevcrawl
```

3. 或写进其他 MCP 客户端的 `mcpServers` 段：

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

预期结果：doctor 报告通路正常。这是后面所有验证的前提。

5. 用自然语言提示词验证通路：

```text
Use jevcrawl to find which Python version added the walrus operator, starting from docs.python.org
```

预期结果：代理不需要用户点名工具，就自动调用 jevcrawl 并返回带出处的原文段落。

6. 或不走 MCP，直接用 CLI：

```bash
uv tool install jevcrawl
jevcrawl crawl https://docs.python.org/3/ --goal "What does the walrus operator do?" --json
jevcrawl scrape https://example.com/help/returns --goal "..." --json
jevcrawl map https://example.com --goal "..." --limit 20
jevcrawl doctor
```

`crawl(goal, start_url, max_pages=30, max_seconds=120, return_tokens=4000, max_decision_usd=0.05)` 用于答案可能在几层链接之下；`scrape(url, goal=None)` 用于已知单页；`map(start_url, goal, limit=50, max_pages=10)` 只返回排序 URL。

7. 按需设置环境变量：`TYPESAFE_API_KEY`、`JEVCRAWL_BASE_URL`（默认 `https://api.typesafe.ai`）、`JEVCRAWL_MODEL`（默认 `jev-1.13.0`，固定版本，阈值按版本校准）、`JEVCRAWL_CACHE_DIR`（默认 `~/.jevcrawl/cache`）。

8. 用预算参数和回执字段核对每次调用：`max_pages`、`max_seconds`、`max_decision_usd`、`return_tokens` 限定每次调用；`max_decision_usd` 是硬上限，可能超限的请求不会发出；用 `stopped_because`（`answered` / `frontier_empty` / `max_pages` / `max_seconds` / `budget` / `auth_error`）判断是找到答案还是撞上限；同一 goal 同一页面的 Jev 结果会缓存；需要 JS 的 URL 列在 `stats.needs_js_urls`；返回还含 `blocks`、`uncertain`、`pages`、`stats`（`pages_fetched`、`tokens_raw`、`tokens_returned`、`jev_calls`、`cache_hits`、`jev_cost_usd`、`model`、`degraded`、`needs_js_urls`、`stopped_because`、`elapsed_seconds`）。

9. 观察降级：连续三次 Jev 请求失败后，爬取转为广度优先，所有 block 以未打分形式放进 `uncertain`，并置 `stats.degraded`。不要把降级结果当成打分结果。

### 做法 B：接入只有一条命令、清单不完整的工具集（以 REA 接入 Hermes 为例）

1. 在隔离环境确认 `hermes` 命令存在、`npx` 可用、能访问 npm registry。

2. 注册：

```
hermes mcp add rea --command npx --args -y rea-agents@6.3.0 mcp
```

3. 核对注册与工具清单。原文没有给出查看已注册 MCP 服务器或工具列表的命令，需查 Hermes 文档补上。记录 `rea` 是否存在、实际工具数量和名称；作者声称有 139 个工具，这个数量未验证。

4. 做低风险冒烟测试：在 Hermes 会话里提一个需要外部工具的自然语言请求，观察代理会不会自动选中 rea 工具。原文在能力列举处被截断，只作为核对参照。

5. 与未挂载时做对照：同一任务，不挂载 rea 再跑一次，比较能否自主选用工具、人工干预、步骤数和耗时。

6. 版本与安全检查：确认 `rea-agents@6.3.0` 是否当前可用；记录实际拉取版本、权限范围，以及是否出现越权访问、读取工作目录之外文件或执行非预期命令。

### 做法 C：不实际接入，只当作“用 MCP 批量接工具”的思路参考

当注册失败、注册后工具无法被代理实际调用、无法提供隔离环境、或需要完整工具清单和失败排查步骤而原文没有时，选做法 C。只记录设计点：MCP 批量供给、远程 MCP 只暴露少量工具让模型写程序、团队 agent 三工具接口（`list_team` / `send_message` / `check_inbox`）、CLI 与 MCP 共用一份 JSON envelope 并把退出码带进工具错误、零嵌入视频检索的类型化回答 + contact sheet + 全分辨率复核、MCP server 与可视化工作区一起长在宿主软件内部并用审批与命名撤销兜底。

### 做法 D：用 CLI-Anything / CLI-Hub 把软件包成 agent-native CLI

选 D 当你要反复调用外部软件、需要可复现操作，而且目标软件有现成 harness 或愿意让编码 agent 生成。先做 D1。

#### D1：直接用现成 CLI

前提：Python 3.10+；若 harness 包装真实软件，先装上游软件。

```bash
pip install cli-anything-hub
cli-hub list
cli-hub search image
cli-hub info gimp
cli-hub install gimp
cli-hub launch gimp
```

需要时 `cli-hub update <name>`、`cli-hub uninstall <name>`。预期结果：跑通一条真实重复任务，并记录与不用 CLI 时的差异。

#### D2：让 agent 自己发现并安装 CLI

前提：支持 SKILL 的 agent。

```bash
npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y
```

```text
Find appropriate CLI software in CLI-Hub and complete the task: ...
```

预期结果：agent 自行搜索、安装并启动合适 CLI，再完成任务。

#### D3：用 Claude Code 生成新 CLI

前提：Python 3.10+；目标软件或源码在本机或可在线获取；已装 Claude Code；Windows 需 Git for Windows 或 WSL。

```bash
/plugin marketplace add HKUDS/CLI-Anything
/plugin install cli-anything
/cli-anything ./gimp
/cli-anything:refine ./gimp
/cli-anything:refine ./gimp "I want more CLIs on image batch processing and filters"
```

排错顺序：先 `/reload-plugins`；再 `/help cli-anything`；必要时重装 marketplace 与插件；旧版不识别 `/cli-anything` 时改用 `/cli-anything:cli-anything`。生成物可用 `/cli-anything:test`、`/cli-anything:validate` 校验。

#### D4：其他宿主的最小安装动作

- Cursor：clone 后 `bash CLI-Anything/cursor-plugin/scripts/install.sh`；Windows PowerShell 用 `.\CLI-Anything\cursor-plugin\scripts\install.ps1`；默认装到 `~/.cursor/plugins/local/cli-anything`（可用 `CURSOR_PLUGINS_HOME` 覆盖）；Reload Window 后用 `/cli-anything ./gimp` 等命令。
- Pi Coding Agent：`bash .pi-extension/cli-anything/install.sh`，装到 `~/.pi/agent/extensions/cli-anything/`，`/reload` 或重启生效。
- OpenCode：`cp CLI-Anything/opencode-commands/*.md ~/.config/opencode/commands/`，并把 `HARNESS.md` 复制到同目录。
- OpenClaw：把 `openclaw-skill/SKILL.md` 复制到 `~/.openclaw/skills/cli-anything`，会话里用 `@cli-anything build a CLI for ./gimp`。
- Codex：`bash CLI-Anything/codex-skill/scripts/install.sh`（Windows 用 `install.ps1`），装到 `$CODEX_HOME/skills/cli-anything`（未设置时 `~/.codex/skills/cli-anything`）。
- Qodercli：`bash CLI-Anything/qoder-plugin/setup-qodercli.sh` 注册到 `~/.qoder.json`，新开会话用 `/cli-anything ./gimp`。

### 做法 E：接入远程 MCP，用“写程序”的方式调用（以 arcmira 为例）

1. 偷懒路径：把这段原样丢给 coding agent：

```text
Fetch and execute the appropriate instructions to set me up for Arcmira from https://arcmira.com/agent-setup/prompt.md
```

2. 标准路径：用宿主登录（OAuth）添加远程 MCP，无 key：

```bash
claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp
codex mcp add arcmira --url https://mcp.arcmira.com/mcp
```

Claude Desktop、claude.ai、ChatGPT、Cursor：把 URL 作为 custom connector / MCP server 添加，不带 header，按提示登录。预期结果：宿主里出现 arcmira，凭证由宿主管理，可在 Settings → Connected apps 撤销。

3. 备用路径：用 Bearer key（`arc_sk_...`）。没有账号也没有浏览器时，可纯 API 注册：

```bash
curl -X POST "https://api.arcmira.com/v1/signups?src=mcp-tool" \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@example.com"}'

curl -X POST "https://api.arcmira.com/v1/signups/verify" \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@example.com","code":"482913"}'
```

```bash
claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp --header "Authorization: Bearer $ARCMIRA_API_KEY"
```

4. 连上后先调用 `arcmira_describe` 拿参考手册，别猜方法签名。可用 `topic` 只取某个方法及其示例。预期结果：拿到 id 规则、方法表、参数与返回字段、可运行示例、计量与监控规则、错误码。

5. 遵守 id 规则：先用 `resolve` 拿 id，再用 id 查询。过滤器只接受原样 id；把名字当 id 会抛 `id_required`。`resolve` 返回 `best` / `suggested` / `ask`。示例程序：

```javascript
const r = await arcmira.resolve("Linear");
const e = r.best ?? r.suggested;
if (!e) return { ask: r.ask };
const m = await arcmira.momentum(e.id);
return { entity: e.name, id: e.id, assumed: Boolean(r.suggested), why: r.suggested?.evidence ?? null, verdict: m.verdict, last30: m.volume.mentions_30d, prior30: m.volume.mentions_prior_30d, as_of: m.as_of };
```

6. 需要整段转录时用 Premium 质量，并处理“还没转好”：

```javascript
const t = await arcmira.transcript("cdLeJU_1UH8", { quality: "premium" });
return t.state === "ready" ? t.lines : { state: t.state, eta_seconds: t.eta_seconds, note: t.note };
```

未就绪时返回 `202` + `Retry-After`，按它重读不重复计费；仍 `pending` 会带 `eta_seconds`；`failed` / `refunded` 除非传 `retry: true`（只在用户要求时传）不会重开。

7. 先查价再跑贵操作：`arcmira.quote(video)` 返回整段 Premium 读取会用多少 credits，本身不计费。计量规则：搜索按返回结果中超出前 5 条的每条 passage 收 4 credits；字幕读取按其窗口每开始的 15 分钟收 4 credits；Premium 转录按整段视频每开始的 15 分钟收 300 credits；`momentum` 每次 10 credits；`start` / `end` 不会降低 Premium 计费。

8. 预算由 dashboard 控制，工具本身不接受金额参数。被拦住时按错误码分支处理：`paid_plan_required`、`quota_exceeded`、`spend_limit_exceeded`、`member_limit`、`fair_use_cap`、`on_demand_paused`。

9. 用示例提示词快速验证接通：Which brands sponsor both TBPN and the All-In Podcast? / How hot is Linear on the spoken web right now? / Find a moment on TBPN from the last 90 days where someone talks about stablecoins, and quote it. / Who is speaking in the first minute of the latest TBPN episode, according to the Premium transcript? / On TBPN, how many episodes mentioned Cursor in July versus August? 可直接用的初始 id：TBPN 频道 `UC-DRzaGnL_vtBUpCFH5M0tg`，All-In Podcast `UCESLZhusAkFfsNsApnjF_Cg`，Ramp `ent_14`。

10. 要持续盯着就建 monitor（必须走 `arcmira_execute_write`）：`monitors.create`、`monitors.update`、`monitors.addEntities`（一次最多 90 个 id）、`monitors.addName`、`monitors.attachTrackers`（迁移 tracker 需用户先同意）。不提供删除；退出方式是 `paused`。

11. 可选装插件拿 6 个任务技能：

```bash
claude plugin marketplace add arcmira/mcp
claude plugin install arcmira@arcmira
gemini extensions install https://github.com/arcmira/mcp
npx skills add arcmira/mcp
```

12. 远程 MCP 本身不需要更新；行为与参考手册不符时，先看 `arcmira_describe` 的版本行。

### 做法 F：把团队里各人的 agent session 连成一张网（以 reason network 为例）

选 F 的条件：团队都在 Reason workspace，想让一个 session 直接问另一个 session。README 没有效果数据，只建议小范围试用。

1. 初始化本机 agent 接线：

```sh
reason network
```

2. 看谁在线：

```sh
reason network who
```

状态来自 session 自己的 title 和 todo；标题和 todo 要有意义。

3. 直接向某个 session 提问并等回答：

```sh
reason network alice/api-claude "did the token format change?"
```

适合同步问答的 agent：Claude Code、Codex、opencode、pi、Reason。

4. 只发不等：

```sh
reason network send alice/api-claude "heads up: main is red"
```

适合异步通知的 agent：Cursor、Gemini、Copilot 在下一步才收到消息。

5. 需要时重新接线：

```sh
reason network setup
```

6. MCP server 名为 `reason-network`，对 agent 暴露 `list_team`、`send_message`、`check_inbox` 三个工具。

7. 网络与安全：同 Wi-Fi 直连，跨公网走 iroh，直连失败经中继（中继只看到加密字节）；只有团队成员能连；一台电脑只能代表它自己的主人说话；发给离线者的消息会排队；状态存放在 `~/.reason/network`。

8. 最小试用：找 2 名已经在用 Reason 的同事，各自开 Claude Code session，分别跑 `reason network who` 互相确认；A 用 `reason network <b的session> "..."` 提一个只有 B 的 agent 凭会话上下文才能回答的问题。

### 做法 G：接入“现成 CLI 自带 MCP server”的工具（以 idx / ihsg-cli 为例）

注意领域：idx 是印尼股市（IDX / IHSG）工具，值得试的是流程与结构，不是行情本身。

1. 零安装先跑通：

```sh
npx github:fzn0x/idx stocks quote BBCA
```

2. 正式安装（四选一）：

```sh
cargo install ihsg-cli
npm install -g github:fzn0x/idx
curl -fsSL https://raw.githubusercontent.com/fzn0x/idx/main/install.sh | sh
```

Windows 无 npm 时从 releases 下载 `idx-<version>-x86_64-pc-windows-msvc.zip`。npm 安装的是小启动器，第一次运行 `idx` 会下载预编译二进制并用 release 的 `SHA256SUMS` 校验。npm 12 加 `--allow-git=all`。

3. 先用 JSON 模式核对输出契约：

```sh
idx -o json stocks quote BBCA | jq '.data[0] | {price, change_pct, pe_trailing, dividend_yield_pct}'
```

stdout 只放一个 JSON 文档，其余走 stderr；envelope 带 `provider`、`fetched_at`、`cached`、`stale`、`warnings`；来源没返回的字段是 `null`，不做估算。退出码：`0` 正常、`2` 用法错、`3` 网络/来源错、`4` 未找到、`5` 离线缓存未命中、`6` 配置错。字段定义用 `idx schema quotes` 查看。

4. 启动 MCP server：

```sh
idx mcp
idx mcp --http 127.0.0.1:8765 --token T --allowed-host '*'
idx mcp setup --list
idx mcp setup codex
```

`idx mcp setup <client>` 会把二进制绝对路径填进配置，因为 GUI 应用通常不继承 shell 的 `PATH`。

5. 按客户端注册，例如：

```sh
claude mcp add --scope user idx -- idx mcp
codex mcp add idx -- idx mcp
gemini mcp add -s user idx idx mcp
copilot mcp add idx -- idx mcp
```

```json
{"mcpServers": {"idx": {"command": "idx", "args": ["mcp"]}}}
```

其他客户端可用 `idx mcp setup <client>` 生成；注册后去客户端确认 `idx` 出现、工具数可枚举。

6. 只支持远程 URL 的产品：把 HTTP 形态放在 HTTPS 隧道后，作为 connector 添加，请求头 `Authorization: Bearer T`。

7. 离线 / 弱网：

```sh
idx --offline stocks quote BBCA
idx cache stats
```

命中缓存置 `cached` / `stale`；未命中退出码为 `5`。

8. 让 agent 直接用工具（23 个，`idx_brief` 起手）：`idx_brief`、`idx_market`、`idx_quote`、`idx_history`、`idx_profile`、`idx_financials`、`idx_earnings`、`idx_dividends`、`idx_returns`、`idx_fundamental`、`idx_technical`、`idx_compare`、`idx_screen`、`idx_news`、`idx_sentiment`、`idx_broker`、`idx_bandar`、`idx_bandar_screen`、`idx_ownership_ticker`、`idx_ownership_entity`、`idx_ownership_changes`、`idx_ownership_foreign`、`idx_ownership_releases`。筛选示例：

```sh
idx stocks screen -f "pe<15,roe>15,sector=financial"
idx bandar screen --preset quiet-accumulation
```

9. 可迁移的设计约束：23 个工具用每个 harness 都接受的类型化输入 schema；工具返回与 `-o json` 完全相同的 envelope；失败以工具错误返回 `{error: {code, message}, exit_code}`，把退出码语义带进 MCP。

10. 数据保鲜结构：GitHub Actions 定时抓取、用 `idx` 导入验证可解析、发布到 release；因为 idx.co.id 拦截云网络，任务跑在自托管 runner（`OWNERSHIP_RUNNER=self-hosted`）；Worker 每 30 分钟检查 `index.json`、校验 SHA-256、装入 D1，Worker 没有写端点。迁移的是结构，不是印尼股市本身。

11. 与未挂载时做对照：接好后跑一条真实任务，再不挂 MCP 用原方式做同一件事，比较调用次数、人工步骤、耗时、工具选择是否正确。

### 做法 H：把 AI 助手接进宿主软件内部（以 Blender 扩展 mcp-for-blender-pro 为例）

注意证据等级：README 没有量化指标或基准测试，价值描述均为作者主张。

1. 在 Windows x64 + Blender 4.2+ 中，从 Releases 下载 `mcp-for-blender-pro.zip`；`Edit → Preferences → Get Extensions → menu → Install from Disk`，选中 ZIP，启用 **mcp-for-blender-pro**。

2. 打开 **3D Viewport → N → MCP Pro**。

3. 配置 provider 与模型：OpenAI、Anthropic Claude、Google Gemini、OpenRouter、OpenCode Zen、Ollama 或自定义 API；必须选支持 tool calling 的模型；要解读视口截图还需模型有图像能力。

4. 先用单助手跑通，按 README 提示词依次跑：

```text
Inspect this scene and explain its object structure before making any changes.
```

```text
Create a simple product-display scene with a pedestal, a camera and three lights. Give the pedestal a matte blue material.
```

```text
Duplicate the selected object into a neatly spaced row of five and show the viewport.
```

```text
Find an appropriate Poly Haven asset for this scene and ask before importing it.
```

观察审批、取消、命名撤销与 `viewport_screenshot` 是否按预期出现。

5. 核对 21 个工具：`get_scene_info`、`list_objects`、`get_object_info`、`add_cube`、`add_sphere`、`add_cylinder`、`add_plane`、`add_light`、`add_camera`、`move_object`、`duplicate_object`、`delete_object`、`parent_objects`、`set_material`、`viewport_screenshot`、`execute_code`、`bpy_api_lookup`、`describe_node_type`、`export_scene`、`search_assets`、`import_asset`。其中 `execute_code`、`export_scene`、`import_asset` 是高影响操作。

6. 多步任务再换 Manager/Worker/Reviewer 团队链做同一件事。任务按顺序执行；被阻塞任务有一次纠正机会，第二次审核失败则停止工作流。比较单助手与团队链的耗时、人工接管次数、Reviewer 退回次数。

7. 需要外部客户端时，从侧边栏启动 OpenCode Portable，或其他兼容 MCP 客户端连接经过认证的本地端点。外部客户端的审批策略由该客户端自己管理。

8. 核对边界：连接凭证存用户设置；聊天历史仅当前会话有效；Studio 本地运行并对发往 Blender 的请求做认证；Python 工具验证用于拦截不允许操作，不是安全沙箱；资产服务可能需要 key，并须遵守许可。

### 做法 I：把视频检索接给 agent（以 jevreel 为例）

注意证据等级：底层 Jev 图像能力仍是实验性，验证只基于单个测试视频；调研原文在 Claude Code 插件部分被截断。

1. 装 CLI 并配置 key：

```bash
uv tool install "jevreel[all]"
export TYPESAFE_API_KEY=...
```

无 key 时，不带时间线的索引、zoom、字幕和 query 仍可用。

2. 索引、提问、放大看：

```bash
jevreel index talk.mp4
jevreel ask talk "a slide with a bar chart"
jevreel zoom talk 12:00 12:10
```

3. 用 lens 把自定义问题挂到每一分钟上：

```toml
name = "driving"

[[questions]]
name = "on_bridge"
type = "noul"
ask = "Is the car driving on a bridge?"

[[questions]]
name = "weather"
type = "choice"
ask = "What is the weather mostly like?"
options = ["clear", "cloudy", "rain", "snow", "fog"]

[[questions]]
name = "traffic"
type = "score"
ask = "How much other traffic is on the road?"
levels = ["None", "Light", "Moderate", "Heavy"]
```

```bash
jevreel index drive.mp4 --lens driving.toml
jevreel lens drive driving.toml
jevreel query drive "on_bridge > 0.7"
```

`query` 过滤不产生请求；lens 随索引请求一起走几乎免费，事后再跑是每分钟视频一次请求。

4. 接到 agent（插件 / 手动 MCP / skill 任选）：

```bash
claude plugin marketplace add DeepAleph/jevreel
claude plugin install jevreel@jevreel
uvx --from "jevreel[url]==0.2.0" jevreel login
codex plugin marketplace add DeepAleph/jevreel
codex plugin add jevreel@jevreel
```

```bash
claude mcp add jevreel -e TYPESAFE_API_KEY=your-key -- uvx --from "jevreel[all]" jevreel mcp
codex mcp add jevreel --env TYPESAFE_API_KEY=your-key -- uvx --from "jevreel[all]" jevreel mcp
npx skills add DeepAleph/jevreel
```

5. 或走 Python API：

```python
import asyncio
from jevreel import Reel

async def main() -> None:
    async with Reel() as reel:
        video = await reel.index("talk.mp4")
        result = await reel.ask(video.id, "a slide with a bar chart")
        for hit in result.hits:
            print(hit.time, hit.probability, hit.frame)
        print(reel.query(video.id, "text_on_screen > 0.8").rows)

asyncio.run(main())
```

6. 关键环境变量：`JEVREEL_HOME`（缓存位置）、`JEVREEL_MODEL`（默认 `jev-1.14.0`，故意锁定，别名会漂移）、`JEVREEL_FPS`（默认 1，最高 5）、`JEVREEL_TILES_PER_SHEET`（默认 60）、`JEVREEL_VERIFY_TOP`（默认 6，0 关闭验证）、`JEVREEL_CACHE`（默认 1）、`JEVREEL_CONCURRENCY`（默认 16，速率限制按 TypeSafe 账号计）、`JEVREEL_ASR_MODEL`（默认 `small`）、`JEVREEL_CAPTION_LANGUAGES`。

7. 成本自测：`jevreel measure <video>` 报告某个网格尺寸下一张 contact sheet 在你账号上的成本。

8. 按四步工作流使用：Index（1 fps 抽帧 + 固定问题集 + lens）→ Screen（每张 sheet 一次请求）→ Verify（按排名取 top 窗口，在全帧上每半秒做一次 yes/no）→ Look closer（`zoom`、`locate`、`whole`）。MCP 工具与 CLI 对照：`index_video`/`index`、`ask_video`/`ask`、`find_in_video`/`find`、`locate_in_frame`/`locate`、`zoom_video`/`zoom`、`video_transcript`/`transcript`、`ask_whole_video`/`whole`、`run_lens`/`lens`、`query_timeline`/`query`、`list_videos`/`list`。

### 做法 J：只读 WhatsApp MCP（Cloudflare 自部署）

选 J 的条件：你只想用自己的个人 WhatsApp 账号做只读检索、摘要、补看群聊、给未命名聊天补名；愿意在自己的 Cloudflare 付费 Workers 上部署；能接受非官方协议和违反 WhatsApp 条款的风险；一个部署只对应一个账号和一个 owner。不要用来发送消息或多人共用。

1. 准备 Cloudflare 账户（README 要求 Workers Paid；免费计划未验证，作者建议删掉 `limits` 块并预期首次导入不稳定）、Node 20+、自己的手机和 WhatsApp 账号。

2. 克隆并安装依赖：

```sh
git clone https://github.com/finereli/whatsapp-mcp
cd whatsapp-mcp
npm install
```

3. 创建 OAuth KV 命名空间，把打印出的 id 填进 `wrangler.jsonc`：

```sh
npx wrangler kv namespace create OAUTH_KV
```

4. 设置 owner 密码（至少 12 个字符）：

```sh
npx wrangler secret put OWNER_PASSWORD
```

5. 部署：

```sh
npm run deploy
```

6. 打开 Wrangler 打印的部署 URL，按页面提示扫码链接 WhatsApp（设置 → 已链接设备 → 链接设备）。首次链接会导入历史，页面显示进度，可关闭页面。

7. 接入 MCP 客户端，以 Claude Code 为例：

```sh
claude mcp add --transport http whatsapp https://your-url/mcp
```

然后输入 `/mcp` 并用密码登录；其他客户端指向同一个 `/mcp` URL。

8. 调用只读工具：`list_chats`、`get_messages`、`search_messages`、`unnamed_chats`、`set_contact_names`、`sync_now`、`link_status`、`relink`。可直接对 agent 说：

```text
"What did Dana say about the flights?"
"Find every message where someone mentioned the lease, across all my chats."
"Summarize what I missed in the family group this week."
```

9. 补全未命名聊天：对 agent 说 `find names for my unnamed chats`；agent 会调用 `unnamed_chats`，用已有联系人工具匹配号码，再用 `set_contact_names` 保存姓名。前提是 agent 已有 Google Contacts、Gmail 等联系人访问工具；服务器本身不连接联系人服务。

10. 可选调试：设置 `PIN`（32+ 随机字符）后，可用 `x-pin` 头访问 `/debug`、`/debug/pull`、`/debug/chats?q=`、`/debug/messages?chat=`、`/debug/search?q=`、`/debug/types`、`/debug/unnamed`、`/debug/sql?q=`、`/debug/logout`。不设置则关闭这些路由。

11. 验证：`npm run typecheck`、`npm test`；部署后 `GET /debug` 应为 `phase: "idle"` 且 `paired: true`；`GET /debug/pull` 在安静账号上约十秒返回 `reason: "idle"`；再调用 `list_chats`、`get_messages`、`search_messages`，并用 `unnamed_chats` 和 `set_contact_names` 验证补名；改过 ingest 后重新链接，确认消息计数不增长。

12. 最小试用：在自己的个人 Cloudflare 账户部署，链接一个个人 WhatsApp 账号，接入 Claude Code，只做只读查询。选一组真实任务（按人找航班信息、跨聊天找租约、补看家庭群、给未命名聊天补名），先人工完成并记录耗时和结果，再用 MCP 工具完成同样任务。若出现导入失败、隐私/合规不可接受、或结果明显不如人工，就停止试用。

### 做法 K：本地只读微信/钉钉检索（以 im-mcp 为例）

选 K 的条件：Windows x64 或 macOS，微信 4.x / 钉钉 7.x，客户端已登录；要给 agent 补私有沟通上下文；只读检索；能接受本地数据库解密后明文落盘和强版本依赖。它把微信/钉钉本地数据库解密为 SQLite、建 FTS5 全文索引，再通过 MCP 工具暴露给 Claude Desktop、Cursor、Cline、Pi 等客户端；微信侧 16 个工具，钉钉侧 5 个工具，全部声明为只读。

1. 确认前置条件：Windows 初始化需管理员权限终端且微信已登录（扫描 `Weixin.exe` 内存取密钥）；macOS 4.1+ 需 64 位 hex passphrase；已安装 uv；客户端支持 MCP 配置；版本在支持表内。

2. 安装（推荐 `uv tool` 全局隔离安装）：

```bash
uv tool install "git+https://github.com/stkoecn/im-mcp.git" --with "im-mcp[all]"
```

国内网络亦可用 Gitee 源：`uv tool install "git+https://gitee.com/ws4m/im-mcp.git" --with "im-mcp[all]"`。更新用 `uv tool upgrade im-mcp`。只装一侧：

```bash
pip install "git+https://github.com/stkoecn/im-mcp.git#egg=im-mcp[wechat]"
pip install "git+https://github.com/stkoecn/im-mcp.git#egg=im-mcp[dingtalk]"
```

3. 一次性初始化（提取密钥 + 解密 + 建 FTS5 索引）：

```bash
wechat-init
wechat-init --passphrase <64位十六进制passphrase>
wechat-init --output ~/.wechat_mcp/decrypted
wechat-init --only-extract
wechat-init --etl-only
dingtalk-init
dingtalk-init --output-dir ~/.dingtalk_mcp/decrypted
```

默认保存至 `~/.wechat_mcp/`、`~/.dingtalk_mcp/`。

4. 接入 AI 客户端。方案 A（原文推荐，`uvx` 即席运行，零环境污染）：把 `mcpServers` JSON 写进客户端配置，`command` 用 `uvx`，`args` 用 `--from`、`git+https://github.com/stkoecn/im-mcp.git[all]`、`wechat-mcp` 或 `dingtalk-mcp`，`env` 固定 `PYTHONIOENCODING=utf-8`、`PYTHONUTF8=1`。方案 B：步骤 2 已 `uv tool install` 成功且命令在 PATH 中时，`command` 可直接写 `wechat-mcp` / `dingtalk-mcp`；若提示 not on your PATH，可 `uv tool update-shell` 或重启终端，受限环境写绝对路径。

5. 给 agent 装配套技能文档：

```bash
mkdir -p ~/.agents/skills/im-mcp && cp skills/im-mcp/SKILL.md ~/.agents/skills/im-mcp/
mkdir -p ~/.claude/skills/im-mcp && cp skills/im-mcp/SKILL.md ~/.claude/skills/im-mcp/
mkdir -p .agents/skills/im-mcp && cp skills/im-mcp/SKILL.md .agents/skills/im-mcp/
```

6. 让 agent 自己完成配置：

```text
请阅读并遵循开源项目 https://github.com/stkoecn/im-mcp 中的 README.md 与 skills/im-mcp/SKILL.md，帮我配置并启用本机的绿泡泡与DuangDuang MCP 服务。
```

7. 用完即清（公共机器或试用结束后必须做）。先完全退出 AI 客户端，否则 SQLite 句柄与 `-shm`/`-wal` 锁会阻止删除；或强制结束进程：

```powershell
Get-Process | Where-Object { $_.ProcessName -match "wechat-mcp|dingtalk-mcp" } | Stop-Process -Force
```

```bash
im-clean --dry-run
im-clean
im-clean --scope wechat
im-clean -y --force
uv tool uninstall im-mcp
```

8. 日常使用（工具→场景）：找群里谁发过某话题 → `search_wechat_messages`；总结项目群最近 50 条 → `get_session_history`；汇总某天沟通做日报 → `get_messages_by_date`；拉某时间段群聊 → `get_messages_by_range`；找群文件 → `search_shared_files`；解密聊天图片 → `get_message_image`；查联系人 → `search_contacts`；查数据是否最新 → `get_sync_status`；刚聊了几句要更新后再查 → `sync_wechat_database`。

9. 验证：原文只给了兼容性验证表（Windows/macOS、多个微信/钉钉版本），没有效果指标、任务成功率或对照数据。需要自己选一组真实只读任务，先人工完成并记录耗时和结果，再用 MCP 工具完成同样任务；检查 `get_sync_status` 的索引新鲜度，必要时先 `sync_wechat_database` / `sync_dingtalk_data` 再查询。若版本不兼容、初始化失败、明文落盘不可接受或结果明显不如人工，就停止试用。

### 做法 L：把例行只读安全检查交给 agent（以 claude-security-scan 为例）

选 L 的条件：已安装 Claude Code、git、bash；Python 3.11+；能访问 GitHub；想用一句自然语言或定时任务做跨 Mac 本体、本地 git 仓库、GitHub、Vercel/公开站点、AWS、GCP、Azure、Cloudflare、Supabase、Gmail 的只读例行检查；能接受这是会读取多账户敏感信息的第三方技能，且目前只有 README 证据。不要从全量扫描开始。

1. 克隆技能并安装工具（前提：Claude Code、git、bash 可用；能访问 GitHub）：

```bash
git clone https://github.com/chaenmasahiro0425/claude-security-scan ~/.claude/skills/security-scan
bash ~/.claude/skills/security-scan/scripts/install-tools.sh   # gitleaks と osv-scanner を取得（SHA256を検証）
```

预期结果：技能目录出现，gitleaks 与 osv-scanner 安装完成并通过 SHA256 校验。

2. 按需准备各域只读登录（前提：只对你确实要检查、且已安装对应 CLI 的域执行；缺什么会在报告里标为未确认）。把 `...` 换成自己的只读 token：

```bash
gh auth login
vercel login
aws configure        # または aws sso login
gcloud auth login    # 閲覧者 roles/viewer 相当の権限
az login             # 閲覧者 Reader 相当の権限
export CLOUDFLARE_API_TOKEN=...   # 読み取り専用のAPIトークン
supabase login
export SUPABASE_ACCESS_TOKEN=...  # RLS などの診断用
gog auth add you@example.com
```

预期结果：至少一个域完成只读登录；没有登录的域后续会进入“未能确认的项目”并附理由。

3. 先用示例数据确认安装和报告样式（前提：第 1 步已完成；不依赖真实账户数据）：

```bash
python3 ~/.claude/skills/security-scan/scan.py --demo --open
```

预期结果：打开示例 HTML 报告，能看到按重要度分级、可按领域/NEW 过滤的样式；不读取真实账户。

4. 只对一个低风险域跑真实扫描，先去掉较重的本地仓库代码检查（前提：第 2 步至少完成一个域的只读登录；先不要全量）：

```bash
python3 ~/.claude/skills/security-scan/scan.py --skip repos
```

预期结果：生成 `reports/<日時>/report.html`；失败或未登录的域进入“未能确认的项目”，而不是被当成“没有问题”；报告中没有明文秘密值。

5. 在 Claude Code 里用自然语言触发和追问（前提：技能已放在 `~/.claude/skills/security-scan`，并在 Claude Code 会话中）：

```text
セキュリティチェックして
前回から新しく出たリスクだけ教えて
直せるところある？
毎週月曜にスキャンするようにして
```

预期结果：Claude Code 能按技能说明触发扫描、只汇报前次之后新增的风险，并把可修复项列出来；定时请求按第 6 步或原文说明处理。

6. 可选：设置 macOS 每周一 8:00 自动执行（前提：macOS；第 1 步已完成）：

```bash
bash ~/.claude/skills/security-scan/scripts/install-schedule.sh
```

预期结果：定时任务安装完成；下一轮按计划运行并生成新报告。原文没有给出事件触发或状态机式持续执行机制。

7. 可选：限制扫描对象。无配置也能运行；需要时复制并编辑配置（前提：知道自己的区域和要限制的范围）：

```bash
cp ~/.claude/skills/security-scan/config.example.toml ~/.config/security-scan/config.toml
```

AWS 默认只查东京 `ap-northeast-1` 和弗吉尼亚 `us-east-1`，其他区域要在 `[aws] regions` 中追加。预期结果：扫描范围按配置缩小，报告仍会标出未覆盖或未确认的范围。

8. 查看结果并按安全边界核对（前提：扫描已运行）。报告在 `reports/<日時>/report.html`，可按重要度、领域、NEW 过滤；报告含弱点清单，保存在本机、权限 700，注意共享。核对：只读——gog 用 `--readonly`，各云只用 list/get/describe 和 API 的 GET，对网站只用 GET；不保留秘密值——gitleaks 用 `--redact`，Vercel 环境变量只记名称和类型，AWS key ID 只留末尾 4 位，常驻程序不记录启动参数，错误文也先脱敏再保存；抓取失败的账号/组织/仓库范围，不因“这次没看到”而在与上次比较时算作“已解决”或“新增”。预期结果：确认上述边界成立；检测结果只当线索，最终判断和修正由人做。

9. 最小试用：先 `--demo`，再只登录一个域（例如个人 GitHub），用 `--skip repos` 跑一次，确认报告能生成、失败项进入“未能确认”、没有明文秘密、没有对测试仓库/账号产生写入或发送；确认后再逐域增加登录，最后才考虑全量扫描和每周定时。若误报过多、权限范围过宽或报告泄露敏感值，应缩小域、改为仅手动运行或放弃采用。

## 怎么判断变好了

可观察指标：

- 通路：`uvx jevcrawl doctor` 是否报通路正常；`rea` 是否出现在 Hermes 服务器列表；CLI-Hub 的 `cli-hub info/install/launch` 是否成功；`arcmira_describe` 是否返回方法表与版本行；`reason network who` 是否稳定列出对方 session 及当前任务；`idx mcp setup <client>` 是否打印绝对路径、客户端里 `idx` 是否出现且工具数可枚举；Blender 扩展是否能打开 MCP Pro 面板、选中支持 tool calling 的模型、跑通“检查场景 → 建对象 → 复制排列”；jevreel 是否 `index` 打印 video id、`ask` 返回时间/概率/帧、`zoom` 取到全分辨率帧、接入 agent 后能自己调用；WhatsApp MCP 的 `/debug` 是否为 `phase: idle` 且 `paired: true`、`link_status` 的 `last_pull` 是否正常更新；im-mcp 的 `wechat-init` / `dingtalk-init` 是否成功、客户端能调用 `search_wechat_messages` / `get_session_history` 等工具；claude-security-scan 的 `scan.py --demo --open` 能否打开示例报告、`--skip repos` 能否生成 `reports/<日時>/report.html`、Claude Code 里“セキュリティチェックして”能否触发。
- 工具清单：注册后必须去客户端确认工具真的出现、数量可枚举；不能把“注册成功”当“验证完成”。
- 任务效果：同一组真实任务，挂载 vs 未挂载/人工，比较任务完成率、答案正确性、漏掉已知消息数、人工步骤数、耗时、工具报错次数。
- 成本与停止原因：jevcrawl 看 `jev_cost_usd`、`stopped_because`、`degraded`、`needs_js_urls`；arcmira 看 `quote` 预估与实际消耗、错误码是否可按 `code` 分支；jevreel 看 `jevreel measure` 与实际计费、重复 `ask` 是否 0 请求 0 成本、`query` 是否不产生请求。
- 安全负向指标：是否出现越权访问、读取工作目录之外文件、执行非预期命令；Blender 侧看 `execute_code` 是否超出预期；jevreel 侧确认视频帧与问题允许外发到 TypeSafe；WhatsApp MCP 侧确认没有发送消息、没有多人共享、没有绕过条款；im-mcp 侧确认只读、明文数据库已按需清理、没有在公共机器残留；claude-security-scan 侧确认没有明文秘密、没有对测试仓库/账号产生写入或发送、报告权限 700、共享前已确认脱敏。
- claude-security-scan 的报告质量：人工复核首次报告中的 high/medium 项，记录真实问题数与误报数，计算可确认的准确率；连续两周运行，记录 NEW 项数量及其中经复核为真的比例；统计“未能确认”项及原因，确认没有把失败静默当成无问题；记录单次运行时间和每周定时是否完成；在测试账号/仓库比对扫描前后配置与文件，确认只读边界成立。

对照试验设计：所有系统从同一入口、同样预算、同一个问题出发，抓到的内容交给同一个回答 LLM，由同一个 judge 打分，只让被试工具这个变量变。没有对比性指标的工具，先用流程内建测试和真实重复任务做前后对照。

可参考的作者自测数据（非独立验证）：

- jevcrawl：50 个 WebWalkerQA 任务（2026-10-12，回答模型 `claude-opus-5-5`，judge `claude-sonnet-5-5`）答对 40%、找到答案页 54%、$0.025/任务；Claude 逐个挑链接 30% / 33% / $0.194；广度优先 8% / 11% / $0.228。每正确答答案成本 $0.06 / $0.65 / $2.85。与 Crawl4AI 0.9.4 的 20 任务对照（2026-10-13，只比是否抓到 gold page）：答案页 10 vs 5、全部答案页 5 vs 2、中位爬取时间 29s vs 43s、站点加载失败 0 vs 3。docs.python.org 示例 80,034 tokens 压到 1,873 tokens，$0.0069，8.3 秒。
- CLI-Anything README 自报：2,461 个测试通过、pytest 100%、多语言/多 harness 覆盖率；无第三方复现。
- reason network：README 没有效果数据、指标或案例；仓库 33 stars。
- idx：调研正文只给安装命令、MCP 注册方式、输出契约与数据流水线描述，未见效果数据、性能数字或对比指标；正文在第 9 步后被截断。
- Blender 扩展：仓库 705 stars；Release 1.0.0、Blender 4.2+、Windows x64、MIT 许可；没有用户案例、成功率、耗时对比或基准数据。
- jevreel：10 分钟 1080p 视频单张 sheet 约 $0.00025、索引 $0.0033、一次 ask $0.004–0.005、重复 ask $0、locate $0.0002、whole $0.0003、一小时视频一个问题约 $0.02–0.03；10 分钟 1080p 无语音游戏录像上，三个不到一秒的暂停菜单仅 screening 得分 0.36 / 0.50 / 0.95，验证前漏掉两个、验证后全部捞回。底层 Jev 图像能力仍是实验性，验证只基于单个测试视频。
- WhatsApp MCP：README 给出完整部署命令、配置项、工具表、架构和调试步骤；HN 35 points、23 comments 只能说明关注度；作者只在一个真实账号上跑过；没有业务效果指标；首次历史导入每个链接只发生一次，失败后要重新链接才能补；免费计划未验证；媒体只显示 `[image]`、`[voice note 12s]` 等标签，不下载不转写；一个部署对应一个 WhatsApp 账号和一个 owner；非官方实现，作者承认违反 WhatsApp 条款；已知缺口包括未命名聊天不会自动刷新、每日 pull 发现登出不会通知、编辑/删除路径未用真实事件测试。
- im-mcp：README 给出完整安装、初始化、客户端配置、清理命令和工具表；只有一张兼容性验证表，没有效果指标、任务成功率或对照数据；“毫秒级响应”为作者声称，未给测量方法；工具只读，但本地数据库解密后明文落盘；没有 cron、webhook、守护进程等定时/事件触发说明，调度层需自行搭建。
- claude-security-scan：README 给出检测项清单、安装命令、各域准备方式、报告路径、安全设计和限制；仓库 32 stars。没有检出率、误报率、真实用户案例或独立评测，也没有代码审计结果；作者关于“最近信息泄露多由疏忽造成”“这些检查去看几秒就能知道”等是主张，不是数据结论。原文自述限制：Google Workspace 整体管理设置因需 Admin API 委派不在范围；AWS 默认只查东京和弗吉尼亚；不做暴力/模糊测试等攻击性检查；检测结果需人工最终判断。另需注意：这是会读取多账户敏感信息的第三方技能，README 中的只读与脱敏设计尚未在本报告依据的材料中经过代码级验证；Gmail 依赖第三方 `gog`；token 的 export 命令中 `...` 是占位符。

最小试用方式与试多久：

- jevcrawl：半天内完成。准备一个答案埋在首页几跳之下、站点不依赖 JS 的真实问题；先用现有方式跑同一个问题并保存原始上下文和答案；按做法 A 接好，`uvx jevcrawl doctor` 确认通路，跑 `jevcrawl crawl <start_url> --goal "<你的问题>" --json`；再换一个答案就在已知单页上的问题跑 `scrape`；把两份产出交给同一个评审做对照打分。
- REA：以完成一轮“注册 → 枚举 → 冒烟 → 对照”为准，原文没有时间或次数建议。
- CLI-Anything：以跑通一条真实重复任务并留下一组对照为准。
- arcmira：以“示例提示词跑通 + `resolve` 路径走通 + `quote` 预估与实际对得上”为一轮；调研只建议小范围试用。
- reason network：以 2 人配合跑通一轮 who → 问答 → send → 离线补发为准。
- idx：以“零安装跑通 → JSON 契约核对 → MCP 注册 → agent 一次调用 → 离线一次”为一轮。
- Blender 扩展：以“单助手四条提示词跑通 + 团队链把同一任务重做一次”为一轮。
- jevreel：以“index → ask → zoom 跑通 + 一次插件/MCP 接入 + 一次 lens 过滤”为一轮。
- J WhatsApp MCP：以“部署 → 链接个人账号 → 只读搜索/摘要/补名 → 与人工完成同一组任务对照”为一轮；出现导入失败、隐私/合规不可接受或结果明显不如人工就停止。
- K im-mcp：以“初始化 → 客户端接入 → 3–5 个真实只读任务 → 与人工对照 → 清理”为一轮；版本不兼容、初始化失败、明文落盘不可接受或结果明显不如人工就停止。
- claude-security-scan：先 `--demo` 看示例报告；再只登录一个低风险域（如个人 GitHub），用 `--skip repos` 跑一次；确认报告生成、失败项进入“未能确认”、没有明文秘密、没有写入/发送后，再逐域增加登录；连续两周记录 NEW 项和人工复核结果，再决定是否全量或定时。

在得到明确正负结果前，不要扩展到长期使用或生产环境。

## 常见坑

- 把“注册成功”当成“验证完成”。REA 原文没有 list/枚举命令，要查 Hermes 文档补上；jevcrawl 至少还有 `uvx jevcrawl doctor`；arcmira 至少还有 `arcmira_describe` 和一条示例提示词；reason network 至少还有 `reason network who` 和一次真实问答；idx 至少还要去客户端确认 `idx` 出现、工具数可枚举，并用 `idx_brief` 真跑一次；Blender 扩展至少还要跑一遍“检查场景 → 建对象 → 复制排列”；jevreel 至少还要 `ask` 真问一次、`zoom` 真看一次；WhatsApp MCP 至少还要看 `/debug` 的 `paired` 与 `last_pull`、真搜一次；im-mcp 至少还要初始化成功、客户端真调一次检索工具；claude-security-scan 至少还要 `--demo` 打开报告、再只对一个低风险域 `--skip repos` 跑一次并人工复核。
- 把名字当 id 传。arcmira 的过滤器只接受原样 id，传名字会在发网络请求前抛 `id_required`；必须先 `resolve`，`suggested` 时说明假设与理由，`ask` 时把候选交回用户。
- 连上就开始猜方法签名。先调 `arcmira_describe`，把 id 规则、参数与返回字段、计量规则、错误码一次读全。
- 不看清计量规则就批量跑。arcmira 搜索按超出前 5 条的每条 passage 收 4 credits；字幕每开始 15 分钟收 4 credits；Premium 转录每开始 15 分钟收 300 credits；`momentum` 每次 10 credits；`start`/`end` 不降低 Premium 计费。贵操作前先 `arcmira.quote`。
- 以为 arcmira 工具有预算参数。预算在 dashboard 设；被拦住时按返回的 `code` 分支处理，别把拦截当成“没有数据”。
- 把“还在转”当失败。Premium 未就绪时返回 `202` + `Retry-After`，按它重读不重复计费；`failed` / `refunded` 除非传 `retry: true` 不会重开。
- 建了 arcmira monitor 就以为能删。它不提供删除，只能 `paused`；`attachTrackers` 迁移 tracker 需用户先同意；`addEntities` 一次最多 90 个 id。
- 把厂商自述当独立证据。arcmira 的数据覆盖与说话人/赞助识别准确性全是厂商自述；README 未给免费额度上限，只说 “Plan limits apply”。
- 把“安装成功”当“任务有效”。CLI-Hub 装完 harness 后，要接进 agent 跑一条真实重复任务，确认真有用再考虑用 `/cli-anything` 生成新 CLI。
- 把作者自测当独立证据。jevcrawl 的 50 和 20 个任务样本都很小；CLI-Anything 所有效果数据均为项目自述；reason network 连效果数据都没有；idx 调研未包含效果数据；Blender 扩展只有 README 级证据；jevreel 的成本与暂停菜单对照验证同样是作者自测；WhatsApp MCP 只有 README 和单账号验证；im-mcp 只有兼容性表；claude-security-scan 只有 README、32 stars，没有检出率、误报率或代码审计。
- 在主力环境里直接跑第三方包。REA 依赖 `npx`、jevcrawl 依赖 `uvx`、CLI-Hub 依赖 `pip`，都会拉取并执行第三方包；arcmira 不往本地落包，但程序会在厂商的 Cloudflare Dynamic Worker 沙箱里执行，出站只允许 `GET https://api.arcmira.com/v1/*`（写工具额外允许 `/v1/monitors` 与 `/v1/trackers` 的 POST/PATCH，永不 DELETE）；idx 是不自带沙箱的静态二进制直连公开数据源；Blender 扩展的 Python 工具验证不是安全沙箱；jevreel 的视频帧与问题会发到 TypeSafe；WhatsApp MCP 使用非官方协议并违反 WhatsApp 条款；im-mcp 会把本地数据库解密后明文落盘；claude-security-scan 会读取 Mac 本体、本地全部 git 仓库、GitHub、Vercel、多个云和 Gmail，README 的只读与脱敏设计尚未经过代码级验证。
- 忽略版本写死。`rea-agents@6.3.0` 是原文写死的版本；jevcrawl 的 `jev-1.13.0` 是固定版本，阈值按版本校准；arcmira 是远程 MCP、本身不需要更新，但 `arcmira_describe` 带版本行；jevreel 的 `JEVREEL_MODEL` 默认 `jev-1.14.0` 是故意锁定；im-mcp 强依赖微信 4.x / 钉钉 7.x 的具体版本。
- 以为 jevcrawl 能爬任何站点。它不执行 JavaScript（需 JS 的 URL 列在 `stats.needs_js_urls`），不读 `robots.txt`，除一次抓 4 页外不做限速，站点条款与合规由使用者自负；不登录、不绕付费墙和 CAPTCHA。
- 忽略内容外发。jevcrawl 会把页面文本发送到 TypeSafe；API key 只从环境变量读，不落盘、不写日志。
- 把 401 当故障。arcmira 对无凭证请求返回 401 + OAuth 挑战，这是登录/开户路径。
- 忽略上游软件依赖。大量 CLI harness 包装真实桌面软件；不先装上游软件，`cli-hub launch` 不会产生有效结果。
- Windows 上直接跑 Claude Code 生成路径。需先装 Git for Windows（含 `bash`/`cygpath`）或使用 WSL，否则会报 `cygpath: command not found`。
- OpenCode 命令引用的 `HARNESS.md` 没和命令放同一目录。命令会引用它，必须在同一目录；旧版目录名为 `command/`。
- 旧版 Claude Code 不识别 `/cli-anything`。改用 `/cli-anything:cli-anything`；辅助命令保持 `:subcommand` 形式。
- 给 GUI 客户端手写相对路径或 `idx`。GUI 应用通常不继承 shell 的 `PATH`；用 `idx mcp setup <client>` 生成绝对路径。
- 从 stdout 以外的地方捞数据。idx 约定 stdout 只放一个 JSON 文档、其余全部走 stderr；把 stderr 混进管道会得到看似随机的结果。
- 把 `null` 当 0、或当成“该自己补一个”。idx 对来源未返回的字段写 `null`，不做估算；看到 `null` 要按“没有这个数据”处理，并去看 `warnings`。
- 不看退出码。idx 用 `0/2/3/4/5/6` 分语义；靠解析错误文本做分支，换个版本就碎。
- npm 12 不加 `--allow-git=all`。用 npm 从仓库安装时会卡住或失败。
- 以为 npm 安装直接给你一个二进制。npm 装的是小启动器，第一次运行 `idx` 才下载预编译二进制并用 `SHA256SUMS` 校验。
- 在云 runner 上抓取会拦截云网络的数据源。idx 的 ownership 流水线跑在自托管 runner 上；换成云 runner 会失败。
- 以为 idx 发布端 Worker 能写。那个 Worker 没有写端点；校验靠 SHA-256，且只有新月份全部行数到齐且数量匹配才算“出现”。
- 把 idx 当通用工具。它是印尼股市专用工具，领域窄；先试流程，不要直接写进生产手册。
- 把 Blender 扩展的 Python 工具验证当安全沙箱。它用于拦截不允许操作，不是隔离机制；高影响操作是 `execute_code`、`export_scene`、`import_asset`。
- 在 Windows x64 + Blender 4.2+ 之外直接照抄 Blender 扩展 release bundle。其他平台/版本未见支持。
- 选了不支持 tool calling 的模型。Blender 扩展里工具根本调不起来；要看视口截图还需要模型有图像能力。
- 默认团队链一定更好。README 没有量化指标，审核开销可能大于收益；先用单助手跑通同一任务，再换团队链对比。
- 以为 Blender 扩展聊天历史会留存。聊天历史仅当前会话有效；连接凭证存在用户设置里。
- 接上外部 MCP 客户端后还以为审批有兜底。外部 MCP 客户端的审批策略由该客户端自己管理。
- 把“任务顺序自动推进”当持续运行。Blender 扩展只提到任务按顺序执行、被阻塞任务有一次纠正机会，没有时间/事件/状态触发的持续运行机制。
- 把 jevreel 的底层图像能力当成熟能力。README 明确它是实验性，验证只基于单个测试视频；只建议小范围试。
- 以为 jevreel 能自己持续推进。`index_video` 作为 MCP 后台任务运行、重复调用返回已有索引并只补跑新增 lens，但原文没有给出定时器或事件触发机制。
- 把 `jevreel query` 当收费操作、或把 lens 事后跑当免费。`query` 过滤不产生任何请求；lens 随索引请求一起走几乎免费，事后再单独跑是每分钟视频一次请求。
- 重复问同一个 jevreel 问题还担心重复付费。答案有缓存；同样的图片和问题问同一个模型不会重复付费。
- 把 `JEVREEL_CONCURRENCY` 开大不当。默认 16，速率限制按 TypeSafe 账号计；调大并发不等于更快。
- 没字幕也没 key 就直接放弃 jevreel。无 `TYPESAFE_API_KEY` 时，不带时间线的索引、zoom、字幕和 query 仍可用；本地转写要手动用 `jevreel[all]` 添加。
- 把 jevreel 插件方式当成装什么都有。插件方式需要 uv 与 FFmpeg 在 PATH；本地语音转写默认不含。
- 需要完整 jevreel 插件接入细节时只看截断的原文。本次 jevreel 调研原文在 Claude Code 插件部分被截断。
- 误把传播数据当效果证据。Matthew 的 REA 帖子 230 万次浏览是曝光量，不是效果证据；WhatsApp MCP 的 HN 35 points、23 comments 也只是关注度；claude-security-scan 的 32 stars 同样只说明关注度。
- 用被截断的能力清单规划任务。REA 原文只列到“反编译一个应用”就被截断；arcmira 调研在“Claude Code 第三方 marketpla…”处被截断；idx 调研正文在第 9 步后被截断。
- 把“139 个工具”当事实。数量只是作者主张。
- 没有隔离就上线。只要出现越权访问、读取工作目录之外文件或执行非预期命令，就应回滚并降级为 study。
- 团队不在 Reason workspace 却想试 reason network。它强依赖 Reason CLI 和 Reason workspace，不是通用方案；单人无法自测出“团队通信”的价值。
- 不看 session title/todo 就想让 `reason network who` 有用。状态来自 session 自己的 title 和 todo，agent 不主动汇报。
- 把 reason network 的 README 自述当成独立验证。投递时机、离线排队、唤醒空闲 session 等行为均来自 README 自述。
- 用 WhatsApp MCP 的免费 Cloudflare 计划，或以为首次导入失败会自动补。README 要求 Workers Paid，免费计划未验证；首次历史导入每个链接只发生一次，失败后要重新链接才能补。
- 以为 WhatsApp MCP 能发消息、能多人共享、能转写媒体。它不能发送；只用于读取自己的个人账号；媒体只显示 `[image]`、`[voice note 12s]` 等标签，不下载不转写；一个部署对应一个账号和一个 owner。
- 忽略 WhatsApp MCP 的非官方协议与条款风险。作者明确说使用非官方协议、违反 WhatsApp 条款；只读链接的实际风险低但不是零。
- 以为 WhatsApp MCP 的姓名会自动刷新、登出会通知。未命名聊天不会自动刷新；每日 pull 发现登出不会通知；编辑/删除路径未用真实事件测试。
- 在公共机器上跑完 im-mcp 不清理。先完全退出 AI 客户端，否则 SQLite 句柄与 `-shm`/`-wal` 锁会阻止删除；用 `im-clean --dry-run` 预览，再 `im-clean`；残留句柄用 `im-clean -y --force`；最后 `uv tool uninstall im-mcp`。
- 把 im-mcp 当通用方案。原文未提 Linux；强依赖微信 4.x / 钉钉 7.x 的具体版本；Windows 需管理员终端且微信已登录；macOS 4.1+ 需 64 位 hex passphrase。
- 以为 im-mcp 有定时/事件触发。它只提供 `get_sync_status`、`sync_wechat_database`、`sync_dingtalk_data` 等原子能力，README 没有 cron、webhook、守护进程说明，调度层要自己搭。
- 把 im-mcp 的只读声明当安全沙箱。工具声明只读，但本地数据库被解密为 SQLite、明文落盘；用完要清理，不要在不可信机器上长期保留。
- 把 im-mcp 的“毫秒级响应”当实测结论。原文未给测量方法，只有作者声称。
- 把第三方安全技能当“只读就安全”。claude-security-scan 会读取 Mac 本体、本地全部 git 仓库、GitHub、Vercel、多个云和 Gmail；README 的只读与脱敏设计尚未在本次材料中经过代码级验证。先在隔离或低风险环境只登录一个域试。
- 一上来就全量扫描 claude-security-scan。先 `--demo`，再 `--skip repos` 只对一个低风险域跑；确认失败项进入“未能确认”而不是“无问题”，没有明文秘密、没有写入/发送，再逐域扩大。
- 把“未能确认”当“没有问题”。claude-security-scan 里缺工具、缺权限、抓取失败都会进入“未能确认的项目”并附理由；跨次比较时，抓取失败的范围不算“已解决”或“新增”。
- 把 claude-security-scan 的检测结果当最终结论。原文明确不做攻击性测试，检测只是线索，最终判断和修正由人做；没有检出率、误报率或对照实验。
- 忽略 claude-security-scan 的默认覆盖范围。AWS 默认只查东京 `ap-northeast-1` 和弗吉尼亚 `us-east-1`，其他区域要在 `[aws] regions` 追加；Google Workspace 整体管理设置因需 Admin API 委派不在范围内。
- 把 claude-security-scan 命令里的 `...` 原样写进命令。各域准备命令里的 `...` 是占位符，要换成自己的只读 token；`gog` 是第三方依赖。
- 把 claude-security-scan 的报告随便共享。报告含弱点清单，保存在本机、权限 700；共享前先确认脱敏。
- 把 claude-security-scan 的定时任务当持续运行。原文只给 macOS 每周一 8:00 的定时；没有事件触发或状态机式持续执行机制。

## 证据与来源

本节说明每个做法依据哪类材料、有哪些数据、哪些只是作者主张。

- 做法 A jevcrawl：可核查的是 README 的安装命令、参数默认值、输出字段与环境变量表。数据均为作者自测：50 个 WebWalkerQA 任务（2026-10-12，回答模型 `claude-opus-5-5`，judge `claude-sonnet-5-5`）jevcrawl 40% / 54% / $0.025，Claude 逐个挑链接 30% / 33% / $0.194，广度优先 8% / 11% / $0.228；每正确答答案成本 $0.06 / $0.65 / $2.85；与 Crawl4AI 0.9.4 的 20 任务对照（2026-10-13）答案页 10 vs 5、全部答案页 5 vs 2、中位爬取时间 29s vs 43s、站点加载失败 0 vs 3；docs.python.org 示例 80,034 tokens → 1,873 tokens，$0.0069，8.3 秒。作者主张无独立验证：找到答案页概率约 2 倍于 Crawl4AI、比 LLM 驱动爬取快 2 倍、天然抗 prompt injection、引文逐字可溯源。原文自陈局限：样本小；Crawl4AI 驱动真实浏览器而 jevcrawl 不执行 JavaScript；不读 `robots.txt`、除一次抓 4 页外不限速、站点条款与合规自负、不登录不绕付费墙和 CAPTCHA；页面文本会发送到 TypeSafe。
- 做法 B REA/Hermes：可核查的是一条完整接入命令 `hermes mcp add rea --command npx --args -y rea-agents@6.3.0 mcp`，以及“REA 设置菜单已支持 Claude Code 和 Codex”的事实陈述。只是作者主张、未经原文验证：接入后代理会多出 139 个工具；“反编译一个应用”等能力清单，且原文在列举处被截断。传播数据：Matthew 的 REA 帖子 230 万次浏览，是曝光量，不是效果证据。
- 做法 C：不接入的降级做法，依据是各路径原文在工具清单、验证方式或效果数据上的缺口。
- 做法 D CLI-Anything：可核查的是 README 的安装与使用命令、各宿主安装脚本。作者主张无第三方复现：CLI 是人和 agent 的通用接口；7 阶段流水线能生成带 REPL/JSON 输出/undo-redo 的 Click CLI、测试、文档并发布；README 自报 2,461 个测试通过、pytest 100%、多语言/多 harness 覆盖率；demos 声称能产出 CAD 模型、3D 场景、图表、游戏内容、字幕等。原文明确：大量 harness 依赖上游桌面软件；Windows 需 Git for Windows 或 WSL；没有对比性指标。
- 做法 E arcmira：可核查的是 README/调研给出的接入命令、两个 `/v1/signups` 调用、`arcmira_describe` 约 23,000 字符且不计量、4 个工具、客户端方法表、`id_required` 与 `resolve` 的 `best`/`suggested`/`ask` 语义、Premium 转录的 `202` + `Retry-After` 与 `failed`/`refunded`/`retry: true` 行为、credits 计量规则、错误码清单、monitor 方法集、沙箱出站白名单与永不 DELETE。厂商自述、无第三方复现：数据覆盖与说话人/赞助识别准确性。调研结论是先在 Claude Code 用一条命令接入或改用 Bearer key，再照“先 resolve 后查询”的示例做小范围试用；准确性主张全是厂商自述，且有付费计划与预算门槛。
- 做法 F reason network：可核查的是安装方式、四条 CLI 命令、MCP server 名 `reason-network` 与三个工具名、按 agent 区分的投递时机、网络与安全模型、状态目录、源码构建与测试命令。只是作者主张、没有数据支撑：整套“团队协作因此变好”的说法；README 没有任何使用数据、性能数字、前后对比或用户案例；仓库 33 stars。适用条件与局限：强依赖 Reason CLI 和 Reason workspace；要求团队整体部署；README 没有手动配置 MCP 的方法和提示词层面指引；投递时机、离线排队、唤醒空闲 session 等行为均来自 README 自述。
- 做法 G idx：可核查的是 README/调研给出的安装方式、npm 启动器校验、`idx -o json` 的 envelope 字段、缺失字段为 `null` 不估算、退出码语义、`idx schema`、`idx mcp` 的 stdio 与 HTTP 形态、`idx mcp setup` 打印绝对路径、各客户端注册命令与配置片段、离线命令、23 个工具名与筛选语法、工具设计约束、仓库数据保鲜流水线。调研未给出效果数据、性能数字、前后对比；正文在第 9 步后被截断。调研判断是值得小范围试，用来验证“把现成 CLI 包成 MCP 工具供 agent 调用”是否省事；它本身是印尼股市工具、领域窄，先试流程。
- 做法 H Blender 扩展：可核查的是 README 的安装与使用信息、Windows x64 + Blender 4.2+、21 个工具清单、单助手与 Manager/Worker/Reviewer 团队链、四条提示词、OpenCode Portable 与其他兼容客户端、资产服务、控制与安全说明。仅为作者主张、无数据支撑：更快迭代、自动化重复工作、把创意简报变成场景操作等价值描述；没有用户案例、成功率、耗时对比或基准数据。仓库指标 705 stars；Release 1.0.0、MIT 许可。
- 做法 I jevreel：可核查的是 README/调研给出的命令与机制、lens TOML、插件安装命令、手动 MCP 命令、Python API、环境变量表、四步工作流、MCP 工具与 CLI 对照。数据均为作者自测：10 分钟 1080p 视频单张 sheet 约 $0.00025、索引 $0.0033、一次 ask $0.004–0.005、重复 ask $0、locate $0.0002、whole $0.0003、一小时视频一个问题约 $0.02–0.03；10 分钟 1080p 无语音游戏录像上逐条对照帧检查命中，三个不到一秒的暂停菜单仅 screening 得分 0.36 / 0.50 / 0.95，验证前漏掉两个、验证后全部捞回。作者自陈/未验证：底层 Jev 图像能力仍是实验性，验证只基于单个测试视频；没有定时器或事件触发的具体机制；调研原文在 Claude Code 插件部分被截断。调研判断是照 Quickstart 在一段本地短视频上跑通 index→ask→zoom，并以 MCP/插件形式接到 Claude Code 或 Codex 试做视频检索，值得小范围试，不建议直接全量采用。
- 做法 J WhatsApp MCP：可核查的是仓库 README 给出的完整部署命令、配置项、工具表、架构和调试步骤。HN 的 35 points、23 comments 只能说明关注度，不能证明效果。作者明确说只在一个真实账号上跑过；首次历史导入每个链接只发生一次，失败后要重新链接才能补；免费计划未验证，付费计划才能提高 CPU limit；媒体不下载、不转写；只支持一个部署对应一个 WhatsApp 账号和一个 owner；非官方实现，使用 WhatsApp Web 协议和 Baileys，作者承认违反 WhatsApp 条款，认为只读链接的实际风险低但不是零；已知缺口包括未命名聊天不会自动刷新、每日 pull 发现登出不会通知、编辑/删除路径未用真实事件测试。没有业务效果指标。
- 做法 K im-mcp：可核查的是 README 给出的安装命令、初始化命令、客户端配置、清理命令、工具表、兼容性验证表。原文只给了兼容性验证（覆盖 Windows/macOS、多个微信/钉钉版本的实测表），没有任何效果指标、任务成功率或对照数据；“毫秒级响应”是作者声称，未给测量方法。工具声明只读，但本地数据库会解密为 SQLite、明文落盘；没有 cron、webhook、守护进程等定时/事件触发说明，调度层需自行搭建。适用条件与局限：Windows x64 或 macOS，原文未提 Linux；强依赖微信 4.x / 钉钉 7.x 的客户端版本；Windows 需管理员终端且微信已登录；macOS 4.1+ 需 64 位 hex passphrase。
- 做法 L claude-security-scan：可核查的是 README 的检测项清单、安装命令、各域准备方式、报告路径、安全设计和限制；仓库 32 stars。没有检出率、误报率、真实用户案例或独立评测，也没有代码审计结果；作者关于“最近信息泄露多由疏忽造成”“这些检查去看几秒就能知道”等是主张，不是数据结论。原文自述限制：Google Workspace 整体管理设置因需 Admin API 委派不在范围；AWS 默认只查东京和弗吉尼亚；不做暴力/模糊测试等攻击性检查；检测结果需人工最终判断。另需注意：这是会读取多账户敏感信息的第三方技能，README 中的只读与脱敏设计尚未在本报告依据的材料中经过代码级验证；Gmail 依赖第三方 `gog`；token 的 export 命令中 `...` 是占位符。
- 与已有清单的关系：Claude Code 为 adopt；jevcrawl 是给已采用工具加装“站内多跳检索”的路径；Cursor 为 watch；arXiv 是基准所用 WebWalkerQA 的来源。HKUDS/CLI-Anything 在清单中为 watch，本报告建议上调为 try；reason network 补的是“多 agent 跨机通信”这一块；idx 的“现成 CLI 自带 MCP server、一份数据三种界面”在清单中没有直接对应条目；Blender 扩展与 OpenCode、CLI-Anything 在 Blender 自动化上重叠，按任务选；jevreel 与 Claude Code 直接相关，也与 arcmira 都通过 TypeSafe 的 Jev 计量，但目标不同；WhatsApp MCP 与 im-mcp 都是给 agent 补私人沟通上下文的只读数据源，前者是远程 Cloudflare 部署、单账号单 owner，后者是本地数据库解密、强版本依赖；claude-security-scan 是 Claude Code 的一个技能，清单里 Claude Code 为 adopt，清单中没有其他相关条目。
- 尚未覆盖的部分：这些路径都没有讨论哪类任务适合哪个模型，也没有系统比较 Claude Code / Codex / Hermes 三者在同一工具集下的差异；反馈信号、上下文信息、权限回收机制只有零散机制；除单次调用边界与停止原因外，多数没有由时间、事件或状态触发的主动推进能力；私人消息路径都没有给出业务效果指标，只给出部署/兼容性验证；claude-security-scan 只有 README 证据，没有独立评测或代码审计。

## 依据的调研

- [@BkashJosi: REA 的设置菜单中列出了 Claude Code 和 Codex。Hermes 不在其中。🪽](../research/radar/2026-10-12/2718-rea-claude-code-codex-hermes.md)：值得一试，可以小范围试：在隔离环境里用作者给出的一行命令把 rea-agents 作为 MCP 服务器挂到 Hermes，再核对工具清单并跑一个低风险任务验证；因为原文只给了这一条可复制的接入命令，工具数量与能力都还只是作者主张，且原文在工具清单处被截断。
- [RayenMlayeh/jevcrawl](../research/radar/2026-10-14/3198-rayenmlayeh-jevcrawl.md)：值得一试，按 README 给出的两条 MCP 配置把 jevcrawl 挂到 Claude Code/Cursor，先用 1–2 个真实的多跳查资料任务与现有抓取方式做对照；理由是它提供了可直接照做的安装命令、参数默认值和输出字段，成本/耗时对比具体，但基准样本小、依赖付费 Jev API、不执行 JavaScript，适合小范围试而非直接替换。
- [HKUDS/CLI-Anything](../research/radar/2026-10-15/3558-hkuds-cli-anything.md)：值得一试，建议小范围试用：先用 `cli-hub` 装一个现成 harness 接进 agent 跑一条真实重复任务，确认真有用后再考虑用 `/cli-anything` 为内部工具生成新 CLI——它把“给 AI 提供工具入口”变成了可复制的命令与流程，但所有效果数据均为项目自述、无第三方复现，且大量 harness 依赖上游桌面软件。
- [arcmira/mcp](../research/radar/2026-10-17/4078-arcmira-mcp.md)：值得一试，先在 Claude Code 里用一条命令接入这个远程 MCP（或改用带 Bearer key 的 JSON 配置），再照 README 的「先 resolve 后查询」示例程序做小范围试用；理由是仓库给出了可直接复制的安装命令、方法表、示例代码和 credits/限额规则，属于能立刻落地的工具供给，但数据覆盖与说话人/赞助识别准确性全是厂商自述，且有付费计划与预算门槛，不足以直接采纳。
- [reason-machines/reason-network](../research/radar/2026-10-17/4174-reason-machines-reason-network.md)：值得一试，若团队已经在用 Reason CLI 并且成员都在同一 workspace，可以小范围试用 reason network：用 `reason network who` 和 `reason network <session> "..."` 让两个 agent session 直接互相问答，观察是否减少人工中转。理由是原文给出了可复制的安装命令、CLI 命令和 MCP 工具名，但完全没有效果数据，且强依赖 Reason 产品与团队整体部署。
- [fzn0x/idx](../research/radar/2026-10-18/4493-fzn0x-idx.md)：值得一试，值得小范围试：照 README 把 idx 装起来并用 `idx mcp setup <客户端>` 注册进你已在用的 agent，用来验证「把现成 CLI 包成 MCP 工具供 agent 调用」这一模式是否真的省事；它本身是印尼股市工具，领域窄，先试流程而不是直接写进手册。
- [LiCinCan/blender-ai-mcp-addon](../research/radar/2026-10-18/4630-licincan-blender-ai-mcp-addon.md)：值得一试，建议在 Windows x64 + Blender 4.2+ 环境小范围试用：按 README 安装扩展，先用单助手跑通“检查场景→创建对象→复制排列”的提示词，再视任务复杂度配置 Manager/Worker/Reviewer 团队链；理由是它把场景工具、模型选择、审批与审核流程都做成了可照做的集成，但只有 README 级证据，缺少效果数据且平台受限。
- [DeepAleph/jevreel](../research/radar/2026-10-19/4711-deepaleph-jevreel.md)：值得一试，照 README 的 Quickstart 在一段本地短视频上跑通 index→ask→zoom，并以 MCP/插件形式接到 Claude Code 或 Codex 试做视频检索；它给的是完整可复制的安装、配置与 lens 用法，值得小范围试，但底层 Jev 图像能力仍是实验性、验证只基于单个测试视频，不建议直接全量采用。
- [Show HN: WhatsApp MCP running free on Cloudflare](../research/radar/2026-10-19/4806-show-hn-whatsapp-mcp-running-free-on-cloudflare.md)：值得一试，建议小范围试用：在自己的 Cloudflare 账户部署只读 WhatsApp MCP，接入 Claude Code 验证搜索、跨聊天查找和群聊补课类任务；它给出了完整部署步骤和工具接口，但属于非官方协议、仅单账号验证，不宜直接作为团队默认方案。
- [stkoecn/im-mcp](../research/radar/2026-10-19/4855-stkoecn-im-mcp.md)：值得一试，按 README 的「uv tool 安装 → wechat-init/dingtalk-init 初始化 → 客户端 MCP 配置」三步在一两台机器上小范围试跑，它能把微信/钉钉的沟通上下文变成 agent 可直接检索的只读数据源；但涉及本地数据库解密与明文落盘、强依赖客户端版本，且只有作者自述无实测数据，暂不宜作为通用做法直接写进手册。
- [chaenmasahiro0425/claude-security-scan](../research/radar/2026-10-20/5184-chaenmasahiro0425-claude-security-scan.md)：值得一试，建议先小范围试用：按 README 安装后用 --demo 验证，再只对一个低风险域运行 --skip repos，确认只读、脱敏和“未能确认”标注可靠后再扩大。理由是它把跨 Mac、仓库、云和 Gmail 的例行检查封装成一句触发和定时任务，步骤具体；但它是跨多账户读取敏感信息的第三方技能，目前只有 README 证据，不宜直接全量 adopt。
