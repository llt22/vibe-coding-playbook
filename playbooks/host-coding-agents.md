# 把编码 agent 从「随手跑一次」变成「在可控边界里按项目规则反复跑」

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：本手册解决的是：如何把编码 agent 从本机一次性试用，变成有持久工作区、明确权限边界、项目级护栏、可核算成本、可回退的固定工作方式，并且能在换模型供应商时不必重做整套流程。
> 先试这一步：先在一个可回退的真实 Git 项目里只落地三样东西——短 CLAUDE.md、permissions 的 allow/ask/deny、一个 PostToolUse 格式化 hook——用 Plan mode 跑一次并记录人工介入时间；如果你在意「同一套流程换模型」，再在容器里用 pi 对同一任务做一次对照。
> 最近修订：2026-10-03

## 解决什么问题

本手册解决的是：把编码 agent（Claude Code / Codex CLI / OpenCode / goose / pi / agentbox 里的 agent）从「在本机随手跑一次」变成「在可控环境里、按项目规则反复跑」。要补八件事：工作区与文件持久化、权限与凭据边界、工具与扩展供给、项目级护栏（上下文供给 + 自动化触发）、按轮次的用量成本记录、「先只读规划、再放权编辑」的分工、「运行时/界面扩展面」的受控试点，以及「跨模型统一接口」——让同一套流程换供应商而不改上层。给出七条可照做的路径：做法 A 是在 Linux 服务器上自托管 agentbox 工作区；做法 B 是在非生产机器上装 goose，用 MCP 供给工具与权限；做法 C 是在单个真实项目里给 Claude Code 配 CLAUDE.md、allow/ask/deny 权限、hook、subagent、skill，并把主工作流固定成 Explore → Plan → Code → Verify → Commit；做法 D 是用 OpenCode 的 build/plan 双 agent 把「先只读规划、再放权编辑」固定成分工；做法 E 是在本机装 Codex CLI 并用 ChatGPT 账号登录，先跑通一次终端编码任务；做法 F 是在一次性项目里用实验开关试点 Claude Mods（function hooks），按验收矩阵检查后再决定是否留下；做法 G 是按 pi 的官方安装脚本装好 CLI，用 `/login` 接入模型，在容器边界内跑一个边界清晰的小任务，验证「同一套流程换 provider」是否成立。

## 适用与不适用

适用：
- 需要在服务器或非生产机器上把 Claude Code、Codex CLI 或通用 agent 跑起来，需要持久工作区、共享目录、Git 变更审查、按轮成本记录的人（做法 A / B）。
- 想用 MCP 给 agent 供给工具与权限，然后观察任务完成率与人工介入时间的人（做法 B / C）。
- 已经在单个真实项目里用 Claude Code，想照抄一份短 CLAUDE.md、权限白名单、PostToolUse hook、subagent 与 skill 定义，把「动作 → 校验」闭环固定下来的人（做法 C）。
- 需要先读懂陌生代码库、评估改动范围、再决定是否放权编辑，想用默认只读、bash 前询问权限的 plan agent 降低误改风险的人（做法 D）。
- 已有 ChatGPT Plus / Pro / Business / Edu / Enterprise 订阅之一，想在本机装官方编码 CLI、用账号登录跑通一次终端编码任务的人（做法 E）。
- 想在一次性项目、合成数据、无生产凭据的前提下，试点 Claude Code 的运行时/界面扩展面（Claude Mods / function hooks），并有一套验收矩阵和成本口径来判断是否留下的人（做法 F）。
- 想验证「同一套流程换模型供应商而不改上层」、需要把 agent 能力嵌进脚本/服务/其他应用（print/JSON、RPC、TypeScript SDK），并且愿意自己承担隔离边界的人（做法 G）。
- 能给出一台非生产机器或一个可回退的 Git 分支，愿意先小范围试用再扩大的人。

不适用：
- agentbox 只有 34 stars、稳定版 v0.1.7，原文自述存在 bypassPermissions 默认权限、凭据可被终端用户读取、单机单进程等硬约束，暂不适合直接作为通用方案推给不特定的人。
- goose 只有 README 级信息，供应商配置字段、权限设置、提示词、工作流步骤都没给，要照做必须查官方文档。
- claude-code-pro-course 只有 109 stars，README 是课程宣传页；install.sh、labs、starter-kit 的具体内容与任何效果数据都没有在原文中给出，不能直接判定为成熟可采用的成品。
- OpenCode 的 README 是入口文档：配置细节、模型接入、提示词、协作流程都在外部 opencode.ai/docs，本次未抓到，无法从本材料提炼可照做的配置；桌面版明确标注 BETA；输入元数据里的 211212 stars 量级异常、README 正文未提及，需自行核实。
- Codex CLI 抓取到的原文只有 README 首页（Quickstart、登录方式、文档链接），没有工作流示例、提示词样本、权限/沙箱/审批配置、性能或成本数据。
- Claude Mods 的原文自述是文档与源码审阅，不是实测 benchmark，也不是生产就绪证明；源码目录明确标注接口为 early access，API 可能不通知就变；文中命令是「源码记录的」，作者未声称在真实 Claude 会话中执行过。因此只适合受控试点，不适合直接采纳为生产依赖。
- pi 的 README 更接近宣传 + 仓库导览：extensions、skills、prompt templates、themes、packages、containerization、usage、cli、rpc、sdk 在原文里只是链接，正文没有内容，无法直接照抄步骤。
- pi 没有内置权限系统，不限制文件系统、进程、网络或凭证访问，默认以启动它的用户和进程权限运行；不做容器化隔离就不适合让它接触敏感文件、凭证或网络。
- pi 默认不含 sub-agents 和 plan mode；想开箱就有「先只读规划、再放权编辑」分工的人，应先看做法 D，或让 Pi 自己构建 / 装一个按你想要方式做的包。
- pi 的原文没有效果数据、案例细节、对比测试，也没有任何性能或质量数字；主动推进只有 pi-durable、chord、pi-chat 这些基础设施线索，原文没有给出任何时间/事件/状态触发的配置或步骤，这一条无法照做。
- 五条已有线索加 Claude Mods、pi 都没有给出「AI 是否让结果变好了」的对照评测方法或基准数据；Claude Mods 给出了验收矩阵与成本公式，但同样是作者提出的评估方法，不是 Anthropic 的计费公式。
- 涉密或受管环境要额外做安全审查与权限约束，不能直接照搬 `curl | bash` 类安装，也不能为了跑通 Claude Mods 示例而关掉组织托管保护；pi 的 pi-telemetry / pi-share-hf 会话导出等于把工作数据上传，需先确认合规。

## 前置条件

做法 A（agentbox）：
- 一台 Linux 服务器（x86_64 / arm64）+ systemd + 本地 Docker Engine。
- Ubuntu 22.04+ / Debian 12+：安装器会自动补装缺失依赖和 Docker；其他发行版需先自行装好 Python 3.9+、Git、curl、CA 证书、时区数据和本地 Docker Engine。
- SELinux 系统（如 Oracle Linux / RHEL）：若旧包启动报 `203/EXEC` / `Permission denied`，先按 `deploy/README.md` 的「SELinux 安装恢复」修复可执行文件标签再重试。
- 服务器用预编译包，不需要装 Go 和 Node。构建镜像需要能访问容器镜像仓库、Debian 包仓库和 npm。

做法 B（goose）：
- 本机可运行命令行且有安装软件的权限。
- 持有任一受支持供应商的 API key，或可用的 Claude / ChatGPT / Gemini 订阅。
- 有非生产环境可用（该 agent 会获得文件与命令执行能力）。

做法 C（Claude Code 项目级护栏）：
- macOS / Linux / WSL；Node.js + npm 或可执行 `curl`。
- 一个真实的 Git 项目，且当前改动可以回退（分支或干净工作区）。
- 能审阅从网络下载的安装脚本；受管环境改用 npm 安装或发行版打包。
- 一个非生产或可回退的环境；无人值守（`-p`、CI、`--dangerously-skip-permissions`）只在无生产访问的容器/沙箱里跑。

做法 D（OpenCode）：
- 能使用包管理器（brew / npm / scoop / choco / pacman / paru / mise / nix 等）的 macOS / Linux / Windows 开发机。
- 安装前先清掉 0.1.x 之前的旧版本（README 明确提示）。
- 安装脚本可用环境变量控制安装目录（仅对安装脚本生效）。

做法 E（Codex CLI）：
- Mac 或 Linux 或 Windows 机器。
- 若按 ChatGPT 订阅使用：需 Plus、Pro、Business、Edu 或 Enterprise 计划之一。
- 或改用 API key，但 README 明确说这需要 additional setup，不是零配置。
- 能执行安装脚本（curl / PowerShell）或包管理器（npm / brew）。
- 网络受限环境下需改用 GitHub Releases 或手动下载二进制。

