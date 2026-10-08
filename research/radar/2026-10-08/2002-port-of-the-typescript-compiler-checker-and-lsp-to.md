# Port of the TypeScript compiler, checker and lsp to Rust, by LLM

- 结论：**值得研读**。把它的验证骨架照搬——固定参考版本、跑对方的移植测试套件、与参考实现逐条比对输出、用 hyperfine 做同机基准——并把“旧尝试卡了几个月就换更强模型从零重开”当作待检验的假设来自建对照实验；至于“怎么让 LLM 完成这次移植”本身，原文只有叙事与结果，没给出 /goal 循环、AGENTS.md 或问责规则的可执行内容，不足以直接照做。
- 原文：https://github.com/pingdotgg/ts-rust
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-08T07:52:06.785Z

## 是什么

`ts-rust`（npm 包名 `tsc-rs`）是用 LLM 把微软的 TypeScript 编译器、类型检查器和语言服务器（Go 版，源自 `typescript-go` / `microsoft/TypeScript`）整体移植到 Rust 的项目，作者是 pingdotgg。README 包含：安装与使用方式、Effect 诊断支持、兼容性与性能基准、已知问题、开发与发布流程，以及一段“这次是怎么做成的”回顾（用了哪些模型、花了多少钱、用了多久）。

需要注意 README 自身声明：`"The Slop Line"` 以下的内容（即“具体做法”绝大部分、状态、基准、已知问题、开发、发布）由作者的 LLM 撰写，不是作者本人写的。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

原文实际上给了两套东西，可照做程度差别很大，分开列。

### A. 把 tsc-rs 当作 tsc 的替换来用（有可照做步骤）

前提：Node 项目，运行环境为 Linux x64（静态）或 macOS arm64；Windows 和 Linux arm64 尚未提供。

1. 安装并运行：

```sh
npm install -D tsc-rs
npx tsc-rs -p tsconfig.json
```

`tsc-rs` 接受与 `tsc` 相同的选项。npm 包叫 `tsc-rs` 是为了不与 `typescript` 包冲突。每个 release 另有按平台的独立压缩包：`tsc` 二进制加旁边的 lib 文件。

2. 在 VS Code 中使用：见 `npm/tsc-rs-readme.md#vs-code`（原文未展开具体内容）。

3. 让 Effect 项目只跑一次检查就拿到 Effect 诊断（诊断码 377xxx，与 TypeScript 诊断同一次检查产出，语言服务器也会显示）。前提：tsconfig 里带该插件，与 `@effect/language-service` 的做法一致：

```json
{ "compilerOptions": { "plugins": [{ "name": "@effect/language-service" }] } }
```

规则、选项和 `@effect-diagnostics` 注释是 Effect-TS/tsgo 0.46.1 的移植。语言服务器的编辑器功能（快速修复、重构、hover、补全）没有移植。

4. 做兼容性对比时，必须对齐版本：本项目固定在 microsoft/TypeScript 的 `673a5f17d713`（2026-09-29，TypeScript 7.1.0-dev，见 `UPSTREAM.md`），比对要用 `typescript@7.1.0-dev.20260929.1`，不能用 7.0.x 或 `@typescript/native-preview`。

### B. 开发、验证与基准（命令有，但前置文档内容没给）

前提：在仓库内，按 README 所述目录结构（`crates/ts_goport` 是编译器，`crates/ts_goport/parts` 下有两个部件 crate `goport_util`、`goport_lsproto`，lib 文件在 `crates/ts_goport/libs`；`tools/ts_ast_codegen`、`tools/ts_diagnostics_codegen` 生成代码；`crates/ts_wasm` 是 WASM 构建）。

1. 构建与验证：

```sh
./scripts/run-cargo-capped.sh build --release -p ts_goport --bins
./scripts/verify.sh
```

产物二进制是 `goport`（类型检查）和 `tsgo`（Go 的 `tsgo` 命令行）。

