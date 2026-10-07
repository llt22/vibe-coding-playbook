# 让有写权限的 AI 先出草案、过审批、留还原点

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：当 AI 从只读审计走向能改账户、改代码、调外部服务时，用默认只读、草案门控、按任务授权、延后批量审批和核准前还原点，把「答案不准」挡在「账户/仓库被动了」之前。
> 先试这一步：先在最不重要的一个小仓库上跑通 ai-meeting-room 的「Claude 只读规划 → Codex 列工作卡 → 逐张核准（自动存 git 还原点）→ Codex 在 workspace-write 下执行 → Claude 复审」闭环；若管的是付费媒体账户，则先跑一遍 `/ads setup → /ads audit → /ads report → /ads next` 只读审计。
> 最近修订：2026-10-08

## 解决什么问题

付费媒体账户、外部服务账号、本地代码仓库都是真金白银或真实代码的操作面。AI 在只读状态下做审计、计划、创意、报告没问题；一旦它能直接改账户、调用外部服务或写代码，风险就从「答案不准」升级成「账户/仓库被动了」。这篇手册给三件事：一是默认只读、产出带证据的结论，账户变更先出草案再逐条过门控（以 AgriciDaniel/claude-ads 作为可照搬的落地模板）；二是把权限模型换成更省人的一种——不再预先给 AI 挂上所有服务、也不卡在第一步等人点确认，而是默认零权限、按当次任务只引入单个具体资源，有副作用的动作先在本地模拟结果让 agent 继续推进，人稍后一次性批量批准或逐条批准（以 Cloudflare OS 的 Gatekeeper 作为可本地体验的实现）；三是在本地代码仓库里用两个 CLI 分工——Claude 只读规划与复审，Codex 只在你逐张核准工作卡后于 `--sandbox workspace-write` 下写卡上明列的文件，核准前自动存 git 还原点，越界就停下并还原（以 sojei1989/ai-meeting-room 作为可照做的本机流程）。

## 适用与不适用

**适用：**

- 你管的是付费媒体账户。覆盖 12 个平台，搜索/视频/社交：Google Ads、Meta Ads、YouTube Ads、LinkedIn Ads、TikTok Ads、Microsoft Advertising、Reddit Ads、Snapchat Ads、X Ads；商务与零售媒体：Apple Ads、Amazon Ads、Pinterest Ads。
- 手上有可授权的账户导出或读取权限。
- 你用的宿主是 Claude Code（claude-ads 原文把它作为规范运行时），或能在其他兼容 Agent Skills 的宿主里消费同一批 skill 文件。
- 你要的是「AI 起草 + 人工审批 + 确定性验证」，或更进一步「默认零权限 + 按任务授权 + 延后批量审批」，或「双 CLI 分工 + 工作卡核准 + 沙箱执行 + 还原点」，而不是「AI 直接改账户/仓库」或「预先全开权限」。
- 你能接受默认只读、写操作逐条过门控的节奏。
- 你还想把这套权限与审批模式移植到通用 agent 工作流（GitHub repo、Google Doc、Slack 等外部服务）：Cloudflare OS 的 Gatekeeper 是可直接本地体验的来源。
- 你有 macOS、Node.js 20 以上、Git，并且已经用自己账号登录了 `claude` 与 `codex` 指令；想用本机网页界面跑双 AI 协作。
- 你能接受 ai-meeting-room 的现状：只支持 macOS、界面繁体中文、目前只有 Claude（规划）+ Codex（执行）两位成员，Gemini CLI 等是后续方向。

**不适用：**

- 非付费媒体账户运营。claude-ads 这个仓库领域很窄。
- 需要 AI 立即自动改账户、无人审批的场景。原文的设计就要求 owner 审批、幂等键与回滚。
- 装不了 Claude Code 插件、也不能消费 skill 文件的宿主。原文只在安装一节把 Cursor、goose 归类为 watch 级：它们「在其运行时支持范围内」可消费同一批 skill 文件，但没有给出任何针对这两个宿主的具体步骤或适配说明。
- 需要核验评分与门控实现细节的场景。claude-ads 的本次材料只有 README 首页，看不到各 skill 的实际提示词、scoring.py 实现、capability manifest 明细。
- 想把 Cloudflare OS 当生产平台上线：它处于 early access、当前是 v2、自建服务器部署文档标注 COMING SOON、无 SLA。
- 想改造 Cloudflare OS 上游：仓库不接受外部大改动贡献，超过十几行的 PR 会被关闭（只收可轻易验证的小修复）。
- 非 macOS、没有 Node.js 20 以上或 Git、或不愿意用本机网页界面跑 ai-meeting-room 的场景。
- 想让会议室被路由器转发或公开反向代理访问：原文明确不要，也不要把监听位址改成 `0.0.0.0`。
- 需要 AI 直接产图：ai-meeting-room 里 Claude 和 Codex 都不产图，需要素材时改成开「等你交件」卡由人交付。
- 需要量化效果数据来决定是否采用：ai-meeting-room 原文没有 benchmark、用户案例或量化结果。

## 前置条件