做法 F（Claude Mods 受控试点）：
- 一次性项目、合成数据、无生产凭据。
- 已获批准的 Claude Code 安装，版本已知。
- 能设置实验开关 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`。
- 能生成并留存与当前安装匹配的类型声明（`/plugin-types`）。
- 有受控测试数据（合成金丝雀值）。
- 有组织托管配置的可见性；若组织提供了自己的 `prependPlugins` 列表，必须显式处理 `sec-default@builtin`。
- 有独立控制与回滚负责人，且禁用/重载 Mod 时该控制仍生效。

做法 G（pi 容器化试用）：
- Node.js 22.19 或更高版本（macOS / Linux / Windows 安装器可按需代装）。
- 一个非关键、有 git 版本控制、能随时回滚的仓库。
- 优先有容器环境：三种模式里 Plain Docker 起步最简单；若只能在宿主机跑，先确认目录内没有凭证文件。
- 一个模型订阅或 API key（在 Pi 内用 `/login` 接入）。
- 需要固定版本或可复现环境时，有可用的 Nix（支持 Linux 与 macOS 的 ARM64、x86-64）。
- 组织有数据外发限制时，先确认 `pi-telemetry` / `badlogic/pi-share-hf` 会话导出是否合规。

## 操作步骤

七条做法按环境选：要服务器、多人、持久工作区、共享目录、Git 审查、按轮用量成本记录，选做法 A；只有一台非生产机器、想要通用 agent 并愿意自己接 MCP，选做法 B；已经在单个真实项目里用 Claude Code、想把项目级规则和自动化触发固定下来，选做法 C；需要先读懂陌生代码库、要一个默认只读、bash 前询问权限的 plan 模式，选做法 D；已经用 ChatGPT 订阅、想在本机装官方 CLI 跑通一次终端编码任务，选做法 E；需要更深的运行时事件组合或受支持界面行为，且能满足一次性项目、合成数据、有回滚负责人等条件，才考虑做法 F；要在同一套流程里换模型供应商、准备把 agent 嵌进脚本或服务，并且愿意自己容器化隔离，选做法 G。做法 C 可以和 A 叠加：A 管服务器工作区与账号边界，C 管单个项目内的工具调用规则。做法 F 是做法 C 在 Claude Code 上的扩展面试点，不替代 Skills、MCP、经典 hook 或插件系统。做法 G 与它们不是替代关系：pi 提供的是「统一多提供商接口 + 可嵌入的 harness」，权限边界要你自己用容器补，原文明确把 OpenClaw 列为它的真实集成案例。

### 做法 A：在 Linux 服务器上搭自托管 agentbox 工作区

1. 一键安装（发行包）。前提：服务器满足上面的 Linux + systemd + Docker 条件。

```bash
curl -fsSL https://raw.githubusercontent.com/devilcoolyue/agentbox/main/install.sh | sudo bash
```

- 固定版本：命令后追加 `-s -- --version v0.1.7`（当前稳定版 v0.1.7，安装器默认选最新稳定版）。
- 只允许本机或反代访问：追加 `-s -- --listen 127.0.0.1:8180`。
- 预期结果：安装器校验发行包 → 构建固定版本的工作区镜像 → 生成配置和随机管理员密码 → 安装并启动 `agentbox.service`。首次构建镜像需要几分钟。配置和数据分别在 `/etc/agentbox` 和 `/var/lib/agentbox`；检测到已有部署时安装器会停止并保留原文件。

2. 登录并添加账号。

1. 浏览器打开 `http://YOUR_SERVER_IP:8180`。
2. 用 `boxadmin` 和终端打印的初始密码登录。
3. 进入 系统设置 → 账号池，添加 Claude 或 Codex 账号；在同一对话框里选择 订阅 OAuth 或 API key / relay，并配置名称、访问范围、出口代理。Claude 订阅粘贴授权码；Codex 订阅粘贴完整回调 URL；API / relay 账号填 endpoint 和 key。
4. 远程访问需在防火墙 / 安全组放行 TCP 8180；长期公开访问要配 HTTPS。

3. 开发者：从源码构建（可选路径）。

```bash
git clone https://github.com/devilcoolyue/agentbox.git
cd agentbox

go build -o agentbox ./cmd/agentbox
./scripts/build-image.sh
```

初始化配置：

```bash
cp config.example.json config.json
openssl rand -hex 24
```

把生成的随机串填进 `auth_token`（它同时是首次启动的 `boxadmin` 初始密码）。首次试用把 `accounts` 和 `proxies` 都设为 `[]`，登录后在 Web UI 里加真实账号——示例里的代理地址和 key 是占位符，不能直接用。

```json
{
  "listen": "127.0.0.1:8180",
  "auth_token": "CHANGE_ME_TO_A_LONG_RANDOM_TOKEN",
  "data_dir": "data",
  "agent_image": "agentbox-agent:latest",
  "accounts": [],
  "proxies": []
}
```

注意：启动校验会拒绝占位符密码。容器默认限制为 **2048 MiB 内存、2 CPU、512 进程**；构建镜像的用户需要 Docker 访问权限；启动时服务器需要把挂载目录属主设为 `1000:1000`（随附的 systemd unit 以 root 运行）。

4. 前台试跑并登录。

```bash
sudo ./agentbox -config config.json
```

本机访问 `http://127.0.0.1:8180`；远程则先做 SSH 转发：

```bash
ssh -N -L 8180:127.0.0.1:8180 user@your-server
```

再用 `boxadmin` + 配置的 `auth_token` 登录。账号创建后密码存在数据库里，改 `auth_token` 不会重置登录密码。

5. 建第一个工作区，跑通任务闭环。

1. 系统设置 → 账号池 添加 Claude 或 Codex 账号。
2. 新建工作区，填名称、选 agent 和账号。
3. 在 文件 里上传项目，或打开 终端 执行 `git clone`。
4. 在 对话 里发任务；结束后到 变更 里看 diff，再提交或下载文件。

闭环上的两个坑：Web 提交不会 push 到远端，也不跑 Git hooks 和签名（需要就用终端）；Web 提交的默认身份是「用户名 / 用户名@localhost」，可在 Git 管理 → 提交身份 里改。远端 ahead/behind 计数来自本地缓存，刷新不会 fetch。

6. 装成系统服务。

```bash
sudo ./deploy/install.sh
sudo ./deploy/deploy.sh
```

`install.sh` 装服务和定时器（默认关闭工作区镜像自动更新）；`deploy.sh` 构建并替换二进制、重启服务、检查健康。升级可在侧边栏版本入口或 系统设置 → 关于与更新 里做，带自动校验、备份和进度反馈。

7. 日常运维要点。

- **备份**：默认系统备份**不含工作区数据**，只覆盖数据库、配置、账号凭据、两层模板和 MCP 管理状态。要含用户文件和历史的用 `agentbox backup --full`（需先停服务和相关容器），用 `backup-verify` 校验，用 `restore --to` 恢复到新目录。
- **CLI 镜像更新**：设置 → 容器与资源 → 客户端更新，可设每日自动更新、Claude 的 `stable`/`latest`、站点时区的检查时间、手动检查/更新/回滚。默认关闭自动更新，Claude 默认 `stable`，Codex 默认钉住。更新失败保留当前镜像，回滚会暂停自动更新；运行中的工作区不受影响，需停止再启动才用新镜像。
- **价格目录**：系统设置里可配 models.dev 预设或自定义 HTTPS 目录，每日检查导入 Anthropic / OpenAI 价格；默认需人工确认，可对选定模型开自动更新（变化超 25%、零价转换、档位规则变化仍需人工审核），保留历史快照和回滚。
- **资源与诊断**：容器与资源 里可设全局 / 每用户运行容器上限、保留磁盘空间、后台磁盘占用统计、清理市场缓存、下载脱敏诊断包。

8. 可选：abox-link 打通私网。在你自己电脑上运行 `abox-link`（本地面板），让云上工作区访问你电脑可达、且在允许名单内的仓库、数据库和服务；无头机器用同一个二进制加 `--server` 配允许名单和端口映射。连接状态和详情可以在对话栏查看。不用私网就不必装。

9. 可选：remote browser 镜像。工作区的 Browser 标签提供容器内完整桌面浏览器，有地址栏、每工作区持久登录态、标签页、全屏、画质调节、UTF-8 剪贴板和工作区下载。管理员需构建并选择可选的 `agentbox-agent:browser` 镜像（amd64 用 Google Chrome，ARM 用 Chromium）。网站登录与 CLI 授权是两回事。

### 做法 B：在本机装通用 agent（goose）+ MCP 扩展

1. 可选：安装桌面应用。从文档安装页下载对应平台版本（macOS/Linux/Windows），链接：https://goose-docs.ai/docs/getting-started/installation
2. 安装 CLI（原文给出的唯一可直接复制的命令）：

```bash
curl -fsSL https://github.com/aaif-goose/goose/releases/download/stable/download_cli.sh | bash
```

注意：这是从网络直接下载脚本并执行，受管环境应先审阅脚本内容与来源，或改用 repology 上的发行版打包（README 给了打包状态徽章）。
3. 按 Quickstart 配置模型供应商：https://goose-docs.ai/docs/quickstart 。若想用已有订阅而非 API key，见 ACP 供应商指南：https://goose-docs.ai/docs/guides/acp-providers 。
4. 按需接入 MCP 扩展（README 称 70+），把任务需要的工具和权限交给 agent；MCP 标准说明见 https://modelcontextprotocol.io/ 。
5. 若要让团队统一使用，用 `CUSTOM_DISTROS.md` 构建预配置 provider、扩展和品牌的定制发行版：https://github.com/aaif-goose/goose/blob/main/CUSTOM_DISTROS.md
6. 出问题时按诊断与已知问题排查：https://goose-docs.ai/docs/troubleshooting/diagnostics-and-reporting 、https://goose-docs.ai/docs/troubleshooting/known-issues

