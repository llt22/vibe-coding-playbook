# nightly-labs/openbot

- 结论：**值得研读**。不要直接把 OpenBot 当作工作台引入；应把它当作“多智能体编排”的设计样本，提炼独立工作区、FIFO 任务队列、频道内显式委派、版本化本地技能这四个可复用机制，并在隔离环境中做小规模对照试验。理由是 README 只提供了安装命令和功能清单，没有任务级流程或效果证据，且其 agent 默认以 danger-full-access、永不逐动作确认的方式运行。
- 原文：https://github.com/nightly-labs/openbot
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-27T06:05:53.732Z

## 是什么

OpenBot 是一个“本地优先（local-first）的桌面工作台，用于常驻 AI 队友”。它本身不是模型，而是把多个编码智能体 CLI 聚合成可长期协作的团队：

- 支持本地 Codex App Server、Claude Code，并通过 ACP 接入 Grok CLI、OpenCode、Gemini、Cursor CLI、Cline CLI。
- 每个 agent 拥有独立的工作区和独立会话，可分别设置模型、reasoning、profile、通知、浏览器与面板状态。
- 提供本地 FIFO 消息队列（可暂停、恢复、取消，崩溃安全持久化）、agent 间消息/回复/表情/图片、受管文件传输、常驻内嵌浏览器、可选的 Computer Use（`cua-driver`）。
- 共享桌面频道聊天：一个任务负责人、显式委派、共享历史，以及 Stop / Resume / Reassign / Archive / Restore 控制。
- 每个 agent 的上下文监控，长对话耗尽窗口前自动压缩。
- 本地技能库：agent 可 `create_skill` 生成 `SKILL.md` 文件夹，其他 agent 通过 Settings → Skills → Local skills 安装；支持版本保留。
- 安装形态覆盖 macOS / Windows / Linux（AppImage）、自托管服务器、Docker、Nix；另有开发用 `bun run dev` 体系与 marketplace 技能目录。

作者自述这是 development preview：agent 以 `danger-full-access` 和 `approvalPolicy: never` 运行，首次启动同意后可读写文件、执行命令、访问网络、控制内嵌浏览器，不再逐动作确认。许可证为 PolyForm Noncommercial 1.0.0。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

以下步骤都来自 README，但请注意：它们是“把这个预览产品跑起来”的步骤，不是“某项工作该怎么交给 AI”的流程。作为研究素材，它们的价值是复现其编排结构，而不是照搬进生产。

1. **选安装形态（前提：先决定是否隔离）**。桌面版要求 macOS 13+（Apple silicon 或 Intel）、Windows 10+ x64、或 Linux x64/arm64 AppImage。若只想观察其多智能体机制，优先在一次性虚拟机/专用机器上用 Docker。

2. **Docker 方式启动服务器（前提：机器可拉取 ghcr 镜像，且你接受默认全权限 agent）**：
```bash
curl -fsSLO https://raw.githubusercontent.com/nightly-labs/openbot/main/docker/seccomp.json
docker run -d --name openbot --restart unless-stopped \
  --security-opt seccomp=seccomp.json --security-opt no-new-privileges:true \
  --shm-size 1g --stop-timeout 60 -v openbot-data:/data \
  ghcr.io/nightly-labs/openbot:latest
docker exec -it openbot openbot login
```
（`--security-opt seccomp=seccomp.json` 的作用是让 Electron 沙箱保持开启；不要用 `--no-sandbox` 启动。）

3. **Linux AppImage 的前置修复（前提：Ubuntu 23.10+ / Debian 13，AppArmor 限制非特权 user namespace）**：不装 profile 会在启动时退出。
```bash
sudo install -m 0644 build/linux/openbot.apparmor /etc/apparmor.d/openbot
sudo systemctl reload apparmor
```
同一文件也随 AppImage 提供在 `resources/linux/openbot.apparmor`；AppImage 放在非常规路径时需改 profile 里的挂载路径。

4. **无显示器的常驻服务器（前提：Ubuntu 24.04/26.04 + systemd，需要邮箱验证码账号）**：
```bash
curl -fsSL https://raw.githubusercontent.com/nightly-labs/openbot/main/scripts/install-server.sh | sudo bash
sudo openbot login
```
随后可从桌面端、iPhone app 或 `openbot.run/app` 使用。

