# 让编码 agent 在项目规则里反复跑，而不是在本机随手跑一次

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：把编码 agent 从「在本机随手跑一次」变成「在可控环境里、按项目规则反复跑」：补齐工作区持久化、权限边界、工具与扩展供给、项目级护栏和按轮用量成本记录。
> 先试这一步：先在单个真实项目里手写一份短 CLAUDE.md 和 `.claude/settings.json` 的 allow/ask/deny，再用 Plan mode 跑一个一文件以上的任务，结束后看 git diff 再决定合并。
> 最近修订：2026-10-02

## 解决什么问题

本手册解决的是：把编码 agent（Claude Code / Codex CLI / 通用 agent）从「在本机随手跑一次」变成「在可控环境里、按项目规则反复跑」。要补五件事：工作区与文件持久化、权限与凭据边界、工具与扩展供给、项目级护栏（上下文供给 + 自动化触发）、按轮次的用量成本记录。给出三条可照做的路径：做法 A 是在 Linux 服务器上自托管 agentbox 工作区；做法 B 是在非生产机器上装 goose，用 MCP 供给工具与权限；做法 C 是在单个真实项目里给 Claude Code 配 CLAUDE.md、allow/ask/deny 权限、hook、subagent、skill，并把主工作流固定成 Explore → Plan → Code → Verify → Commit。

## 适用与不适用

适用：
- 需要在服务器或非生产机器上把 Claude Code、Codex CLI 或通用 agent 跑起来，需要持久工作区、共享目录、Git 变更审查、按轮成本记录的人（做法 A / B）。
- 想用 MCP 给 agent 供给工具与权限，然后观察任务完成率与人工介入时间的人（做法 B / C）。
- 已经在单个真实项目里用 Claude Code，想照抄一份短 CLAUDE.md、权限白名单、PostToolUse hook、subagent 与 skill 定义，把「动作 → 校验」闭环固定下来的人（做法 C）。
- 能给出一台非生产机器或一个可回退的 Git 分支，愿意先小范围试用再扩大的人。

不适用：
- agentbox 只有 34 stars、稳定版 v0.1.7，原文自述存在 bypassPermissions 默认权限、凭据可被终端用户读取、单机单进程等硬约束，暂不适合直接作为通用方案推给不特定的人。
- goose 只有 README 级信息，供应商配置字段、权限设置、提示词、工作流步骤都没给，要照做必须查官方文档。
- claude-code-pro-course 只有 109 stars，README 是课程宣传页；install.sh、labs、starter-kit 的具体内容与任何效果数据都没有在原文中给出，不能直接判定为成熟可采用的成品。
- 三者都没有给出「AI 是否让结果变好了」的对照评测方法或基准数据；agentbox 只提供成本与用量维度度量，goose 没有任务效果指标，claude-code-pro-course 没有效果数据。
- 涉密或受管环境要额外做安全审查与权限约束，不能直接照搬 `curl | bash` 类安装。

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

## 操作步骤

三条做法按环境选：要服务器、多人、持久工作区、共享目录、Git 审查、按轮用量成本记录，选做法 A；只有一台非生产机器、想要通用 agent 并愿意自己接 MCP，选做法 B；已经在单个真实项目里用 Claude Code、想把项目级规则和自动化触发固定下来，选做法 C。做法 C 可以和 A 叠加：A 管服务器工作区与账号边界，C 管单个项目内的工具调用规则。

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

## 证据与来源