诚实说明：除第 2 步的安装命令外，原文没有给出任何具体的 provider 配置字段、权限设置、提示词或工作流步骤；这些必须查阅 goose-docs.ai 才能照做。因此本做法只能做到「装起来并接上模型与扩展」这一层。

### 做法 C：在单个真实项目里给 Claude Code 配项目级护栏

前提：macOS / Linux / WSL，已能运行命令行；在一个可回退的真实 Git 项目里操作。

1. 安装并试通起步命令。

```bash
# 1. 安装 Claude Code
curl -fsSL https://claude.ai/install.sh | bash     # macOS / Linux / WSL
# 或: npm install -g @anthropic-ai/claude-code

# 2. 把 starter-kit 装进你的项目
git clone https://github.com/justxor/claude-code-pro-course.git
bash claude-code-pro-course/install.sh ~/path/to/my-project

# 3. 启动
cd ~/path/to/my-project && claude
> /context          # 看上下文里装了什么
> /onboard          # starter-kit 的 skill：项目概览
```

注意：`install.sh` 的脚本内容在原文中没有展示，执行前应先审查。也可以跳过 starter-kit，直接手写下面几项配置。预期结果：`/context` 能看到当前加载的上下文；`/onboard` 能给出项目概览。

2. 写一个短而具体的 `CLAUDE.md`（项目记忆）。原文给的可直接改用的模板（俄语，按原样保留）：

```markdown
# Проект: магазин на Next.js + PostgreSQL

## Команды
- npm run dev — запуск
- npm test — тесты (Vitest), npm run lint — линтер
- npm run db:migrate — миграции (только с подтверждения!)

## Архитектура
- src/app — роуты, src/lib — бизнес-логика, src/db — доступ к БД
- Вся работа с БД только через src/db, не из компонентов

## Правила
- TypeScript strict, без any
- Новый код — с тестами, баг — сначала падающий тест
- Не трогать src/legacy без явной просьбы
- Перед завершением задачи: npm test && npm run lint
```

结构就是三块：命令、架构、规则。原则（原文明确）：命令、风格、禁令，短；细节放到 `.claude/rules/` 和 skills；超过几百行会让重点淹没并浪费上下文。`/init` 可自动生成，`/memory` 可编辑。

3. 用 allowlist 管权限，而不是 bypassPermissions。`.claude/settings.json`：

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run test:*)",
      "Bash(npm run lint)",
      "Bash(git status)",
      "Bash(git diff:*)"
    ],
    "ask": [
      "Bash(git push:*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Bash(rm -rf:*)",
      "Bash(curl:*)"
    ]
  }
}
```

检查顺序是 deny → ask → allow，deny 永远优先。原文的安全清单：密钥用 deny 关掉且不写进 CLAUDE.md；`git push`、部署、迁移必须确认；无人值守运行（`-p`、CI、`--dangerously-skip-permissions`）只在无生产访问的容器/沙箱里；把外部与 MCP 数据当作数据而非指令，防提示注入；提交前看 `git diff`，不要「全部接受」。预期结果：白名单内的命令不再弹确认，`git push` 仍会问，`.env` 读不到，`rm -rf` 和 `curl` 被拒。

4. 加 PostToolUse hook，让格式化「必然发生」。原文说法：CLAUDE.md 是请求，hook 是规则，hook 可以阻断动作。

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write" }
        ]
      }
    ]
  }
}
```

事件与用途对照（原文表）：`SessionStart` 载入当前分支和待办；`UserPromptSubmit` 给每条提示补上下文；`PreToolUse` 拦 `rm -rf`、`.env` 和迁移文件（`exit 2` + stderr 说明原因即阻断）；`PostToolUse` 跑格式化、lint、针对改动文件的测试；`Notification` 桌面提醒；`Stop` 收尾检查（测试绿了才允许结束）；`PreCompact` 在压缩上下文前保存要点。预期结果：每次 Edit/Write 后自动格式化；不符合规则的 PreToolUse 动作被阻断并给出原因。

5. 定义 subagent，把「嘈杂」的活儿隔离出去。`.claude/agents/reviewer.md`：

```markdown
---
name: reviewer
description: Ревью изменений перед коммитом. Используй после любой заметной правки.
tools: Read, Grep, Glob, Bash
model: sonnet
---
Ты строгий ревьюер. Проверь git diff на баги, пограничные случаи,
утечки секретов и нарушения стиля из CLAUDE.md.
Отвечай списком: файл:строка — проблема — как исправить.
```

子代理在独立上下文窗口工作，只把结论返回主会话（如 explorer 只回摘要、test-runner 只回失败用例、security-reviewer 只回发现列表）。预期结果：主会话上下文不被审查过程塞满，只收到问题清单。

6. 把重复三次以上的流程写成 skill。`.claude/skills/release-notes/SKILL.md`：

```markdown
---
name: release-notes
description: Готовит release notes по коммитам с последнего тега. Используй, когда просят релиз, changelog или заметки к версии.
---
1. Найди последний тег: git describe --tags --abbrev=0
2. Собери коммиты: git log <тег>..HEAD --oneline
3. Сгруппируй: ✨ Новое, 🐛 Исправления, ⚙️ Внутреннее
4. Пиши для пользователей, а не для разработчиков
5. Добавь блок в начало CHANGELOG.md
```

调用 `/release-notes`，或由 Claude 按 description 自动触发。预期结果：同类流程不再每次口述，调用名即可复用。

7. 接 MCP，接上外部系统。

```bash
# 浏览器，用于验证 UI 和截图
claude mcp add playwright -- npx @playwright/mcp@latest

# 查看已连接的 server 及其状态
claude mcp list
```

团队共用的 `.mcp.json` 放在仓库根：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

不用的 MCP server 要关掉——工具描述本身也占上下文。

8. headless / 脚本 / CI 里跑。

```bash
# 脚本或 CI 里的单次请求
claude -p "Найди причину падения сборки" --output-format json < build.log

# push 前审自己的 diff
git diff main | claude -p "Сделай ревью: баги, пограничные случаи, безопасность"

# 限制工具与步数
claude -p "Обнови CHANGELOG по последним коммитам" --allowedTools "Read,Edit,Bash(git log:*)" --max-turns 10

# 批量迁移：逐文件
for f in $(git ls-files 'src/**/*.js'); do
  claude -p "Переведи $f на TypeScript, не меняя поведения" --allowedTools "Read,Edit,Bash(npx tsc:*)"
done
```

GitHub 集成最快的做法是在 Claude Code 里执行 `/install-github-app`，之后可直接在 issue / PR 里写：

```text
@claude реализуй эту задачу и открой PR
@claude сделай ревью этого PR с фокусом на безопасность
```

预期结果：单次请求可返回 JSON；diff 审阅和批量迁移能限定工具与步数后跑完；issue/PR 里能被 @claude 触发。

9. 主工作流：Explore → Plan → Code → Verify → Commit。
- 任何超过一个文件的改动，先用 Plan mode（`Shift+Tab` 循环切换：普通 → auto-accept edits → plan）。
- 先只读、出计划（文件、步骤、风险、怎么验证），人改计划，再让它实现。
- 每轮实现后跑测试/lint/构建，未绿继续循环。
- 结束后看 diff，再让它提交、开 PR。
- 一个任务一个会话：`/clear` 开新任务，长任务 `/compact`（可带指令，如「只保留 API 相关决策」）。`/rewind` 或 `Esc Esc` 回退到上一步，而不是在错误上叠第三条消息。
- 上下文注入：`@src/api/client.ts` 直接放文件，`!git status` 放命令输出，截图和日志可粘贴或管道 `cat error.log | claude`。
- 长任务让它维护 `PLAN.md` / `NOTES.md`，`/clear` 后能接着做。

10. 让它能自己验证（原文称为最强的质量杠杆）。
- 测试和类型检查：`npm test`、`pytest`、`tsc --noEmit`；
- lint 和格式化（最好走 hook，保证每次都跑）；
- 通过浏览器 MCP 截 UI 图对比（Playwright / Chrome）；
- 参考输出：「脚本必须恰好打印这些内容」。

11. 并行与互审。

```bash
git worktree add ../app-auth -b feature/auth
cd ../app-auth && claude
```

每个会话在自己的目录和分支里工作。Writer / Reviewer 模式：一个 Claude 写，另一个在干净会话里审，第一个按意见改——新上下文能看到「被看习惯而忽略」的问题。

12. 提示词写法。公式：**目标 + 去哪里找 + 约束 + 怎么验证**。原文给的「模糊 → 具体」改写示例：

| 模糊 | 具体 |
|---|---|
| 「修个 bug」 | 「当 email 为空时 `signup()` 抛 TypeError。先写一个可复现的测试，再修，然后跑 `npm test`。」 |
| 「加点测试」 | 「用测试覆盖 `parseDate`：月份边界、时区、非法输入。不要 mock，风格照 `utils.test.ts`。」 |
| 「重构一下」 | 「把 `orders.ts` 里的数据库操作抽到 repository。公开 API 不变，现（原文此处截断）」 |

预期结果：同类任务的提示词从一句话变成「目标 + 去哪里找 + 约束 + 怎么验证」，agent 少问、少猜。

### 做法 D：用 OpenCode 把「先只读规划、再放权编辑」固定成分工

1. 清理旧版本。README 明确提示「Remove versions older than 0.1.x before installing」。