2. 跑 Go 基线测试：

```sh
TS_GO_REPO=/path/to/typescript-go ./scripts/run-cargo-capped.sh test -p ts_goport --test go_baselines
```

3. 跑真实项目基准：脚本在 `scripts/bench-apps`，顺序是 `setup.sh <dir>`、`run.sh <dir>`、`summary.py <dir>`，T3 Code 用 `t3code.sh <dir>`。测量方法（可直接照抄的条件）：Apple M4 Pro（12 核，48 GB）、macOS 26.5.1，hyperfine，1 次预热后取 5 次运行的中位数，参数 `--noEmit --incremental false`，每个检查器用默认线程数，`tsc` 7 和 `tsc-rs` 用原生二进制（不走 npm launcher），`tsc` 6 跑在 Node 24.19、16 GB 堆（默认堆会在 VS Code 和 Sentry 上 OOM）。

4. 发布：推 tag `v<version>`（如 `v0.1.0`），release workflow 会构建、打包、测试、发布到 npm 并建 GitHub release；稳定版发到 dist-tag `latest`，预发布版（`v0.2.0-beta.1`）发到 `next` 并标记为 GitHub prerelease。

### C. “怎么用 LLM 做成这次移植”——原文没有给出可照做的流程

这一部分只有叙述性回顾，没有提示词、没有循环配置、没有规则文件内容：

- 作者用 OpenAI 系模型（GPT-5.6 Sol 和 GPT 6 Astra）做了多个月的 `/goal` 循环，写了超过 130 万行 Rust，花掉 **超过 $400,000** 的 API 计价 token，兼容度始终没超过约 84%。
- 之后换 Opus 5.5：**10 小时**出可用的 v0。作者原本以为它沿用 Codex 模型写的代码，**实际是从零开始**，用 1/10 的时间超过了 Astra。
- 总 token 花费约 **$24,047**（两周 API 开销），用 Claude 账号跑，折算约为其 $200 周额度上限的 **925%–983%**。
- README 提到“你大概 $20k 就能做到（见下文）”，但下文只给出了上面这笔 $24,047，并未展开如何做到。
- 仓库里存在若干看起来是流程产物的文件，原文只给了名字和用途、没有内容：`crates/ts_goport/PORTING.md`（移植规则）、`AGENTS.md`（类型检查工作规则）、`docs/typechecker-accountability.md`（问责规则）、`docs/typechecker-state/current.json`（保存的状态）、`docs/history.md`（项目如何开始）、`scripts/goport/README.md`（度量与门禁脚本）。

**结论：C 部分无法照做**，要照做必须先打开仓库读上述文件，而输入材料里没有这些内容。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：把一整个编译器 + 类型检查器 + 语言服务器移植到另一种语言，是很少会被想到交给 AI 的任务规模——作者确实这么做了，产出 130 万行以上 Rust，并宣称在测过的真实项目上 100% 兼容、可作为绝大多数应用的 drop-in 替换。

**2. 任务匹配**：原文给了同一任务下两种模型/协作方式的结果对照：GPT-5.6 Sol + GPT 6 Astra 走 `/goal` 循环、多个月、>$400k、1.3m 行、卡在 84% 兼容；Opus 5.5 从零开始、10 小时出 v0、两周约 $24,047 并继续推进。这提示长程任务中“换更强的模型 + 丢弃旧产物重开”可能优于“在旧上下文中继续投入”，但这是作者的主张，不是受控实验。

**3. 条件供给**：可辨识的上下文与门禁供给包括：把移植固定到一个上游 revision（`673a5f17d713`）作为比对基准；移植规则文档（PORTING.md）；工作规则（AGENTS.md）；问责规则（typechecker-accountability.md）；保存状态文件（typechecker-state/current.json）；移植过来的 Go 测试套件作为回归基线；oracle 测试集用于比对语言服务器与 API 行为。原文只说明这些文件存在及用途，未给出内容。