5. **接入 provider CLI（前提：对应账号/订阅/API key）**。可以让 OpenBot 在 onboarding 或设置里点 Download 下载并固定托管 CLI；也可自装：
```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```
```bash
curl -fsSL https://claude.ai/install.sh | bash
```
- Grok：按 Grok Build 文档安装后 `grok login`，或在启动 OpenBot 的环境里设 `XAI_API_KEY`。
- OpenCode：免费模型无需登录，选中后点 Connect 读取 CLI 公开的模型；付费 Go 模型需在 OpenCode 行点 Sign in 粘贴 Go key，key 在本机加密后只交给本地 CLI。
- Gemini：使用 Google AI Pro/Ultra；选 Download 时下载 Google 的 Antigravity ACP server（许可证不允许 OpenBot 捆绑），登录在浏览器完成。
- Cursor：`cursor-agent acp`；Cline：`cline --acp`。
- 指定可执行文件路径的覆盖变量：`OPENBOT_OPENCODE_PATH`、`OPENBOT_ANTIGRAVITY_PATH`、`OPENBOT_CURSOR_PATH`、`OPENBOT_CLINE_PATH`（README 另述 `OPENBOT_*_PATH` 覆盖优先于托管 CLI）。
- Windows 需把 `codex`/`claude`/`grok` 放进 PowerShell 的 PATH；Claude Code 还需要 Git for Windows。

6. **建立“一 agent 一工作区”结构（前提：已至少接通一个 provider）**。用提示驱动创建 agent，编辑 instructions、头像，保存前可分段复核；在 agent 设置里分别指定模型与 reasoning 强度。这一步是可复用要点：模型选择属于 agent 级配置，而不是全局配置。

7. **用 FIFO 队列下发任务，而不是在单会话里连续追加**（前提：任务可被拆成串行消息）。队列支持 pause / resume / cancellation 与崩溃安全持久化；长任务可在中途暂停或改写后续消息。

8. **在共享频道里做显式委派**（前提：任务需要多于一个 agent）。频道有唯一任务负责人和共享历史，控制项为 Stop / Resume / Reassign / Archive / Restore。可复用要点：用 Reassign 作为“换手”，用 Archive/Restore 作为上下文存档边界。

9. **把可复用流程固化成技能**（前提：某流程已稳定跑通至少一次）。让 agent 从该流程生成技能，它会准备 `SKILL.md` 文件夹并调用 `create_skill`；之后可用 `list_local_skills`、`read_local_skill`、`revise_skill`、`install_local_skill`。修订需提交 agent 读到的版本，旧版本保留；更新库里的技能不会自动更新已安装副本，需用 Update chip 或安装确切版本；已修改的安装文件受保护。技能可带 `scripts`、`references`、`assets`，`assets/icon.png` 作为本地预览图；注册时不执行脚本。

10. **给技能加试用提示词（前提：你在写 marketplace 技能）**。在 `SKILL.md` 的 YAML frontmatter 里加：
```yaml
example-prompt: Turn the latest commits into release notes.
```
预览会显示该文本；Try skill 只把它和技能引用追加到选中 agent 的草稿，不发送消息；trim 后上限 1000 字符。

11. **（可选）本地构建与自检**（前提：Bun 1.4.2、Node 24、至少一个受支持的 agent CLI）：
```bash
git clone https://github.com/nightly-labs/openbot.git
cd openbot
bun install --frozen-lockfile
bun run codex:doctor
bun run dev
```
`codex:doctor` 只检查 CLI 版本、App Server 握手和 ChatGPT 登录，不发起模型回合；新 worktree 用 `bun run dev:bootstrap`；只重置本地开发状态用 `bun run dev:reset`；种子数据用 `bun run dev:seed` 后 `bun run dev --shared`。

12. **导入已有 agent（前提：有 Grok Bot 导出）**。Server settings → Import，选择导出 `.zip`（≤100 MB），导入名称、instructions、头像、技能、routines、memories；工作区文件进 `imported/`；聊天历史不导入（导出 agent 把要点存成 memories）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
README 明确声明可交给 agent 的“额外动作”有：控制常驻内嵌浏览器（打开、查看、操作页面）、可选 Computer Use（macOS/Windows/Linux，经 `cua-driver` 子进程提供给所有 provider）、agent 间互发消息/回复/表情/图片、受管文件传输、在共享频道里承接与转交任务、把稳定流程写成带脚本与资源的技能。这些都是功能声明，README 未给“哪类工作因此被接管”的实例，只能作为能力清单的候选池。

