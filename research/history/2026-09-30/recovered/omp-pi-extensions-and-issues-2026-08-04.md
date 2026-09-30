# OMP 与 Pi 扩展：兼容性实测、Issue 分析与自建取舍（2026-08-04）

状态：**历史会话恢复稿**，整理日期 2026-09-30。当时环境为 OMP 17.2.7；版本号、Issue 状态和插件兼容性均可能已变化，使用前需重新核验。

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-08-04T08-17-30-515Z_019fcbd9-6793-7000-940c-ae6aa174fe6a.jsonl`。下文每段标注原会话行号；只保留用户消息和结论性回答，省略中间的检查进度播报与命令输出。

## 这次讨论为什么值得保留

- **“有没有装”和“是否内置”是两个问题**：用户纠正“你要检查是否内置了呀”之后，判断口径才从本机安装记录转到 OMP 自身能力。
- **能安装、能加载，不等于生效**：`pi-statusline` 命令注册成功，但与 `--no-extensions` 对照后底栏逐字一致；`pi-stamp` 通过 `doctor` 后仍在运行时失败。
- **集成工具 vs 自建**：结合 Issue 区的真实故障，比较“继续用集成好的 OMP”和“基于 Pi 自己搭”的维护成本。

## 原始对话

**用户**（第 5 行）：和当前项目无关，帮我看一下 omp 里面都有啥 pi 插件

**助手**（第 51 行）：

结论：当前 OMP 没有通过插件管理器安装任何正式 Pi/OMP 插件，但自动加载了 3 个 Orca 管理的用户级 Pi 扩展。

| 扩展 | 作用 |
|---|---|
| `orca-agent-status.ts` | 把 Agent 启动、工具调用、工具结束、回复完成等状态发送给 Orca，用于面板状态和消息预览。 |
| `orca-prefill.ts` | 从 `ORCA_OMP_PREFILL` 读取预填内容，在 Orca 启动会话时写入输入框。 |
| `orca-titlebar-spinner.ts` | Agent 工作期间在 Orca 终端标题栏显示旋转动画，结束后恢复会话名和目录名。 |

位置：

```text
~/.omp/agent/extensions/
├── orca-agent-status.ts
├── orca-prefill.ts
└── orca-titlebar-spinner.ts
```

插件管理器的实际查询结果：

```json
{
  "npm": [],
  "marketplace": []
}
```

也就是说：

- npm/link 插件：没有
- Marketplace 插件：没有
- 当前项目 `.omp` 插件：没有
- 用户级原生扩展：3 个，均由 Orca 管理
- 这些 Orca 扩展主要受 `ORCA_*` 环境变量控制，脱离 Orca 启动时基本不会产生效果

当前 OMP 版本是 `17.2.7`。可随时用下面的命令复查：

```bash
omp plugin list
omp plugin list --json
```

**用户**（第 52 行）：我理解 omp 是 pi 集成一些插件的结果，或者你去官网看看

**助手**（第 73 行）：

对，你的理解接近，但更准确的说法是：

> **OMP 是 Pi 的深度 fork，不是“原版 Pi + 一组可卸载插件”的发行包。**

官方 README 直接写明：

> “Fork of Pi”  
> “The Pi you love, with batteries included.”

OMP 会持续同步上游 Pi 的代码，同时把大量能力直接整合进自身源码、工具系统和 Rust 原生核心。因此 `omp plugin list` 查不到这些能力，因为它只列出用户后装的插件，不列 OMP 自己编译进去的功能。

**三层关系**

```text
Pi 上游
├── 多模型 LLM API
├── Agent loop
├── TUI
├── 基础 coding-agent CLI
└── 扩展机制

OMP fork
├── 保留并同步 Pi 的基础架构
├── 大幅修改工具、运行时、提示词和 TUI
├── 加入 Rust 原生核心
├── 加入大量内置工具与工作流
└── 继续兼容 Pi 的 extension/package manifest

用户插件
└── omp plugin install / link / marketplace 安装的额外插件
```

**OMP 集成进去的主要能力**

官方目前宣称有 **31 个内置工具、14 个 LSP 操作、28 个 DAP 操作、60+ 模型提供商**。其中相对 Pi，OMP 重点集成了：

1. **Hashline Edit**
   - 基于内容哈希和行锚点编辑。
   - 文件变化后拒绝旧锚点，减少误改。

2. **原生 `read` / `grep` / `glob`**
   - 支持文件、目录、归档、SQLite、PDF、Notebook、URL、SSH。
   - 支持 `pr://`、`issue://`、`agent://`、`skill://` 等内部协议。

