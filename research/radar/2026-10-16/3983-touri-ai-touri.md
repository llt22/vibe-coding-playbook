# touri-ai/touri

- 结论：**值得一试**。在符合条件（macOS 14+ Apple Silicon、已登录 Codex/Claude Code CLI）的机器上装 touri，用它的 routines（cron 调度 bot）和审批模式跑一个低风险重复任务做小范围验证；理由是该仓库给出了可复制的安装、构建、验证与导入命令，且提供了常驻代理、定时触发、逐线程 token 与隔离 VM 这些正对研究问题 3、4 的具体机制，但它未签名、文档未展开配置细节、仅有 35 stars，所以先小范围试而非直接采用。
- 原文：https://github.com/touri-ai/touri
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-16T10:38:55.975Z

## 是什么

touri desktop 是一个 local-first 的 macOS 桌面应用，用来把 Codex、Claude Code、OpenCode 这类 CLI 变成"常驻的 AI 队友"（bot）。所有数据默认留在本机，除非显式配置远端。技术栈为 Tauri v2（Rust shell）+ Bun sidecar + React UI，Apache-2.0 许可。

README 列出的能力：

- Persistent bots：每个 bot 有自己的指令、记忆、技能和可分支的完整对话历史。
- Codex 与 Claude Code runtime，带审批模式（`on-request`、`workspace-write`、`full`）。
- Routines：cron 调度的 bot 运行，带 overlap 与 catch-up 控制。
- Projects：接入本地仓库、运行受监督的进程（数据库、服务器）并在应用内预览。
- Agent browser，支持人工接管；computer use 为可选项，带可见指示器和 kill switch。
- MCP gateway：逐线程 token 与审批提示。
- Bot machines：通过 Apple `container` 启用的可选隔离 Linux VM。
- Importer：把早期 bot 设置导出的数据导入 touri。

隐私设计：数据存在 `~/Library/Application Support/touri` 下的 SQLite；无遥测、无需账号；凭据放在 macOS Keychain，不进数据库、日志或导出；可选云托管是单独 opt-in 协议（`docs/protocol/cloud-v1.md`）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### A. 安装（前提：macOS 14 或更新版本，Apple Silicon）

1. 确认机器满足前置条件：
   - macOS 14+，Apple Silicon。
   - 本机已安装并登录 Codex 或 Claude Code CLI。
   - 若要用可选的 bot-machine（隔离 VM）功能，需要 macOS 26 与 Apple `container` >= 1.5.0；低于此版本本机 bot 仍可用，machine 功能会自报为不可用。
2. 从 Releases 页面下载最新 `.dmg`，把 `touri.app` 拖进 `/Applications`。
3. Release 构建目前未签名、未公证，首次启动会被 Gatekeeper 拦截。按原文三步走：
   1. 打开 `touri.app`，macOS 弹出警告并拒绝打开。
   2. 打开 System Settings > Privacy & Security，滚动到关于 touri 的提示，点 "Open Anyway"。
   3. 用密码确认。之后启动正常。
   原文特别说明：macOS 15 及以后，Control-click > Open 不再能绕过 Gatekeeper，必须用上面这套步骤。
4. 或者用终端去掉隔离标记：

```sh
xattr -dr com.apple.quarantine /Applications/touri.app
```

### B. 从源码构建（前提：满足 Requirements）

1. 准备工具链：Bun 1.2.21 或更新；Rust 1.90 或更新并带 `aarch64-apple-darwin` target。
2. 构建并打开：

```sh
bun install
bun run build:sidecar
bun run tauri build --bundles app
open src-tauri/target/release/bundle/macos/touri.app
```

3. 开发模式运行：

```sh
bun run build:sidecar && TOURI_SIDECAR_BIN="$PWD/src-tauri/binaries/touri-sidecar-aarch64-apple-darwin" bun run tauri dev
```

4. 注意原文说明：签名、公证和 updater 已接线但被关闭（见 `docs/DECISIONS.md`）。

### C. 验证安装/构建是否真的可用

```sh
bun run typecheck
bun run lint
TOURI_BROWSER_HEADLESS=1 bun test sidecar/test
(cd ui && bunx vitest run && bunx vite build && bunx playwright test)
(cd src-tauri && cargo test && cargo clippy --all-targets -- -D warnings)
```

可选的、打真实 CLI 的冒烟测试：

```sh
TOURI_E2E_REAL_CLI=1 bun test sidecar/test/runtime/real-cli.test.ts
```

### D. 从旧设置导入（先 dry run）

