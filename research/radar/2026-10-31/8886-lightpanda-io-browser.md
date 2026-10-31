# lightpanda-io/browser

- 结论：**值得一试**。建议小范围试：先用 Docker 或二进制启动 Lightpanda，用 `fetch --dump markdown` 和 MCP / agent 模式各跑一条真实的网页采集与操作任务，并与现有 Chrome + Playwright 方案对比成功率、耗时和内存；理由在于 README 给出了可直接复制的安装、MCP 配置、PandaScript 录制回放流程，但只有 nightly 构建、基准为自测且无渲染引擎，兼容性必须在自家目标站点上验证。
- 原文：https://github.com/lightpanda-io/browser
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-31T06:18:38.072Z

## 是什么

Lightpanda 是一个从零写的无头浏览器（Zig 实现，非 Chromium/WebKit 分支），定位为「给 AI agent 和自动化用的浏览器」。README 的核心卖点有三个：

- 资源占用和执行速度显著低于 headless Chrome（自测基准见下）。
- 支持 JS 执行（V8）、DOM、XHR/Fetch、点击、表单输入、Cookie、自定义 Header、代理、网络拦截、adblocker、CDP 与 WebDriver Bidi 协议。
- 提供三种给 AI 用的接入面：`fetch --dump`（把页面转成 HTML/Markdown/PNG/PDF/结构化数据）、CDP/MCP 服务（给 Puppeteer/Playwright 或 MCP 客户端调用）、`agent` 原生 agent 模式（自然语言驱动，产出可回放的 PandaScript）。

官方自测基准（AWS EC2 m5.large，请求 933 个真实网页）：

| 指标 | Lightpanda | Headless Chrome | 差异 |
| :---- | :---- | :---- | :---- |
| 内存（峰值，100 页） | 123MB | 2GB | 约 16 倍更少 |
| 执行时间（100 页） | 5s | 46s | 约 9 倍更快 |

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 路线 A：只要「把网页变成模型能读的文本」

前提：Linux x86_64 / macOS（或 WSL2）。

1. 安装。任选一种：

```console
# Homebrew（nightly）
brew install lightpanda-io/browser/lightpanda

# Arch AUR
yay -S lightpanda-nightly-bin

# 直接下 Linux x86_64 二进制
curl -L -o lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux && \
chmod a+x ./lightpanda

# Nix
nix run github:lightpanda-io/browser -- --help
```

2. 运行前先校验二进制：

```console
./lightpanda version
```

3. 抓单个 URL 并直接输出 Markdown（喂给 LLM 最省 token 的形态）：

```console
./lightpanda fetch --obey-robots --dump markdown --log-format pretty --log-level info https://demo-browser.lightpanda.io/campfire-commerce/
```

可替换的输出格式：`--dump html`、`--dump png > page.png`、`--dump pdf > page.pdf`（纯文本渲染）、`--dump structured_data`（输出页面的 JSON-LD、OpenGraph、Twitter card、meta 和 link 标签为 JSON）。

4. 页面是异步渲染时，用等待参数控制抓取时机：`--wait-until`、`--wait-ms`、`--wait-selector`、`--wait-script`。

前提与坑：Linux 发行版二进制链接 glibc，在 Alpine 等 musl 系统上会报 `cannot execute: required file not found`，需换 `FROM debian:bookworm-slim` / `FROM ubuntu:24.04` 这类基础镜像，或从源码编译。Android/Termux 同样不可用（缺 glibc loader）。Windows 无原生二进制，走 WSL2。

### 路线 B：给现成的 Puppeteer/Playwright 脚本换引擎（CDP）

前提：已有 Puppeteer 脚本；客户端可跑在 WSL 内或 Windows 宿主（WSL 会自动转发 `localhost:9222`）。

1. 用 Docker 起服务端（最简单）：

```console
docker run -d --name lightpanda -p 127.0.0.1:9222:9222 lightpanda/browser:latest
```

2. 或直接起 CDP server：

```console
./lightpanda serve --obey-robots --log-format pretty --log-level info --host 127.0.0.1 --port 9222
```

需要只允许本机用户访问时，改用 Unix domain socket（owner-only，0600）：

```console
./lightpanda serve --unix-socket /run/user/1000/lightpanda.sock
```