3. **LSP 集成**
   - definition、references、rename、code actions、diagnostics。
   - 重命名可以同步处理 re-export、别名 import 和 barrel 文件。

4. **DAP 调试器**
   - 可驱动 LLDB、GDB、Delve、debugpy 等。
   - 支持断点、单步、线程、堆栈、变量和内存检查。

5. **持久化 `eval`**
   - Python 和 Bun JavaScript 内核。
   - 内核里可以反向调用 OMP 工具。

6. **子 Agent 系统**
   - `task` 并行执行。
   - 支持独立 worktree、结构化输出、Agent 间通信。
   - `hub` 管理 Agent 消息、后台任务和长进程。

7. **Advisor**
   - 使用第二个模型持续审查主 Agent 的工作。
   - 可以给提示、风险警告或阻断意见。

8. **Time-Traveling Stream Rules**
   - 模型输出命中规则时，中止当前流、注入规则并重试。
   - 规则不必长期占用上下文。

9. **浏览器与桌面控制**
   - `browser` 驱动 Chromium、Electron 或用户现有 Chrome 标签页。
   - `computer` 操作系统窗口、截图、原生输入和辅助功能树。

10. **原生 shell**
    - 内置 shell 和大量 coreutils。
    - `sed`、`sort`、`xargs`、`jq` 等能力尽量在进程内运行。
    - 跨 macOS、Linux、Windows。

11. **AST 编辑**
    - `ast_edit` 通过 ast-grep 做结构化修改。
    - 先生成 proposal，再显式接受后落盘。

12. **代码审查工作流**
    - `/review` 并行启动专用 reviewer。
    - 按 P0-P3 和置信度输出问题。

13. **协作会话**
    - `/collab` 生成浏览器或终端可加入的共享会话。
    - 支持只读和可交互模式。

14. **记忆系统**
    - `retain`、`recall`、`reflect`、`learn`、`memory_edit`。
    - 支持 local、Hindsight、Mnemopi 后端。

15. **Skills 和上下文兼容**
    - 可读取 Codex `AGENTS.md`、Cursor MDC、Cline rules、Copilot `applyTo` 等格式。
    - 不要求先转换成 OMP 专用格式。

16. **GitHub 文件系统化**
    - PR 和 Issue 可以通过 `read pr://...`、`read issue://...` 访问。
    - 避免为每种 GitHub 对象设计独立工具。

17. **冲突解决协议**
    - `conflict://N` 表示单个 Git 冲突。
    - 可选择 `@ours`、`@theirs`、`@base`。

18. **MCP、SSH、Web Search**
    - MCP 生命周期与工具发现。
    - SSH 远程文件和命令能力。
    - 多搜索提供商和网页/PDF读取。

19. **ACP 编辑器协议**
    - 可作为 ACP Agent 被 Zed 等编辑器驱动。

20. **原子提交工作流**
    - `omp commit` 分析工作区，把无关修改拆为多个原子提交并生成提交信息。

**哪些才是真正意义上的“插件”**

OMP 仓库里明确作为扩展包存在的例子包括：

- `@oh-my-pi/swarm-extension`：YAML DAG 多 Agent 编排。
- Browser Relay 的 Chrome 扩展：让 OMP 接管已有 Chrome 标签页。
- 用户自己安装的 npm/link/marketplace 插件。
- `~/.omp/agent/extensions/*.ts` 下的运行时扩展。

但 LSP、DAP、Hashline Edit、子 Agent、memory、browser、native grep 等并不是运行时外挂的 Pi 插件，而是 **OMP fork 中的内置实现**。

所以你最初问“OMP 里面都有啥 Pi 插件”，更准确的答案应该是：

> **OMP 并没有一份“打包安装的 Pi 插件清单”；它把原本可以通过 Pi 扩展实现的很多能力，直接产品化、内置化并重写了。你本机额外安装的插件为 0，但 OMP 自身已经集成了上述完整工具集。**

官方来源：