**4. 主动推进**：作者用 `/goal` 循环让模型持续工作数月（这是“状态/目标驱动持续执行”的实例，但循环本身的配置未给出）。发布侧则是明确的事件触发：推 tag `v<version>` → CI 构建、打包、测试、发布 npm、建 GitHub release。

**5. 效果验证**：这是原文最扎实的部分，且可直接迁移到其他“移植/重写”类任务：
- 与参考实现同 revision 比对；
- 181,711 个移植过来的 Go 测试全部通过；
- 语言服务器与 API 在 oracle 测试集上与 Go 答案一致；
- TanStack Query core 和 Hono 的诊断与 Go 完全一致；
- 120 个开源仓库上，命令行输出与 Go 的差异只出现在“已知问题”列表以及 Go 自身运行间不稳定的地方；
- 基准用 hyperfine（1 次预热 + 5 次中位数）在固定机器上测量，并给出几何平均；
- 对 T3 Code 的 221 条 Effect 诊断，`tsc-rs`、`tsc` 7 + `@effect/tsgo`、`effect-tsgo diagnostics` 三方报告一致（`tsc` 6 用 JS 插件，规则集不同，报 287 条 vs 177 条）。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中只有 **Claude Code（tool，status: adopt）**，与本条直接相关：原文明确说这次移植是用 Claude 账号、Claude Code 的额度跑的（花费折合为其 $200 周额度上限的 925%–983%），主力模型 Opus 5.5 在 10 小时内产出可用的 v0。这是手册里“用 Claude Code 做超长程、超大规模工程任务”的一个极端案例，并额外提供了一个很稀缺的数据点：这类任务的额度/费用量级。

清单中没有其他相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**有具体数据/案例支撑的**：
- 花费与规模：>$400,000（GPT 系）对比约 $24,047（Opus 5.5 两周）；130 万行以上 Rust；兼容度卡在约 84%；Opus 5.5 的 v0 用时 10 小时；额度占用 925%–983%。
- 兼容性：181,711 个移植 Go 测试通过；TanStack Query core、Hono 诊断与 Go 一致；120 个开源仓库输出差异受限；语言服务器/API 在 oracle 集上一致。
- 性能：T3 Code（五个工程合计）无 Effect 诊断时 `bun check` 4.07s、`tsc-rs` 7.25s、`tsc` 7 16.10s、`tsc` 6 62.63s；带 Effect 诊断时 `tsc-rs` 11.13s、`tsc` 7 + `@effect/tsgo` 21.07s、`bun check` + `effect-tsgo diagnostics` 37.60s、`tsc` 6 + `@effect/language-service` 138.63s。六个真实项目上几何平均：`tsc-rs` 相对 `tsc` 6 快 11.4×，相对 `tsc` 7 快 1.61×；`bun check` 相对 `tsc` 7 快 2.95×，除 tRPC 外每个项目都是最快。
- 已知问题（可用来判断适用条件）：某些 monorepo 里 `tsc-rs` 可能对更多文件写输出并报 TS6059（`tsc` 靠时序决定，自己每次运行结果都会变，`tsc-rs` 每次结果相同）；`tsc -b` 中若一个项目不通过 project reference 就导入另一个项目的输出，`tsc-rs` 可能读到旧的或缺失的输出（TS2305/TS2307），加 reference 可修复；编辑器长时间编辑会话内存缓慢增长（约每 1,000 次编辑 20 MiB，实测仍低于 `tsc`）；`tsc-rs --version` 打印的是它移植的 TypeScript 版本（7.1.0-dev），不是 npm 版本，编译器会据此匹配 `typesVersions`。

