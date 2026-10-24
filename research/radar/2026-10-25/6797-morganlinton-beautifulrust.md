# morganlinton/BeautifulRust

- 结论：**值得一试**。可直接照抄它的安装命令和评测流程，在自己的 Rust 仓库里对比跑一轮；但先小范围试，别急着推广——它只覆盖 Rust 一个领域，评测只有 3 个任务、由作者自评（有 skill 时通过 29/30，没有时 24/30 条断言通过，token 约多三分之一），迁移价值在于方法不在这个插件本身。
- 原文：https://github.com/morganlinton/BeautifulRust
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-24T23:57:24.278Z

## 是什么

BeautifulRust 是一个 Claude Code 插件，只含一个 skill：`rust-best-practices`。装上后，只要任务涉及 Rust、cargo、crate、借用检查器、clippy 或 `.rs` 文件，它就会自动加载，把「写惯用、健壮、可维护的 Rust」这套规范注入模型上下文。

规范不是原创，而是把五份公开来源提炼成约 500 行的 `SKILL.md`，并把每份来源的摘要放在 `references/` 下供模型按需深查：Google Rust Style Guide、Rust API Guidelines、Effective Rust、Rust Design Patterns、Microsoft Pragmatic Rust Guidelines。来源之间有冲突时，skill 会明确选择一方并说明理由。

对本项目的价值不在 Rust 本身，而在于它示范了一个可复用的做法：把某个领域的团队约定、权威来源和交付前检查清单（外加断言式评测）打包成一个可安装、可版本化、可自动触发的智能体技能。

## 具体做法

前提：已安装 Claude Code CLI；本次只处理 Rust 相关任务；在 claude.ai 上使用需先开启 code execution。

1. 从终端一次性安装（个人级）：

```bash
claude plugin install beautiful-rust --marketplace morganlinton/BeautifulRust
```

2. 若想让当前仓库的所有协作者都用上，在安装命令后加 `--scope project`（每位协作者仍需各自执行一次安装）：

```bash
claude plugin install beautiful-rust --marketplace morganlinton/BeautifulRust --scope project
```

3. 或者在 Claude Code 会话内安装：

```
/plugin marketplace add morganlinton/BeautifulRust
/plugin install beautiful-rust@beautiful-rust
```

4. 不想安装、只想单次会话试用时，克隆到本地并用 `--plugin-dir` 启动：

```bash
git clone https://github.com/morganlinton/BeautifulRust
claude --plugin-dir ./BeautifulRust
```

5. 需要显式调用时，使用插件命名空间下的路径（一般不必，因为它会自动触发）：

```
/beautiful-rust:rust-best-practices
```

6. 在 claude.ai 上使用：把 skill 目录打成 zip（zip 根目录就是该文件夹），再到 Customize > Skills（部分套餐在 Settings 下）上传：

```bash
cd skills && zip -r ../rust-best-practices.zip rust-best-practices -x '*.DS_Store'
```

7. 如果要替换成自己团队的规范，按原文的结构改写：把 `SKILL.md` 组织成下面这 13 节（原文就是按这个顺序排的，便于模型边写边扫）；每份来源在 `references/` 下放一份摘要；来源冲突时明确选择一方并给出理由：

```
1. Mindset: Rust-shaped code, invalid states unrepresentable, application vs library
2. Pre-handback checklist: fmt, clippy with -D warnings, test, doc; lint policy
3. Ownership and borrowing
4. Types and API design
5. Errors and panics
6. Everyday idioms
7. Concurrency and async
8. Unsafe and FFI（SAFETY: 注释、健全性）
9. Crates, modules, dependencies
10. Documentation and comments
11. Tests
12. Performance, in order
13. Final checklist
```

8. 插件自身的目录布局（`plugin.json` 是清单，`marketplace.json` 让仓库可以充当自己的 marketplace）：

```
BeautifulRust/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── skills/
│   └── rust-best-practices/
│       ├── SKILL.md
│       └── references/
│           ├── google-rust-style-guide.md
│           ├── rust-api-guidelines.md
│           ├── effective-rust.md
│           ├── rust-design-patterns.md
│           └── microsoft-rust-guidelines.md
└── README.md
```

9. 建评测用例：`skills/rust-best-practices/evals/` 下放三个用例（库 API 设计、应用 CLI、带输入文件的重构模块），每个用例包含 prompt、一段「好结果应是什么样」的描述，以及 `graders/` 下每个文件一条断言。

10. 在 skill 目录下运行评测（会真实调用模型并产生费用）：

```bash
claude plugin eval . --allow-tools Write,Edit,Bash --scaffold
```

分别在装有 skill 和未装 skill 时各跑一次，对比断言通过数。