- [OMP 官网](https://omp.sh/)
- [OMP 官方仓库](https://github.com/can1357/oh-my-pi)
- [OMP README](https://github.com/can1357/oh-my-pi/blob/main/README.md)
- [上游 Pi 仓库](https://github.com/earendil-works/pi)
- [Pi 官网](https://pi.dev/)

**用户**（第 74 行）：看一下 @juicesharp/rpiv-ask-user-question 这个有装吗

**用户**（第 87 行）：@cortexkit/pi-magic-context  这个呢

**用户**（第 98 行）：@narumitw/pi-statusline
这个呢、

**用户**（第 109 行）：你要检查是否内置了呀

**助手**（第 121 行）：

结论：**`@narumitw/pi-statusline` 这个第三方插件本身没有内置进 OMP，但 OMP 内置了自己实现的 `StatusLineComponent`，功能属于同一类。**

证据：

- OMP 安装包中没有 `@narumitw/pi-statusline` 或 `pi-statusline` 的依赖和源码引用。
- npm 显示该包是独立第三方扩展，描述为“替换 footer 的信息丰富状态栏”。
- OMP 自身源码包含：
  - `src/modes/interactive/components/status-line/component.ts`
  - `StatusLineComponent`
- OMP 在初始化交互界面时直接创建自己的状态栏：

```ts
this.statusLine = new StatusLineComponent(session);
```

因此应区分为：

| 检查项 | 结果 |
|---|---|
| 第三方包 `@narumitw/pi-statusline` | 没有安装，也没有被 OMP 作为依赖内置 |
| 状态栏功能 | OMP 已自行实现并默认内置 |
| 是否需要安装该插件 | 通常不需要，可能与 OMP 自带状态栏重复或冲突 |

OMP 的迁移文档也明确把 `StatusLineComponent` 列为其相对上游 Pi 必须保留的自有功能。换句话说，**OMP 不是内置了这个插件，而是内置了自己的替代实现**。

**用户**（第 122 行）：但是现在 omp 已经有了自动压缩的能力，是啥提供的

**助手**（第 143 行）：

OMP 现在的自动压缩是**核心内置能力**，不是你前面列出的第三方插件提供的。

你这台机器当前实际配置是：

```text
compaction.enabled = true
compaction.strategy = snapcompact
```

**具体由三部分提供**

1. **自动触发和流程编排**
   - OMP coding-agent 的 `SessionMaintenance`
   - 源码：`src/session/session-maintenance.ts`
   - 负责检测上下文阈值、溢出、输出截断，并触发压缩。

2. **传统摘要压缩**
   - 内置包 `@oh-my-pi/pi-agent-core/compaction`
   - 调用模型把旧对话总结成结构化摘要，保留最近消息。
   - 这部分基础能力来自上游 Pi，OMP 后续进行了扩展。

3. **你当前使用的默认策略**
   - OMP 自带依赖 `@oh-my-pi/snapcompact`
   - 版本随 OMP 一致：`17.2.7`
   - 它把旧对话序列化并渲染成紧凑 PNG 帧，提供给支持视觉的模型，减少上下文 token。
   - 这是 OMP 加入的能力，不是 `@cortexkit/pi-magic-context`。

执行逻辑大致是：

```text
SessionMaintenance 检测上下文
        │
        ├─ 达到阈值
        ├─ context overflow
        ├─ 模型输出因长度截断
        └─ 工具循环中途达到阈值
        │
        ▼
读取 compaction.strategy
        │
        ├─ snapcompact → @oh-my-pi/snapcompact
        ├─ context-full → pi-agent-core/compaction
        ├─ handoff → 生成交接文档并切换会话
        ├─ shake → 删除或归档重型工具输出
        └─ off → 不自动维护
```

当前默认值在 OMP 里直接定义为：

```ts
"compaction.enabled": {
  default: true
}

"compaction.strategy": {
  values: ["context-full", "handoff", "shake", "snapcompact", "off"],
  default: "snapcompact"
}
```

需要注意：`snapcompact` 要求当前模型支持图片输入。如果模型只支持文本，OMP 会自动回退到 `context-full` 摘要压缩。

**来源判断**

| 能力 | 来源 |
|---|---|
| 基础自动摘要压缩 | 上游 Pi 本身已有 |
| OMP 自动维护编排、更多触发条件和恢复机制 | OMP 核心增强 |
| 当前默认的 `snapcompact` | OMP 内置的 `@oh-my-pi/snapcompact` |
| `@cortexkit/pi-magic-context` | 未安装，也不负责当前压缩 |
| `@narumitw/pi-statusline` | 未安装，与压缩无关 |

所以最短答案是：**你现在看到的自动压缩由 OMP 核心的 `SessionMaintenance` 触发，实际默认使用内置 `@oh-my-pi/snapcompact` 完成。**

**用户**（第 144 行）：那我安装那个会不会冲突了

**助手**（第 163 行）：

会冲突。**如果你指的是 `@cortexkit/pi-magic-context`，不能在保留 OMP 默认 `snapcompact` 的情况下直接并用。**

Magic Context 官方说明明确写了：

> 安装时会禁用宿主的 built-in compaction。  
> 如果不禁用，会干扰其 cache-aware deferred operations，并造成 double-compress。

两者都在管理同一份上下文：

| 能力 | OMP `snapcompact` | Magic Context |
|---|---|---|
| 自动控制上下文大小 | 是 | 是 |
| 压缩旧历史 | 渲染为图片帧 | 后台 Historian 分层摘要 |
| 跨会话长期记忆 | OMP memory 后端负责 | 内置 |
| 接管压缩时机 | `SessionMaintenance` | Magic Context 自己管理 |
| 是否允许宿主继续压缩 | 不适用 | 官方要求关闭 |

不关闭 OMP 压缩可能出现：

- 同一段历史被二次压缩
- Magic Context 维护的原始历史提前被 OMP 替换
- Historian 的延迟任务与 OMP 阈值压缩同时启动
- 上下文缓存被重写，增加 token 成本
- 溢出恢复行为不确定

而且还有一层兼容风险：当前 `pi-magic-context@0.33.1` 声明的 peer dependency 是：

```json
{
  "@earendil-works/pi-coding-agent": "^0.80.2",
  "@earendil-works/pi-tui": "^0.80.2"
}
```

它面向上游 Pi，不是专门面向 OMP。OMP 虽然有 Pi 扩展兼容层，但这只能说明插件可能加载，**不代表它的安装向导会正确识别并修改 OMP 的 `.omp` 配置，也不代表上下文生命周期完全兼容**。

**建议**

优先继续用 OMP 自带的 `snapcompact`。它与 OMP 的会话、溢出恢复、工具结果裁剪和 UI 都是一体实现，风险最低。

如果一定要试 Magic Context，应当二选一，关闭 OMP 压缩：

```bash
omp config set compaction.strategy off
```

确认：

```bash
omp config get compaction.strategy
# 应输出 off
```

不要只安装插件然后保留：

```text
compaction.enabled = true
compaction.strategy = snapcompact
```

最终判断：**能尝试安装，但必须把它当作 OMP 自动压缩的替代品，而不是增强插件；当前没有足够证据证明它对 OMP 17.2.7 完全兼容。**

**用户**（第 164 行）：那就不要了，那个状态栏那个呢，能安装吗，会冲突吗

**助手**（第 192 行）：

结论：**包可能可以被 OMP 加载，但它的核心状态栏在 OMP 17.2.7 中不会生效，不建议安装。**

原因很直接：

1. `@narumitw/pi-statusline` 通过 Pi 扩展 API 的 `ctx.ui.setFooter(...)` 替换原生 footer。
2. OMP 17.2.7 对该 API 的实现是空函数：

```ts
setFooter: () => {},
setHeader: () => {},
```

3. OMP 已经直接创建自己的内置状态栏：

```ts
this.statusLine = new StatusLineComponent(session);
```

所以可能出现的实际结果是：

- 插件可以通过 Pi 兼容层加载。
- `/statusline` 命令可能可以注册和打开配置菜单。
- 配置文件可能正常生成。
- 但插件调用 `setFooter` 后不会改变 OMP 底栏。
- OMP 自带 `StatusLineComponent` 仍然照常显示。

这不属于“双状态栏直接冲突”，因为 OMP 把插件的 footer 替换请求忽略了；更准确地说是**功能被 OMP 的 no-op API挡住，装了也大概率无效**。

| 项目 | 判断 |
|---|---|
| 能否被插件管理器安装 | 大概率可以 |
| 能否正常加载 | 可能可以，依赖 Pi 兼容层 |
| `/statusline` 命令 | 可能可用 |
| 自定义 footer | OMP 当前不会应用 |
| 与 OMP 状态栏冲突 | 不会直接覆盖，但功能重复且被忽略 |
| 建议 | 不安装 |

另外，OMP 自带状态栏已经覆盖该插件的大部分核心信息，包括上下文使用量、自动压缩状态、模型、Git 分支和会话活动。要调整 OMP 状态栏，应该优先使用 OMP 自己的 `statusLine` 配置，而不是安装这个 Pi footer 插件。

**用户**（第 193 行）：试试

**助手**（第 257 行）：

实测结论：**能安装、能加载，但无法替换 OMP 状态栏，所以已经卸载并恢复原状。**

验证结果：

- `omp plugin install @narumitw/pi-statusline`：安装成功
- `omp plugin doctor`：插件状态正常
- `/statusline status`：命令能运行，配置无警告
- 插件启用和 `--no-extensions` 对照会话的底栏完全一致
- OMP 仍显示内置 `StatusLineComponent`
- 插件调用的 `ctx.ui.setFooter()` 在 OMP 17.2.7 中没有实际效果

已经执行卸载，当前状态：

```json
{
  "npm": [],
  "marketplace": []
}
```

包目录也已删除，没有残留。最终建议是不装，OMP 需要先实现扩展 `setFooter`，这个插件才有实际价值。

**用户**（第 258 行）：那你意思是 omp 没办法扩展了吗

**助手**（第 259 行）：

不是。**OMP 可以扩展，而且兼容 Pi 扩展；只是某些扩展 API 在 OMP 中没有完整实现。**

`@narumitw/pi-statusline` 失败属于一个具体限制：它依赖 `ctx.ui.setFooter()`，而 OMP 17.2.7 将这个方法实现为空操作。因此插件成功加载、命令成功注册，但无法替换 OMP 自带底栏。

**OMP 当前可正常扩展的能力**

- 注册新工具：`pi.registerTool()`
- 注册斜杠命令：`pi.registerCommand()`
- 注册快捷键和参数：`registerShortcut()`、`registerFlag()`
- 监听会话、Agent、消息、工具等事件：`pi.on(...)`
- 拦截或修改工具调用和结果：`tool_call`、`tool_result`
- 注入消息：`sendMessage()`、`sendUserMessage()`、`appendEntry()`
- 添加输入框上下方的 widget：`ctx.ui.setWidget()`
- 添加状态信息：`ctx.ui.setStatus()`
- 替换编辑器组件：`ctx.ui.setEditorComponent()`
- 添加自动补全：`ctx.ui.addAutocompleteProvider()`
- 弹出选择、确认、输入和编辑对话框
- 注册自定义消息和思考内容渲染器
- 注册新模型提供商
- 加载 Skills、Hooks、MCP、Agents、Rules、Prompts
- 通过 npm、Git、本地 link 和 Marketplace 安装插件

**当前明确受限的 UI API**

```ts
setFooter: () => {}
setHeader: () => {}
```

也就是：

| 扩展类型 | OMP 支持情况 |
|---|---|
| 工具、命令、事件 Hook | 支持 |
| Skills、MCP、Agent | 支持 |
| 输入框附近的 Widget | 支持 |
| 状态项 `setStatus` | 支持 |
| 自定义编辑器、自动补全 | 支持 |
| 对话框和通知 | 支持 |
| 替换整个 Footer | 当前不支持 |
| 替换整个 Header | 当前不支持 |

还有一个兼容维度：很多 Pi 插件声明依赖上游包 `@earendil-works/pi-*`。OMP 提供兼容层重写这些导入，但如果插件依赖 Pi 的内部实现、特定 TUI 结构或 OMP 尚未实现的 UI 接口，就不一定能工作。

因此正确判断是：

> **OMP 的扩展机制是完整产品能力，但不是对上游 Pi 扩展 API 的 100% 行为兼容。普通工具、命令、事件和 MCP 插件通常可用；修改核心 TUI 布局的插件要逐个验证。**

安装前重点看插件源码用了哪些 API。只要依赖 `setFooter` 或 `setHeader`，当前版本可以直接判断为不适用。

**用户**（第 260 行）：那你联网搜索一下，有哪些可以安装值得安装的扩展

**助手**（第 369 行）：

结论：按你当前的 **OMP 17.2.7** 能力，第三方 Pi 扩展里只推荐优先试装 **`@narumitw/pi-stamp`**。多数热门扩展已被 OMP 内置能力覆盖，重复安装反而容易出现命令、状态栏或生命周期冲突。

**值得安装**
1. **`@narumitw/pi-stamp`，推荐**
   - 在每条用户、助手消息后显示时间戳。
   - 可选显示响应耗时、首字耗时、模型、Token、费用及工具执行耗时。
   - 元数据不进入 LLM 上下文。
   - 不启动定时器、进程或网络请求，副作用较小。
   - 使用的是 OMP 已实现的 `registerEntryRenderer`、事件和自定义 session entry 接口，兼容概率较高。
   - 当前 npm 版本：`0.46.0`。
   - 安装命令：
     ```bash
     omp plugin install @narumitw/pi-stamp
     ```
   - 重启 OMP 后运行 `/stamp` 配置。
   - 来源：[GitHub](https://github.com/narumiruna/pi-extensions/tree/main/extensions/pi-stamp) · [npm](https://www.npmjs.com/package/@narumitw/pi-stamp)

**按需考虑**
- **`pi-langfuse`**：只有明确使用 Langfuse，并需要它的专用 Trace 结构和配置界面时才考虑。OMP 已原生支持通过标准 `OTEL_*` 环境变量导出 traces、metrics 和 logs，通常不需要再装。  
  [GitHub](https://github.com/narumiruna/pi-extensions/tree/main/extensions/pi-langfuse)
- **`pi-firecrawl`**：只有已经购买或部署 Firecrawl，并依赖它处理复杂网页抓取时才有价值。普通网页读取和搜索，OMP 自带工具已经够用。  
  [GitHub](https://github.com/narumiruna/pi-extensions/tree/main/extensions/pi-firecrawl)
- **`pi-accounts`**：多账号快速切换属于特定需求，并涉及凭据管理；没有明确痛点不建议增加这一层。  
  [GitHub](https://github.com/narumiruna/pi-extensions/tree/main/extensions/pi-accounts)

**不建议安装**
- `pi-btw`：OMP 已内置 `/btw`，还提供 `/tan` 处理旁支任务。
- `pi-caffeinate`：OMP 已内置 `power.sleepPrevention`；你当前配置是 `idle`，已经在会话期间阻止系统空闲休眠。
- `pi-github-pr`：OMP 默认状态栏已有当前分支 PR 查询和 `#PR` 链接。
- `pi-statusline`、`pi-starship`：OMP 状态栏更完整；此前实测第三方 `setFooter` 在 OMP 兼容层下不能可靠替换底栏。
- `pi-lsp`、`pi-subagents`、`pi-plan-mode`、`pi-chrome-devtools`：OMP 都有对应内置能力。
- `pi-image-drop`：OMP 已支持图片附件和图片检查。
- `pi-langfuse`：除非必须使用其 Langfuse 专用界面，否则优先用 OMP 原生 OTLP。

当前 `omp plugin list --json` 结果为空，之前测试安装的 `pi-statusline` 已清理，没有残留。最合理的安装顺序是只装 `pi-stamp`，重启后验证 `/stamp` 和消息时间戳，再决定是否保留。

**用户**（第 370 行）：先试试值得安装的那个

**助手**（第 441 行）：

试装失败，已完整卸载并恢复原状。

根因不是安装问题，而是运行时 API 不兼容：

```text
pi.registerEntryRenderer is not a function
```

`@narumitw/pi-stamp@0.46.0` 依赖 Pi 的 `registerEntryRenderer`，OMP 17.2.7 的兼容层没有暴露该接口，因此插件启动时直接加载失败，`/stamp` 无法注册。

已验证清理结果：

- `omp plugin list --json`：`npm` 和 `marketplace` 均为空
- `omp plugin doctor --json`：插件目录、manifest、`node_modules` 全部正常
- 未修改当前项目
- 未留下第三方插件配置

结论：当前 OMP 版本暂时没有值得直接安装且能补足现有能力的 Pi 插件。之前测试的 `pi-statusline` 和这次的 `pi-stamp` 都卡在 OMP 的 TUI 扩展 API 兼容层。

**用户**（第 442 行）：所以其实够了是不，不需要再加啥

**助手**（第 443 行）：

是，**你当前的 OMP 17.2.7 已经够完整，不建议继续加 Pi 插件**。

核心能力基本都有原生实现：

- `/btw` 旁路提问、`/tan` 后台支线任务
- `task` 多代理协作
- LSP、DAP、浏览器、图片、网页搜索
- plan、todo、skills、memory、自动压缩
- Git、PR 状态和用量状态栏
- macOS 防休眠，你当前已启用 `idle`
- OpenTelemetry / OTLP 遥测
- 插件、MCP、marketplace 扩展机制

第三方 Pi 插件目前有两个问题：

1. 大部分功能与 OMP 内置能力重复。
2. 涉及 TUI 的插件可能依赖 OMP 尚未兼容的 Pi API。实测 `pi-statusline` 的 `setFooter` 无效，`pi-stamp` 因缺少 `registerEntryRenderer` 无法加载。

当前插件列表已恢复为空，环境健康。维持现状最稳；以后只在出现明确需求且 OMP 本身解决不了时，再针对那个需求找插件。

**用户**（第 444 行）：两个问题 1 看一下 omp 的 issue 区，主要都有哪些问题  2 有些人说基于 pi agent 自己搭更好，你怎么看和 omp 这种集成好的对比

**用户**（第 529 行）：继续呀，怎么说了一半

**助手**（第 530 行）：

刚才回复被截断了。完整结论如下。

**结论**

**继续用 OMP，暂时不值得迁移到 Pi 自建。**  
OMP 的主要风险来自“集成功能多、并发和状态边界复杂”，Pi 自建则把这些风险换成你自己的开发和维护责任。按你目前需要浏览器、LSP、调试、多代理、压缩、skills 和完整工具链的用法，OMP 的综合成本明显更低。

**1. OMP Issue 区主要问题**

我检查了最新 100 个开放 issue，并阅读了代表性问题。大致分为以下几类。

1. **会话持久化与数据安全，优先级最高**

   [#7593](https://github.com/can1357/oh-my-pi/issues/7593) 是明确标记为 P0 的问题：`17.2.5+` 在迁移旧会话目录时，如果新旧目录存在同名会话文件，可能删除仍在被旧进程写入的文件。这是实际发生过的不可逆对话记录丢失。

   [#7478](https://github.com/can1357/oh-my-pi/issues/7478) 报告一个长会话在另一个进程执行 `omp update` 后，界面继续正常工作，但 `.jsonl` 停止持久化，最终丢失 2 小时 10 分钟记录。不过这个问题目前被标记为 `wontfix`，且只有一次现场事故，具体机制尚未证实。

   这类问题说明 OMP 的会话存储、跨版本迁移和长进程更新边界不够稳。

2. **极端并发、PTY 和资源失控**

   [#7328](https://github.com/can1357/oh-my-pi/issues/7328) 描述约 100 个进程内 subagent，加上宿主终端被关闭后，OMP 单核满载、内存增长到 35.8 GiB、事件循环完全阻塞，只能 `SIGKILL`。该问题是 P1，但没有稳定复现步骤。

   [#7443](https://github.com/can1357/oh-my-pi/issues/7443) 是 WSL 下普通会话持续占用 60% 到 150% CPU。证据相对有限，已经标为 `wontfix`，更像平台或特定配置问题，不宜外推到 macOS。

   这里真正值得吸取的是：OMP 的多代理能力很强，但并发规模不能无限扩大。一次开几十个代理，并允许它们继续嵌套派生，不属于稳健用法。

3. **Pi 插件兼容层不完整**

   [#7610](https://github.com/can1357/oh-my-pi/issues/7610) 中，`remote-pi` 因 OMP 兼容层缺少 `convertToPng` 无法安装；已经有对应修复 PR [#7611](https://github.com/can1357/oh-my-pi/pull/7611)。

   [#7470](https://github.com/can1357/oh-my-pi/issues/7470) 报告兼容层缺少 `ModelRuntime`，影响 `pi-dynamic-workflows`。

   我们之前还亲自验证过：

   - `pi-statusline` 的 `setFooter` 在 OMP 中不起实际作用。
   - `pi-stamp` 因缺少 `registerEntryRenderer` 启动失败。

   所以 OMP 对 Pi 插件的兼容更接近“常用 API 尽量兼容”，不能理解为完整 ABI/API 兼容。纯工具、命令和事件 hook 成功率较高；深度依赖 Pi TUI、渲染器或内部导出的插件风险较高。

4. **扩展失败时没有严格 fail-closed**

   [#7472](https://github.com/can1357/oh-my-pi/issues/7472) 指出：扩展初始化抛错后，OMP 可能继续运行；扩展失败前注册的 provider 还可能残留，但该扩展的安全拦截 hook 已经不存在。

   对普通美化插件影响不大；对承担权限控制、路径保护、工具审批的策略插件，这是实质性安全风险。不能把第三方扩展当作唯一安全边界。

5. **模型异常停止和自动恢复误判**

   [#7499](https://github.com/can1357/oh-my-pi/issues/7499) 表明 reasoning 模型只输出 thinking、不输出 text 时，意外停止检测可能被绕过，导致任务中途静默结束。该问题已有 PR [#7502](https://github.com/can1357/oh-my-pi/pull/7502)。

   这类问题通常出现在长上下文、推理模型和自定义 provider 组合中。不是 OMP 基础工具坏了，而是模型输出格式与恢复逻辑之间存在边界遗漏。

**整体评价**

OMP 的 issue 数量看起来很大，但不能直接等于“不稳定”：

- 很多是 enhancement、性能工作项和维护者主动登记的技术债。
- 不少问题已有对应 PR，维护活跃度高。
- 真正严重的问题集中在长会话、跨版本运行、极端并发和兼容层。
- 你使用的是 macOS，WSL/Linux 专属问题不能直接套用。
- 功能越多，组合状态越多，OMP 必然比精简 Pi 核心有更大的缺陷表面积。

**2. Pi 自建和 OMP 的本质差别**

Pi 官方把 coding agent 定位成一个精简、可扩展的核心。扩展可以注册工具、命令、事件、UI 和自定义渲染；包管理也支持 npm、Git 和项目级资源：

- [Pi 扩展文档](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)
- [Pi 包管理文档](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md)
- [Pi 项目](https://github.com/badlogic/pi-mono)

因此，“基于 Pi 自己搭”不是另一款现成产品，而是选择自己维护一个内部发行版。

| 维度 | Pi 自建 | OMP |
|---|---|---|
| 初始复杂度 | 低，核心很小 | 开箱即用，但系统较大 |
| 最终维护成本 | 高，由你集成和测试 | 主要由 OMP 维护者承担 |
| 定制自由度 | 最高 | 很高，但受 OMP API 限制 |
| Pi 插件兼容 | 原生最好 | 兼容层不完整 |
| 浏览器、LSP、DAP | 自己选型和接入 | 已集成 |
| 多代理编排 | 自己实现或选插件 | 已集成 |
| 会话、压缩、memory | 自己确定策略 | 已集成 |
| 故障表面积 | 功能少时较小 | 功能多，组合问题较多 |
| 升级责任 | 上游变化需要自己适配 | OMP 统一处理 |
| 安全控制 | 可以做得很严格，但要自己证明 | 有现成机制，但扩展失败边界仍有问题 |

**Pi 自建什么时候确实更好**

满足下面条件时才值得：

- 只需要 4 到 8 个固定工具，不需要 OMP 大部分能力。
- 有明确、特殊的 agent loop 或权限模型，OMP 的扩展接口无法实现。
- 必须原生运行某些深度依赖 Pi TUI/API 的插件。
- 愿意长期维护 provider、会话格式、压缩、工具协议、升级兼容和回归测试。
- 这是团队基础设施，有专人维护，而不是个人配置工程。

一个典型合理场景是：公司只允许固定 provider、固定工具白名单、无 TUI、无第三方插件，在容器里运行可审计的 headless agent。此时精简 Pi 核心比 OMP 更容易控制和证明。

**对你当前情况的建议**

继续使用 OMP，但按以下约束使用：

1. **有会话运行时不要执行 `omp update`。** 先结束所有 OMP 会话，再升级并重新启动。
2. **近期从 `17.2.7` 升级前先看 [#7593](https://github.com/can1357/oh-my-pi/issues/7593) 是否已修复。** 该问题明确影响 `17.2.5+` 的会话目录迁移。
3. **控制代理并发。** 一批 4 到 8 个独立 agent 属于合理范围；不要一次开二三十个并允许继续嵌套派生。
4. **保持第三方插件为空或极少。** 尤其避免依赖 Pi TUI、entry renderer、footer 和内部模块导出的插件。
5. **不要把插件作为唯一安全策略。** 路径权限、密钥隔离和危险操作限制应在操作系统、容器或工作区边界上落实。
6. **重要长任务让结果持续写入项目文件。** 不要只依赖会话 transcript 保存关键设计和调查结论。

最终判断：**OMP 更适合做你的日常主力；Pi 自建适合做一个目标非常窄、需要严格控制的专用 agent。** 现在迁移只会丢掉大量已经集成好的能力，再由你重新承担它们的兼容、升级和故障处理。