- 运行时会话：Claude Code。要落到其他独立宿主，需在安装时显式指定 target。
- 托管依赖支持 CPython 3.11 和 3.12，且限于声明的 Linux/macOS/Windows wheel 矩阵；不支持的解释器会在改动目标位置之前失败。`--no-deps` / `-NoDeps` 用于只装 skill。
- 浏览器抓取需要操作员自行安装 Playwright 浏览器 payload。
- PDF 渲染需要宿主的 WeasyPrint 和 Pango 系统库（见 `control-plane/manifests/external-runtime-dependencies.json`）。
- 账户侧要有 client / account / KPI / privacy / guardrail 档案，由 `/ads setup` 建。
- 凭证必须放环境变量、OS keychain 或经批准的 secret manager，不得进入仓库、profile、报告或日志。
- 写操作另需：capability、账户与对象 ID、before/after diff 与 blast radius、审批上限、幂等键、审计目的地、回滚、验证窗口。
- 想本地体验 Cloudflare OS：需要安装 pnpm（原文未给出 Node 版本要求）；本地数据存在 `.wrangler` 子目录。
- 想部署到自己的 Cloudflare 账号：需要自己的 Cloudflare 账号。
- 想接入外部服务：多数 Gatekeeper 需要各自的服务配置，包括自行申请该服务的 OAuth client 凭据；Gatekeeper 服务独立部署的细节「尚未确定」，目前只能与 OS 实例一起部署。
- 想跑 ai-meeting-room：macOS；Node.js 20 以上；Git；已用自己账号登录的 `claude` 与 `codex` 指令。
- 首次启动 ai-meeting-room 的设定精灵会问三件事：项目放在哪个文件夹、要不要开手机入口（可留空）、会议室的登录密码。
- ai-meeting-room 可选输入：`.secrets/telegram-token.txt` 与 `.secrets/telegram-chat-id.txt`（Telegram 推播）；`.secrets/gemini-api-key.txt`（白话解释用 Gemini）；需要图片素材时按卡片规格交件。

## 操作步骤

下面分成三套做法。做法 A 是付费媒体账户的具体落地：默认只读，写操作逐条同步过门控。做法 B 是可迁移的权限与审批模式：默认零权限，按任务只引入单个资源，有副作用的动作延后批量审批。做法 C 是本地代码仓库的双 AI 协作：Claude 只读规划与复审，Codex 只在你逐张核准工作卡后于沙箱内执行，核准前自动存 git 还原点。三者不冲突，可以叠加——用 A 的审计与门控管账户，用 B 的授权与审批节奏减少人的同步盯守，用 C 的沙箱与还原点夹住代码写入。

### 做法 A：付费媒体账户（claude-ads）——默认只读、写操作逐条过门控

**1. 安装**

原文明确要求：优先使用宿主原生插件流程，或带 SHA-256 校验的 tagged release 归档；不要把远程安装脚本直接管道进 shell。

插件路线（在 Claude Code 里就用这条）：

```text
/plugin marketplace add agricidaniel/claude-ads
/plugin install claude-ads@ai-marketing-hub-claude-ads
```

若在 v2.0.0 之前加过该 marketplace，本地别名是陈旧的 `agricidaniel-claude-ads`，先移除再加：

```text
/plugin marketplace remove agricidaniel-claude-ads
/plugin marketplace add agricidaniel/claude-ads
/plugin install claude-ads@ai-marketing-hub-claude-ads
```

本地克隆路线（需要先审代码、或走带 SHA-256 校验的本地归档时用这条）：

```bash
git clone https://github.com/AgriciDaniel/claude-ads.git
cd claude-ads
bash install.sh --source=local
```

显式选择其他独立宿主：

```bash
bash install.sh --target=codex --source=local
bash install.sh --target=gemini --source=local --no-deps
```

PowerShell 使用同一套托管归属模型：

```powershell
git clone https://github.com/AgriciDaniel/claude-ads.git
Set-Location claude-ads
.\install.ps1 -Source local
```

两条路线怎么选：在 Claude Code 里跑就用插件路线；需要本地审查代码、或使用带 SHA-256 校验的 tagged release 归档时用本地克隆路线。预期结果：skill 文件落到宿主，`/ads` 或 `/claude-ads:ads` 命名空间加载同一份契约。

**2. 先建档**

```text
/ads setup
```

前提：已有授权导出或账户读取权限。预期结果：客户、账户、KPI、隐私与护栏档案建立完成——这是后面所有审计与报告的条件供给。

**3. 跑一次只读审计**

```text
/ads audit [all|platform|scope]
```

平台快捷方式：`/ads google`、`/ads meta`、`/ads amazon`、`/ads reddit` 会路由到对应平台审计。

预期结果：审计结果带日期证据（dated evidence）和显式置信度。这一步不触碰账户。

**4. 出报告、看阻塞项**

```text
/ads report
/ads next
```

`/ads report` 渲染已验证的 JSON run bundle；`/ads status` / `/ads next` 显示当前状态与最高优先级阻塞项。规范结果是版本化 JSON，Markdown、HTML、PDF 都只是同一个已验证 run bundle 的渲染。

其余命令：

```text
/ads plan
/ads create
/ads experiment
/ads monitor
/ads research refresh
/ads validate
/ads status
```

`/ads research refresh` 刷新平台、政策、API、基准和生态证据；`/ads validate` 校验 contracts、runs、capabilities、maturity 或 release readiness。

