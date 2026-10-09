# 把浏览器、桌面或手机交给 AI 前，先用最小任务验证反馈回路

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在把浏览器、桌面或安卓手机交给 AI 操作之前，用成本递增的步骤先验证它的反馈回路和验收标准，并把「高效」变成同批任务上的可比较数字，避免装完一堆组件却不知道能不能用。
> 先试这一步：先只跑做法 A 的两条安装命令，建一个最小任务、跑它的参考解，确认 evaluator 返回 1.0；如果你已有 agent 和一台可信安卓测试机，就先跑一条只读任务：「打开系统设置首页，确认页面，不修改设置」。
> 最近修订：2026-10-09

## 解决什么问题

在把浏览器、桌面或安卓手机交给 AI 操作之前，用成本递增的步骤先验证它的反馈回路和验收标准，并把「高效」变成同批任务上的可比较数字，避免装完一堆组件却不知道能不能用。

## 适用与不适用

**适用：**
- 你希望 agent 真的去读和操作浏览器标签页：dsh 桌面端 + MV3 扩展的文本快照路线。
- 你希望 agent 能操作 GUI 桌面，或在 API 不通时改走界面。
- 你要给「计算机使用」类 agent 建评测、导出 trajectory。
- 你需要隔离的批量桌面操作（gVisor 容器沙箱）或本地 macOS/Linux VM。
- 你已有 Claude Code / Codex / Cursor / OpenClaw 等 agent，想通过 MCP 或 skill 接上界面操作能力。
- 你已有 agent，想让它通过 ADB 操控一台**已授权**的安卓测试机：打开 App、查找页面、点击/滑动/长按/输入文字，查看授权范围内的界面信息、处理有限列表、复现测试操作、准备消息草稿（明确授权后才执行发送）。
- 你的技能宿主是 Pi Agent、Codex CLI/IDE、Claude Code、OpenCode 之一。

**不适用 / 先别用：**
- 团队不在用 dsh 桌面端：浏览器路线完全绑定 dsh 生态（桥接是 dsh 插件，配置写在桌面 profile 的 `cordis.patch.yml` 里）。
- 手机或平板：dsh 浏览器方案明确不支持（这与下面安卓 ADB 路线是两件事，后者只走 ADB，不依赖浏览器）。
- 你要的是成熟稳定的 1.0 产品：Cua Spaces 为 0.1.0，Pro/Teams 标注「即将推出」；CUA-S1 是早期源码研究版；dsh 扩展在 Chrome / Firefox 均标注 not yet listed；android-adb-control 作者自述「本版本已做文档审查和静态检查，尚未完成修订版真机端到端验收」。
- 你的机器不满足硬性条件：Spaces 需 macOS 26+，Lume 需 Apple Silicon；dsh 需 Node ≥ 20、桌面版 Chrome/Chromium/Edge ≥ 116 或 Firefox ≥ 140.0。
- 你只看了 README 就想跑完整流程：Cua 的权限授予、平台支持边界、任务编写格式都在外链文档里；dsh 的安装确认在仓库 `docs/INSTALL.md`。
- 你要做对外托管或商用集成：Cua 的许可不是单一的；dsh 方案 README 通篇没有给出基准实测结果，不宜直接全量采用。
- 你在 Windows 且想装除 Driver 以外的 Cua 组件：原文只提供 Windows 的 Driver PowerShell 安装脚本，其余以 macOS / Linux 为主。
- 你想用安卓路线去绕过锁屏、验证码、支付验证或企业策略：android-adb-control 明确排除这些用途。
- 你要无人值守监控、自动交易、无限重试：同样被 android-adb-control 明确排除。
- 你打算在云端会话或远程容器里跑安卓路线：那里不会自动获得本地 USB 设备，不匹配。
- 你打算把手里的主力机（承载凭据的设备）当试验田：ADBKeyboard 的部分实现允许其他本地应用发送控制广播，应优先用于可信测试设备，不用于凭据输入。

## 前置条件

按路线分：

- 浏览器路线（dsh）：dsh 桌面端；Node ≥ 20（开发构建用 Node 22 + pnpm 11）；桌面版 Chrome/Chromium/Edge ≥ 116 或 Firefox ≥ 140.0；手机与平板不支持。
- 评测回路（Cua Bench）：Python 3.12 或 3.13，并安装 uv；该任务不需要 VM、Docker 或模型 API key。
- 桌面 Driver 路线：已有 Claude Code / Codex / Cursor / OpenClaw 等 agent。
- Cua Spaces 应用：macOS 26 或更高版本。
- Lume：Apple Silicon。
- Windows 下只有 Driver 有 PowerShell 安装脚本，其余组件以 macOS / Linux 为主。
- 安卓 ADB 路线：本机有 ADB 可执行权限；一台已解锁并确认 RSA 授权的安卓测试机（`adb devices -l` 显示 `device`）；正确的技能安装目录与调用方式；明确的授权边界；截图与 UI XML 的数据与日志策略；任务预算（默认 30 个状态变更动作 / 5 分钟）。自绘界面还需截图工具与视觉模型；中文输入可选 ADBKeyboard；跑静态检查需要 Bash、Git 和 uv。

