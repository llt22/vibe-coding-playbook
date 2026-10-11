# aindeev/agent-chrome-relay

- 结论：**值得一试**。在一台 Mac 上按 README 的 setup 流程装 Chrome Relay，让 Claude Code/Codex/Cursor 这类编码 agent 借用你已登录的 Chrome 后台标签页做网页操作；它给出了可直接照做的命令、安装步骤和权限/审计机制，值得小范围试，但仅限 macOS、只放行四类 agent 应用，且作者自认不是恶意软件的边界，所以先试不要全量铺开。
- 原文：https://github.com/aindeev/agent-chrome-relay
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-11T02:13:05.996Z

## 是什么

Chrome Relay 让编码 agent（Claude Code、Codex、Cursor、Paseo）从命令行使用**你日常在用的 Chrome**（带真实登录态），并在**后台标签页**里运行：不抢焦点、不弹对话框，作者称每条命令约 0.15 秒。

链路结构（原文）：

```
agent-browser (CLI) ──ws──▶ relay (127.0.0.1:9333, LaunchAgent) ──ws──▶ Chrome Relay extension ──chrome.debugger──▶ agent tab
```

- **扩展**（`extension/`，MV3，每个加载它的 Chrome profile 一个）：把 agent 标签页开成**非激活**状态，收在折叠的 "Agents" 标签组里，通过 `chrome.debugger` 在里面执行 DevTools 命令。不用远程调试端口，所以 Chrome 不会弹 "Allow remote debugging?"（但工作期间 Chrome 会显示 "Chrome Relay started debugging this browser"）。
- **Relay**（`relay/relay.mjs`）：每个 agent 一个 DevTools 端点，agent 只能看到并控制自己开的标签页；可能唤起或聚焦浏览器的命令会被吞掉。
- **CLI**（`bin/chrome-relay`）：安装、连接 URL、诊断、审计。

它是 opt-in 的：不会替你装扩展，且只在设置过它的 Mac 上运行。

## 具体做法（编号步骤）

前提：macOS、Google Chrome、Node.js 20+，以及 `agent-browser`。

1. 安装 agent-browser：

```bash
npm i -g agent-browser
```

2. 克隆仓库并执行 setup（最省事的替代方案：把 https://agent-chrome-relay.aindeev.com/setup-prompt.txt 粘进 Claude Code / Codex / Cursor，让 agent 自己装）：

```bash
git clone https://github.com/aindeev/agent-chrome-relay
cd agent-chrome-relay
bin/chrome-relay setup     # secret, background service, identities, `chrome-relay` on PATH, Claude Code skill
```

（setup 会生成密钥、装后台服务、生成身份映射、把 `chrome-relay` 放进 PATH，并把 Claude Code skill 链进去。）

3. **在每个希望 agent 使用的 Chrome profile 里**加载扩展：打开 `chrome://extensions`，打开 **Developer mode**，点 **Load unpacked**，选中你 clone 下来的 `extension` 文件夹。

4. 自检：

```bash
chrome-relay doctor
```

5. 告诉 agent 怎么用这个 skill：Claude Code 由 `setup` 自动把 `skill/SKILL.md` 链到 `~/.claude/skills/chrome-relay`（所有仓库都能用）；Codex、Cursor 等把同一个文件指给它们，例如在全局 `~/.codex/AGENTS.md` 里写一行：*"For any browser step that needs my logins, follow `<path>/agent-chrome-relay/skill/SKILL.md`."* 某个仓库的 `CLAUDE.md`/`AGENTS.md` 只需一行指向该 skill。

6. 典型用法（在 agent 里或命令行）：

```bash
agent-browser --cdp "$(chrome-relay url you@company.com)" open https://app.example.com/
agent-browser snapshot -i          # the page's buttons, links and fields, each with a ref like @e5
agent-browser click @e5
agent-browser close
```

7. 日常维护：`git pull` 之后跑 `chrome-relay update`（重启 relay，并在每个 profile 重载扩展）。卸载：`chrome-relay uninstall`，然后每个 profile 里手动移除扩展。

8. 排查与审计：`chrome-relay logs`（日志在 `~/.chrome-relay/relay.log`）；`chrome-relay audit` 读 `~/.chrome-relay/audit/YYYY-MM-DD.jsonl`；`chrome-relay identities` 管身份映射。环境变量 `CHROME_RELAY_HOME`、`CHROME_RELAY_PORT` 可覆盖数据目录和端口。改扩展要编辑 `extension/` 后跑 `chrome-relay update`。

9. 谁可以连（两道校验，属配置前提）：
   - **本机 secret**：setup 时生成在 `~/.chrome-relay/token`（权限 600），嵌在 `chrome-relay url` 打印的 URL 里。
   - **允许的 agent 应用**：连接进程必须来自 Claude Code、Codex、Cursor 或 Paseo——relay 用 `lsof`、`ps` 查进程，并检查这些应用在子进程里设的标记（`CLAUDECODE`、`CODEX_*`、`CURSOR_*`、`PASEO_AGENT_ID`）及其父进程。
   - 带浏览器 `Origin` 头的连接（网页）即使有 secret 也被拒。扩展连接还需 `Origin: chrome-extension://<id>`，且 id 由 setup 记到 `~/.chrome-relay/config.json`；连接进程必须是 Chrome。