2. 安装（任选一种，按平台和习惯选）：

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package managers
npm i -g opencode-ai@latest        # or bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
nix run nixpkgs#opencode           # or github:anomalyco/opencode for latest dev branch
```

注意：`curl | bash` 是直接从网络下载脚本并执行，受管或涉密环境应先审阅脚本内容与来源，或改用包管理器安装。预期结果：`opencode` 命令可用。

3. 若需要指定安装位置（仅对安装脚本生效），按 README 给出的优先级选择，优先级顺序为：
   1. `$OPENCODE_INSTALL_DIR` — 自定义安装目录
   2. `$XDG_BIN_DIR` — 符合 XDG Base Directory 规范的路径
   3. `$HOME/bin` — 标准用户二进制目录（存在或可创建时）
   4. `$HOME/.opencode/bin` — 默认回退

```bash
# Examples
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

4. 启动后按 `Tab` 键在 `build` 与 `plan` 两个内置 agent 之间切换。预期结果：界面显示当前处于哪个 agent。

5. 把「读陌生代码库、规划改动」这一步固定交给 `plan` agent。README 对其行为的描述是：默认拒绝文件编辑；运行 bash 命令前会询问权限；适合探索不熟悉的代码库或规划改动。预期结果：plan 阶段不会直接改文件，bash 需要你授权。

6. 确认计划后切到 `build`（默认、full-access）执行实际开发改动。预期结果：编辑动作被执行。

7. 遇到复杂搜索和多步任务时，在消息中用 `@general` 调用 `general` 子代理（README 说明它主要供内部使用）。

8. 需要图形界面时安装桌面版（README 标注为 BETA）：

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

下载页：`https://github.com/anomalyco/opencode/releases` 或 `https://opencode.ai/download`。平台包名：`opencode-desktop-mac-arm64.dmg`、`opencode-desktop-mac-x64.dmg`、`opencode-desktop-windows-x64.exe`、Linux 用 `.deb` / `.rpm` / `.AppImage`。

9. 需要更细的配置（模型、协作方式等）时，按 README 指引访问 `https://opencode.ai/docs` 与其 agents 文档 `https://opencode.ai/docs/agents`——这些内容不在本次输入中。

诚实说明：README 是入口文档，除安装命令、内置 agent 列表、`Tab` 切换、`plan` 的默认权限行为、`@general` 调用方式和桌面版安装命令外，没有给出配置字段、提示词或协作流程；这些必须查阅 opencode.ai/docs 才能照做。

### 做法 E：在本机装 Codex CLI 并跑通一次终端编码任务

1. 确认前提：Mac / Linux / Windows；按 ChatGPT 订阅使用需 Plus、Pro、Business、Edu 或 Enterprise 计划之一。README 也提到可改用 API key，但明确说这需要 additional setup，即 API key 路径不是零配置。

2. 在 Mac / Linux 上安装（任选其一）：

```shell
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

```shell
# 或使用 npm
npm install -g @openai/codex
```

```shell
# 或使用 Homebrew
brew install --cask codex
```

3. 在 Windows 上安装：

```shell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

4. （可选）强制从 GitHub Releases 下载：独立安装脚本默认从 `https://releases.openai.com/codex` 下载，元数据或资源不可用时回退到 GitHub Releases。需要强制走 GitHub Releases 时设置环境变量 `CODEX_INSTALLER_USE_RELEASES_OPENAI_COM` 为 `false`（`0`、`no` 也接受）：

```shell
curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_INSTALLER_USE_RELEASES_OPENAI_COM=false sh
```

```powershell
$env:CODEX_INSTALLER_USE_RELEASES_OPENAI_COM='false'; irm https://chatgpt.com/codex/install.ps1 | iex
```

5. （可选）手动下载二进制：到 latest GitHub Release（https://github.com/openai/codex/releases/latest）按平台选择对应的包——
   - macOS：Apple Silicon/arm64 用 `codex-aarch64-apple-darwin.tar.gz`；x86_64（较老 Mac 硬件）用 `codex-x86_64-apple-darwin.tar.gz`
   - Linux：x86_64 用 `codex-x86_64-unknown-linux-musl.tar.gz`；arm64 用 `codex-aarch64-unknown-linux-musl.tar.gz`

   每个压缩包内只有一个条目，文件名里带了平台标识（如 `codex-x86_64-unknown-linux-musl`），解压后建议重命名为 `codex`。

6. 启动：安装完成后直接运行

```shell
codex
```

7. 登录（推荐路径）：运行 `codex` 后选择 **Sign in with ChatGPT**。README 建议用 ChatGPT 账号登录，以便把 Codex 作为 Plus、Pro、Business、Edu 或 Enterprise 计划的一部分使用。预期结果：登录成功后可在终端里让 Codex 执行编码任务。

8. （可选）换用其他形态：想要编辑器内体验，到 https://developers.openai.com/codex/ide 安装 IDE 扩展（VS Code、Cursor、Windsurf）；想要桌面应用运行 `codex app`，或访问 Codex App 页面；需要 OpenAI 的云端代理 Codex Web，访问 chatgpt.com/codex。

9. （可选）继续查文档：README 指向 Codex Documentation（developers.openai.com/codex）、Contributing（./docs/contributing.md）、Installing & building（./docs/install.md）、Open source fund（./docs/open-source-fund.md）。

诚实说明：抓取到的原文只有 README 首页，没有工作流示例、提示词样本、权限/沙箱/审批配置、性能或成本数据，因此本做法只能做到「装起来并完成账号登录、跑通一次终端任务」这一层。

### 做法 F：在一次性项目里受控试点 Claude Mods（function hooks）

Claude Mods 是 Claude Code 的插件形态，用 function hooks 扩展代理的运行时行为，而不只是提供指令或外部工具。原文对机制的具体描述是：模块入口为 `register(on, options)`，其 handler 收到 `($, e, next)`——`e` 是事件，`$` 是该 handler 可用的引擎接口，`next` 是沿剩余链路的延续。作者强调「这更接近中间件，而不是更长的 system prompt」。Mod 还能参与受支持的界面渲染（如 diff 面板）。

选型时逐级降级：先看 Skills/项目指令、MCP、经典 hook、CI 是否能满足；只有确实需要更深的事件组合或界面行为时才写 Mod。原文给出的选型表：

| 机制 | 主要职责 | 何时优先选它 |
| --- | --- | --- |
| Skills / 项目指令 | 提供任务知识与可复用流程 | 代理需要你的约定、清单或设计上下文 |
| MCP | 暴露外部工具、资源与集成 | 代理需要到另一个系统的受支持通路 |
| 经典 hooks | 在受支持的生命周期事件上跑已配置逻辑 | 已有事件能触发你的检查或审批规则 |
| Claude Mods | 围绕运行时事件与受支持 UI 面组合 function hooks | 需要更深的事件组合或界面行为 |
| Plugins | 打包与分发扩展 | 需要可复用的安装单元（其中可含 Mod） |

可用性状态：官方 9 月 9 日更新点名该特性并给出测试用开关，称「数周内」扩大发布；Mods 源码目录明确标注接口为 early access，API 可能不通知就变。另有一个无关社区仓库 `0xDarkMatter/claude-mods`，不要与其混淆。

前提（全部步骤共用）：一次性项目、合成数据、已获批准的 Claude Code 安装、不接触任何生产凭据。原文声明这些是「源码记录的命令」，作者并未声称在真实 Claude 会话中执行过；能否跑通取决于已安装的 build 与组织管控。

1. 确认版本。

```
claude --version
```

2. 用实验开关启动。

```
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude
```

3. 在兼容会话中生成与当前安装匹配的类型声明，并与试点测试证据一起留存。

```
/plugin-types
```

前提与停机条件：如果命令或特性不可用，停下来找管理员确认受支持权限，**不要为了跑通示例而关掉组织托管保护**。升级后要重新生成声明，不要假设旧的类型还适用。

4. 从官方仓库的已审阅 revision 检出，在该 checkout 的根目录运行文档中的 diff 示例与测试脚手架（每个进程都带上实验开关）。

```
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --plugin-dir ./mods/diff
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test ./mods/diff
```

注意：`/diff` 已是内置命令，会与你的实现争夺命令归属；「加载了一个目录」不足以证明某个 handler 真的跑了，要用测试或显式的非敏感诊断证据确认当前生效的实现。

5. 自制 Mod 时使用这个目录结构（一个已发布的 Mod 就是一个带 manifest 和 hooks 模块的普通插件目录）。

```
my-reviewed-mod/
├── .claude-plugin/plugin.json
├── hooks/
│   ├── hooks.json
│   └── register.ts
└── tests/
```

6. 官方 diff 的 `hooks.json` 用下面这个字段指向模块。原文强调这只是加载器片段，既不是完整可用的插件，也不是安全控制。

```
{
  "modules": ["./register.ts"]
}
```

7. 按第 3 步生成的声明构建入口，加测试，并**在加载前审阅完整源码**。不要使用凭空发明的命令（例如所谓「万能 Mod 安装器」）。

8. 分发走受支持的插件机制与组织审批流程，不要用搜索引擎找来的任意脚本。

9. 加载前按原文的验收矩阵逐项建测试（下表由原文表格改写）。