## 操作步骤

下面按成本从低到高排。**建议先做做法 A**；如果团队已在用 dsh 桌面端，做法 B 是最短的一条「模型真的读浏览器」的路；如果你已有 agent 和一台可信安卓测试机，做法 E 是最短的一条「agent 真的操作手机」的路。

### 做法 A：只跑评测回路，不碰界面（最便宜的入口）

前提：Python 3.12/3.13 + uv。预期结果：建一个小任务，跑它的参考解，确认评测器给出的 reward 为 `1.0`。

1. 安装 Cua Bench（带 browser 扩展）：

```bash
uv tool install 'cua-bench[browser]'
```

2. 安装 Chromium：

```bash
uv tool run --from 'cua-bench[browser]' playwright install chromium
```

3. 建一个小任务，跑它的参考解，确认 evaluator 返回 `1.0`。
4. 然后你自己再手动做一遍同一任务，作为对照。

做到这一步，你已经验证了「评测器能打出 1.0」这个反馈回路，而且不需要 VM、Docker 或模型 API key。

### 做法 B：浏览器路线——用文本快照代替截图（dsh 生态，团队已在用 dsh 桌面端时选它）

前提：dsh 桌面端、Node ≥ 20；桌面版 Chrome/Chromium/Edge ≥ 116 或 Firefox ≥ 140.0。预期结果：模型拿到的是带编号的可操作控件清单，用同一个编号就能点，不需要坐标；成对基准能跑出两个后端的同批任务对比。

1. 装桥接插件（插件路线一条命令）：

```sh
# 从 npm 仓库（已发布 dsh-browser-crossplatform@0.38.5）
dsh plugin --profile desktop add dsh-browser-crossplatform   # dsh web 用 --profile web

# 或直接从仓库，不经 npm
git clone https://github.com/youbaiyun/dsh-browser-crossplatform
dsh plugin --profile desktop add link:<clone>/packages/bridge
```

前提：有 `dsh` 命令行；`dsh web` 场景把 profile 换成 `web`。是否装好请按仓库 `docs/INSTALL.md` 的逐步说明确认；插件设置页在 dsh 内，标题为「dsh 浏览器扩展（全端）的桌面端一半」。

2. 装浏览器扩展：从扩展商店安装（README 标注 Chrome / Firefox 均 not yet listed），或加载未打包构建。**插件无法替你装扩展**：命令行加载只维持一个会话、关掉浏览器就没了；Chrome 137+ 的品牌版 Chrome/Edge 已忽略 `--load-extension`（Chromium 与 Chrome-for-Testing 仍认）。所以要在 profile 里装一次（商店安装，或在扩展页「加载已解压的扩展程序」），之后正常启动会自动重连。

3. 从源码构建（开发用）：

```sh
pnpm install
pnpm -r run typecheck
pnpm -r run test
pnpm --filter dsh-browser-extension run build               # Chrome → extension/dist
pnpm --filter dsh-browser-extension run build:firefox       # Firefox → extension/dist-firefox
pnpm --filter dsh-browser-extension run build:store         # Chrome，无 manifest key
pnpm --filter dsh-browser-extension run build:store:firefox # Firefox，无 key
pnpm --filter dsh-browser-extension run package             # 出全部归档
pnpm --filter dsh-browser-crossplatform run build           # 桥接插件 → packages/bridge/lib
```

前提：开发构建用 Node 22 + pnpm 11。上架要传 `-store` 包：普通构建带 manifest `key`（用于开发时钉住扩展 id），Chrome Web Store 会拒收。

4. 验证「模型真的看得到」：调用 `browser_snapshot`，页面以文本形式返回——标题/URL/正文 + 编号交互清单（含 ARIA role 控件）+ 表单字段（含 masked/checked/required），支持 delta 增量与 region 局部快照。工具面共 17 个：`browser_snapshot` / `click` / `type` / `press` / `scroll` / `navigate` / `open_tab` / `list_tabs` / `follow_tab` / `close_tab` / `back` / `forward` / `reload` / `get_text` / `wait` / `launch` / `describe_image`；位置信息来自 DOM，所以模型不需要坐标。