**5. 要改动时，只让它出草案**

```text
/ads launch --draft
/ads optimize --draft
```

预期结果：起草账户变更计划，但不动账户。

**6. 真正落地前，逐条满足六项门控（这是做法 A 的同步节奏）**

要真正落地，必须逐条满足以下六项（原文顺序）：

1. 针对**精确操作**要有已测试并启用的 capability。
2. 明确的账户和对象 ID。
3. 人类可读的 before/after diff，含 blast radius。
4. 在账户定义的上限内由 owner 审批。
5. 幂等键、审计目的地、回滚、验证窗口。
6. 验证远端状态仍匹配变更前置条件。

缺少 ceilings 即等于禁止写入；v2 不支持永久删除。注意：这是「人看过 diff 才放行」的同步逐条审批。另一种节奏（先模拟、后批量批准）见第 13 步。

**7. 按规则判读评分**

控件结果只有 `pass`、`fail`、`unknown`、`not_applicable` 四种。

- 健康度（health）、证据覆盖率（evidence coverage）、监管暴露（regulatory exposure）、机会（opportunities）彼此独立。
- unknown 控件只降低证据覆盖率，不改变已确定的健康度。
- 覆盖率 ≥80% 可评级，60–79% 为暂定（provisional），低于 60% 证据不足。
- optional、beta、premium、unavailable、ineligible 的功能不计分。
- 平台 profile 被禁用或未批准时不产出健康分。
- 某平台失败会被排除出组合评分，并使该次 run 变为 partial。

**8.（可选）自建或验证实现**

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install --no-deps -e .
.venv/bin/python -m pip install --require-hashes --only-binary=:all: -r requirements.lock
.venv/bin/python -m pip install --require-hashes --only-binary=:all: -r requirements-dev.lock
.venv/bin/python -m pip install --require-hashes --only-binary=:all: -r .github/requirements-schema-tests.lock
.venv/bin/python -m pip check
.venv/bin/python -m pytest -q
```

```bash
python -m claude_ads_core --version
python -m claude_ads_core validate finding path/to/finding.json
bash -n install.sh uninstall.sh
```

预期结果：依赖装齐、`pip check` 无冲突、单测通过、版本与 finding 校验可跑。

**9. 卸载**

```bash
bash uninstall.sh --target=claude
```

PowerShell 对应 `uninstall.ps1`。预期结果：只删 manifest 拥有的文件。

### 做法 B：Cloudflare OS Gatekeeper——按任务引入资源 + 有副作用动作延后批量审批

**10. 本地跑起来（不用于生产，数据存在 `.wrangler` 子目录）**

```bash
pnpm run-local
```

然后访问 http://localhost:8787 。预期结果：看到预载公司运作知识的 agent 对话界面，可以直接派任务。

**11. 用官方给的提示词验证能力边界**（原文原样给出）

```
Make slides for my upcoming meeting with a customer.
```

（会使用内置 slides blueprint）

```
Make a collaborative whiteboard app.
```

（从零创建新应用）

```
Make a tic tac toe game.
I'll be X and you be O. I've made my first move. Your turn.
```

```
Make an issue dashboard for this GitHub repo.
```

（需附加一个 repo，且需先配置 GitHub 集成）

```
Fix the typos in this Google Doc.
```

（需附加一个 doc，且需先配置 Google 集成）

**12. 按任务引入具体资源，而不是预先挂上所有服务**

Cloudflare OS 的做法：每个 agent 和 Gadget 默认零权限，必须按当次任务把具体资源「介绍」给它（粘贴链接，或点 add resource 选择）；agent 也可以主动请求引入某资源，由你批或拒。Gatekeeper 侧负责：包装原生 API、处理 OAuth、把访问限定到用户指定的那一个资源、记录全部动作、对有副作用的动作提供人工批准。

预期结果：这个 agent 或 Gadget 只拿到本次任务需要的那一个资源，其余一律不可见。

**13. 有副作用的动作：先模拟、后批量批准**

agent 触发需批准的动作时，Gatekeeper 在本地模拟该动作结果，告诉 agent 已完成、读回时也给模拟结果，于是 agent 可以继续排队后续动作；等它做完，你再一次性批量批准或逐条批准，不必盯着屏幕同步点确认。原文认为这优于两种常见做法：卡在第一步等人点确认，或者干脆开 `--dangerously-skip-permissions` 自动放行。

预期结果：你离开一段时间回来，agent 已经基于模拟结果推进了后续步骤，而不是停在第一步。

**14. 接入外部服务前，读对应 gatekeeper 包的配置说明，并自行申请该服务的 OAuth client 凭据**

```
packages/gatekeeper-github/README.md
packages/gatekeeper-google/README.md
packages/gatekeeper-cloudflare/README.md
packages/gatekeeper-supabase/README.md
packages/gatekeeper-notion/README.md
packages/gatekeeper-confluence/README.md
packages/gatekeeper-email/README.md
packages/gatekeeper-homeassistant/README.md
packages/gatekeeper-slack/README.md
packages/gatekeeper-spotify/README.md
packages/gatekeeper-zoominfo/README.md
```

注意：原文只给了这些路径，没有给出任何一条 gatekeeper 的具体 OAuth 配置步骤，要照做必须打开对应文件；原文也提醒服务商通常不为非开发者简化这件事。

**15.（可选）开发模式与部署**

开发模式（两个终端）：

```bash
pnpm dev-server
pnpm dev-client
```

访问 http://localhost:3000 。

部署到自己的 Cloudflare 账号走 https://os.cloudflare.app/deploy ；要带自己的 gatekeeper 或改代码，用部署模板仓库 https://github.com/cloudflare/cloudflare-os-starter 。自建服务器部署原文标注 COMING SOON，目前需要自己读 workerd 配置文档（https://github.com/cloudflare/workerd/blob/main/src/workerd/server/workerd.capnp ）或让 agent 去读。

### 做法 C：本地代码仓库（ai-meeting-room）——双 AI 只读规划 + 工作卡核准 + 沙箱执行 + 核准前 git 还原点

**16. 安装并启动（前提：macOS；Node.js 20 以上；Git；已用自己账号登录的 `claude` 与 `codex` 指令）**

1. 从 GitHub 页面 Code > Download ZIP 或 Releases 下载压缩档，解压到习惯放工具的位置。
2. 在 Finder 双击 `start.command`。若 macOS 提示无法打开，右键选「打开」，或到「系统设定 > 隐私权与安全性」按「强制打开」。
3. 首次启动的设定精灵会问三件事：项目放在哪个文件夹、要不要开手机入口（可留空）、会议室的登录密码。
4. 设定完成后浏览器自动打开 `http://127.0.0.1:4477`，输入密码进入。
5. 想用终端机：进到会议室文件夹执行 `npm start`；要关掉按 `Control + C`。
6. 检查画面左下角「环境检查」：`claude` 和 `codex` 都显示版本号就没问题；上方「模型状态」会列出侦测到的模型，未验证或本次未提供的模型会被标示原因并禁止选用。