3. 把脚本里的 `connect` 改成指向 `browserWSEndpoint`，其余逻辑不变：

```js
import puppeteer from 'puppeteer-core';

// use browserWSEndpoint to pass the Lightpanda's CDP server address.
const browser = await puppeteer.connect({
  browserWSEndpoint: "ws://127.0.0.1:9222",
});

// The rest of your script remains the same.
const context = await browser.createBrowserContext();
const frame = await context.newPage();

// Dump all the links from the frame.
await frame.goto('https://demo-browser.lightpanda.io/amiibo/', {waitUntil: "networkidle0"});

const links = await frame.evaluate(() => {
  return Array.from(document.querySelectorAll('a')).map(row => {
    return row.getAttribute('href');
  });
});

console.log(links);

await frame.close();
await context.close();
await browser.disconnect();
```

4. 需要 WebDriver Bidi 时，加 `--protocol webdriver`；两个协议可同时开：`--protocol webdriver --protocol cdp`。

### 路线 C：接入 MCP 客户端（Claude Desktop 等）

前提：MCP 客户端支持 stdio 或 HTTP 传输。

1. stdio 方式，在 MCP 配置里加：

```json
{
  "mcpServers": {
    "lightpanda": {
      "command": "/path/to/lightpanda",
      "args": ["mcp"]
    }
  }
}
```

2. 多个 agent 共用一个进程时，改用 HTTP 传输：

```bash
lightpanda mcp --port 9223
```

客户端向 `http://host:9223/mcp` POST JSON-RPC。要点：

- 不带 `Mcp-Session-Id` 头 `initialize` 会被分配新会话（id 在响应的 `Mcp-Session-Id` 头里返回），后续请求带上它以保持隔离——每个会话有自己的页面、Cookie 和内存，agent 之间不再互相踩页面。
- 两个 agent 用**相同**的 `Mcp-Session-Id` 则共享同一个浏览上下文（例如多个 agent 协作同一页面）。
- 用 `session_new` / `session_list` / `session_close` 显式管理会话；`DELETE /mcp` 带 session id 关闭会话。

3. 用 `run` 工具执行 PandaScript，可一次 POST 完成（脚本默认超时 60000ms）：

```bash
curl -s http://127.0.0.1:9223/mcp -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": { "name": "run", "arguments": { "script":
    "const page = new Page();\nawait page.goto(\"https://example.com\");\nreturn page.extract({ title: \"title\", links: [\"a\"] });" } }
}'
```

脚本结束时打开的页面会关闭，但 Cookie 和 storage 保留，登录态可以带到下一次 `run`。也有现成 skill：`lightpanda-io/agent-skill`。

### 路线 D：用自然语言跑一遍，再固化成免模型的脚本

前提：有任一模型供应商的 API key，或本地模型。

1. 让 agent 干活（自动从环境变量检测 key）：

```console
./lightpanda agent                                    # auto-detects API key from env
./lightpanda agent --task "top story on news.ycombinator.com?"
./lightpanda agent --no-llm                           # basic REPL, no LLM
./lightpanda run session.js                           # run a recorded script
cat session.js | ./lightpanda run -                   # ...or pipe one in via stdin
./lightpanda agent --provider gemini --task "..."     # force a specific provider
./lightpanda agent --list-models                      # models available for the detected provider
VERTEX_API_KEY=... ./lightpanda agent --provider vertex             # Vertex AI, express mode
GOOGLE_CLOUD_PROJECT=my-proj ./lightpanda agent --provider vertex   # Vertex AI, token via gcloud auth
AI_GATEWAY_API_KEY=... ./lightpanda agent --provider vercel --model moonshotai/kimi-k2   # any model behind Vercel AI Gateway
OPENROUTER_API_KEY=... ./lightpanda agent --provider openrouter --model anthropic/claude-sonnet-5   # any model behind OpenRouter
OPENAI_BASE_URL=https://my-gateway/v1 OPENAI_API_KEY=... ./lightpanda agent            # any OpenAI-compatible server
```