5. 决定动手前是否询问：`unrestrictedBrowserAccess` 开关**出厂为开**（新装不做询问）；关掉才恢复动手前的提示，并支持 trusted origins、allow-once。注意该开关打开时还会覆盖「读页面前先问」的选择。

6. 收紧回环免鉴权（可选）：桥接默认用 bearer token 鉴权，但来自扩展自身的回环连接可跳过以便零配置发现；豁免不是「任何 `chrome-extension://` 来源」，而是与 `extensionId`（逗号分隔白名单）精确匹配。自建构建要把自己的 id 加进去，或设 `extensionId: ''` 让所有连接（含回环）都要求 token。

7. 需要看图时再开图像识别（默认关；一旦开启，你询问的那张图会离开本机交给所配模型）。两条路二选一：

- 桌面中转（推荐）。在桌面 profile 的 `cordis.patch.yml` 里给桥接插件加配置：

```yaml
- id: bridge-browser
  disabled: false
  config:
    visionApiKey: <key>
    # 可选；必须是 API id 而不是显示名 —— 写 deepseek-flash，别写 DeepSeek-V4.1-Flash（API 会 400）
    visionModel: deepseek-flash
```

地址与模型已有默认值（`https://api.deepseek.com/v1` / `deepseek-flash`），thinking 默认关。

- 扩展直连（面板没有入口，直接写扩展存储；manifest 的 `connect-src` 已允许任意 `https:`/`http:` 主机，不用改 manifest）：

```js
chrome.storage.local.set({ dshSettings: { visionEndpoint: 'https://…/v1', visionModel: '…', visionApiKey: '…' } })
```

这是部署方配置；面板只显示图像查看档位（off / low / standard / enhanced），不显示 endpoint、模型、密钥。两条路径共用同一 prompt 与解析器（`protocol/src/vision-contract.ts`），换哪边调模型都不改变提问与有效答案判定。

8. 跑成对基准，把「高效」变成数字：

```sh
pnpm --dir benchmark install-browser          # 下载与 lockfile 里 playwright-core 匹配的 Chrome for Testing
node benchmark/run.mjs --dry-run --smoke      # 基础设施检查，不调模型
node benchmark/run.mjs --smoke                # 一次真实模型调用（消耗额度）
node benchmark/run.mjs                        # 正式：6 任务 × 5 种子 × 2 后端 = 60 次
node benchmark/run.mjs --tasks order_lookup,contact_form --seeds 1-5 --trials 2
```

三个前提：① 有一个接受 `--profile web --patch … -- --no-open --port N` 的 dsh 命令行（本仓库是独立 workspace、不依赖 `@deepseek-ai/dsh`，所以要自己指路：`BENCHMARK_DSH_COMMAND="node D:/path/to/dsh.mjs"`）；② Windows 上用 `pnpm.cmd`；③ 用 Chrome for Testing 或 Chromium。基准里拿 `playwright`（基线，只暴露任务真正需要的 8 个工具：snapshot/click/type/press/scroll/navigate/get_text/wait）对比 `extension`（本产品 17 个工具），比的是同一批任务而不是同一工具面。

9. 跑桥接插件的 e2e（可选）：需要一个仍认 `--load-extension` 的浏览器，先 `node benchmark/lib/browser-install.mjs chromium`，再把 `PLAYWRIGHT_CHROMIUM_PATH` 设成 `node benchmark/lib/chromium-path.mjs` 打印的路径。

### 做法 C：只装 Driver，做一个可判对错的任务（已有自己的 agent 时最省事）

前提：已有 Claude Code / Codex / Cursor / OpenClaw 等 agent。预期结果：agent 在计算器里算出 6 × 7，并验证应用显示 42。

1. macOS / Linux 安装 Driver：

```sh
/bin/bash -c "$(curl -fsSL https://cua.ai/driver/install.sh)"
```

2. Windows（PowerShell）安装 Driver：

```powershell
irm https://cua.ai/driver/install.ps1 | iex
```

3. 按原文 Driver 教程走平台设置、权限和 agent 连接。
4. 让你的 agent 在计算器里算 6 × 7，并**验证应用显示 42**。
5. 接进你现有的 agent：通过 MCP / skill 接上 Cua Driver。原文点名 Claude Code、Codex、Cursor、OpenClaw 等。

### 做法 D：装整套 / 沙箱 / 本地 VM（接受安装器改动本机时再用）