**17. 跑一场会议（可直接照做的操作顺序）**

1. 用白话写下想做什么，按「开始会议」。
2. 等 Claude 出规划、方案选项、风险（全程只能读）。
3. 等 Codex 回报可行性、要改哪些文件，并列出操作清单。
4. 在左栏选方案。
5. 在右栏一张一张核准或拒绝。风险分级照原文：低风险＝只新增文件或改样式；中风险＝会动到现有功能；高风险＝删档、装套件、部署。
6. 卡片两张以上时，栏位标题会出现「核准全部低风险」和「核准全部」；按一下会变成「确定？再按一次」，再按才开跑。批次是一张接一张做，每张照样先存还原点；中途一张失败就停下来，后面的留在待处理。
7. 全部做完 Claude 再审查一次。
8. 按「结束并产出决议」，存成 `meetings/` 里的 markdown。

会议中可随时插话（Enter 送出，Shift + Enter 换行），送出前要选这句话给谁：

- Claude（策划者）：问方向、改需求、要他重新规划
- Codex（执行者）：问项目的事、要他多做或改做某件事；若这句话代表要多做操作，右栏会自动长出新的待核准卡片
- 只记录，不询问：只留一句话在会议纪录里，不呼叫任何 AI

AI 正在跑的时候发言框会暂时锁住，跑完自动解开。

**18. 权限与还原机制（这套工具最值得抄的部分）**

| 阶段 | Claude | Codex |
|---|---|---|
| 讨论中 | 只能读 | 只能读（`--sandbox read-only`） |
| 待核准 | 只能读 | 只能读 |
| 你按核准后 | 只能读 | 可写（`--sandbox workspace-write`） |

配套规则：

- 每次核准前自动存一个 git 还原点，右下角「回到执行前」可一键回复。
- Codex 越界写未列出的文件时会停下来并还原本次变更。
- 项目夹没有 git 时，第一次执行会自动建立版本控制（夹标旁绿色 `GIT` 表示还原点可正常运作）。
- 不要设定路由器转发或公开反向代理，也不要把监听位址改成 `0.0.0.0`。会议室只监听本机 `127.0.0.1`；手机入口只接受 Tailscale 网段（100.64.0.0/10），填错会直接不开放。
- 登录密码存在本机 `.secrets/passcode.txt`，不出现在画面、log 或会议纪录；登录八小时后、按登出、或服务器重启后都要重新登录；只关分页不会立刻撤销登录。
- 附件或交件档若是 HTML、SVG 这类会执行程序的档案，一律改成下载，不在会议室里直接打开。

**19. 模型自动跟进与费用护栏**

原文描述的机制（不用改程序）：

- 会议室启动时、每次 AI 开工前（最多每 5 分钟一次）比对 `claude` 和 `codex` 的版本；版本变了，或 Codex 的模型清单超过一小时，就自动重新侦测。闲置时每 30 分钟也看一次。
- CLI 新列出的模型会出现在设定里，标成「待你开放」；按「开放」才会被使用，避免不知情下换成更贵的模型；不想用了可以「收回」。
- 选定的模型若本次未提供（例如官方下架），会暂时改用最接近、且不比原本高阶（不会更贵）的模型，设定区与会议纪录都会写明换成了什么；原模型恢复后自动换回，设定不会被改。若剩下的模型都比原本高阶，会停下来请你在设定里选，不会自己升级。
- Codex 执行时若回报模型不能用，会立刻重新侦测。唯读的讨论会自动换模型重试一次；会改档的工单不会自动重跑，改成提示你按「重试」。