| 风险 | 测试方法 | 需要的证据 |
| --- | --- | --- |
| 版本或 API 漂移 | 改 CLI 或 Mod revision 后重跑整套 | 确切版本、重新生成的类型、审阅过的行为差异 |
| 链式组合不安全 | 在已批准的层之间混合允许、拒绝、转换的事件 | 预期顺序、最终决策、无意外的重复副作用 |
| 保护缺失或损坏 | 触发 handler 错误、超时、禁用 Mod、重载 | 保护不可用时，必需动作仍被某个独立控制阻断 |
| 敏感数据泄漏 | 让合成金丝雀值穿过每个目的地 | 在测试范围内，模型输入、导出日志、留存产物中都没有禁止值 |
| 只考虑 UI 的假设 | 跑受支持的交互与非交互路径 | 没有无人值守流程在等待不可用的界面 |
| 运维回归 | 禁用 Mod 并恢复已批准的基线 | 已知的回滚流程、负责人、基线检查通过 |

原文特别提示：**绝不要从一次正常的成功运行推断出 fail-closed 行为**；拒绝路径和不可用路径要用够不到生产环境的凭据故意去测。

10. 供应链审阅：用官方 plugin-marketplace 文档配合源码审阅，记录发布者、审阅过的 revision、依赖、申请的能力、更新路径与吊销流程；并且要测「实际会部署的那个组合」（含管理层与其他插件），而不是逐个孤立审批。

11. 成本核算方法（原文自述这是其评估方法，不是 Anthropic 的计费公式）：

```
每被接受任务总成本 =（可归属的模型与工具费用 + 工程与评审时间）
                    ÷ 通过同一验收标准的任务数
```

在相同的任务集、模型配置与质量线下比较基线与启用 Mod 的运行，并且要报告失败与回归，而不只是最快的那个成功样例。

### 做法 G：用 pi 把「统一模型接口 + 无内置权限」的 agent 放进容器里试

Pi 是一个「极简、可扩展的 agent harness（智能体外壳）」，作者定位是「让 Pi 适应你的工作流，而不是反过来」。仓库为 monorepo，包含 `@earendil-works/pi-ai`（统一的多提供商 LLM API，覆盖 OpenAI、Anthropic、Google 等）、`@earendil-works/pi-agent-core`（带工具调用和状态管理的 agent 运行时）、`@earendil-works/pi-coding-agent`（交互式编码 agent CLI）、`@earendil-works/pi-durable`（持久对话、任务、文档运行时）、`@earendil-works/chord`（面向服务、复制状态、RPC、插件的应用组合运行时）以及 `@earendil-works/pi-tui`、`@earendil-works/pi-telemetry`。默认**不含** sub-agents 和 plan mode；作者建议要么让 Pi 自己构建，要么装一个按你想要方式做的包。使用方式有四种：交互式、print/JSON 模式自动化、RPC 控制、TypeScript SDK 构建应用。另有 `earendil-works/pi-chat` 面向 Slack/聊天自动化与工作流。

1. 确认 Node.js 22.19 或更高版本。macOS / Linux / Windows 安装器可按需代装。

2. 安装 CLI（安装器会 pin 住所有依赖）。

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

Windows：

```shell
powershell -c "irm https://pi.dev/install.ps1 | iex"
```

后续用 `pi update` 更新。也可以直接用 npm 安装（注意：不 pin 传递依赖）：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

注意：与其他做法一样，这是从网络直接下载脚本并执行；受管或涉密环境应先审阅脚本内容与来源。预期结果：`pi` 命令可用。

3. 在你希望它工作的目录里启动。

```bash
cd /path/to/project
pi
```

4. 接入模型：在 Pi 内运行 `/login`，连接一个订阅或 API key，然后给它任务。预期结果：可以开始对话并执行编码任务。

5. 设置权限边界（重要前提）：Pi **没有内置权限系统**，不限制文件系统、进程、网络或凭证访问，默认以启动它的用户和进程权限运行。需要更强边界时，原文给出三种容器化模式（详见 `packages/coding-agent/docs/containerization.md`）：
   - **Gondolin extension**：`pi` 和 provider 认证留在宿主机，把内置工具和 `!` 命令路由进本地 Linux micro-VM。
   - **Plain Docker**：把整个 `pi` 进程跑在本地容器里，隔离最简单。
   - **OpenShell**：把整个 `pi` 进程跑在策略控制的 sandbox 里。

预期结果：无论用哪种模式，Pi 触达的文件系统/网络范围都被限制在容器边界内。

6. （可选，需要固定版本或可复现环境时）用 Nix 运行：

```bash
nix run github:earendil-works/pi/stable
```

```bash
nix profile add github:earendil-works/pi/stable
nix profile upgrade pi
```

`stable` 指向最新 release；用 tag（如 `github:earendil-works/pi/v1.0.0`）固定版本，或用 `github:earendil-works/pi` 取 main 上未发布改动。支持 Linux 与 macOS 的 ARM64、x86-64；Nix 从源码构建，构建离线，内置模型数据来自 `nix/model-catalog.json` 中 pin 的 pi.dev 模型目录 revision，运行时仍会覆盖 pi.dev 上的新目录数据。手工刷新 pin：

```bash
npm run update:model-catalog-pin
```

7. 定制工作流（前提：读完仓库内对应文档，原文只给了入口）：用 extensions、skills、prompt templates、themes 定制，再打包成 Pi packages 通过 npm 或 git 分享。原文未给出这些文件的具体写法与示例，只有链接：`packages/coding-agent/docs/extensions.md`、`skills.md`、`prompt-templates.md`、`themes.md`、`packages.md`。

8. （可选）从源码开发或自建二进制：

```bash
npm install --ignore-scripts  # 装依赖但不跑生命周期脚本
npm run build         # 刷新模型数据后构建所有包
npm run build:offline # 用现有模型数据离线重建
npm run check         # lint、format、类型检查
./test.sh             # 跑测试（没有 API key 时跳过依赖 LLM 的测试）
./pi-test.sh          # 从源码运行 pi，可在任意目录执行
```

从 release 源码构建独立二进制：

```bash
VERSION="<release-version>"
tar -xzf "pi-${VERSION}-source.tar.gz"
cd "pi-${VERSION}"
./scripts/build-binaries.sh --offline-model-data --platform linux-x64 --out "$PWD/out"
```

`--offline-model-data` 表示用归档内的模型数据、不刷新 provider 目录；依赖已就绪时可加 `--skip-install`。

9. （可选）想把编码 agent 能力嵌进别的系统时：走 print/JSON 模式、RPC 或 TypeScript SDK；原文把 OpenClaw 列为真实集成案例。

诚实说明：几乎所有「怎么做」的细节（extensions、skills、prompt templates、themes、packages、containerization、usage、cli、rpc、sdk）在原文里只是链接，正文没有内容，无法直接照抄步骤；这份 README 更接近宣传 + 仓库导览。

## 怎么判断变好了

做法 A（agentbox）看成本与交付把关，不看「结果是否更好」：
- 用量页可按用户、模型、时间过滤，显示 tokens、成本来源和单轮延迟，支持 CSV 导出。
- 缓存命中率算法为 `cache reads / (uncached input + cache reads + cache writes)`，无输入时显示「—」。
- 对话每条回复显示时间、模型、设置快照和记录成本——用它核对成本与配置是否对得上。
- 交付侧：在 变更 页看 diff 和整文件，审完再提交；Git 评审在容器内运行并走与终端相同的额度准入检查。
- 注意：原文没有给出「AI 是否让结果变好了」的对照评测方法或基准数据，以上只是成本与交付把关指标。

做法 B（goose）最小试用方式：
1. 挑 1 个重复性高、边界清楚的任务（例如整理一批本地文件、跑一次固定流程的数据分析、生成一份周期性报告初稿），并记录手工完成的耗时与质量作为基线。
2. 在一台非生产机器上装 CLI（或桌面应用），接 1 个模型供应商 + 1~2 个与该任务直接相关的 MCP 扩展，不做额外定制。
3. 让 agent 独立跑完一次，全程记录：哪些步骤它自己做了、哪些停下来要人确认、哪些因缺工具而失败。
4. 重复 3~5 次，看结果是否稳定。

判断有没有改善的指标：
- 任务完成率：能否无人干预跑完，还是必须人工接手。
- 人工介入时间与返工时间，相对手工基线的变化。
- token 消耗与费用。
- 被拒绝或需要确认的权限请求数量：用来判断工具/权限供给是否给少了，还是给多了。
- 失败归因分布：是模型能力不足，还是缺工具/缺扩展。若多数失败是缺扩展，优先补工具与权限，而不是换模型。

判定规则：同类任务的人工耗时明显下降、返工不超过基线，可考虑扩大试用范围；否则停留在单机单任务，先补齐权限与工具供给再评估。安全上全程限定在非生产环境、最小权限下进行。

做法 C（Claude Code 项目级护栏）最小试用方式：
1. 挑 1 个重复性高、边界清楚的任务（例如整理一批本地文件、跑一次固定流程的数据分析、生成一份周期性报告初稿），并记录手工完成的耗时与质量作为基线。
2. 在单个真实项目里只落地可复制的片段：短 `CLAUDE.md`、`permissions` 的 allow/ask/deny、一个 PostToolUse 格式化 hook；先不引入 starter-kit 安装脚本与 CI 集成。
3. 用 Plan mode 跑完一次并全程记录：哪些步骤它自己做了、哪些停下来要人确认、哪些因缺工具而失败。
4. 重复 3~5 次，看结果是否稳定。