前提：只想先看全貌，接受安装器会改动本机。预期结果：`cua` CLI、Cua Spaces 应用、cua-driver MCP 和 skill 就位，并能选择性地把本机作为宿主。

1. macOS / Linux 装整套：

```sh
curl -fsSL https://cua.ai/install.sh | sh
```

脚本会在终端显示一个短清单：`cua` CLI、Cua Spaces 应用（macOS 默认勾选）、给 agent 用的 cua-driver MCP 和 skill、以及把本机作为宿主。

2. 登录并决定是否把 cua skills 和 cua MCP server 装进你的 AI 编程 agent（Claude Code、Codex、Cursor 等）：

```sh
cua auth login
```

3. 只想预选某几项时：

```sh
sh -s -- --select cua-driver
```

跳过清单：

```sh
--only cua-driver
```

4. 用沙箱做隔离的批量操作（前提：已装好 `cua` CLI）：

```sh
cua sb create ubuntu --name dev          # a gVisor container, set up on first use
cua sb exec dev uname -a
cua sb screenshot dev
cua sb rm dev
```

同一个沙箱的 Python 写法（`pip install cua`）：

```python
from cua_sandbox import Image, Sandbox

async with Sandbox.ephemeral(Image.linux(), local=True) as sb:
    print((await sb.shell.run("uname -a")).stdout)
```

要点：沙箱内不需要装 agent，就绪状态来自运行时和可选的端口探测；镜像若带 cua-spacesd（端口 3211），才额外提供进程、文件、截图、经 cua-driver 的输入，以及低延迟音视频流。

5. 把自己的机器接进来（无需端口转发）：

```sh
cua host setup
```

6. 要本地 VM 时装 Lume（前提：Apple Silicon）：

```bash
/bin/bash -c "$(curl -fsSL https://cua.ai/lume/install.sh)"
```

首个结果：从 Apple 恢复镜像创建一个干净的 macOS Tahoe VM、启动、用 SSH 连上。

### 做法 E：安卓手机——用 ADB 技能做「观察—一步操作—验证」（已有 agent + 可信测试机时选它）

这是一个 instruction-only 的 Agent Skill，不是独立程序、不是 MCP Server、不是后台服务：让已有 Agent 通过 ADB 操控安卓手机，观察界面、执行一步、验证结果，再决定下一步。

前提：本机有 ADB；一台已解锁、已确认 RSA 授权的安卓测试机；技能装到对应宿主目录。预期结果：`adb devices -l` 显示 `device`，宿主能发现并调用该技能，并且只读任务能跑完而不改动任何设置。

1. 确认本机 ADB（前提：有可执行命令行的开发环境）。先检查，避免重复安装：

```bash
command -v adb
adb version
```

2. 缺失时安装 Android SDK Platform-Tools。macOS 可用：

```bash
brew install --cask android-platform-tools
```

Windows 需使用官方 Platform-Tools 并适配路径、引号和截图输出（原文只给了 macOS 命令）。

3. 安装技能（先审阅仓库）。Pi、Codex、OpenCode 可共用一份：

```bash
mkdir -p "$HOME/.agents/skills"
git clone https://github.com/robbin/android-adb-control.git \
  "$HOME/.agents/skills/android-adb-control"
```

前提与注意：目标已存在时先检查，不要覆盖。

4. 只用 Claude Code 时的安装方式：把目标目录改为 `~/.claude/skills/android-adb-control`；若已装共享版本，可建兼容链接：

```bash
mkdir -p "$HOME/.claude/skills"
ln -s "$HOME/.agents/skills/android-adb-control" \
  "$HOME/.claude/skills/android-adb-control"
```

注意：OpenCode 也会扫描 `.claude/skills`，兼容链接可能引起同名告警；确认最终加载路径，不要再安装第二份副本。

5. 项目内安装（可选）：只想在项目内使用时，装到项目的 `.agents/skills/android-adb-control/`；Claude Code 用 `.claude/skills/android-adb-control/`。不要无意重复安装用户级和项目级技能。父项目已有 Git 时，按团队规范处理嵌套仓库或子模块。

6. 让宿主发现技能：Pi 执行 `/reload`；其他宿主若未发现技能，检查技能权限并重开会话。OpenCode 的技能不一定注册为同名斜杠命令。各宿主的调用方式：

| Agent | 用户级目录 | 调用方式 |
|---|---|---|
| Pi Agent | `~/.agents/skills/android-adb-control/` | `/skill:android-adb-control` |
| Codex CLI / IDE | `~/.agents/skills/android-adb-control/` | `$android-adb-control` 或 `/skills` |
| Claude Code | `~/.claude/skills/android-adb-control/` | `/android-adb-control` |
| OpenCode | `~/.agents/skills/android-adb-control/` | 请求加载同名技能，由原生 `skill` 工具调用 |

