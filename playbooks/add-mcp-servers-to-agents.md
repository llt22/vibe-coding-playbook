# 给代理接第三方工具前，先隔离、核对、冒烟、对照再决定

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：把第三方工具集以 MCP 或 CLI 形式接给代理时，怎么不被一句注册命令带走，用隔离、清单核对、冒烟和对照验证决定继续试还是只当思路参考。
> 先试这一步：在隔离环境里选一个真实重复任务，先用 `pip install cli-anything-hub` + `cli-hub install/launch` 跑通一个现成 CLI harness，或对 MCP 工具先跑 `uvx jevcrawl doctor` 确认通路，并留下未接入时的基线。
> 最近修订：2026-10-15

## 解决什么问题

把第三方工具集以 MCP 或 CLI 形式接给代理时，常见供给方式是一句注册/安装命令就完事：能不能用、多出哪些工具、花了多少钱、和现有做法比是不是真的更好，全靠感觉。本章解决的是：怎么在不污染主力环境的前提下，完成接入、核对工具清单、冒烟测试和对照验证，并据证据决定“继续试”还是“只当思路参考”。

现在有三条路径：REA 接 Hermes（MCP，原文只给一条命令、能力清单被截断、没有验证方式）；jevcrawl 接 Claude Code / Cursor（MCP，有可直接照做的安装命令、参数默认值、输出字段和一份基准数据）；CLI-Anything / CLI-Hub（把桌面软件、代码库、内部工具包装成 agent-native CLI，有现成 harness 注册表、meta-skill 和生成流水线，但所有效果数据均为项目自述、无第三方复现）。两条 MCP 路径的安全纪律相同，CLI 路径多出“上游软件依赖”和“生成物自带测试”两个变量。

## 适用与不适用

适用：

- 本机已有可用的 MCP 客户端：Claude Code、Claude Desktop、Cursor，或 Hermes CLI（终端里 `hermes` 命令存在）。
- 愿意并且能够在隔离环境（容器、虚拟机或专用账号）里先跑第三方包。
- 目标是“让代理一次性获得一整套外部工具 / 一类新能力”，例如站内多跳资料检索，或把 GIMP、Blender、LibreOffice 等软件变成可反复调用的 CLI。
- 需要反复调用外部软件、需要可复现操作的任务：CLI 的结构化、可组合、自描述和 JSON 输出更适合 agent。

不适用：

- 不能隔离、必须直接在主力工作目录上试用。
- 需要稳定可复现的生产接入。
- 你依赖“139 个工具”的完整清单来规划任务：原文在列举处被截断，完整清单不可见。
- 目标站点需要 JavaScript 渲染、需要登录、或有付费墙 / CAPTCHA：jevcrawl 这几项都不做。
- 所选 CLI harness 包装的是真实软件时，你不想先安装上游桌面软件：大量 harness 依赖上游软件。
- 你在 Windows 上且没有 Git for Windows（含 `bash`/`cygpath`）或 WSL：Claude Code 路径会报 `cygpath: command not found`。

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

CLI-Anything / CLI-Hub 路径：

- Python 3.10+。
- 若所选 harness 包装的是真实软件（GIMP / Blender / LibreOffice 等），需先自行安装该上游软件。
- 若走 meta-skill，需要支持 SKILL 的 agent（OpenClaw、Nanobot、Claude Code、Codex、Reasonix、Antigravity 等）。
- 若走 Claude Code 生成器，需已装 Claude Code；Windows 需先装 Git for Windows（含 `bash`/`cygpath`）或使用 WSL，否则会报 `cygpath: command not found`。
- 若走 Cursor，需已装 Cursor 并 clone 仓库；默认装到 `~/.cursor/plugins/local/cli-anything`（可用 `CURSOR_PLUGINS_HOME` 覆盖，指向名为 `plugins` 的目录）。

另外，REA 侧需要自己查 Hermes 自身文档，找到“查看已注册 MCP 服务器 / 枚举工具”的命令，因为原文没有给出这个命令。

## 操作步骤

做法 A 与做法 B 的区别：做法 A 适用于“文档里给了安装命令、参数默认值和输出字段”的工具集，能做完整对照；做法 B 适用于“只有一条注册命令、清单不完整”的工具集，只能做隔离 + 冒烟 + 对照；做法 C 是不接入，只留思路；做法 D 是用 CLI-Anything / CLI-Hub 把软件包成 agent-native CLI，适用于需要反复调用外部软件、需要可复现操作的任务。先做 A 或 D1：它们能在半天内给出可观察的结论，也顺带把隔离环境、基线记录这套流程跑通。

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

### 做法 C：不实际接入，只当作“用 MCP 批量接工具”的思路参考