**20. 通知、远程与交件**

- 三个时刻会响一声：AI 跑完一轮、有新的事需要你决定、素材做好了等你看。右下角「提示音」可关。音档放在 `public/assets/sfx/yes-my-lord.mp3`，想换声音用同名档案盖掉。
- Telegram 推播（需要你决定、Codex 做完一张卡、出错三个时刻）只要两个档案，放在 `.secrets/`：

```
.secrets/telegram-token.txt     BotFather 給你的 bot token
.secrets/telegram-chat-id.txt   你自己的 chat id（純數字）
```

存好后重启服务器，启动讯息会显示「Telegram 通知：已启用」；页尾「测试通知」可立刻试收一则。

- 需要图片素材时 Claude 和 Codex 都不产图，右栏会出现「等你交件」卡片，写清尺寸、格式、数量、档名和存放路径；卡片建立时会先准备好收件资料夹。可「开启资料夹」「把档案拖到这里」（单档上限 25MB，同名档不会被覆盖）「复制产图工单」；自己放好后按「我自己放好了」，确认档案存在才让 Codex 接手。

**21. 看不懂时的白话解释（含降级链）**

每则讯息下面有「用白话解释」，翻成不含技术词汇的中文，程序码收在「展开技术细节」里。翻译顺序是 Ollama（本机、免费）→ Gemini → Claude，前面连不上、逾时或没回东西就自动往后退，白话版最后一行会写是谁翻的。

- 想跳过 Ollama：把 `config.json` 的 `explainBy` 改成 `gemini`；全交给 Claude 就改成 `claude`。
- Ollama：`config.json` 的 `ollama.url` 填位址，例如 `http://100.x.x.x:11434`；`model` 留空就用第一个模型。装在另一台电脑时，把那台的 `OLLAMA_HOST` 设成它自己的 Tailscale IP，不要设成 `0.0.0.0`。
- Gemini：到 Google AI Studio 建一把金钥，存成 `.secrets/gemini-api-key.txt`（一行，只有金钥本身）。服务器只在启动 `gemini` 时把它当环境变数传入。没有金钥时自动退回 Claude。

**22. 出问题时的处理**

- 画面显示「连线中断」：服务器关掉了，重新双击 `start.command`。
- 被送回登录页：登录逾时、已登出或服务器刚重启，重新输密码。
- 显示错误次数过多：依登录页显示的时间等待，期间即使密码正确也不放行。
- 手机网址打不开：看启动视窗写的原因，确认 Mac 的 Tailscale 已连线；本机仍可用 `http://127.0.0.1:4477`。
- Claude 或 Codex 没回应：按「环境检查」，通常是登录过期，在终端机执行一次 `claude` 或 `codex` 重新登录。
- 还原点建不起来、说 .git 被锁住：在项目资料夹执行

```
rm -f .git/*.lock .git/objects/maintenance.lock
```

再按一次核准。

- 回覆格式跑掉：画面会直接显示原始回覆，不会当掉。
- CLI 改版导致参数失效：改 `config.json` 里的 `args`，不用动程序码。

**23.（可选）想改程序或自建时**

- 改画面（`public/index.html`）重新整理浏览器就好；改 `server/` 或 `config.json` 要按左下角「重新启动」。
- `npm run dev` 会在程式变动时自动重启，但执行核准工作时不要用，监视器会把 Codex 执行到一半的工作砍掉。
- 测试：

```
node --test test/*.test.js
```

- 可用模型由 `codex debug models` 和 `claude --help` 即时侦测（`server/model-discovery.js`）；`server/model-config.js` 只放已知模型的中文名称、说明和高低排序。
- 工单的模型上限依「Astra > Sol > Terra > Luna，同家族比版本」判断；不认得的新家族一律当成最高档，思考深度也一样。
- 打包 Mac 版：

```
node scripts/build-release.mjs --platform mac --out dist/ai-meeting-room-mac.zip
```

**怎么选（做法 A / 做法 B / 做法 C）：**

- 账户写操作、不可逆或 blast radius 大的动作：走做法 A 第 6 步，逐条同步确认。六项门控是硬约束，缺 ceilings 即禁止写入，v2 不支持永久删除。
- 可模拟、可回滚、需要连续推进的动作：走做法 B 第 13 步，先本地模拟让 agent 排队推进，人离线，回来批量批准。
- 本地代码仓库的改动：走做法 C。它把「谁能写、写哪些文件、核准前存还原点、越界就还原」夹住；Claude 全程只读规划与复审，Codex 只在核准后 `workspace-write` 执行工作卡明列的文件。比 A 更省去逐条 diff 门控的配置，比 B 多了 git 还原点；但只支持 macOS、界面繁体中文、当前只有 Claude+Codex 两位成员。
- 只读审计与报告：两者都不触碰目标，直接按做法 A 第 2–4 步做；想验证权限链路，再用做法 B 第 10–13 步本地跑一遍，或用做法 C 第 16–18 步在小仓库上跑一轮。
- 差异要认清：做法 A 是「人看过 diff 才放行」的同步审批；做法 B 是「先给 agent 模拟结果、人稍后批量裁决」的异步审批；做法 C 是「逐张工作卡同步核准 + 核准前 git 还原点 + 沙箱执行」的同步审批，但把回滚做成一键，并用风险分级减少逐条 diff 的负担。原文对异步审批只给主张，没有效果数据；ai-meeting-room 也没有量化效果数据。