7. 连接手机（前提：设备已获授权）。在手机上开启开发者选项和 USB 调试，用数据线连接，手动解锁并确认电脑的 RSA 授权，然后运行：

```bash
adb devices -l
```

设备应显示为 `device`。多个设备时明确指定目标；遇到 `unauthorized`、`offline` 或 Linux `no permissions`，先解决连接问题。无线调试是可选项，见 references/troubleshooting.md。不要将 ADB 端口暴露到公网。

8. 从低风险任务开始调用。例如 Pi：

```text
/skill:android-adb-control 打开系统设置首页，确认页面，不修改设置。
```

也可用自然语言请求加载技能，再描述目标和边界——尤其要把「停在哪个动作之前」写清楚：

```text
使用 android-adb-control，在指定测试联系人会话里输入「我稍后回复」，
停在发送前。不要点击发送，也不要按可能触发发送的回车。
```

```text
查看这个测试列表的前 20 个项目，只记录名称和可见编号。
同名项目不要直接合并；到 20 个或预算用完就停止。
```

9. 遵守默认预算与安全约束：默认最多 30 个设备状态变更动作、5 分钟，并为恢复操作预留预算；长任务提前约定有限预算和检查点；发送状态不明时不会自动重发。

- 只操作获授权的设备、Android 用户和 App。
- 发送、购买、删除、安装、导出个人资料及修改安全/网络设置需要明确授权。
- 截图和 UI XML 可能含私人内容，交给云端模型前应确认数据与日志策略；不要提交到本仓库或公开 Issue。
- ADBKeyboard 的部分实现允许其他本地应用发送控制广播：优先用于可信测试设备，不用于凭据输入；使用前说明风险，结束后恢复本次改变的输入法状态。
- 默认不改休眠时间、不切换 VPN、不安装辅助 App。
- 无法验证或恢复时停止并报告。
- 技能规则不是技术沙箱，仍需宿主权限控制与人工监督。

10. 静态检查与更新（前提：需要 Bash、Git 和 uv；静态检查不连接手机）：

```bash
uv run --no-project python scripts/check_docs.py
```

更新前检查安装目录的本地修改，确认可接受上游变更后再运行 `git pull --ff-only`，然后刷新 Agent 会话。

### 怎么选

- 只想验证「这套东西在我这儿能不能用起来」：选做法 A，成本最低。
- 团队已在用 dsh 桌面端、又需要模型真的去读和操作浏览器：选做法 B，并优先复刻它的权限与反馈设计（敏感字段打码、动手前批准开关、回环 id 白名单）和成对基准方法。
- 已有 agent，想让它先做一件有明确对错的事：选做法 C。
- 已有 agent 和一台可信安卓测试机，只做获授权设备与 App 的事：选做法 E，先跑只读任务，再跑「停在动作前」的边界任务。
- 需要完整桌面、隔离沙箱、本地 VM、或把本机接进来：选做法 D。
- 已经装了旧包 `cuabot`（npm）：先停用并卸载，见「常见坑」。

## 怎么判断变好了

可观察的指标：
- 做法 A：Cua Bench 的 evaluator 对参考解返回 `1.0`；不需要 VM、Docker 或模型 API key 就能跑。
- 做法 B：`browser_snapshot` 能给出带编号的可操作控件清单和表单字段（含 masked/checked/required），模型用同一个编号就能点，不需要坐标；`browser_wait` 支持 `selector` / `text` 等待条件（等不到报 `timeout` 错误码）而不是固定延时；成对基准能分别跑出 `playwright` 与 `extension` 两个后端在同批任务上的数字。注意仓库 README 通篇没有给出基准实测结果，所以基准跑出来的数字才是你自己的证据。
- 做法 C：计算器里 6 × 7 的结果被验证为显示 42。
- 做法 D：Lume 创建并启动的 macOS Tahoe VM 能用 SSH 连上；`cua sb exec dev uname -a` 能返回结果；`cua sb screenshot dev` 能拿到截图。
- 做法 E：任务一次跑通的步骤数对比你手动操作的步数；人工接管次数（每次接管记一次，越少越好）；越界动作次数——未经授权的发送/购买/删除/安装/改设置次数应为 0，「停在发送前」这类约束是否 100% 被遵守；是否守住预算（动作数不超过 30、时长不超过 5 分钟，超预算时正确停止并报告）；不可验证/不可恢复时是否如约停止并报告；同一任务重复执行多次的成功率与结果一致性。