**只是作者主张、没有证据的**：
- “你大概 $20k 就能做到”——原文没有解释怎么做。
- “我一行代码都没读过”。
- “我们测过的每个真实项目上 100% 兼容”“可作为绝大多数应用的 drop-in 替换”——只给了有限的项目样本。
- 对模型优劣的因果解释（Opus 从零开始反而走得更远）——没有受控对比，时间、额度、上下文、任务阶段等因素都混杂在一起。
- 作者自称早期版本、“我不知道这东西到底能不能跑起来”。

**适用条件与局限**：
- 移植过程本身**没有给出任何可复制的提示词、`/goal` 循环配置或规则文件内容**，只有文件名和花费数字；想复现必须先打开仓库读 `PORTING.md`、`AGENTS.md`、问责规则与状态文件，而输入材料中没有。
- 平台只有 Linux x64 和 macOS arm64。
- 这是一个多月、数十万美元量级的超长程任务，与日常小任务的可比性有限；费用量级对个人基本不可复制。
- README 后半部分由 LLM 写成，其中的状态与基准描述未经人工校对（“我一行代码都没读过”），引用时需保留这一折扣。
- 六项目基准中，`tsc-rs` 在 VS Code 报 10 个错误、Sentry 报 2 个，与 TypeScript 7.1.0-dev 逐行一致（因为它移植的是 7.1 dev revision，而其余项目原本按 7.0.2 检查，7.0.2 下为 0 error）——这说明版本对齐是这类对比的硬前提。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

### 试用一：把 tsc-rs 换进一个真实 TS 项目（低成本，当天可做）

前提：项目能在 `tsc` 7.0.2 下 0 error 检查通过；机器为 Linux x64 或 macOS arm64。

1. 同时装两个包，保证对比版本正确：

```sh
npm install -D tsc-rs typescript@7.1.0-dev.20260929.1
npx tsc-rs -p tsconfig.json --noEmit
npx tsc -p tsconfig.json --noEmit
```

2. 把两个输出逐条 diff。
3. 在编辑器里挂上它的语言服务器，做一段真实开发。

判断指标：
- 诊断差异是否落在“已知问题”范围之外——出现范围外的差异即算失败；
- 全量检查耗时相对 `tsc` 6 / `tsc` 7 的倍数：用 hyperfine，1 次预热 + 5 次取中位数，参数 `--noEmit --incremental false`，同机同条件；
- 长时间编辑会话中的内存增长（原文参考值：约每 1,000 次编辑 20 MiB，且低于 `tsc`）；
- monorepo 里是否触发 TS6059 或 `tsc -b` 的 TS2305/TS2307。

### 试用二（对研究项目更重要）：把“换模型从零重开”当假设做自建对照

原文只提出了这个现象，没有给出协议。要拿到可写进手册的结论，建议自己设计最小对照：

1. 选一个已经卡住的长程 AI 任务（有明确里程碑、能自动判定成败），把它复制成两份。
2. A 组：沿用原上下文继续推进。B 组：新开会话，只给目标陈述 + 规则/状态文档，从零开始，不复用 A 组产物。
3. 记录到同一里程碑的：墙钟时间、token 花费（或额度占用百分比）、以及正确性门禁是否通过。
4. 判断指标：里程碑达成时间、花费、以及最终能否通过“与参考实现逐条比对”的验收。

### 可直接搬进手册的通用验收骨架（来自原文的验证做法）

适用于任何“移植 / 重写 / 换实现”类任务：

1. 把参考实现固定到一个具体 revision（原文：`673a5f17d713`），并记录该 revision 对应的版本号，比对时严格对齐版本。
2. 把参考实现自带的测试套件整体跑起来当回归基线（原文：181,711 个移植的 Go 测试全过）。
3. 用 oracle 测试集比对行为性输出（原文：语言服务器与 API 的答案与 Go 一致）。
4. 在多个真实项目上跑并 diff 输出，把差异逐条归因到“已知问题”或“参考实现自身不稳定”。
5. 性能用固定机器 + hyperfine（1 次预热 + 5 次中位数）测量并给出几何平均，不用单次结果。
