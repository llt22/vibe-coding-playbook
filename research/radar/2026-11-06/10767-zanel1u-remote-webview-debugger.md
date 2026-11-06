# ZaneL1u/remote-webview-debugger

- 结论：**值得一试**。把 RWD 当作小范围试点：自托管一个网关，让 Claude Code 经 MCP 接入一台真实手机的 WebView/H5，专门处理「只在某台设备上复现、又没有 USB 和调试端口」的 bug；原因是 README 给出了可直接照抄的部署命令、SDK 接入片段和 `claude mcp add` 配置，同时提供了分级授权、掩码和审计等可执行的安全配置，但项目年轻（SDK 0.3.0、51 stars），效果与隐私承诺都只有作者主张，需先自行验证。
- 原文：https://github.com/ZaneL1u/remote-webview-debugger
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-06T02:33:09.554Z

## 是什么

Remote WebView Debugger（RWD）是一个自托管的远程 WebView/H5 调试网关。页面注入一段 SDK 后，用户在手机上看到带设备码的小胶囊并可点「请求协助」；AI 智能体通过 MCP（Claude Code、Cursor 或任意 MCP 客户端）在设备端批准后接入，读取无障碍快照、console、网络（含 body）、存储与截图，并像人一样点击、输入、滚动，可跨该设备的所有页面与 WebView。同时它把真正的 Chrome DevTools（Elements / Console / Network / Application）经 Web 控制台开放给人。

架构（原文）：

```
Claude Code / Cursor ──MCP (HTTPS)──▶ Gateway ──WebSocket──▶ SDK in the page ──▶ DOM · console · network
                                         ▲
                                   Web console
```

形态：单个 Go 二进制，内嵌控制台与 SDK，SQLite 或 Postgres。目标场景是「只在某个用户手机上、某个 App 的 WebView 或微信类超级 App 里复现」的 bug——没有 USB 线、没有远程调试端口、本地无法复现。

## 具体做法

### 1. 起网关
前提：有 Docker；选定一个「手机和 agent 都能访问」的地址。

```bash
docker run -d --name rwd -p 8080:8080 -v rwd-data:/data \
  -e RWD_ADMIN_PASSWORD='change-me' \
  ghcr.io/zanel1u/remote-webview-debugger:latest
```

打开 `http://<your-host>:8080`，用 `admin` + 该密码登录。不设 `RWD_ADMIN_PASSWORD` 则随机密码只在 `docker logs rwd` 打印一次。数据在 `rwd-data` 卷；升级是 pull 新 tag 后重建容器。

常用设置（`-e` 传入）：

| 变量 | 用途 |
|---|---|
| `RWD_ADMIN_EMAIL` | 所有者登录名（默认 `admin`） |
| `RWD_PUBLIC_URL` | 手机与 agent 使用的地址，如 `https://rwd.example.com/v1`，与浏览器地址不同时用 |
| `RWD_LANG=zh` | MCP 工具描述与结果用中文 |
| `RWD_DATABASE_URL` | `postgres://…` 改用 Postgres 而非 SQLite |
| `RWD_TRUST_PROXY=1` | 仅在自建反代之后：从 `X-Forwarded-*` 取客户端 IP 与 scheme |

其它运行方式：二进制（解包后 `./rwd serve --addr :8080`）；`deploy/platform` 的 Docker Compose（前面加 Caddy，`RWD_DOMAIN=<host>` 自动签 Let's Encrypt 证书）；源码 `make -j16` 后 `gateway/bin/rwd-<os>-<arch> serve --addr :8080`。

### 2. 让页面在线
前提：先在控制台建项目拿到 app key（形如 `rwd_pk_…`）。

```html
<script src="https://cdn.jsdelivr.net/npm/remote-webview-debugger@0.3.0/dist/sdk.js"></script>
<script>RemoteWebviewDebugger.run('https://rwd.example.com/v1', 'rwd_pk_…')</script>
```

也可从 unpkg 加载，或 `npm install remote-webview-debugger` 后 `import { run } from 'remote-webview-debugger'`；网关自身也在 `/v1/sdk.js` 提供内嵌副本。App 内则由原生代码在 document start 注入同一脚本（iOS `WKUserScript`、Android `addDocumentStartJavaScript`，见 `docs/native-integration.md`）。