最小试用方式：
- 先只跑做法 A 的两条安装命令，建最小任务、跑参考解，确认 reward 为 `1.0`。这是「这套东西在我这儿能不能用起来」最便宜的入口。
- 若团队已在用 dsh 桌面端，做法 B 的最小试用是「装桥接插件 → 在 profile 里装一次扩展 → 让模型做一次快照与点击」。成对基准要等你自己的 dsh 命令行就位（`BENCHMARK_DSH_COMMAND`）再跑。
- 跑通后再做做法 C：只装 Driver，让现成 agent 在计算器里算 6 × 7 并确认显示 42。
- 做法 E 的最小试用顺序：① 准备一台可信测试机（非承载凭据的主力机），开启开发者选项与 USB 调试，解锁并确认 RSA 授权，`adb devices -l` 显示 `device`；② 按第 3～6 步装技能到对应宿主目录，重开会话或 `/reload`，确认技能能被发现并调用；③ 先只跑只读任务「打开系统设置首页，确认页面，不修改设置」；④ 再跑一条「停在动作前」的边界任务（测试联系人会话里输入草稿但明确不发送）；⑤ 最后跑一条有限列表任务（前 20 项，只记录名称与编号，到 20 个或预算用完即停）。指标稳定达标后再扩到真实业务设备；若出现越界动作或无法恢复的状态，停止使用并报告。

试多久：
- 材料没有给出耗时或成功率的数字；以「参考解拿到 `1.0`」「快照能给出编号控件并且点得中」「只读任务不改动设置」这类单点事实跑通为准，不要用 star 数或视频演示判定。

## 常见坑