当出现以下任一情况时选做法 C：注册失败，或注册后工具无法被代理实际调用；无法提供隔离环境；需要完整的工具清单、权限说明和失败排查步骤，而原文只给了一条命令（或命令之外的能力清单被截断）。

做法：不把工具挂到任何工作环境，只记录“用 MCP 协议把外部工具集一次性喂给代理”这一供给方式，作为后续遇到类似工具集时的参考。

### 做法 D：用 CLI-Anything / CLI-Hub 把软件包成 agent-native CLI

做法 D 与 A/B 的区别：A/B 走 MCP 服务器接工具集；D 走 CLI harness，让 agent 用命令行驱动软件。CLI-Hub 注册表有现成 harness，也可用 `/cli-anything` 为内部工具生成新 CLI。选 D 当你要反复调用外部软件、需要可复现操作，而且目标软件有现成 harness 或愿意让编码 agent 生成。先做 D1，成本最低。

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

## 怎么判断变好了

可观察指标：

- 通路：`uvx jevcrawl doctor` 是否报通路正常；`rea` 是否出现在 Hermes 的服务器列表中；CLI-Hub 的 `cli-hub info`、`install`、`launch` 是否成功。
- 上下文压缩：`tokens_raw` 对 `tokens_returned`。jevcrawl README 的演示是 docs.python.org 示例抓 6 页，80,034 tokens 压到 1,873 tokens，$0.0069，8.3 秒。
- 成本与停止原因：`jev_cost_usd`、`stopped_because`、`degraded`、`needs_js_urls`。
- 任务效果：是否抓到含答案的页面、答案是否正确，外加每次任务成本、每个正确答案成本、耗时。
- REA 侧：代理能否在不需要用户点名工具的情况下自动调用 rea 的工具；同一任务与未挂载时相比，人工步骤数和耗时是否减少。
- CLI-Anything 侧：agent 是否自主发现、安装并启动合适 CLI；生成流水线是否产出 TEST.md、`/cli-anything:test` 与 `/cli-anything:validate` 是否通过；README 自报 2,461 个测试通过、pytest 100%、多语言/多 harness 覆盖率，但这是项目自述，不是第三方复现。
- 安全负向指标：是否出现越权访问、读取工作目录之外的文件、或执行非预期命令；出现即回滚并降级为 study。

对照试验设计（借用 jevcrawl README 的基准设计）：所有系统从站点首页出发、同样的 30 页预算、同一个问题，抓到的内容交给同一个回答 LLM，由同一个 judge 打分，只让爬虫这个变量变。CLI-Anything 没有对比性指标（用了 CLI 之后任务成功率/耗时变化），原文没有给；只能先用流程内建测试和真实重复任务做前后对照。

可参考的作者自测数据（非独立验证）：

- 50 个 WebWalkerQA 任务（2026-10-12，回答模型 `claude-opus-5-5`，judge `claude-sonnet-5-5`）：jevcrawl 答对 40%、找到答案页 54%、$0.025/任务；“Claude 逐个挑链接”为 30% / 33% / $0.194；广度优先为 8% / 11% / $0.228。
- 每正确答答案成本：jevcrawl $0.06、“Claude 挑链接” $0.65、广度优先 $2.85。
- 与 Crawl4AI 0.9.4 的对照（20 个任务，2026-10-13，只比“是否抓到 gold page”，不接 LLM）：答案页 10 次 vs 5 次；全部答案页 5 vs 2；中位爬取时间 29s vs 43s；站点加载失败 0 vs 3；jevcrawl 找到 6 个 Crawl4AI 错过的答案页，Crawl4AI 找到 1 个 jevcrawl 错过的。
- CLI-Anything README 自报：2,461 个测试通过、pytest 100%、多语言/多 harness 的覆盖率；demos 声称能产出 CAD 模型、3D 场景、图表、游戏内容、字幕等真实产物。均无第三方复现。

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

试多久：jevcrawl 侧原文说最小试用半天内可完成；REA 侧原文没有给出时间或次数建议，以完成一轮“注册 → 枚举 → 冒烟 → 对照”为准；CLI-Anything 侧原文未给固定时长，以跑通一条真实重复任务并留下一组对照为准。在得到明确正负结果前，不要扩展到长期使用或生产环境。

## 常见坑