观察指标：
- 任务完成率：能否无人干预跑完，还是必须人工接手。
- 人工介入时间与返工时间，相对手工基线的变化。
- token 消耗与费用。
- 被拒绝或需要确认的权限请求数量：用来判断工具/权限供给是否给少了，还是给多了。
- 失败归因分布：是模型能力不足，还是缺工具/缺扩展。若多数失败是缺扩展，优先补工具与权限，而不是换模型。
- 可观察的护栏信号：提交前 diff 是否变小、是否被 hook 拦住未格式化或未通过测试的改动、`/context` 里是否还塞着不用的 MCP 描述。

判定规则：同类任务的人工耗时明显下降、返工不超过基线，可考虑扩大试用范围（再引入 starter-kit 与 CI）；否则停留在单个项目单类任务，先补齐权限与工具供给再评估。安全上全程限定在非生产环境、最小权限下进行。

注意：做法 C 的调研没有给出任何效果数据，以上指标与 3~5 次的最小试用节奏沿用做法 B 的方法，属于作者主张而非基准数据。

做法 D（OpenCode）最小试用方式（1 台机器、1 个仓库、1 次对照即可）：
1. 在个人开发机上按上文任一命令安装，先清掉 0.1.x 之前的旧版本。
2. 选一个自己不熟悉的中小型仓库，交给 `plan` agent 做同一件事：「定位 X 功能的实现位置，并给出改动计划」。全程不要切到 `build`。
3. 人工核对：它指出的文件/函数是否真的命中。
4. 确认计划后切到 `build` 执行同一改动。
5. 对照：另取一个同量级任务，跳过 `plan`，直接用 `build` 从零做，记录差异。

判断有没有改善的指标（这些指标由调研报告提出，原文未给出）：
- plan 阶段定位准确率（人工核对命中/未命中）；
- 计划返工次数（需要你纠正几次才可用）；
- 从开始到「首个可运行的改动」的耗时；
- 误操作风险：`plan` 因默认拒绝编辑、bash 需授权而拦下的次数（拦得多说明放权前确实起到闸门作用）；
- build 阶段的回滚或重做次数（若比不用 plan 时更少，说明前置规划有价值）。

若上述指标没有改善，或 plan 的定位频繁失准，则应退回 watch，等看过官方 docs 后再判断。

做法 E（Codex CLI）最小试用方式（约 15 分钟）：
1. 在一台自己的开发机上，用 npm 或 curl 命令安装（避免一开始就动生产环境或团队镜像）。
2. 运行 `codex`，选择 Sign in with ChatGPT 完成登录。
3. 挑一个小而不重要的真实仓库（例如内部工具脚本库），交给它一个边界清晰的任务，例如「修掉某个已知的小 bug 并补一个测试」。
4. 人工 review 它产生的每一处改动，记录下面几项。

判断有没有改善的指标（这些指标由调研报告提出，原文未给出）：
- 任务是否一次跑通（未跑通时，人工介入了几轮）；
- 最终 diff 中人工需要重写/删除的比例（越低说明越可用）；
- 与你自己动手相比，完成同一任务的时间差；
- 它对仓库上下文的「误解次数」（改错文件、改错函数、误删内容等）——这类错误直接决定能不能放进日常工作流；
- 触发权限确认/中断的次数，评估在受控环境下是否可接受。

建议的继续路径：安装验证通过后，把 README 指向但本次未抓到的文档（Codex Documentation、docs/install.md）补进来，再决定是否把它写进日常编程任务的工作流；若补齐文档后能看到明确的配置与工作流步骤，可把结论从 try 上调。

注意：做法 D、E 的调研都没有给出效果数据，以上指标与最小试用节奏属于调研报告提出的作者主张而非基准数据。

做法 F（Claude Mods）最小试用方式与验收：
1. 跑 `claude --version` 记录版本，用 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude` 启动，在里面执行 `/plugin-types` 并保存生成的声明。
2. 从官方仓库的已审阅 revision 检出，用 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --plugin-dir ./mods/diff` 加载 diff 示例，并用 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test ./mods/diff` 跑测试脚手架。
3. 按验收矩阵逐项建测试：版本或 API 漂移、链式组合不安全、保护缺失或损坏、敏感数据泄漏、只考虑 UI 的假设、运维回归。每项都要留下证据，不只是「跑通了一次成功路径」。
4. 成本核算：在相同的任务集、模型配置与质量线下比较基线与启用 Mod 的运行，用「每被接受任务总成本 =（可归属的模型与工具费用 + 工程与评审时间）÷ 通过同一验收标准的任务数」；报告失败与回归，而不只是最快的成功样例。
5. 两条判据：交互时间省了但返工变多可能是净亏；反之，在某个高频且昂贵的评审环节上的小改进，可以支撑一个范围很窄的 Mod。
6. 只有存在明确的运行时或界面限制、有受控测试数据、有负责人、有回滚手段时才试点；当需求已由 Skills、MCP、经典 hook 或 CI 满足，或该扩展会成为保护生产系统的唯一屏障时，应当等待。

注意：做法 F 的调研自述是文档与源码审阅，不是实测 benchmark；文中命令是「源码记录的」，作者未声称在真实 Claude 会话中执行过；验收矩阵与成本公式是作者提出的评估方法，不是 Anthropic 的计费公式。

做法 G（pi）最小试用方式（约半小时）：
1. 选一个非关键、有 git 版本控制、能随时回滚的仓库。
2. 记录用的是哪种安装：`curl -fsSL https://pi.dev/install.sh | sh` 还是 `npm install -g --ignore-scripts ...`。
3. 因为默认无权限隔离，先在容器里跑（三种模式里 Plain Docker 起步最简单）；若只能在宿主机跑，先确认目录内没有凭证文件。
4. `cd` 进仓库，`pi` 启动，`/login` 接入一个 provider。
5. 给它一个边界清晰的小任务（例如「读某个文件并为其中函数补一个测试」），全程观察它调用哪些工具、动了哪些文件。
6. 再用另一个 provider 重跑同一提示（验证 `pi-ai` 统一接口的可迁移性）。

判断有没有改善的指标（原文没有基线，需自建对照——同一任务用你现有工具跑一遍做参照）：
- 任务是否一次完成，需要人工介入几次；
- 返工次数和需要你补的上下文量，相比现有工具是升是降；
- 换 provider 后同一提示是否仍然跑通（这是 Pi 相对单模型工具的核心卖点，值得单独记一笔）；
- 它实际触达的文件系统/网络范围，对照容器化边界判断隔离够不够；
- 如果条件允许，用 `pi-telemetry` 或 `badlogic/pi-share-hf` 把会话导出留档，作为后续复盘的原始素材——但注意这本身也是把工作数据上传，需先确认合规。

说明：pi 的原文没有定义任何指标或阈值；上面这套最小试用与对照方法来自调研报告，属于作者主张而非基准数据。

## 常见坑