- 做法 A 依据调研《devilcoolyue/agentbox》：一键安装命令、最小配置样例、工作区任务闭环步骤、容器默认限额（2048 MiB / 2 CPU / 512 进程）、账号池与凭据约束、备份与价格目录说明，均来自该报告转述的项目原文。其中「暂不适合直接作为通用方案推给不特定的人」是调研结论中的作者主张。
- 做法 B 依据调研《aaif-goose/goose》：安装命令来自 README；54,827 stars、15+ 供应商、70+ MCP 扩展、Apache-2.0、AAIF / Linux Foundation 托管、CI workflow 徽章、repology 打包状态均为仓库自述与徽章，未在原文中独立验证。其余关于通用能力的表述均为作者主张，无数据或案例支撑。
- 做法 C 依据调研《justxor/claude-code-pro-course》：安装命令、`CLAUDE.md` 模板、`permissions` 配置、`PostToolUse` hook 配置、subagent 与 skill 定义、MCP 命令与 `.mcp.json`、headless / CI 命令、GitHub 集成提示词、Explore → Plan → Code → Verify → Commit 工作流、让它自己验证的做法、worktree 并行与 Writer/Reviewer 互审、提示词公式与「模糊 → 具体」示例，均来自该报告转述的 README 原文（该报告正文在「重构一下」示例处截断，本手册也照此截断标注）。109 stars、12 个模块、8 个实验、13 类任务的提示词库、插件示例与 GitHub Actions 示例均为仓库自述，未在原文中独立验证。原文没有给出 install.sh / labs / starter-kit 的具体内容与任何效果数据；「先把 README 里可直接复制的片段在单个真实项目上落地，再决定是否引入 starter-kit 与 CI 集成」是调研结论中的作者主张。
- 三条线索都没有给出「AI 是否让结果变好了」的对照评测方法或基准数据。agentbox 的成本与用量指标属于记账维度；goose 没有任务效果指标；claude-code-pro-course 没有效果数据。做法 C 的「怎么判断变好了」沿用做法 B 的最小试用方法与指标，属于作者主张。
- 与清单的关系：agentbox 不替代 Claude Code，而是给它（以及 Codex CLI）提供自托管环境；goose 这条线索给出了可复制安装命令和通过 MCP 供给工具权限、通过定制发行版预置配置两条路径；claude-code-pro-course 给出了项目级护栏与自动化触发的可复制配置。三条都可把评估从 watch 上调为 try，但都必须先读官方文档、审查安装脚本，并做一次实际任务。

## 依据的调研

- [devilcoolyue/agentbox](../research/radar/2026-10-02/36-devilcoolyue-agentbox.md)：值得一试，建议在一台可信的 Linux 服务器上小范围试装 agentbox，用它把 Claude Code / Codex CLI 装进 Docker 工作区，换取持久工作区、共享目录、统一 Git 审查和按轮次的用量成本记录；理由是一键安装命令、最小配置样例和任务闭环步骤都可直接照做，但项目仅 34 stars、稳定版 v0.1.7，且原文自述存在 bypassPermissions 默认权限、凭据可被终端用户读取、单机单进程等硬约束，暂不适合直接作为通用方案推给不特定的人。
- [aaif-goose/goose](../research/radar/2026-10-01/550-aaif-goose-goose.md)：值得一试，建议小范围试用：在非生产机器上用给出的命令装 CLI，接一个模型供应商和 1~2 个相关 MCP 扩展，拿一个重复性任务跑通并记录人工耗时变化；理由是它是本地运行、能用 MCP 供给工具与权限的通用 agent，README 给了可复制的安装方式，但配置与工作流细节缺失，须配合官方文档。
- [justxor/claude-code-pro-course](../research/radar/2026-10-02/672-justxor-claude-code-pro-course.md)：值得一试，建议小范围试：先把 README 里可直接复制的片段（短 CLAUDE.md、permissions 的 allow/ask/deny、PostToolUse 自动格式化 hook、subagent 与 skill 定义、Plan mode 工作流）在单个真实项目上落地，再决定是否引入其 starter-kit 安装脚本与 CI 集成；理由是这些配置具体到可照抄、覆盖了上下文供给与自动化触发两条主线，但仓库自带的 install.sh／labs／starter-kit 具体内容与任何效果数据都未在原文中给出，不足以直接判定为成熟可采用的成品。