10. 登录态（`~/.chrome-relay/identities.json`，用 `chrome-relay identities` 管理）：agent **从不输入凭据**。当站点跳到 Google 且对应账号**已登录**时，扩展会替它点账号并点 **Continue/Allow**（页面脚本方式，所以 1Password 的框在页面上也照样工作）。遇到密码、passkey、两步验证或未登录账号，就停下，agent 收到 `SIGN-IN NEEDED: ...`，让你在自己的窗口里登录。站点用哪个 Google 账号来自 identities.json：Chrome profile（setup 填好）、可选的 `sites.rules`、以及 relay 每次成功跳转后自己填的 `sites.learned`。默认用 profile 自己的账号。

## 对应的研究问题

1. **能力发现**：把「用你的真实登录态在浏览器里干活」这件事交给编码 agent——open 页面、`snapshot -i` 抓按钮/链接/字段（带 `@e5` 这类 ref）、`click`、`close`。这类需要登录态的浏览器操作过去不容易交给 AI。
2. **任务匹配**：面向编码 agent（Claude Code、Codex、Cursor、Paseo）的浏览器步骤；因为是后台标签页、不抢焦点、不弹框，适合与编码工作并行跑。CLI 与 relay 之间走本机 WebSocket（127.0.0.1:9333）。
3. **条件供给**：需要 macOS + Chrome + Node.js 20+ + `agent-browser`；需要每个 profile 手动加载扩展；需要 `chrome-relay setup` 生成 token、装 LaunchAgent、生成 identities.json；需要把 SKILL.md 指给 agent（Claude Code 自动，Codex/Cursor 手动加一行）。反馈来自 audit trail。
4. **主动推进**：原文的自动行为是**清理而非任务推进**——沉默 30 分钟的 agent 标签页会被关闭；relay 重启时扩展会关掉它开过的标签页（按 tab id 追踪，不动你自己的标签组）。另外登录跳转中的 Continue/Allow 会自动点击。原文没有描述按时间/事件持续跑的自主任务循环。
5. **效果验证**：`chrome-relay doctor` 自检；audit 记录每个 agent 动作——谁连的（应用、Claude/Paseo session id、工作目录、`AGENT_BROWSER_SESSION`）、页面、带位置的点击、特殊键、agent 自己的脚本、截图、上传、弹窗、登录点击、被拦页面。输入文本只存字符数，URL 去掉 query string。

## 与已有做法的关系

清单中有相关条目，且本工具正是为它们服务的：**Claude Code**（adopt）、**Paseo**（adopt）、**Cursor**（watch）——Chrome Relay 放行的 agent 应用恰好是这四类（加 Codex）。setup 会直接往 `~/.claude/skills/chrome-relay` 装 skill；Codex/Cursor 需要在全局 AGENTS.md 里加一行指针。清单里没有关于「给 agent 提供带登录态的真实浏览器」的其他条目。

## 证据与局限

**原文给出的可核验细节**：完整命令（setup/update/uninstall/doctor/logs/audit/identities、`agent-browser` 四步用法）、架构图、路径（`~/.chrome-relay/` 下的 token、config.json、identities.json、audit/、relay.log）、端口 127.0.0.1:9333、权限校验机制、以及 `relay/` 下有 `npm test` 覆盖「谁可以连接」（secret、允许的应用、Chrome-only 扩展、审计）。作者称 setup 约 2 分钟、每条命令约 0.15 秒、30 分钟沉默清理。

**仅为作者主张**：0.15s/命令、2 分钟 setup 都是作者自述，没有第三方基准或用户案例数据；「让 agent 用真实登录态」的收益也没有实测数字。

**适用条件与限制**：仅 macOS + Google Chrome + Node.js 20+；只放行 Claude Code/Codex/Cursor/Paseo 四类 agent 应用；要每个 profile 手动 Load unpacked；作者明确说明它**不是**对「已以你身份运行的恶意软件」的安全边界（那种程序能读 secret、伪造标记）。工作期间 Chrome 会显示调试提示条。

## 怎么试、怎么验证

**最小试用**（一台 Mac，约需几分钟安装）：
1. `npm i -g agent-browser`，clone 仓库后跑 `bin/chrome-relay setup`。
2. 在**一个** Chrome profile 里 Load unpacked 加载扩展，跑 `chrome-relay doctor` 确认。
3. 选一个**需要登录**的内部站点，让 agent 走完 `chrome-relay url <你的邮箱>` → `open` → `snapshot -i` → `click @e5` → `close` 这条四步流程，中途不手动登录。
4. 跑 `chrome-relay audit` 复盘这次会话记录是否完整。

**判断有没有改善的指标**：
- 这四步流程一次跑通的成功率，以及每条命令的实际耗时（对照作者称的 ~0.15s）。
- 出现 `SIGN-IN NEEDED` 的次数（次数越少说明登录态复用越顺；频繁出现则说明身份映射 `identities.json` 要调）。
- 运行过程中是否发生抢焦点、弹框、Chrome 弹远程调试确认框（按设计应为 0）。
- `chrome-relay audit` 里 blocked pages 的数量与原因，确认权限边界符合预期。
- 对比基线：同样这些浏览器步骤之前靠人工切换窗口/手动登录花的时间。

**放量前的门槛**：先只在单机单 profile、非关键账号上试；确认 audit 记录、权限拦截和登录跳转行为符合预期后，再考虑更多 profile 或更多 agent。