**2. 任务匹配**
最直接的可迁移点是“模型与推理强度按 agent 配置”：per-agent model / reasoning / profile。接入层区分 Codex App Server 与 ACP 两类协议；能检测本地模型服务器（Ollama、LM Studio）与已安装 agent；支持自定义 OpenAI 兼容端点与自定义 ACP agent。也就是说，同一工作台里可以按任务性质把不同 agent 指向不同 CLI/模型，而不是一个模型包打天下。README 未给出“什么任务配什么模型”的对照结论。

**3. 条件供给**
- 空间与状态：每个 agent 独立工作区 + 独立会话；per-agent 面板、浏览器、通知状态独立。
- 工具：文件传输、内嵌浏览器、Computer Use 驱动随发行版附带（macOS 需授予屏幕录制与辅助功能权限）。
- 权限：默认是最宽供给——`danger-full-access` 且 `approvalPolicy: never`，首次启动一次性同意后不再逐动作确认。这是“供给充分、约束为零”的极端样本。
- 凭据：沿用本机已有 CLI 登录，不复制 provider 凭据；Grok 的 `XAI_API_KEY` 与 per-session MCP bearer token 不持久化、不记录。
- 反馈通道：每个 agent 的上下文监控与自动压缩、通知状态、队列的暂停/取消、频道的 Stop/Reassign，构成“人可以随时介入”的反馈面。

**4. 主动推进**
有据可依的部分：FIFO 队列（可暂停/恢复/取消、崩溃安全持久化）本身就是“任务持续排队推进”的机制；共享频道里有任务负责人、显式委派与 Reassign；种子数据包含“channel memories and routines”，说明存在 routines 概念且被当作持久化对象。但 README（在本次抓取范围内）没有给出 routine 的触发条件配置（时间/事件/状态）的字段、语法或例子，也没有队列项的定时/事件触发方式。因此“按时间/事件/状态触发并持续完成”只能算方向性线索，不能作为可照做的结论。

**5. 效果验证**
README 只提供了工程侧自检工具，而不是任务效果评估：
- `bun run dev:verify`：打印稳定的 JSON 验证计划（ready/reasons、改动文件与受影响面、邻近测试、runtime 状态、`qa.required`/`qa.ready`、renderer QA 循环、安全可运行的 `runnableCommands`），`--run` 只执行安全的非变更检查；外观相关时按 `snapshot → action with --wait-for → snapshot → screenshot` 走。
- `bun run dev:automation`：通过 CDP 驱动运行中的 dev app（`instances`、`pages`、`snapshot`、`screenshot`、按无障碍角色 `click`/`type`），变更类操作需 `--allow-mutations` 并指定实例。
- `bun run dev:cpu`：按进程类型与页面测 idle CPU，`--duration`、`--interval`、`--label`、`--out`、`--compare` 做改前改后对比，只读。
这些能验证“应用没坏、没更费 CPU”，但没有任何关于任务产出质量、返工率或成本的度量。

## 与已有做法的关系

清单条目：OpenBot（study）、Claude Code（adopt）、Cline（watch）、Cursor（watch）、OpenCode（watch）。

- 与 **OpenBot（study）**：本条就是同一仓库，结论一致——保持 study。它值得研究的是编排层结构，而不是其产品成熟度。
- 与 **Claude Code（adopt）**：README 把 Claude Code 列为一等 provider（通过本机 CLI 登录接入，不复制凭据）。因此 OpenBot 与 adopt 条目是“宿主层 vs 执行层”的关系，不是替代关系；采用 Claude Code 的做法不需要因此改变，但可借用 OpenBot 的“每 agent 独立工作区 + 队列 + 委派”来组织多个 Claude Code 会话。
- 与 **Cline（watch）、Cursor（watch）**：同样是被聚合的 provider（`cline --acp`、`cursor-agent acp`），且 README 说明 Cursor 与 Cline 的 agent 只留在本机、团队成员看不到——这提示多智能体编排里的“可见性边界”是一个需要显式设计的东西。
- 与 **OpenCode（watch）**：作为 provider 被下载并固定版本，免费模型无需登录；其 Go key 在本机加密后只交给本地 CLI。
- 清单中没有关于“多智能体任务队列 / 频道委派 / 版本化本地技能”的其他条目，这部分是 OpenBot 独有的可借鉴点。