## 怎么判断变好了

三份材料都没有给准确率、节省工时、误报/漏报率这类结果数据，所以只能看过程信号：

claude-ads 侧：

- 审计 run 产出的 findings 是否带日期证据和显式置信度。
- 报告是否为版本化 JSON run bundle，MD/HTML/PDF 是否同源渲染。
- 证据覆盖率是否 ≥80%（可评级）；60–79% 只能算暂定；低于 60% 视为证据不足，别急着下结论。
- `/ads status` / `/ads next` 是否稳定给出当前状态和最高优先级阻塞项。
- 写操作是否一直停在草案，直到六项门控齐备才放行。
- 发布侧四条硬规则是否被守住：无来源即无平台主张；无实现+fixture+测试即无 capability 主张；无审批与回滚即无账户变更；无独立验证即无发布。

Cloudflare OS 侧：

- 从下提示词到拿到可用产出，需要你中途介入几次；接入真实资源后是否仍需同步守着点确认。
- 审批能否真的延后批量完成：你离开一段时间后回来，agent 是否已经基于模拟结果继续推进了后续步骤，而不是卡在第一步。
- Gatekeeper 日志能否让你复盘 agent 对外的每一个动作、以及它被限定在了哪个具体资源上——这正是「最小权限 + 可审计」是否落地的检验。
- 同一任务换通用编码 agent 跑一次，对比 token 消耗、失败次数与返工量。原文声称同一底层模型在该平台上更快更好、token 更少，这是作者主张，需自行验证。

ai-meeting-room 侧：

- 会议结束后是否产出 `meetings/` 里的 markdown 决议。
- 每次核准前是否成功存 git 还原点，夹标旁绿色 `GIT` 是否表示还原点可正常运作；按「回到执行前」能否一键回复。
- Codex 是否只写工作卡明列的文件；越界时是否停下来并还原本次变更。
- 风险分级是否合理：低=只新增文件或改样式；中=会动到现有功能；高=删档、装套件、部署。
- 模型被替换时，设定区与会议纪录是否写明换成了什么；原模型恢复后是否自动换回，设定未被改。
- 唯读讨论失败是否自动换模型重试一次；会改档的工单是否不自动重跑、提示人按「重试」。
- 程序侧 `node --test test/*.test.js` 是否通过；环境检查是否显示 `claude` 和 `codex` 版本号。

**最小试用方式：** claude-ads 侧全程只读、不触碰账户，只挑一个广告平台，依次跑 `/ads setup` → `/ads audit` → `/ads report` → `/ads next`，看它能不能给出带证据和置信度的 findings，以及 next 指出的阻塞项是否合理。Cloudflare OS 侧：装好 pnpm → `pnpm run-local` → 打开 http://localhost:8787 → 跑「做 slides」和「建协作白板应用」两条提示词 → 再配置一个真实资源（GitHub repo 或 Google Doc 选一个），走完「引入资源 → agent 请求权限 → 审批队列 → 批量批准」的完整链路。ai-meeting-room 侧：在一个无关紧要的小仓库上，下载解压 → 双击 `start.command` → 完成设定精灵 → 浏览器打开 `http://127.0.0.1:4477` → 用白话提一个小改动 → 等 Claude 规划、Codex 列卡 → 逐张核准（注意先存还原点）→ 看 Codex 是否只写列出的文件 → 按「回到执行前」验证回滚 → 结束并产出决议。

**试多久：** claude-ads 的材料在「怎么试」一节被截断，没有给出建议时长。Cloudflare OS 原文建议最小试用控制在半天内。ai-meeting-room 原文没有给出建议时长；建议至少跑通一轮完整会议，并故意制造一次越界或失败，看还原与重试行为是否符合预期。合起来的建议：单平台只读一轮，加半天本地权限链路验证，再决定要不要扩到更多平台或更多服务。调研结论本身的建议是「小范围试而非全面采用」。

## 常见坑