- 把关注度当可用性：28,641 stars、今日 +229 只说明有人看，原文没有给任何性能数字（任务成功率、耗时、token 成本、对比人工基线的提升幅度）；dsh 方案 README 同样通篇没有基准实测结果；android-adb-control 标称 40 stars，也没有给出任何效果数据（成功率、耗时、错误率）或真实案例结果。
- 以为插件能替你装浏览器扩展：不能。命令行 `--load-extension` 只维持一个会话，关掉浏览器就没了；Chrome 137+ 的品牌版 Chrome/Edge 已忽略 `--load-extension`。必须在 profile 里正式装一次。
- 上架包传错：普通构建带 manifest `key`（开发时钉扩展 id），Chrome Web Store 会拒收，要传 `-store` 包。
- 以为默认有人把关：`unrestrictedBrowserAccess` 出厂为开，新装不做询问；关掉才恢复动手前提示，而且它还会覆盖「读页面前先问」的选择。
- 把图像通道当默认能力：图像识别默认关，一旦开启你询问的那张图会离开本机交给所配模型；扩展直连的 endpoint、模型、密钥只存在扩展存储里，面板只显示 off / low / standard / enhanced 档位。
- 模型名写显示名：`visionModel` 必须是 API id（写 `deepseek-flash`，别写 `DeepSeek-V4.1-Flash`），否则 API 会 400。
- 以为凭据会跟着请求走：凭据留在桌面端，`hello.ok` 在无法构建视觉客户端时上报 `imageRecognition: false`；特权网关方法（`host.pickDirectory`、`host.openPath`、`settings.*`、`credentials.*`）对非回环远端一律拒绝。
- 以为图像失败就是「没有图」：图像失败被分类而非抛出（`too-large` / `unsupported-url` / `fetch-failed` / `empty`，带 `permanent` 标志），让模型知道「这里有图但读不了」。
- 把文本快照当能覆盖一切：`<canvas>` 明确不收集；CSS background-image 里类声明的走有界 computed-style 扫描，上限 1500 个元素或 20 张背景图；图片超过 `MAX_IMAGE_BYTES`（4 MB）就不内联、退回把 URL 交给桌面端。
- 缓存预期错位：图像缓存按 URL 身份持久化到 `chrome.storage.local`，24 小时、保留最近 200 条、瞬时失败最多重试两次——首要目的是同一个 logo 出现三十次不要给出三十种不同描述，其次才是省成本。
- 以为装了技能就有人把关：android-adb-control 的规则不是技术沙箱，仍需宿主权限控制与人工监督；作者自述「本版本已做文档审查和静态检查，尚未完成修订版真机端到端验收」，不同 ROM、App、输入法版本和视觉链路仍需测试。
- 把「兼容四个宿主」当成「四个宿主都验收过」：原文的兼容只是格式与加载层面，作者明确说不代表已在四个宿主完成真机验收。
- 重复安装技能：用户级和项目级不要都装；从 `.agents/skills` 往 `.claude/skills` 建符号链接时注意 OpenCode 也扫描 `.claude/skills`，可能引起同名告警，先确认最终加载路径。
- 以为云端会话能跑安卓路线：云端会话或远程容器不会自动获得本地 USB 设备。
- 拿主力机做实验、或把截图与 UI XML 往外发：截图和 UI XML 可能含私人内容，交给云端模型前应确认数据与日志策略，不要提交到公开 Issue；ADBKeyboard 的部分实现允许其他本地应用发送控制广播，优先用于可信测试设备，不用于凭据输入，用后恢复输入法状态。
- 把设备连接问题当技能问题：`unauthorized`、`offline`、Linux `no permissions` 先解决连接；多个设备时明确指定目标；不要将 ADB 端口暴露到公网。
- 以为技能会自己无限跑：默认预算是最多 30 个设备状态变更动作、5 分钟，发送状态不明时不会自动重发；原文也没有时间/事件触发的持续运行、无人值守监控或无限重试，这些被明确排除。
- 忽略成熟度：Cua Spaces 是 0.1.0，个人免费，Pro 和 Teams 标注为「即将推出」；CUA-S1 自述为「早期的、仅源码的研究发布」，权重另放 Hugging Face，「System 1」只是工程类比，不替代通用 agent 的规划推理；dsh 扩展在 Chrome / Firefox 均 not yet listed。
- 环境不满足硬装：Spaces 需 macOS 26+，Lume 需 Apple Silicon；dsh 需 Node ≥ 20、桌面版浏览器 ≥ 116/140；手机与平板不支持 dsh 方案；Windows 下只有 Cua Driver 有 PowerShell 安装脚本，安卓路线的安装命令原文只给了 macOS 的 brew。
- 跑错已废弃包：`cuabot`（npm）有已知安全问题，原文明确写「Do not run it」，应停用并卸载，改用 Cua Driver 或 `cua` CLI；`cua-computer`、`cua-computer-server`、`cua-agent`、`cua-som` 也已被替代。
- 以为后台投递一定成立：「不移动指针、不抢焦点」只在「app 和平台支持时」成立，具体边界被外链到 platform support，正文没写；原文也没有给出由时间、事件或状态触发并持续完成任务的机制，「常驻」不等于「自动推进」。
- 商用许可踩坑：Spaces 之外的 SDK、CLI、Driver、Lume 是 MIT；Cua Spaces（应用、cua-spacesd、Keyvault、teleport、cua-volume、流媒体客户端）是 FSL-1.1-MIT（免费自托管自建，但不得做竞争性托管服务，每版发布两年后转 MIT）；`cua-som` 是 AGPL-3.0-or-later，其 Ultralytics 依赖另有许可；可选扩展 `cua-perception` 打包了 AGPL-3.0-only 的 OmniParser 模型产物，网络分发或托管可能触发 AGPL 源码义务，原文明确说 Cua 无法为此重新授权。做商用集成前必须逐目录查 LICENSING.md。android-adb-control 是 MIT。
- 以为 README 就是全部：Cua 的权限授予、平台支持边界、任务编写格式都在外链文档里，照着装可以，照着做完整流程需要再去读 quickstart；dsh 的安装确认也要按仓库 `docs/INSTALL.md` 逐步走；android-adb-control 的具体 ADB 命令、故障处理、真机验收清单在 references/adb-commands.md、references/troubleshooting.md、docs/testing.md 里，本次材料只包含 README，无法复述这些文档里的判据。

## 证据与来源