- 把“注册成功”当成“验证完成”。REA 侧原文没有给出 list / 枚举命令，必须查 Hermes 文档自行补上；jevcrawl 侧至少还有 `uvx jevcrawl doctor` 这一步。
- 把“安装成功”当成“任务有效”。CLI-Hub 装完 harness 后，要接进 agent 跑一条真实重复任务，确认真有用再考虑用 `/cli-anything` 生成新 CLI。
- 把作者自测当独立证据。jevcrawl 的 50 和 20 个任务样本都很小；原文自己写出的判断是“成本差距大而稳定，准确率差距没那么稳定”。CLI-Anything 的所有效果数据均为项目自述、无第三方复现。
- 在主力环境里直接跑第三方包。REA 命令字面依赖 `npx`、jevcrawl 依赖 `uvx`、CLI-Hub 依赖 `pip`，都会拉取并执行第三方包；REA 原文完全没讨论安全边界、权限范围、失败排查或离线可用性。
- 忽略版本写死。`rea-agents@6.3.0` 是原文写死的版本；jevcrawl 的 `jev-1.13.0` 也是固定版本，阈值按版本校准，换模型需重新评估。
- 以为 jevcrawl 能爬任何站点。它不执行 JavaScript（需 JS 的 URL 会列在 `stats.needs_js_urls`），不读 `robots.txt`，除了一次抓 4 页外不做限速，站点条款与合规由使用者自负；不登录、不绕付费墙和 CAPTCHA。
- 忽略内容外发。jevcrawl 会把页面文本（段落、链接标签、URL）发送到 TypeSafe 打分；API key 只从环境变量读，不落盘、不写日志。
- 忽略上游软件依赖。大量 CLI harness 包装的是真实桌面软件（GIMP / Blender / LibreOffice 等），不先装上游软件，`cli-hub launch` 不会产生有效结果。
- Windows 上直接跑 Claude Code 生成路径。Windows 需先装 Git for Windows（含 `bash`/`cygpath`）或使用 WSL，否则会报 `cygpath: command not found`。
- OpenCode 命令引用的 `HARNESS.md` 没和命令放同一目录。命令会引用它，必须在同一目录；旧版目录名为 `command/`。
- 旧版 Claude Code 不识别 `/cli-anything`。改用 `/cli-anything:cli-anything`；辅助命令保持 `:subcommand` 形式（如 `/cli-anything:refine`）。
- 误把传播数据当效果证据。Matthew 的 REA 帖子 230 万次浏览是曝光量，不是任何效果证据。
- 用被截断的能力清单去规划任务。REA 原文只列到“反编译一个应用”就被截断，后续能力未知。
- 把“139 个工具”当成事实。数量只是作者主张。
- 没有隔离就上线。只要出现越权访问、读取工作目录之外的文件或执行非预期命令，就应回滚并降级为 study。
- 期待接入 MCP 本身带来主动推进。原文只给出单次调用的边界与状态；定时或事件触发的机制，jevcrawl 与 REA 两侧的原文都没有提到。CLI-Anything 有部分依据（meta-skill 自主发现安装、Unreal Insights 后台捕获会话控制），但没有系统给出由时间/事件触发持续完成的机制。

## 证据与来源