- 把远程安装脚本直接管道进 shell。原文明确不要；改用宿主原生插件流程，或带 SHA-256 校验的 tagged release 归档。
- 旧 marketplace 别名没清。v2.0.0 之前加过的话，本地别名 `agricidaniel-claude-ads` 是陈旧的，必须先 remove 再 add。
- 以为出了 diff 就能改账户。缺 ceilings 等于禁止写入；六条门控缺一不可；v2 不支持永久删除。
- 预先挂上一堆 MCP server、让所有服务在整个会话里都「在场」。Cloudflare OS 原文反对这种做法，改成默认零权限、按当次任务引入单个资源。
- 把所有有副作用的动作都卡在第一步同步等确认。原文认为不如「先模拟、后批量批准」，但前提是你能接受 agent 在模拟结果上继续推进。
- 用 `--dangerously-skip-permissions` 自动放行。原文把它列为异步审批要替代的另一种坏做法。
- 把 unknown 当扣分项。unknown 只降低证据覆盖率，不改变已确定的健康度。
- 覆盖率不够就下结论。低于 60% 是证据不足，60–79% 只是暂定。
- 把 partial run 当完整审计。某平台失败会被排除出组合评分并使该次 run 变为 partial；按原文的协作约定，必需的 worker 失败即让整次 run 变为 partial，绝不悄悄当成完整审计。
- 凭证乱放。必须放环境变量、OS keychain 或经批准的 secret manager，不得进入仓库、profile、报告或日志。接入外部服务时，OAuth client 凭据也要自备，别指望服务商简化流程。
- 把仓库自述当成已验证结果。见「证据与来源」。
- 指望监控自动触发。原文提到 `/ads monitor`（节奏、投放、追踪、疲劳、政策、表现），但没有给出定时器、事件或状态触发的具体机制；Cloudflare OS 原文也没有给出由时间、事件或状态触发并持续执行任务的机制，唯一相关的是审批异步化，那是「不中断」，不是「自动触发」。
- 以为 Cursor / goose 有现成适配。原文只把它们列为 watch 级，没有具体步骤或适配说明。
- 以为 12 个平台适配质量一致。本次材料无法判断各平台适配是实测通过还是仅有 fixture。
- 解释器不对。托管依赖只支持 CPython 3.11/3.12 且限于声明的 wheel 矩阵；不支持的解释器会在改动目标位置之前失败。
- 把 `pnpm run-local` 当生产环境。原文明确它不适用于生产，数据存在 `.wrangler` 子目录。
- 现在就把整套 Cloudflare OS 当生产平台上线。它处于 early access、自建服务器部署文档标注 COMING SOON、无 SLA。可直接拿走的是第 12、13 步的权限与审批模式，移植进你现有的 agent 工作流。
- 想改造 Cloudflare OS 上游。仓库不接受外部大改动贡献，超过十几行的 PR 会被关闭。
- 把 `0.0.0.0` 当方便。ai-meeting-room 原文明确不要设定路由器转发或公开反向代理，也不要把监听位址改成 `0.0.0.0`；手机入口只接受 Tailscale 网段（100.64.0.0/10），填错会直接不开放。
- 只关分页就以为登出了。登录八小时后、按登出、或服务器重启后都要重新登录；只关分页不会立刻撤销登录。
- 在会议室里直接打开 HTML、SVG 这类会执行程序的附件或交件档。原文明说一律改成下载。
- 用 `npm run dev` 跑核准工作。原文警告监视器会把 Codex 执行到一半的工作砍掉。
- 以为 Claude 或 Codex 会产图。需要图片素材时右栏会出现「等你交件」卡片，写清尺寸、格式、数量、档名和存放路径；单档上限 25MB，同名档不会被覆盖；自己放好后按「我自己放好了」，确认档案存在才让 Codex 接手。
- 把新模型自动升级。CLI 新列出的模型会标成「待你开放」，按「开放」才会被使用；选定模型若本次未提供，会暂时改用最接近且不比原本高阶（不会更贵）的模型，原模型恢复后自动换回，设定不会被改。若剩下的模型都比原本高阶，会停下来请你在设定里选，不会自己升级。
- 把唯读失败和写工单失败一视同仁。唯读讨论会自动换模型重试一次；会改档的工单不会自动重跑，改成提示你按「重试」。
- 把会议室的 git 锁当作死局。还原点建不起来、说 .git 被锁住时，在项目资料夹执行 `rm -f .git/*.lock .git/objects/maintenance.lock` 再按一次核准。
- 以为 ai-meeting-room 有量化效果数据。原文没有 benchmark、用户案例或量化结果；先在小仓库验证。

## 证据与来源

**依据三份材料：** AgriciDaniel/claude-ads 仓库 README 首页（版本号 v2.0.2）；cloudflare/cloudflare-os 仓库 README（当前是 v2，基于 v1 经验重写，定位 early access）；sojei1989/ai-meeting-room 仓库 README（Apache License 2.0，macOS 本机开源应用，作者自述是平面设计师、不写程序、工具是他自己每天在用的）。

**可以直接照抄的部分：**

- claude-ads：插件与脚本安装命令、`install.sh` / `install.ps1` / `uninstall.sh` 用法、完整命令表、12 平台清单、写操作六条门控、评分阈值（80%/60%）、release 四条硬规则、开发与校验命令；贡献者表列出带 issue/PR 编号的社区反馈（如 #65、#53、#17/#18、#56、#57、#61、#66 等），说明有真实使用与缺陷修复痕迹。
- Cloudflare OS：`pnpm run-local`、http://localhost:8787、五条官方提示词、11 个 gatekeeper 包路径清单、`pnpm dev-server` / `pnpm dev-client` 与 http://localhost:3000、部署入口与部署模板仓库、自建服务器部署标注 COMING SOON、OS 概念映射表（kernel=`packages/workshop-backend`、device drivers=`packages/gatekeeper-*`、shell=`packages/workshop-frontend`、processes=gadgets、executables=blueprints、ACLs=shared permissions）。
- ai-meeting-room：安装步骤（`start.command`、`npm start`、`http://127.0.0.1:4477`）、沙箱参数（`--sandbox read-only` / `--sandbox workspace-write`）、档案路径（`.secrets/passcode.txt`、`.secrets/telegram-token.txt`、`.secrets/telegram-chat-id.txt`、`.secrets/gemini-api-key.txt`、`public/assets/sfx/yes-my-lord.mp3`、`meetings/`）、风险分级、核准与还原规则、模型发现与费用护栏、白话解释降级链、测试命令 `node --test test/*.test.js`、打包命令 `node scripts/build-release.mjs --platform mac --out dist/ai-meeting-room-mac.zip`。