### 3. 接入智能体
前提：在控制台建 API key——原文说「一把钥匙可触达所有设备」。

```bash
claude mcp add --transport http rwd https://rwd.example.com/v1/mcp --header "Authorization: Bearer rwd_sk_live_…"
```

然后用自然语言下任务，带上设备码，例如原文示例：

> "Connect to device K7Q2-9M4X and find out why the checkout total shows `--`."

### 4. 先定 HTTP 还是 HTTPS
前提：决定因素是**被调试的页面**，不是网关。https 页面不能加载 http 脚本、不能开 ws://（混合内容），即使 sdk.js 来自 HTTPS CDN。

| 被调试页面 | 网关纯 HTTP |
|---|---|
| `http://`：本地 dev server、内网测试环境 | ✅ 可用 |
| 浏览器或 iOS `WKWebView` 里的 `https://` | ❌ 被混合内容拦截，必须给网关 HTTPS |
| Android WebView 里的 `https://` | ⚠️ 仅当 App 在 debug 构建里调用了 `setMixedContentMode(MIXED_CONTENT_ALWAYS_ALLOW)` |

纯 HTTP 下 API key 与控制台密码明文传输，只放在可信网络。要 HTTPS：用 Compose 加 `RWD_DOMAIN=<host>`，或容器挂在自己的 TLS 反代后并加 `-e RWD_TRUST_PROXY=1`。

### 5. 设定授权与隐私边界
前提：从最低权限起步，确认行为正常再提级。

- 设备端批准分级：`observe` / `interact` / `advanced`；可开自动批准。
- 敏感动作在元素上加 `data-rwd-confirm`，要求二次确认。
- 智能体操作期间锁屏，页面显示发光边缘、agent 光标和带计划步骤的任务卡；用户可随时 take over / hand back / end。
- 掩码：密码框、`data-rwd-mask`、可配置选择器/正则，在快照、截图、console、网络数据里统一生效。
- 审计日志记录谁做了什么，不含页面内容。
- API key 可设级别 / 有效期 / IP 白名单；另有成员与角色、设备 token、二维码邀请、配额、SSE 实时控制台、Prometheus 指标。

### 6. 可选：与 eruda 共存
原文提供可选的 eruda 内「Remote Debugger」标签页，并可按需为开发者加载 eruda。

## 对应的研究问题

**1. 能力发现**——原文列出的 agent 工具集就是可交给 AI 的新工作面：无障碍快照（带元素 ref，Playwright 的 aria snapshot）、find、click、fill、type、press、select、hover、scroll、drag、navigate、evaluate、console、带 body 的 network、storage、截图（原生桥或 DOM）、批量动作、wait 与事件。对应的是以前只能靠人肉连 USB/开远程调试端口的真机 H5 定位工作。

**2. 任务匹配**——适合「只在特定设备/特定 WebView 里复现、本地无法重现」的移动端页面缺陷定位与验证；宿主侧要求一个 MCP 客户端（Claude Code、Cursor 或任意 MCP client）。协作方式被明确设计成三级授权 + 敏感动作二次确认 + 用户随时接管，属于「人可中断的 agent 操作」而非全自动。

**3. 条件供给**——需要给齐：可被手机与 agent 访问的网关（含 HTTPS 与否的决策）、页面侧 SDK（script 标签或原生 document-start 注入）、控制台里的项目 app key、API key，以及**设备端用户当场批准**。另外要给 agent 一个设备码和一句自然语言目标。

**4. 主动推进**——仅部分有依据：原文提到 waits and events、批量动作、自动跟随导航与新开 WebView、跨页时间线，属于会话内的连续推进；**没有**时间/事件触发的常驻任务、后台监控或无人值守轮询的描述，不能据此推断可做「自动巡检」。