- agentbox 的权限默认值：原文自述存在 bypassPermissions 默认权限、凭据可被终端用户读取、单机单进程等硬约束。账号凭据会传给容器内 CLI，有终端权限的用户可以读到。
- 撤销不等于终止：撤销账号访问会阻止新操作和后续凭据同步，但**不会收回已下发凭据、也不会终止正在运行的进程**；彻底撤销需停容器并轮换上游凭据。
- Web 提交的边界：Web 提交不会 push 到远端，也不跑 Git hooks 和签名；默认身份是「用户名 / 用户名@localhost」。需要完整 Git 行为就用终端。
- 远端 ahead/behind 计数来自本地缓存，刷新不会 fetch。
- 默认系统备份**不含工作区数据**；要含用户文件和历史的用 `agentbox backup --full`，且需先停服务和相关容器。
- 持久文件不等于持久进程：要留的文件必须放 `/workspace`、`/home/agent`、每用户 `/shared` 这三个位置；容器停止或重建就终止进程，tmux 只是会话保活。
- 安装器检测到已有部署时会停止并保留原文件；启动校验会拒绝占位符密码；源码构建需要 Docker 访问权限；挂载目录属主需为 `1000:1000`。
- goose 的 `curl | bash` 安装：受管或涉密环境应先审阅脚本内容与来源，或改用发行版打包。
- MCP 扩展会带来文件与命令执行权限，需要在受管或涉密环境中做额外安全审查与权限约束。
- goose 的 README 本质是项目宣传页，不含配置细节、权限模型、扩展清单、沙箱/安全边界和实际任务效果数据。其中「研究、写作、自动化、数据分析」「Built in Rust for performance and portability」「general-purpose AI agent」均无数据或案例支撑，只能作为线索。
- agentbox 项目仅 34 stars、稳定版 v0.1.7，暂不适合直接作为通用方案推给不特定的人。
- 做法 C 的 `install.sh` 与 starter-kit 内容未在原文中展示，执行前先审查；也可以跳过 starter-kit，直接手写 `CLAUDE.md`、`permissions`、hook 文件。
- `CLAUDE.md` 超过几百行会淹没重点并浪费上下文；命令、风格、禁令要短，细节放 `.claude/rules/` 和 skills。
- 权限检查顺序是 deny → ask → allow，deny 永远优先；不要用 bypassPermissions 替代 allow/ask/deny 白名单。这与 agentbox 的 bypassPermissions 默认值不是同一层：agentbox 管服务器工作区账号边界，做法 C 管单个项目内的工具调用边界；两者可以叠加，但不要把「服务器上默认放开」当成「项目内也可以不设白名单」。
- 无人值守运行（`-p`、CI、`--dangerously-skip-permissions`）只在无生产访问的容器/沙箱里；把外部与 MCP 数据当作数据而非指令，防提示注入；提交前看 `git diff`，不要「全部接受」。
- CLAUDE.md 是请求，hook 是规则，hook 可以阻断动作；不要把必须每次都发生的事只写在 CLAUDE.md 里。
- 不用的 MCP server 要关掉——工具描述本身也占上下文。
- 一个任务一个会话，`/clear` 开新任务，长任务 `/compact`；`/rewind` 或 `Esc Esc` 回退，而不是在错误上叠第三条消息。
- 做法 C 的仓库只有 109 stars，README 是课程宣传页；原文没有给出 install.sh、labs、starter-kit 的具体内容与任何效果数据，不适合直接判定为成熟成品。
- OpenCode 安装前先清掉 0.1.x 之前的旧版本；桌面版明确标注 BETA。
- OpenCode 的 README 是入口文档，配置细节、模型接入、提示词、协作流程都在外部 `opencode.ai/docs`，本次未抓到，无法从中提炼可照做的配置。
- OpenCode 输入元数据给出 211212 stars，README 正文未提及该数字，且该量级明显异常，应自行到仓库页面核实。
- OpenCode 对 `plan` agent「默认拒绝文件编辑、执行 bash 前询问权限」的描述来自 README，没有案例或对比支撑，也未在原文中独立验证。
- Codex CLI 抓取到的原文只有 README 首页（Quickstart、登录方式、文档链接），没有工作流示例、提示词样本、权限/沙箱/审批配置、性能或成本数据。
- Codex 的 API key 路径需要 additional setup，不是零配置；有 ChatGPT 订阅的人应优先走账号登录。
- Codex 独立安装脚本默认从 `https://releases.openai.com/codex` 下载，元数据或资源不可用时回退到 GitHub Releases；需要强制走 GitHub Releases 用 `CODEX_INSTALLER_USE_RELEASES_OPENAI_COM=false`。
- Codex Web 是云端代理，原文没有任何关于定时、事件或状态触发的说明，不能据此做主动推进。
- Codex 的 `curl | sh` / PowerShell `irm | iex` 同样是直接从网络下载脚本并执行；受管或涉密环境应先审阅脚本内容与来源，或改用 npm / brew / 手动下载二进制。
- 不要把「服务器上默认放开」（agentbox 的 bypassPermissions 默认值）当成「项目内也可以不设白名单」；做法 C/D/G 的权限边界与 agentbox 的账号边界不是同一层。
- Claude Mods 源码目录明确标注接口为 early access，API 可能不通知就变；官方 9 月 9 日更新称「数周内」扩大发布，本审阅检查的 TypeScript 声明对应 Claude Code 2.1.273。
- 不要混淆：社区仓库 `0xDarkMatter/claude-mods` 与 Anthropic 原生功能无关。
- `/diff` 已是内置命令，会与你的实现争夺命令归属；「加载了一个目录」不足以证明某个 handler 真的跑了，要用测试或显式的非敏感诊断证据确认当前生效的实现。
- 官方 diff 的 `hooks.json` 只是加载器片段，既不是完整可用的插件，也不是安全控制。
- 不要使用凭空发明的命令（例如所谓「万能 Mod 安装器」）；分发走受支持的插件机制与组织审批流程。
- 绝不要从一次正常的成功运行推断出 fail-closed 行为；拒绝路径和不可用路径要用够不到生产环境的凭据故意去测。
- `sec-default` 是外层管理保护，让选定的托管设置、提示内容、经典 hooks 与工具策略处于用户安装插件的触及范围之外；它不新增业务策略，很多其他事件会原样通过，它不是覆盖每次工具调用的通用防火墙；其链上位置本身就是保护的一部分，组织的 `prependPlugins` 会改变默认座位，管理员必须显式处理 `sec-default@builtin`；本地加载该目录不等同于安装组织托管控制。
- `telemetry` 自己的 README 比目录看起来更受限——它跑在开启分析的内部构建上，不打算用 `--plugin-dir` 独立安装，其分析能力不是通用公共日志服务，只能当架构范例，不能作为客户环境的安装建议。
- 如果命令或特性不可用，停下来找管理员确认受支持权限，不要为了跑通示例而关掉组织托管保护；升级后要重新生成声明，不要假设旧的类型还适用。
- 只在存在明确的运行时或界面限制、有受控测试数据、有负责人、有回滚手段时才试点；当需求已由 Skills、MCP、经典 hook 或 CI 满足，或该扩展会成为保护生产系统的唯一屏障时，应当等待。
- pi **没有内置权限系统**：不限制文件系统、进程、网络或凭证访问，默认以启动它的用户和进程权限运行。不要在未隔离的情况下放任它访问敏感文件、凭证或网络；先按三种容器化模式之一建边界（Plain Docker 起步最简单）。
- pi 的 README 更接近宣传 + 仓库导览：extensions、skills、prompt templates、themes、packages、containerization、usage、cli、rpc、sdk 在原文里只是链接，正文没有内容，无法直接照抄步骤；要定制必须先读仓库内对应文档。
- pi 默认**不含** sub-agents 和 plan mode；不要指望它开箱就有「先只读规划、再放权编辑」的分工，要么让 Pi 自己构建，要么装一个按你想要方式做的包。
- pi 的安装方式影响可复现性：`pi.dev` 安装器从 `packages/coding-agent/install-lock/` 安装以 pin 传递依赖，而 npm 包不 pin 传递依赖；团队要求可复现时用安装器或 Nix。
- pi 的 Nix 路线从源码构建、构建离线，内置模型数据来自 `nix/model-catalog.json` 中 pin 的 pi.dev 模型目录 revision，可能滞后于 pi.dev 最新状态；需要时手工跑 `npm run update:model-catalog-pin`。
- `pi-telemetry` / `badlogic/pi-share-hf` 导出会话等于把工作数据上传（作者自己发布过 `badlogicgames/pi-mono` 数据集做例子）；在用它做复盘之前先确认合规。
- pi 的主动推进只有基础设施线索（`pi-durable` 的持久对话/任务/文档运行时、`chord` 的服务与插件、`pi-chat` 的 Slack/聊天自动化），原文**没有**给出任何时间/事件/状态触发的配置或步骤，不能据此做主动推进。
- pi 原文没有效果数据、案例细节、对比测试，也没有性能或质量数字；「minimal, extensible」「adapt Pi to your workflows, not the other way around」、公开会话数据比玩具 benchmark 更有价值、「ships with powerful defaults」均为作者主张。仓库星标 111397 来自给定 metrics，README 正文未独立验证。
- pi 的供应链加固做法可作为参考：直接外部依赖 pin 精确版本（内部 workspace 包仍是版本范围）；`.npmrc` 设 `save-exact=true` 和 `min-release-age=2`（避免当天发布的依赖被解析）；`package-lock.json` 是依赖事实来源，pre-commit 阻止意外的 lockfile 提交（除非设 `PI_ALLOW_LOCKFILE_CHANGE=1`）；`npm run check` 校验 pinned 直接依赖、原生 TypeScript 导入兼容性和生成的 coding-agent install lock；CI 用 `npm ci --ignore-scripts`，另有定时 workflow 跑 `npm audit --omit=dev` 和 `npm audit signatures --omit=dev`。

## 证据与来源