11. 更新分发：修改 skill → 修改 `.claude-plugin/plugin.json` 里的 `version` → 提交推送；已安装用户执行：

```bash
claude plugin update beautiful-rust
```

12. 推送前先校验：

```bash
claude plugin validate .
```

## 对应的研究问题

**1. 能力发现**：原文把「按团队规范写代码 + 交付前自查」明确列为覆盖范围（`SKILL.md` 第 2 节 pre-handback checklist 包含 fmt、`clippy -D warnings`、test、doc 四项）。这提示，原本靠 code review 事后兜底的规范检查，可以前置给智能体自行执行；但原文只列出这几项，没有具体量化结果。

**2. 任务匹配**：适配 Claude Code + Rust；作者用三种任务类型做评测（库 API 设计、应用 CLI、重构现有模块），说明他认为该 skill 在这三类任务上有效。不适配非 Rust 项目、非 Claude Code 工具链。

**3. 条件供给**：这是原文最充分的一条。它给出了给智能体「喂约定」的完整清单：五份权威来源各一份摘要（references/）、约 500 行结构化规范（SKILL.md）、来源冲突时的裁决规则（选一方并说明理由）、用触发词表实现自动加载（Rust/cargo/crate/borrow checker/clippy/`.rs`）、提供显式调用入口，以及提供项目级安装范围（`--scope project`）。

**4. 主动推进**：属于「状态触发」——任务上下文出现 Rust 相关信号即自动加载，而不是靠人记得去调用。更新后的传播是手动流程（更新版本号 → 推送 → `claude plugin update`），不是自动持续执行。原文没有涉及时间或事件驱动的持续任务。

**5. 效果验证**：原文给了一套可直接照搬的验证范式：eval 用例的目录约定（prompt + 期望结果描述 + graders/ 每文件一条断言）、运行命令、「装与不装各跑一次」的对照方法，以及一组结果（有 skill 时通过 29/30 条断言，没有时通过 24/30 条，token 约多三分之一）。

## 与已有做法的关系

清单中只有「Claude Code」（tool，adopt）一条相关。本条是 Claude Code 的一种扩展用法：不改动既有配置，通过 plugin/skill 机制把领域约定固化成可安装、可版本管理的单元，可与现有的 Claude Code 使用方式叠加。清单中没有关于「如何编写 skill」「如何注入领域约定」「断言式评测」的其他条目。

## 证据与局限

原文给出的数据：173 stars；`SKILL.md` 约 500 行、13 节；5 份来源；3 个评测用例；有 skill 时 29/30 条断言通过，无 skill 时 24/30 条；token 约多三分之一。

- 都是作者自述，没有第三方复现；grader 由作者自己编写，存在自评偏差。
- 样本很小（3 个任务、每个任务 10 条断言），不足以支撑「普遍提升代码质量」的结论；没有给出延迟、人工 review 工时、长期维护成本。
- 适用条件：Claude Code 环境；Rust 项目；claude.ai 上传路径需先开 code execution；eval 使用真实模型运行、产生费用。
- 「来源冲突时选择一方」只是作者的判断，原文未给出选择标准，因此迁移到自家领域时，这部分需要自己补规则。
- 许可提示：Effective Rust 在线版是 CC BY-NC-ND 4.0，仓库自身是 MIT；原文只列出许可表，未讨论摘要再分发的合规边界，团队内二次分发前需自行确认。

## 怎么试、怎么验证

最小试用（不动团队配置）：

1. 用 `--plugin-dir` 方式单会话试用，避免影响他人：`git clone https://github.com/morganlinton/BeautifulRust && claude --plugin-dir ./BeautifulRust`。
2. 选 3 个真实任务（一个库 API、一个 CLI/脚本、一个重构），每个任务在「装 skill」和「不装 skill」下各跑一次，共 6 次，尽量固定 prompt。
3. 参照原文的 eval 结构给每个任务写 graders（每个文件一条断言）；没有 eval 工具时改人工盲评。

判断改善的指标：

- 断言通过率：对照原文 29/30 对 24/30 这个量级，提升不到 2 条断言的差异，可视作噪声。
- 四个命令的一次通过率：`cargo fmt --check`、`cargo clippy -- -D warnings`、`cargo test`、`cargo doc`（正是 skill 里 pre-handback checklist 覆盖的四项）。
- token 成本增量：原文约多三分之一，需自行核算是否可接受。
- 人工 review 的返工轮次和评论条数。

若要迁移到其他领域：用同一结构（来源摘要 + SKILL.md 分节 + 冲突裁决 + 交付前检查清单 + references/）写一份自己的 skill，再用同样的「装与不装对照」方式验证；通过率提升低于 10% 就不值得长期维护。