**5. 效果验证**——有可观测性底座：Prometheus 指标、SSE 实时控制台、记录操作者与动作的审计日志。但原文没有给出「修复后结果是否真的改善」的任何指标、对照或案例数据。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：原文把它列为首要 MCP 客户端，并给出可直接执行的 `claude mcp add --transport http ...` 接入命令，是本工具落地的现成入口。
- **Cursor（清单状态 watch）**：原文将 Cursor 与 Claude Code 并列为可用 MCP 客户端，但未给出 Cursor 侧的具体配置步骤。
- **Playwright Test（清单状态 try）**：技术上有直接血缘——页面侧引擎复用了 Playwright 的 accessibility snapshot 代码（Apache-2.0），工具描述也写明是「Playwright's aria snapshot」。含义是元素定位语义与 Playwright 一致，本地测试里熟悉的 snapshot + ref 操作方式可以平移到真机 WebView。但两者用途不同：Playwright Test 是本地/CI 自动化测试，RWD 是在真实用户设备上做远程诊断与协作操作。
- 清单中没有其它相关条目。

## 证据与局限

**原文给出的可核查物**：完整可复制的部署命令与配置项表、SDK 接入片段、`claude mcp add` 命令、HTTP/HTTPS 混合内容对照表、三种部署方式、CI badge、npm 包（v0.3.0）、MIT 许可、11 种语言、示例目录（多页 demo shop、托管 WKWebView 的 macOS App）、独立版本与 changelog（`sdk-vX.Y.Z` / `gateway-vX.Y.Z`）。

**只是作者主张、无数据支撑**：隐私承诺（密码/手机号/卡号在离开手机前被掩码、审计日志不含页面内容）没有第三方验证或测试报告；「像人一样点击输入」没有成功率/准确率数据；没有用户案例与前后对比数据；51 stars 说明实际采用面还很窄。

**适用条件与硬约束**：被调试页面必须运行在用户设备上且用户在场并能批准；`https://` 页面必须给网关配 HTTPS（浏览器与 iOS WKWebView 无例外，Android 仅 debug 构建放开混合内容）；纯 HTTP 只适合可信网络；自托管意味着自己承担部署、证书与运维；SDK 与网关分别发版（SDK 0.3.0），接口可能变动。

**对本项目的含义**：这是一个「窄而深」的可执行样本——把权限、同意、掩码、审计这些 agent 接入真实环境的前置条件写成了具体配置项，可提炼为通用清单；但不要把它的能力外推到「通用的移动端自动化平台」。

## 怎么试、怎么验证

**最小试用（建议 1 天内跑完，全程用测试账号与隔离测试环境）**

1. 本机或内网起网关（纯 HTTP 即可），登录控制台建项目拿 app key、建 API key。
2. 准备一个内网 `http://` 测试页，人为植入一个已知缺陷（例如结算金额显示成 `--`），按第 2 步接入 SDK。
3. 在真机（先用内网测试环境，避开真实用户）打开该页，记住设备码。
4. 用 `claude mcp add` 接入，把授权级别设为 `observe`，先只让 agent 读快照/console/network 并说出它看到的现象。
5. 升到 `interact`，让它执行复现路径（点击、输入、滚动），观察任务卡步骤是否与预期一致，随时准备接管。
6. 在同一页面上加 `data-rwd-mask` 和一个密码框，检查快照、截图、console、network body 里是否出现明文。

**判断有没有改善的指标**

- 定位耗时：从拿到 bug 描述到 agent 指出根因的时间，对比人工路径（无 USB 场景下人工通常无法定位，可用「是否能在当天给出根因」作二分指标）。
- 首轮定位是否命中：需要几轮追问才给出可行动的结论。
- 人工介入率：一次会话中用户 take over 的次数与时机。
- 掩码有效性：人工抽查快照/截图/network body 中是否出现密码、手机号、卡号明文（应为 0）。
- 授权摩擦：设备端从发起到批准的耗时、误批准次数。
- 副作用：agent 操作是否写入脏数据（用测试库判定）、会话中断率、SDK 是否拖慢页面加载（原文无数据，需自测）。
- 事后可追溯性：审计日志能否完整还原「谁在何时对哪台设备做了什么」。

**淘汰线**：若在 `observe` 阶段就拿不到有用的 console/network 证据，或掩码抽查出现明文泄露，或需频繁手动接管才不跑偏，则不要进入手册主流程，退回 study。