- 做法 A / B / C 依据的调研：REA / Hermes 路径可核查内容为“REA 设置菜单已支持 Claude Code 和 Codex”这一事实陈述，以及一条完整可复制的接入命令 `hermes mcp add rea --command npx --args -y rea-agents@6.3.0 mcp`。只是作者主张、未经原文验证：接入后代理会多出 139 个工具；“反编译一个应用”等具体能力清单，且原文在列举处被截断。传播数据：Matthew 的 REA 帖子 230 万次浏览，这是曝光量，不是效果证据。该调研的判断是原文只给了一种接入形态、没有验证方式，因此只建议给到“试”，而不是“采用”。
- 做法 A 依据的调研（仓库 RayenMlayeh/jevcrawl，Apache-2.0，Python 3.11+，README 页显示 37 stars）：可直接照做的是安装命令、参数默认值、输出字段与环境变量表。数据均为作者自测：50 个 WebWalkerQA 任务（2026-10-12，回答模型 `claude-opus-5-5`，judge `claude-sonnet-5-5`）jevcrawl 40% / 54% / $0.025，Claude 逐个挑链接 30% / 33% / $0.194，广度优先 8% / 11% / $0.228；每正确答答案成本 $0.06 / $0.65 / $2.85；与 Crawl4AI 0.9.4 的 20 任务对照（2026-10-13）答案页 10 vs 5、全部答案页 5 vs 2、中位爬取时间 29s vs 43s、站点加载失败 0 vs 3；docs.python.org 示例 80,034 tokens → 1,873 tokens，$0.0069，8.3 秒。作者主张（无独立验证）：找到答案页的概率约 2 倍于 Crawl4AI、比 LLM 驱动爬取快 2 倍、天然抗 prompt injection（页面文本只作为数据字段被打分，问句是 jevcrawl 写死的固定字符串）、引文逐字可溯源。原文自陈局限：样本小；Crawl4AI 驱动真实浏览器而 jevcrawl 不执行 JavaScript；不读 `robots.txt`、除一次抓 4 页外不限速、站点条款与合规自负、不登录不绕付费墙和 CAPTCHA；页面文本会发送到 TypeSafe。
- 做法 D 依据的调研：HKUDS/CLI-Anything。可核查的是 README 给出的安装与使用命令：`pip install cli-anything-hub`、`cli-hub list/search/info/install/update/uninstall/launch`、`npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y`、`/plugin marketplace add HKUDS/CLI-Anything`、`/plugin install cli-anything`、`/cli-anything`、`:refine`、`:test`、`:validate`，以及各宿主安装脚本。作者主张（无第三方复现）：CLI 是人和 agent 的通用接口；7 阶段流水线能自动生成带 REPL/JSON 输出/undo-redo 的 Click CLI、测试、文档并发布；README 自报 2,461 个测试通过、pytest 100%、多语言/多 harness 覆盖率；demos 声称能产出 CAD 模型、3D 场景、图表、游戏内容、字幕等真实产物；建议小范围试用，先用 `cli-hub` 装一个现成 harness 接进 agent 跑一条真实重复任务，确认真有用后再考虑用 `/cli-anything` 为内部工具生成新 CLI。原文也明确：大量 harness 依赖上游桌面软件；Windows 需 Git for Windows 或 WSL；生成流水线有 TEST.md 与 `/cli-anything:test`、`/cli-anything:validate`，但没有对比性指标（用了 CLI 之后任务成功率/耗时变化）。
- 与已有清单的关系：Claude Code 为 adopt；jevcrawl 以 MCP server 形式接入 Claude Code 是给已采用工具加装“站内多跳检索”能力的一条路径；Cursor 为 watch，README 明确支持，配置方式就是上面的 `mcpServers` JSON；arXiv（source，try）是基准所用 WebWalkerQA 的来源（arXiv 2501.07572，Wu et al., Alibaba Tongyi Lab, ACL 2025）。清单中 Claude Code 已内置对 REA 的接入，Hermes 为 watch，本条线索给出一条手动让它获得外部工具集的路径；清单中没有与 REA / rea-agents 直接对应的条目，也没有与 jevcrawl 或 Crawl4AI 这类具体爬虫方案直接对应的条目。HKUDS/CLI-Anything 在清单中为 watch，本报告建议上调为 try；Claude Code 是它的一等公民宿主，Cursor、OpenClaw、OpenCode、goose、Hermes 为 watch 且是它支持的宿主/同类接入点；GitHub Copilot 为 drop，本报告未给出具体安装路径；SkillHub 为 study，与 `npx skills add ... --skill <name> -g -y` 的 skill 分发方式相关。
- 尚未覆盖的部分：MCP 两条线索都只给了一种接入形态 —— MCP 服务器 + 代理；CLI-Anything 给的是 CLI harness 形态。三者都没有讨论哪类任务适合哪个模型，也没有比较 Claude Code / Codex / Hermes 三者在同一工具集下的差异；没有涉及反馈信号、上下文信息、权限回收机制；除单次调用边界与停止原因外，未提任何由时间、事件或状态触发的主动推进能力（CLI-Anything 仅在 meta-skill 自主发现安装、Unreal Insights 后台捕获会话控制上有部分依据，但未系统给出）。

## 依据的调研

- [@BkashJosi: REA 的设置菜单中列出了 Claude Code 和 Codex。Hermes 不在其中。🪽](../research/radar/2026-10-12/2718-rea-claude-code-codex-hermes.md)：值得一试，可以小范围试：在隔离环境里用作者给出的一行命令把 rea-agents 作为 MCP 服务器挂到 Hermes，再核对工具清单并跑一个低风险任务验证；因为原文只给了这一条可复制的接入命令，工具数量与能力都还只是作者主张，且原文在工具清单处被截断。
- [RayenMlayeh/jevcrawl](../research/radar/2026-10-14/3198-rayenmlayeh-jevcrawl.md)：值得一试，按 README 给出的两条 MCP 配置把 jevcrawl 挂到 Claude Code/Cursor，先用 1–2 个真实的多跳查资料任务与现有抓取方式做对照；理由是它提供了可直接照做的安装命令、参数默认值和输出字段，成本/耗时对比具体，但基准样本小、依赖付费 Jev API、不执行 JavaScript，适合小范围试而非直接替换。
- [HKUDS/CLI-Anything](../research/radar/2026-10-15/3558-hkuds-cli-anything.md)：值得一试，建议小范围试用：先用 `cli-hub` 装一个现成 harness 接进 agent 跑一条真实重复任务，确认真有用后再考虑用 `/cli-anything` 为内部工具生成新 CLI——它把“给 AI 提供工具入口”变成了可复制的命令与流程，但所有效果数据均为项目自述、无第三方复现，且大量 harness 依赖上游桌面软件。