- 做法 A 依据调研《devilcoolyue/agentbox》：一键安装命令、最小配置样例、工作区任务闭环步骤、容器默认限额（2048 MiB / 2 CPU / 512 进程）、账号池与凭据约束、备份与价格目录说明，均来自该报告转述的项目原文。其中「暂不适合直接作为通用方案推给不特定的人」是调研结论中的作者主张。
- 做法 B 依据调研《aaif-goose/goose》：安装命令来自 README；54,827 stars、15+ 供应商、70+ MCP 扩展、Apache-2.0、AAIF / Linux Foundation 托管、CI workflow 徽章、repology 打包状态均为仓库自述与徽章，未在原文中独立验证。其余关于通用能力的表述均为作者主张，无数据或案例支撑。
- 做法 C 依据调研《justxor/claude-code-pro-course》：安装命令、`CLAUDE.md` 模板、`permissions` 配置、`PostToolUse` hook 配置、subagent 与 skill 定义、MCP 命令与 `.mcp.json`、headless / CI 命令、GitHub 集成提示词、Explore → Plan → Code → Verify → Commit 工作流、让它自己验证的做法、worktree 并行与 Writer/Reviewer 互审、提示词公式与「模糊 → 具体」示例，均来自该报告转述的 README 原文（该报告正文在「重构一下」示例处截断，本手册也照此截断标注）。109 stars、12 个模块、8 个实验、13 类任务的提示词库、插件示例与 GitHub Actions 示例均为仓库自述，未在原文中独立验证。原文没有给出 install.sh / labs / starter-kit 的具体内容与任何效果数据；「先把 README 里可直接复制的片段在单个真实项目上落地，再决定是否引入 starter-kit 与 CI 集成」是调研结论中的作者主张。
- 做法 D 依据调研《anomalyco/opencode》：安装命令列表（curl 脚本、npm/bun/pnpm/yarn、scoop、choco、brew tap 与官方 formula、pacman、paru、mise、nix）及「先卸载 0.1.x 之前版本」的提示、安装脚本目录优先级四档与两段示例命令、内置 agent 列表与 `Tab` 切换、`plan` 的默认权限行为、`@general` 调用方式、桌面版下载平台与包名与两条安装命令，均来自该报告转述的 README 正文。其中「The open source AI coding agent」是自我描述，README 未给许可证、代码规模或架构说明；211212 stars 来自输入元数据、README 正文未提及且量级异常；「Ideal for exploring unfamiliar codebases or planning changes」是作者对 plan agent 适用场景的主张，没有案例或对比支撑。「先把 `plan` 用于陌生代码库的定位与规划、确认后再切 `build` 执行」是调研结论中的作者主张。
- 做法 E 依据调研《openai/codex》：安装命令（Mac/Linux 的 `curl | sh`、Windows 的 PowerShell、npm、Homebrew）、下载源与回退机制、`CODEX_INSTALLER_USE_RELEASES_OPENAI_COM` 环境变量、各平台二进制文件名、登录方式（Sign in with ChatGPT 优先，API key 需额外设置）、许可证（Apache-2.0）、仓库星标 127,454，均来自该报告转述的 README 首页。其中「推荐用 ChatGPT 账号登录以作为订阅计划的一部分使用」属于官方推荐，非第三方验证结论。抓取内容只有 README 首页，没有工作流、提示词、权限/沙箱/审批配置、性能或成本数据；做法 E 的「怎么判断变好了」指标由调研报告提出，原文未给出。
- 做法 F 依据调研《Claude Mods: Setup, Function Hooks and Security》：实验开关 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`、`/plugin-types`、`--plugin-dir`、`plugin test`、插件目录结构、`hooks.json` 的 `modules` 片段、选型表、验收矩阵、成本公式、`sec-default` 与 `telemetry` 的边界说明，均来自该报告转述的官方更新、源码与文档审阅。其中「作者自述这是文档与源代码审阅，不是实测 benchmark，也不是生产就绪证明」「文中所有命令是源码记录的，作者未声称在真实 Claude 会话中执行过」「三个试点设计是提出的试点设计，不是部署记录或担保的内置功能」「安全验收矩阵是待实现和验证的验收要求，不是对当前每种失败模式的断言」「供应链审阅清单是工程建议」「成本核算公式是作者自述的评估方法，不是 Anthropic 的计费公式」均为原文明确声明。没有测得的节省百分比；Mod 本身不是价格折扣；额外的工具调用、上下文、重试、开发与维护成本都要计入。原文还明确否认「hook 环境没有 Node.js 或浏览器 DOM」构成完整安全论证——能访问强大中介工具的 Mod 仍需要仔细划定信任边界，权限、网络限制、数据处理和管理配置必须单独审阅。
- 做法 G 依据调研《earendil-works/pi》：安装命令（`pi.dev` 安装脚本、Windows PowerShell、npm 安装）、Node.js 22.19+ 前提、`pi update`、启动与 `/login`、Nix 运行与固定版本命令及平台支持、各包列表与职责、三种容器化模式、源码开发与独立二进制构建命令、供应链加固机制、`pi-telemetry` 与 `badlogic/pi-share-hf`、OpenClaw 集成案例，均来自该报告转述的项目原文。其中 stars 111397 来自给定 metrics；「minimal, extensible」「adapt Pi to your workflows, not the other way around」、公开真实会话数据比玩具 benchmark 更能改进 agent、「ships with powerful defaults」为作者主张；extensions、skills、prompt templates、themes、packages、containerization、usage、cli、rpc、sdk 在原文里只是链接，正文没有内容；原文没有效果数据、案例细节、对比测试、性能或质量数字；主动推进只有基础设施线索，没有时间/事件/状态触发的配置或步骤。做法 G 的最小试用方式与对照指标由调研报告提出，原文没有基线或阈值。
- 五条已有线索加 Claude Mods、pi 都没有给出「AI 是否让结果变好了」的对照评测方法或基准数据。agentbox 的成本与用量指标属于记账维度；goose 没有任务效果指标；claude-code-pro-course 没有效果数据；OpenCode 与 Codex 的 README 也没有效果数据；Claude Mods 的验收矩阵与成本公式是作者提出的评估方法；pi 的原文同样没有效果数据，其会话导出只是留档路径。做法 C、D、E、F、G 的「怎么判断变好了」分别沿用做法 B 或调研报告提出的最小试用方法与指标，属于作者主张。
- 与清单的关系：agentbox 不替代 Claude Code，而是给它（以及 Codex CLI）提供自托管环境；goose 这条线索给出了可复制安装命令和通过 MCP 供给工具权限、通过定制发行版预置配置两条路径；claude-code-pro-course 给出了项目级护栏与自动化触发的可复制配置；OpenCode 补上了可复制的安装命令和 `build`/`plan` 权限分工，但 README 不含效果数据，不足以支撑 adopt，可作为把清单中 OpenCode（watch）推进到 try 的依据；Codex CLI 给出了安装与登录路径，并说明可作为 Cursor 里的智能体使用（同一层叠加），但原文只到首页，可作为对比参照，没有给出与 Cursor 的功能差异证据；Claude Mods 补上了 Claude Code 的运行时/界面扩展面、选型表、验收矩阵与成本口径，但处于 early access，适合受控试点而非直接采纳；pi 补上了「统一多提供商接口 + 可嵌入 harness」这一层，给出了安装、启动、登录、Nix 固定版本与三种容器化边界的可复制步骤，并把 OpenClaw 列为真实集成案例，但 README 是宣传 + 导览，扩展与容器化细节只给了链接，默认没有权限系统，没有效果数据，需要在容器里实测后再决定是否写进日常流程。七条都可把评估从 watch 上调为 try，但都必须先读官方文档、审查安装脚本，并做一次实际任务。

## 依据的调研

- [devilcoolyue/agentbox](../research/radar/2026-10-02/36-devilcoolyue-agentbox.md)：值得一试，建议在一台可信的 Linux 服务器上小范围试装 agentbox，用它把 Claude Code / Codex CLI 装进 Docker 工作区，换取持久工作区、共享目录、统一 Git 审查和按轮次的用量成本记录；理由是一键安装命令、最小配置样例和任务闭环步骤都可直接照做，但项目仅 34 stars、稳定版 v0.1.7，且原文自述存在 bypassPermissions 默认权限、凭据可被终端用户读取、单机单进程等硬约束，暂不适合直接作为通用方案推给不特定的人。
- [aaif-goose/goose](../research/radar/2026-10-01/550-aaif-goose-goose.md)：值得一试，建议小范围试用：在非生产机器上用给出的命令装 CLI，接一个模型供应商和 1~2 个相关 MCP 扩展，拿一个重复性任务跑通并记录人工耗时变化；理由是它是本地运行、能用 MCP 供给工具与权限的通用 agent，README 给了可复制的安装方式，但配置与工作流细节缺失，须配合官方文档。
- [justxor/claude-code-pro-course](../research/radar/2026-10-02/672-justxor-claude-code-pro-course.md)：值得一试，建议小范围试：先把 README 里可直接复制的片段（短 CLAUDE.md、permissions 的 allow/ask/deny、PostToolUse 自动格式化 hook、subagent 与 skill 定义、Plan mode 工作流）在单个真实项目上落地，再决定是否引入其 starter-kit 安装脚本与 CI 集成；理由是这些配置具体到可照抄、覆盖了上下文供给与自动化触发两条主线，但仓库自带的 install.sh／labs／starter-kit 具体内容与任何效果数据都未在原文中给出，不足以直接判定为成熟可采用的成品。
- [anomalyco/opencode](../research/radar/2026-10-02/511-anomalyco-opencode.md)：值得一试，可先在一台开发机上按 README 给的 brew/npm 命令安装 OpenCode，用 Tab 在 build 与 plan 之间切换，把「读陌生代码库、出改动计划」固定交给只读的 plan agent，确认后再切到 build 执行。理由：README 直接给出了可复制的安装命令和 plan agent 的权限行为（默认拒绝文件编辑、执行 bash 前询问），这套「先只读规划、再放权编辑」的分工流程可以照做；但仓库内容只到入口层，配置细节与效果未给，需自行验证。
- [openai/codex](../research/radar/2026-10-02/516-openai-codex.md)：值得一试，可以按 README 给出的命令在本机装好 Codex CLI、用 ChatGPT 账号登录，先在真实小仓库里跑通一次终端编码任务；因为原文只提供了安装与登录这类可照做的步骤，没有可提炼的工作流配置，所以先小范围试而不是直接采用。
- [Claude Mods: Setup, Function Hooks and Security](../research/radar/2026-10-02/851-claude-mods-setup-function-hooks-and-security.md)：值得一试，把 Claude Mods 当作受控试点的运行时/界面扩展面来用：先用实验开关与 /plugin-types 在一次性项目里跑通官方 diff 示例，再按文章的验收矩阵和「每被接受任务总成本」指标判断是否留下。理由是原文给出了可直接复制的启用命令、插件目录结构、hooks.json 片段和一整套安全验收检查，但它自认只是文档与源码审阅、API 处于 early access，因此不适合直接采纳为生产依赖。
- [earendil-works/pi](../research/radar/2026-10-03/518-earendil-works-pi.md)：值得一试，建议小范围试：按 README 的安装脚本装好 pi，在单个有版本控制的项目目录里用 /login 接入模型跑一个边界清晰的小任务（优先在容器里跑），验证它作为「统一模型接口 + 编码 agent」能否承载可复用的协作工作流；理由是原文给出了安装、启动、登录、容器化三类能直接照做的步骤，但扩展、技能、提示词模板等定制细节全在外链文档里，只有实测才能判断值不值得写进手册。