## 证据与局限

**原文给出的可核查内容**：具体安装命令（macOS/Windows/Linux AppImage、Docker、自托管脚本、Nix flake）、provider 接入方式与环境变量名、技能文件结构与工具名（`create_skill`/`list_local_skills`/`read_local_skill`/`revise_skill`/`install_local_skill`）、`example-prompt` frontmatter 示例与 1000 字符上限、开发命令清单与各自行为、仓库有 CI 徽章、1649 stars（当日 +176）。

**只是作者主张、无数据支撑**：所有“能力”都是功能列表，没有案例、没有前后对比、没有基准或用户反馈；“persistent AI teammates”“agent-to-agent collaboration”这类表述没有附带可核查的产出证据。

**明确写出的适用条件与风险**：
- development preview；agent 以 `danger-full-access` + `approvalPolicy: never` 运行，可读改文件、执行命令、联网、控制浏览器，首次同意后无逐动作确认。作者要求“只运行你信任的 agent 与任务、做好备份”。
- 许可证 PolyForm Noncommercial 1.0.0，商用受限；Nix 安装还要求 nixpkgs 允许 unfree。
- “local-first, not offline-only”：Codex/Claude/Grok/Gemini/Cursor/Cline 各自连各自服务，访问的页面走网络，插件可能连第三方。
- 平台限制：远程桌面仅 Linux x64 的 X11（Xorg/Xvfb），Wayland 不支持，arm64 AppImage 不含该功能；Gemini 登录需要桌面浏览器与 `xdg-utils`，无桌面的服务器无法完成；Nix 包在 Linux 上不含远程桌面运行时。
- Windows 发布签名主体与旧版本未签名、SmartScreen 可能告警，需核对校验和或构建证明。
- 本次抓取在 Commands 表格中途被截断（止于 `bun run dev:cpu` 段落中断处），表格后半与后续章节内容不可见，故对“routines 触发方式”“任务效果评估”等只能按已知部分判断，不能断言原文没有。

**结论性局限**：这是一份产品 README，不是工作方法文档。它能支撑“这套编排结构长什么样”，不能支撑“这样用 AI 结果更好”。

## 怎么试、怎么验证

**最小试用（隔离优先）**
1. 在一次性虚拟机或专用机器上用 Docker 方式启动（见“具体做法”第 2 步），只挂载一次性测试目录与测试仓库，不挂载个人主目录，不使用生产凭据/密钥。
2. 接两个 provider（例如 Codex + Claude Code），建立两个独立工作区，一个做实现、一个做审查。
3. 选一个可度量的小编码任务（如修一个已知 bug 或加一个带测试的小功能），把它拆成“实现 → 审查 → 修订”三条队列消息，用频道里唯一任务负责人 + Reassign 完成换手，全程手动记录人工介入点。
4. 对照组：同一任务、同一模型，用单会话一次性完成（不拆 agent、不排队）。
5. 收尾时把它跑通的流程用 `create_skill` 固化成技能，再跑第二个同类任务，看是否减少重述。

**判断有没有改善的指标（全部可人工记录，不依赖产品自带统计）**
- 端到端完成时间；人工介入次数与时长；Reassign / Stop 次数（返工代理指标）。
- 最终 diff 中被人工改写的行数占比；测试通过率；是否引入需要回滚的破坏性改动。
- 上下文是否因长对话被迫重启会话（对应其自动压缩机制是否真的减少了中断）。
- 第二个同类任务相对第一个任务的重述字数与启动耗时（技能复用是否真的省事）。
- 安全侧：试用期间发生的非预期文件改动/网络访问次数——考虑到默认全权限，这一项是硬性否决指标。
- 工程侧可用 `bun run dev:cpu` 做改前改后 CPU 对比，但它只说明应用开销，不作为任务效果证据。

**判定规则（建议事先写死）**：若“人工介入次数”与“diff 改写占比”相对单会话基线没有下降，或出现任何一次非预期文件/网络行为，则维持 study，只保留其四个机制（独立工作区、FIFO 队列、频道显式委派、版本化技能）作为设计参考。