2. 跑通后用 `/save` 把当前会话导出成 PandaScript（原生 JS + 少量浏览器原语），再用 `lightpanda run <script>.js` 回放。按 README 说法，脚本是确定性的、不消耗 token，所以可以「用 LLM 做原型、把产物上线到生产而不在运行时带模型」。支持 Anthropic、OpenAI、Gemini、Vertex AI、Mistral、Hugging Face、Vercel AI Gateway、OpenRouter、任意 OpenAI 兼容端点，以及 Ollama / llama.cpp / LLMD 本地模型。

### 运维/合规前提

- 默认会上报使用遥测，需要关闭时设 `LIGHTPANDA_DISABLE_TELEMETRY=true`。
- 不想要 core dump 时设 `LIGHTPANDA_DISABLE_CORE_DUMP`（启动时把软 `RLIMIT_CORE` 置零）。
- 抓取第三方站点时加 `--obey-robots` 遵守 robots.txt。
- 从源码编译需 Zig `0.17.0` + v8 + libcurl + html5ever；Debian/Ubuntu 依赖：

```
sudo apt install xz-utils ca-certificates \
    pkg-config libglib2.0-dev \
    clang make curl git
```

然后 `make build`（或 `zig build run`）。自测：`make test`，可加 `F="..."`、`TEST_FILTER="..."`、`METRICS=true`（把分配/耗时指标输出成 JSON）、`TEST_JOBS=1`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：哪些没想到可以交给 AI 的活**

README 明确列出 agent 模式能做：导航页面、走完点击流程（clicking through flows）、填写表单、抽取结构化数据。加上 `--dump structured_data` 输出 JSON-LD/OpenGraph/meta，以及 MCP 的 `run` 工具返回脚本的 console 输出与返回值——意味着「把网页当 API 用」这类活（读一个没有 API 的站点的固定字段、走一遍带表单的提交流程）可以整段交给 agent，而不是人手写选择器。

**2. 任务匹配：什么工作配什么模型/工具/协作方式**

- 高频、大并发的网页抓取 → 走 `fetch --dump markdown` 或 CDP server，理由是内存和时间的量级差异。
- 需要「边看边点」的探索型任务 → `lightpanda agent --task`，用强模型（OpenRouter/Vercel AI Gateway/Vertex 等一行切模型）。
- 已定型、要反复跑的任务 → `/save` 导出 PandaScript 后 `lightpanda run`，运行时不需要模型、确定性、零 token。这是原文最值得抄的「原型用 LLM、生产不用 LLM」的分工。
- 多 agent 并行 → MCP over HTTP，按 `Mcp-Session-Id` 做隔离或共享。
- 本地/私有数据 → Ollama、llama.cpp、LLMD，或任意 OpenAI 兼容端点。

**3. 条件供给：需要给哪些信息、工具、权限、反馈**

- 凭证：各 provider 的 API key 走环境变量（`OPENROUTER_API_KEY`、`AI_GATEWAY_API_KEY`、`VERTEX_API_KEY` / `GOOGLE_CLOUD_PROJECT` 等），或 `OPENAI_BASE_URL` 指向自建网关。
- 工具接入：MCP 配置里的可执行路径与 `args: ["mcp"]`；HTTP 模式下的端口与 session 头。
- 权限与边界：`--obey-robots`、Unix socket 0600、`--host 127.0.0.1` 绑定、`LIGHTPANDA_DISABLE_TELEMETRY`。
- 反馈信号：`run` 工具返回脚本的 console 输出和返回值，超时（默认 60000ms）会把卡住的脚本掐掉；Cookie/storage 跨 `run` 保留，登录态可复用。

**4. 主动推进：时间/事件/状态触发并持续完成**

原文**没有**给出调度器、定时器或事件触发机制。能算「持续运行」的只有：`serve` / `mcp --port` 常驻进程，配合客户端的会话管理（`session_new`/`session_list`/`session_close`）和脚本级 timeout。定时与触发需要外部系统自己做。

**5. 效果验证：怎么判断真的改善了**

- 官方基准给了可复现口径：933 个真实网页、AWS EC2 m5.large、对比 100 页的峰值内存与执行时间；细节在 `lightpanda-io/demo` 的 BENCHMARKS.md。
- 功能覆盖用 Web Platform Tests 衡量，结果每天发布在 `perf.lightpanda.io/wpt`；单测可用 `TEST_FILTER="WebApi: #selector_all" make test` 精确定位，`METRICS=true make test` 输出分配/耗时 JSON。
- 单个 WPT 用例可用 `fetch --dump wpt` 打出 harness 状态、通过/失败汇总与未通过用例（依赖 fork 的 `testharnessreport.js`）。