**只是作者主张、没有佐证的部分：**

- claude-ads README 全部为仓库自述。没有任何第三方评测、审计准确率、节省工时、误报/漏报率等结果数据；安全门控和 release 规则是作者设定的规则，未附验证结果；「确定性评分 / 确定性报告」也是自述，无对照数据。贡献者一节自己也声明「部分提案被独立实现或取代，署名不代表每个补丁都被合并」。
- Cloudflare OS：同等模型下该平台编码 agent 更快更好更省 token；沙箱让「slide 应用有安全漏洞泄露你的 slides 给攻击者」不可能发生；Blueprint 模式代表云软件传统作法的转变；传统操作系统「应当」对 AI agent 特殊对待。这些都无数据或第三方验证。仓库指标 10473 stars（当日 +84）只说明热度。
- ai-meeting-room：原文是 README 级别的作者自述系统设计与操作流程，没有 benchmark、用户案例或量化结果；可核对的事实性材料包括安装步骤、沙箱参数、档案路径、风险分级、核准与还原规则、模型发现与费用护栏、白话解释降级链、测试与打包命令，但「改善了多少」没有数据。

**材料本身的局限：**

- claude-ads：输入只有仓库 README 首页，不含各 skill 的实际提示词内容、`scoring.py` 实现、capability manifest 明细，因此无法核验评分与门控是否如其所述，也无法确认各平台适配是实测通过还是仅有 fixture；「怎么试、怎么验证」一节在材料中被截断，完整试用步骤无法从材料中得到。
- Cloudflare OS：没有给出任何一条 gatekeeper 的具体 OAuth 配置步骤（只有链接），且原文承认服务商有意不简化 OAuth 申请；自建服务器部署文档标注 COMING SOON；Gatekeeper 服务独立部署「细节尚未确定」，目前只能与 OS 实例一起部署；没有任何任务完成质量、耗时、成本的对照数据；原文也没有给出定时、事件或状态触发的自动推进机制。
- ai-meeting-room：只支持 macOS；界面是繁体中文；目前只有 Claude（规划）+ Codex（执行）两位成员，Gemini CLI 等是后续方向；原文没有给出「改善了多少」的量化数据。

**与已有工具做法的关系：** claude-ads 把 Claude Code 作为规范运行时，安装直接走 Claude Code 插件市场（`/plugin marketplace add`、`/plugin install`），本身是 Agent Skills 形态的实例（`ads/SKILL.md` 契约、`ads/`、`skills/`、`agents/` 目录结构，独立安装与插件命名空间 `/ads` 对 `/claude-ads:ads` 加载同一契约）；Cursor、goose 在原文里只列为 watch，仅说明可消费同一批 skill 文件。Cloudflare OS 的 Gatekeeper 原文自称「增强版 MCP server」，与「预先挂上所有 MCP server 让服务全程在场」相对；它也能跑在开源 `workerd` 上、不必绑定 Cloudflare 云，但这一点同样只有原文自述。ai-meeting-room 可以看作 Claude Code 的一种落地用法：让 Claude Code 只做只读的规划与复审，执行交给另一个 CLI（Codex），并用核准卡 + git 还原点把写权限夹住；它没有替代 Claude Code，而是补上了「谁执行、谁核准、怎么回滚、模型换代怎么办」这几层。

## 依据的调研

- [AgriciDaniel/claude-ads](../research/radar/2026-10-01/580-agricidaniel-claude-ads.md)：值得一试，可按 README 原样安装 Claude Code 插件，先在一个广告平台上跑只读审计（/ads setup → /ads audit → /ads report → /ads next），把它当作「AI 操作 + 权限门控 + 确定性验证」的落地模板照搬；理由是原文给出了可直接复制的安装命令、完整命令表、评分阈值和写操作六道门控，但适用面限于付费媒体、效果只有仓库自述，因此建议小范围试而非全面采用。
- [cloudflare/cloudflare-os](../research/radar/2026-10-04/1062-cloudflare-cloudflare-os.md)：值得一试，先在本地跑 `pnpm run-local` 体验，重点把 Gatekeeper 的「按任务引入资源 + 有副作用动作延后批量审批」这套权限流程抄到自己的 agent 工作里，不要照搬整套平台；理由是它仍是 early access、自部署文档未完成，但权限与审批的具体做法可立即小范围验证。
- [sojei1989/ai-meeting-room](../research/radar/2026-10-08/1867-sojei1989-ai-meeting-room.md)：值得一试，建议小范围试装这套「只读规划 + 核准后写入 + 核准前 git 还原点」的双 AI 协作流程，因为它把权限边界、风险分级和回滚都做成了可直接照做的配置；但它是作者个人项目、只支持 macOS、界面仅繁体中文，且没有效果数据，所以先在一个无关紧要的小仓库上验证再决定是否长期用。