- 做法 A 的两条安装命令、做法 D 的 `cua sb` 四条 CLI 命令、沙箱 Python 片段、Driver 与 Lume 安装命令：来自 trycua/cua README（本次整理的 Cua 调研材料）。
- 三个带验收标准的「first result」（Calculator 显示 42、Lume VM 能 SSH 连上、Cua Bench 参考解 reward=1.0）：来自同一份 Cua 调研。
- 做法 B 的安装/构建命令、17 个工具名、`cordis.patch.yml` 与 `chrome.storage.local` 配置片段、基准命令与 6 任务 × 5 种子 × 2 后端 = 60 次的规模：来自 youbaiyun/dsh-browser-crossplatform 仓库 README 与源码结构（本次整理的 dsh 调研材料）。
- 文本快照的覆盖范围（`<img>` 含 `currentSrc` 与 srcset 候选、`<video poster>`、内联 `<svg>`、CSS background-image 的收集方式，`<canvas>` 不收集，1500 元素或 20 张背景图上限）、`MAX_IMAGE_BYTES` 4 MB、图像缓存 24 小时/200 条/两次重试、失败分类 `too-large`/`unsupported-url`/`fetch-failed`/`empty`：来自同一份 dsh 调研，属源码与文档描述，可核对但本次未独立实测。
- 敏感字段打码规则（`type=password`、`autocomplete=credit-card|cc-*`、id/name/aria-label 命中 `password|passwd|credit|card|cvv|cvc|secret|pwd`）与「可访问名称绝不使用输入框当前值」：来自同一份 dsh 调研，仓库自述有单元测试强制，本次没有独立复现。
- `unrestrictedBrowserAccess` 出厂为开、`hello.ok` 在无法构建视觉客户端时上报 `imageRecognition: false`、特权网关方法对非回环远端一律拒绝、扩展上下文持有 host permissions 因而能绕过 content script 的 canvas 污染：来自同一份 dsh 调研。
- 「浏览器路线更高效」目前只是主张：README 通篇没有给出基准实测结果，所以基准命令只能证明方法可跑，不能证明更快或更准，需要你自己跑出数字。
- star 数 28,641、今日 +229 和两段视频说明：来自 Cua 调研，只能说明关注度，不说明可用性。
- 「后台投递、不移动指针不抢焦点」、`cua daemon` 常驻、Multiplayer 同桌面接手：来自 Cua 调研，但原文没有给出触发式持续完成任务的机制，属于作者主张而非可验证数据。
- 许可与成熟度（Spaces 0.1.0、CUA-S1 早期研究版、FSL-1.1-MIT、AGPL 相关风险）：来自 Cua 调研的「证据与局限」部分。
- 做法 E 的安装命令与目录（含 Claude Code 专用路径与符号链接做法）、四宿主调用方式对照表、三条示例提示词（「不修改设置」「停在发送前」「只记录前 20 项」）、默认预算（30 个设备状态变更动作 / 5 分钟）、安全与授权清单、静态检查命令 `uv run --no-project python scripts/check_docs.py`、MIT 许可、40 stars、引用文档清单（SKILL.md、references/adb-commands.md、references/troubleshooting.md、docs/droidclaw-notes.md、docs/testing.md）：来自 robbin/android-adb-control README（本次整理的调研材料）。
- 安卓路线的「观察—执行一步—验证—再决定下一步」循环、发送状态不明不自动重发、预算与检查点：来自同一份 README，属于方法描述而非实测数据。
- 安卓路线目前只是主张：作者自述本版本已做文档审查和静态检查，尚未完成修订版真机端到端验收；「兼容四个宿主」只是格式与加载层面的兼容声明；没有给出成功率、耗时、错误率或真实案例结果。方法来源是 DroidClaw 的启发，但明确不是其官方产品或运行时。
- 安卓路线的具体 ADB 命令、故障处理、真机验收判据、DroidClaw 笔记内容：本次材料只包含 README，未给出，只能确认 docs/testing.md 这套检查方法存在，不能复述其判据。

## 依据的调研

- [trycua/cua](../research/radar/2026-10-08/1857-trycua-cua.md)：值得一试，可以把 Cua 当作一套「让 AI 真正操作电脑」的试验台小范围搭起来：先用 Cua Bench 的无 VM 模拟任务跑通「建任务→跑参考解→evaluator 返回 reward=1.0」，再装 cua-driver 做 Calculator 6×7 这类有明确验收标准的首个结果；理由是原文给了可复制的安装与 CLI 命令和明确的验收口径，但详细权限/平台支持步骤都在外链文档里，且 Spaces 仅 0.1.0、CUA-S1 为早期源码研究版，尚不足以直接写进手册当标准流程。
- [youbaiyun/dsh-browser-crossplatform](../research/radar/2026-10-08/2037-youbaiyun-dsh-browser-crossplatform.md)：值得一试，若团队已在用 dsh 桌面端、又需要让模型真的去读和操作浏览器，可以按仓库给出的安装/配置命令小范围试装，并优先复刻它的权限与反馈设计（敏感字段打码、动手前批准开关、回环 id 白名单）和成对基准方法；理由是安装命令、配置片段、工具面与验证指标都能直接照抄，但 README 通篇没有给出基准实测结果，且方案完全绑定 dsh 生态，不宜直接全量采用。
- [robbin/android-adb-control](../research/radar/2026-10-09/2231-robbin-android-adb-control.md)：值得一试，先把该技能装到一台可信测试机上，用最低风险任务（如“打开系统设置首页并只读确认”）跑通观察—一步操作—验证的闭环，再考虑扩大范围；README 给了可照做的安装路径、调用方式和安全预算，但作者自述本版本尚未完成真机端到端验收。