1. 前提：有一份早期 bot 设置的数据目录，可在本机路径或通过 SSH 访问。导入器是幂等的，routine 以 disabled 状态导入，且从不读取凭据文件；SSH 源在远端只读（仅白名单文件，不写远端）。

```sh
TOURI_APP_DATA="$HOME/Library/Application Support/touri-dev" \
  bun sidecar/src/importer/legacy/cli.ts --source ssh --host user@host.example \
  --root '~/.legacy-app' --dry-run --all
```

2. 去掉 `--dry-run` 才真正导入；`--bot <name>` 选择 bot；`--cwd-map <from>=<to>` 映射路径。

### E. 直接运行 sidecar / 接 MCP

```sh
TOURI_UI_TOKEN=dev-ui-token bun run sidecar/src/main.ts serve
```

该命令会往 stdout 打印一行 `SidecarHandshake` JSON。MCP stdio 模式只是连接运行中的 sidecar 的字节管道，只读逐线程 token 文件，不打开 SQLite：

```sh
bun run sidecar/src/main.ts mcp-stdio --thread <thread-id>
```

### F. 运行时要留意的配置面（README 只给了名称，未给字段级配置步骤）

- 审批模式：`on-request`、`workspace-write`、`full`——按任务风险选档。
- MCP gateway 使用逐线程 token，并带审批提示。
- computer use 是 opt-in，必须依赖可见指示器与 kill switch。
- bot machine 通过 Apple `container` 起隔离 Linux VM；系统不满足条件时该功能报不可用。
- 仓库规则：`packages/contracts/` 放共享类型、SQL schema 与 MCP tool schema，改这里必须先有 contract change；凭据从不被导入或存入 SQLite。

> 缺口提示（原文未覆盖，试用时需自己摸索）：README 没有说明在 UI 里如何新建一个 bot、如何写 routine 的调度配置、overlap 与 catch-up 的具体参数怎么填。要照着手册用，需要补上 `docs/` 目录与界面内的说明。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**
原文只能支持到这里：touri 把"常驻代理 + 定时例程"这类平时不会被主动交给 AI 的工作形态做成了产品能力——bot 有自己的指令、记忆和技能，routines 按 cron 调度运行，agent browser 可操作浏览器，computer use 可操作电脑（可选、带 kill switch）。但 README 没有给出这些能力的具体使用场景或案例，无法据此判断"哪些具体工作可以交出去"。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**
有依据的部分：touri 明确同时支持 Codex runtime 与 Claude Code runtime（安装要求里也把 Codex 或 Claude Code CLI 的登录列为前提，初筛理由还提到 OpenCode），并且为 runtime 提供了档位化的审批模式（`on-request` / `workspace-write` / `full`）——这构成一种"按风险选协作方式"的粗粒度框架。但原文没有说明什么任务该选哪个 runtime、哪个档位。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**
这是原文最有料的一块，且都指向具体做法：
- 信息/数据：本地 SQLite，路径 `~/Library/Application Support/touri`。
- 凭据：存 macOS Keychain，不进数据库、日志或导出。
- 权限：审批模式三档；MCP gateway 用逐线程 token 并弹审批提示；SSH 导入源在远端只读且走白名单文件。
- 隔离：可选通过 Apple `container` 起 Linux VM 跑 bot。
- 反馈/接管：agent browser 支持人工接管；computer use 有可见指示器和 kill switch。
- 工具接入契约：`packages/contracts/` 的共享类型、SQL schema 与 MCP tool schema 需要先有 contract change。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**
- Routines：cron 调度的 bot 运行，带 overlap 与 catch-up 控制（即错过或重叠时怎么处理）。
- Projects：可运行受监督的进程（数据库、服务器）并在应用内预览，属于长期驻留型工作。
- Persistent bots：有长期记忆、技能与分支对话历史，意味着跨会话持续。
原文只给了功能名称，没有触发配置的写法。

**5. 效果验证：怎样判断确实改善了结果**
原文提供的是"软件本身是否正常工作"的验证链，而不是"工作产出是否改善"的指标：`bun run typecheck`、`bun run lint`、sidecar 测试、ui 的 vitest/vite/playwright、Rust 的 cargo test 与 clippy、以及 `TOURI_E2E_REAL_CLI=1` 的真实 CLI 冒烟测试；importer 的 `--dry-run` 也是一种干跑验证。

## 与已有做法的关系（对照清单条目）