## 与已有做法的关系（对照给出的清单条目）

清单中没有相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**给出的事实性内容**

- 基准表格：100 页峰值内存 123MB vs 2GB（约 16x），执行时间 5s vs 46s（约 9x），环境为 AWS EC2 m5.large、933 个真实网页。
- 功能清单（README 用勾选框列出）：CORS、Libcurl HTTP loader、html5ever HTML 解析、DOM 树、V8 JS、DOM API、XHR/Fetch、DOM 与 Markdown dump、CDP/websocket server、点击、表单输入、Cookie、自定义 Header、代理、网络拦截、`--obey-robots`、CDP + WebDriver Bidi、adblocker。
- 具体可复制的命令、MCP 配置、PandaScript 示例与 curl 调用。
- 构建前置：Zig 0.17.0、v8、libcurl、html5ever；E2E 需要 demo 仓库与 Go > v1.24。

**只是作者主张、需要自己验证的**

- 「16x lighter / 9x faster」是厂商自测、特定页面集与机型，不代表你的目标站点上的表现；对比的是 headless Chrome，未给出与其他无头方案的对比。
- 「因为 agent 跑在浏览器同进程里，每次工具调用都是直接操作，所以保住了速度和内存优势」——是设计主张，无对应数据。
- 「脚本确定性、零 token、可把原型直接上线」是工作流主张；README 未给出长期回放的稳定性数据。

**适用条件与已知限制**

- 只提供 nightly 构建（Homebrew / AUR / nightly release / Docker `latest`），无稳定版承诺，接口可能变动。
- 无图形渲染引擎（README 自述 “No graphical rendering engine”），且功能完整性指向 WPT 结果页而非「100% 通过」——依赖复杂视觉布局或冷门 Web API 的页面存在兼容风险，需要逐站点验证。
- 平台限制明确：无原生 Windows（走 WSL2）、无 Android/Termux、musl 系 Linux 需换 glibc 基础镜像或源码编译。
- 默认开遥测，合规敏感场景必须先设 `LIGHTPANDA_DISABLE_TELEMETRY=true`。
- 原文没有任何调度/触发能力，不能当「自运行 agent 平台」用。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天量级）**

1. 起容器，不动现有环境：

```console
docker run -d --name lightpanda -p 127.0.0.1:9222:9222 lightpanda/browser:latest
```

2. 挑 5–10 个你真实在抓/在操作的页面（含一个需要登录、一个强 JS 渲染、一个表单流程），先用 dump 跑一遍：

```console
./lightpanda fetch --obey-robots --dump markdown --wait-until networkidle0 <你的URL>
```

3. 同一批页面再用现有 Chrome + Playwright 跑一遍，逐页比对抽取字段是否正确、是否缺块。

4. 选其中 1 个「操作型」任务，用 `./lightpanda agent --task "..."` 跑通，然后 `/save` 导出脚本，`./lightpanda run session.js` 回放 3 次，看结果是否每次一致。

5. 若走 MCP：配好 `mcpServers`，先单会话跑通；再多开一个会话验证 `Mcp-Session-Id` 隔离（两个 agent 同时操作不同页面不串）。

**判断有没有改善的指标**

- 正确率：抽取字段与人工/Chrome 基线的一致率（目标：不低于现有方案；低于则只在低风险抓取上用）。
- 单页成本：同样的页面批量下，峰值内存与总耗时（对应 README 的 123MB / 5s 口径，自己测一遍）。
- 稳定性：同一 PandaScript 连续回放的失败率与超时率（默认 60000ms 超时是否够）。
- token 成本：agent 探索阶段 vs 固化脚本回放阶段的 token 消耗对比——若回放阶段确实为 0，则「原型用 LLM、生产不用」这条分工成立，这是最值得写进手册的收益点。
- 兼容性红线：出现页面结构缺失、JS 报错或必须渲染才能拿到的内容时，记录为「该站点不适用」，回退 Chrome。
