# earendil-works/pi

- 结论：**值得一试**。建议小范围试：按 README 的安装脚本装好 pi，在单个有版本控制的项目目录里用 /login 接入模型跑一个边界清晰的小任务（优先在容器里跑），验证它作为「统一模型接口 + 编码 agent」能否承载可复用的协作工作流；理由是原文给出了安装、启动、登录、容器化三类能直接照做的步骤，但扩展、技能、提示词模板等定制细节全在外链文档里，只有实测才能判断值不值得写进手册。
- 原文：https://github.com/earendil-works/pi
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T17:29:00.924Z

## 是什么

Pi 是一个「极简、可扩展的 agent harness（智能体外壳）」，作者定位是「让 Pi 适应你的工作流，而不是反过来」。仓库为 monorepo，包含：

- `@earendil-works/pi-ai`：统一的多提供商 LLM API（OpenAI、Anthropic、Google 等）
- `@earendil-works/pi-agent-core`：带工具调用和状态管理的 agent 运行时
- `@earendil-works/pi-coding-agent`：交互式编码 agent CLI
- `@earendil-works/pi-durable`：持久对话、任务、文档运行时
- `@earendil-works/chord`：面向服务、复制状态、RPC、插件的应用组合运行时
- `@earendil-works/pi-tui`、`@earendil-works/pi-telemetry`

默认**不含** sub-agents 和 plan mode；作者建议要么让 Pi 自己构建，要么装一个按你想要方式做的包。可通过 extensions、skills、prompt templates、themes 定制，打包成 Pi packages 经 npm 或 git 分享。使用方式有四种：交互式、print/JSON 模式自动化、RPC 控制、TypeScript SDK 构建应用。另有 `earendil-works/pi-chat` 面向 Slack/聊天自动化与工作流。

## 具体做法

**前提：Node.js 22.19 或更高版本**（macOS/Linux/Windows 安装器可按需代装）。

1. 安装 CLI（安装器会 pin 住所有依赖）：

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

2. 在你希望它工作的目录里启动：

```bash
cd /path/to/project
pi
```

3. 接入模型：在 Pi 内运行 `/login`，连接一个订阅或 API key，然后给它任务。

4. （可选，需要固定版本或可复现环境时）用 Nix 运行：

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

5. 定制工作流（前提：读完仓库内对应文档，原文只给了入口）：用 extensions、skills、prompt templates、themes 定制，再打包成 Pi packages 通过 npm 或 git 分享。原文未给出这些文件的具体写法与示例，只有链接：`packages/coding-agent/docs/extensions.md`、`skills.md`、`prompt-templates.md`、`themes.md`、`packages.md`。

6. **设置权限边界（重要前提）**：Pi **没有内置权限系统**，不限制文件系统、进程、网络或凭证访问，默认以启动它的用户和进程权限运行。需要更强边界时，原文给出三种容器化模式（详见 `packages/coding-agent/docs/containerization.md`）：
   - **Gondolin extension**：`pi` 和 provider 认证留在宿主机，把内置工具和 `!` 命令路由进本地 Linux micro-VM。
   - **Plain Docker**：把整个 `pi` 进程跑在本地容器里，隔离最简单。
   - **OpenShell**：把整个 `pi` 进程跑在策略控制的 sandbox 里。

7. 从源码开发或自建二进制（可选）：

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

8. 想把编码 agent 能力嵌进别的系统时：走 print/JSON 模式、RPC 或 TypeScript SDK；原文把 OpenClaw 列为真实集成案例。

## 对应的研究问题

1. **能力发现**：原文给出四种驱动同一 harness 的方式（交互式、print/JSON、RPC、TypeScript SDK），意味着同一个编码 agent 可以被嵌进脚本、服务或其他应用（OpenClaw 是真实集成案例）。但原文没有给出「哪些具体工作可以交给它」的任务清单。
2. **任务匹配**：`pi-ai` 提供覆盖 OpenAI、Anthropic、Google 等的统一多提供商 LLM API，这正是「同一套流程换模型而不改上层」的基础设施，适合做跨模型比较与迁移。原文未说明哪类任务该配哪个模型。
3. **条件供给**：需要 Node.js 22.19+；需要在 Pi 内 `/login` 提供订阅或 API key；默认没有权限系统，要限制文件系统/进程/网络/凭证访问必须自己容器化（三种模式）；扩展和技能是给 agent 补能力的机制，但写法未展开。
4. **主动推进**：只能算有基础设施线索——`pi-durable` 被称为「持久对话、任务和文档运行时」，`chord` 面向服务、复制状态、RPC 和插件，`pi-chat` 面向 Slack/聊天自动化与工作流。原文**没有**给出任何时间/事件/状态触发的配置或步骤，这一条无法照做。
5. **效果验证**：`pi-telemetry` 提供厂商中立的遥测契约、参考适配器、一致性测试和类型化 schema；另有「分享 OSS coding agent 会话」的做法，用 `badlogic/pi-share-hf` 把会话发到 Hugging Face（作者自己发布的 `badlogicgames/pi-mono` 数据集是一个例子）。作者主张公开真实会话数据比玩具 benchmark 更能改进 agent——这是记录真实使用轨迹的验证路径，但原文没有定义任何指标或阈值。