- **Claude Code（tool，adopt）**：touri 不是替代品，而是编排/外壳层——它把 Claude Code CLI 作为一个 runtime 接入，并在其上面加常驻 bot、记忆、routines、逐线程 MCP token 与 VM 隔离。两者是叠加关系。
- **OpenCode（tool，watch）**：初筛理由把 OpenCode 与 Codex、Claude Code 并列；README 正文标题只写 Codex 与 Claude Code，Features 里也只写这两个 runtime，因此对 OpenCode 的支持在原文中依据较弱，与它 watch 的状态一致。
- **Playwright Test（tool，try）**：在仓库验证链里被实际使用（`cd ui && bunx playwright test`）；同时 touri 有一个"agent browser"能力，但 README 没有说明它是否基于 Playwright，不能据此推断。
- 清单中没有"常驻代理 + cron 例程 + 隔离 VM 的本地编排器"这一类的条目。

## 证据与局限

**原文给出的可核验内容**：一整套可复制的命令（构建、开发运行、五项验证、真实 CLI 冒烟、sidecar serve 与 mcp-stdio、importer dry-run）、明确的版本门槛（macOS 14+、Apple Silicon、Bun 1.2.21+、Rust 1.90+ with `aarch64-apple-darwin`、bot machine 需 macOS 26 + Apple `container` >= 1.5.0）、明确的 Gatekeeper 处理流程、明确的隐私与凭据策略、明确的仓库契约规则。仓库 35 stars，Apache-2.0。

**只是作者主张、无数据支撑的部分**："persistent bots""routines 带 overlap 和 catch-up 控制""agent browser 带人工接管""computer use 带可见指示器和 kill switch"——这些都是 README 的功能声明，没有截图、演示、案例或效果数据。所有"能让工作更好"的隐含结论都没有被验证。

**适用条件与硬约束**：
- 仅 macOS、仅 Apple Silicon，Windows/Linux 用户完全用不上。
- Release 未签名未公证，首次启动必须手动绕过 Gatekeeper，企业环境可能直接禁止。
- bot-machine 的前置条件（macOS 26 + `container` >= 1.5.0）在当下属于偏前沿的配置。
- 从源码构建需要完整 Rust + Bun 工具链，并带指定 target。
- 签名、公证、updater 已接线但被关闭，说明分发链路尚未走通。
- 本次材料只有 README，`docs/DECISIONS.md`、`docs/protocol/cloud-v1.md` 的内容未给出，bot 与 routine 的配置方法在原文中缺位。
- 35 stars 说明采用者基数小，社区验证不足。

## 怎么试、怎么验证

**最小试用方式**（建议半天内完成，不做 computer use）：

1. 一台符合条件的 Mac，先装好并登录 Codex 或 Claude Code CLI。
2. 下载 `.dmg` 安装；被 Gatekeeper 拦截时用 `xattr -dr com.apple.quarantine /Applications/touri.app` 或系统设置三步放行。
3. 跑一遍 README 的验证命令（`bun run typecheck` / `bun run lint` / sidecar 测试 / ui / src-tauri），确认工具链本身没问题。
4. 打开 app，用最严的审批档 `on-request` 建一个 bot，只给它工作目录里的一个低风险、重复性任务（例如每日整理某个目录的变更摘要），不接 MCP、不开 computer use。
5. 给它配一个 cron routine，观察若干天：是否按时触发、漏触发时 catch-up 是否补跑、overlap 时是否按预期处理。
6. 如果满足 macOS 26 + `container` >= 1.5.0，再单独试 bot machine，确认隔离 VM 能否起来；不满足时确认它是否如实报"不可用"。

**判断有没有改善的指标**：

- 启动成本：从下载到首次跑通 bot，是否在 30 分钟内完成；验证命令是否全绿。
- 触发可靠性：routine 计划触发次数 vs 实际触发次数；漏触发后 catch-up 是否按预期补跑；overlap 场景下是否出现并发冲突或重复执行。
- 产出替代率：该任务上，bot 自主完成的比例，以及人工接管次数（浏览器接管次数、审批提示次数）。审批提示过密导致比自己动手还慢，就是负向信号。
- 权限收缩是否有效：把审批档从 `full` 降到 `on-request` / `workspace-write` 后，任务是否仍能完成；出问题时 kill switch 是否真的能立刻停住。
- 凭据边界：检查 SQLite 文件与应用导出物中确实不含凭据（README 声称凭据只在 Keychain）。
- 跨会话持续性：bot 的记忆与技能在重启应用、跨天之后是否仍然生效，不需要重新交代背景。

**降级条件**：如果 routine 触发不稳定、需要频繁手动补跑、或者 README 未覆盖的 bot/routine 配置成本明显高于收益，就把结论从 try 降为 study——只借鉴它的思路（常驻 bot + cron 例程 + 逐线程 token + 默认本地数据 + 权限档位），不采用这个具体应用。