## 与已有做法的关系

清单中相关条目：**OpenClaw（tool，状态 watch）**。原文明确把 OpenClaw 列为 Pi 的「real-world integration」，即 Pi 作为底层 harness/SDK 被 OpenClaw 集成。两者是上下层关系而非替代关系：OpenClaw 可视为 Pi 能力的一种集成形态。其余清单条目没有对应内容。

## 证据与局限

**原文给出的事实**：
- 仓库指标 stars 111397（来自给定 metrics）。
- 安装、启动、Nix 运行、开发构建、独立二进制构建的命令均为可执行原文。
- 包列表及各包职责描述明确。
- 供应链加固部分给了具体机制：直接外部依赖 pin 精确版本（内部 workspace 包仍是版本范围）；`.npmrc` 设 `save-exact=true` 和 `min-release-age=2`（避免当天发布的依赖被解析）；`package-lock.json` 是依赖事实来源，pre-commit 阻止意外的 lockfile 提交（除非设 `PI_ALLOW_LOCKFILE_CHANGE=1`）；`npm run check` 校验 pinned 直接依赖、原生 TypeScript 导入兼容性和生成的 coding-agent install lock；pi.dev 安装器从 `packages/coding-agent/install-lock/` 安装以 pin 传递依赖，而 npm 包不 pin 传递依赖；CI 用 `npm ci --ignore-scripts`，另有定时 workflow 跑 `npm audit --omit=dev` 和 `npm audit signatures --omit=dev`。

**局限**：
- 几乎所有「怎么做」的细节（extensions、skills、prompt templates、themes、packages、containerization、usage、cli、rpc、sdk）在原文里**只是链接**，正文没有内容，无法直接照抄步骤。这份 README 更接近宣传 + 仓库导览。
- 没有效果数据、案例细节、对比测试，也没有任何性能或质量数字。
- 属于作者主张而非证据的部分：「minimal, extensible」「adapt Pi to your workflows, not the other way around」、公开会话数据比玩具 benchmark 更有价值、Pi「ships with powerful defaults」。

**适用条件**：需要 Node.js 22.19+；因为没有内置权限系统，不适合在未隔离的情况下放任其访问敏感文件、凭证或网络；Nix 路线构建离线、模型目录取自 pin 的 catalog revision，模型目录可能滞后于 pi.dev 最新状态。

## 怎么试、怎么验证

**最小试用方式**（约半小时）：
1. 选一个非关键、有 git 版本控制、能随时回滚的仓库。
2. 记录用的是哪种安装：`curl -fsSL https://pi.dev/install.sh | sh` 还是 `npm install -g --ignore-scripts ...`。
3. 因为默认无权限隔离，先在容器里跑（三种模式里 Plain Docker 起步最简单）；若只能在宿主机跑，先确认目录内没有凭证文件。
4. `cd` 进仓库，`pi` 启动，`/login` 接入一个 provider。
5. 给它一个边界清晰的小任务（例如「读某个文件并为其中函数补一个测试」），全程观察它调用哪些工具、动了哪些文件。
6. 再用另一个 provider 重跑同一提示（验证 `pi-ai` 统一接口的可迁移性）。

**判断有没有改善的指标**（原文没有基线，需自建对照——同一任务用你现有工具跑一遍做参照）：
- 任务是否一次完成，需要人工介入几次；
- 返工次数和需要你补的上下文量，相比现有工具是升是降；
- 换 provider 后同一提示是否仍然跑通（这是 Pi 相对单模型工具的核心卖点，值得单独记一笔）；
- 它实际触达的文件系统/网络范围，对照容器化边界判断隔离够不够；
- 如果条件允许，用 `pi-telemetry` 或 `badlogic/pi-share-hf` 把会话导出留档，作为后续复盘的原始素材——但注意这本身也是把工作数据上传，需先确认合规。
