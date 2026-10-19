# AntoGA/agents-contract

- 结论：**值得一试**。按照 README 的做法，在一个有隐性规则的真实仓库里落地五段式 AGENTS.md、零依赖 linter 和 Claude Code SessionStart 钩子，并把 bench 脚本换成自己的任务做小规模 A/B 验证；这些步骤具体可照做、成本约一小时、跨工具复用，但作者自己说明只有 5 次单任务、且只测了 Claude Code，质量提升也只体现在从代码里推不出来的规则上，所以先小范围试，暂不直接全员采用。
- 原文：https://github.com/AntoGA/agents-contract
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-19T10:30:50.415Z

## 是什么

`AntoGA/agents-contract` 是一个把「给编码智能体的项目说明书」工程化的模板仓库，包含三个核心部分：

1. **`AGENTS.md` 契约**：纯 Markdown、随 git 版本化。linter 强制五个分节——Project（是什么、什么栈）、Commands（安装、构建、**测试**，测试必须有 `` - Test: `...` `` 这样一行）、Conventions（代码与提交约定）、Boundaries（不许碰什么）、Definition of Done（怎样算完成）；可选 `Lessons` 分节，把智能体每次犯错写成一行。
2. **`scripts/agents_lint.py`**：纯 Python 3.9+、零依赖、Win/macOS/Linux 通用的 linter。错误级检查：文件可读且 UTF-8 非空、`@` 导入文件存在（E001–E004）、五个必填分节齐全（E010）、有命令且有测试命令（E020/E021）、没留 `<...>`/`{{...}}`/TODO/TBD/FIXME 占位（E030）、没混入形似密钥的字符串（E040）。警告级：空分节（W011）、命令不在 PATH（W022）、反引号路径在仓库里不存在（W050）、重复标题（W060）、`CLAUDE.md` 未导入 `AGENTS.md`（W070）、文件超 32 KiB（W101，Codex 默认在此截断）。支持 `--json` 和 CI 退出码。
3. **SessionStart 钩子** `scripts/session-start.sh` / `.ps1`：Claude Code 在会话开始或恢复时自动跑 linter、装依赖、跑测试，输出进上下文；永远退出 0，不阻塞会话。

附带 `CLAUDE.md`（一行 `@AGENTS.md`）、`.claude/settings.json`、三平台 CI workflow、填好的 `examples/python-app/`，以及 `bench/` 下的 linter 速度测试与 A/B 实验脚本。

## 具体做法

前提：一个 git 仓库；Python 3.9+；接钩子需要 Claude Code（Windows 上没有 Git Bash 时用 PowerShell 变体）。作者称整套约一小时。

1. 复制模板与脚本。Windows / PowerShell（原文快速开始）：

```powershell
git clone https://github.com/AntoGA/agents-contract $env:TEMP\agents-contract
Copy-Item $env:TEMP\agents-contract\templates\AGENTS.md, $env:TEMP\agents-contract\templates\CLAUDE.md .
New-Item -ItemType Directory -Force scripts, .claude | Out-Null
Copy-Item $env:TEMP\agents-contract\scripts\* scripts\
# 如果 .claude\settings.json 已存在，不要覆盖它，而是手动把 "hooks" 块加进去
if (-not (Test-Path .claude\settings.json)) { Copy-Item $env:TEMP\agents-contract\.claude\settings.json .claude\ }

notepad AGENTS.md            # 把所有 <...> 填掉
python scripts\agents_lint.py # 应输出 "Итого: ошибок 0"（错误 0 条）
```

   macOS / Linux：同样步骤改用 `cp`，运行 `python3 scripts/agents_lint.py`。

2. 填写 `AGENTS.md` 的五个分节（这是全部工作量所在，按原文表格的要求逐节写）：Project 写清项目是什么、用的栈；Commands 写安装/构建/**测试**命令，测试行写成 `` - Test: `...` ``，否则 E020/E021 报错；Conventions 写代码风格与提交约定；Boundaries 写「不许碰什么」（生成物、目录、依赖）；Definition of Done 写怎样判定任务完成。把 `<...>`、TODO、TBD、FIXME 全部清掉（E030），不要写入任何密钥（E040）。

3. 每次跑 linter 直到零错误：

```powershell
python scripts\agents_lint.py                 # 检查当前目录的 AGENTS.md / CLAUDE.md
python scripts\agents_lint.py --strict        # 警告也算失败
python scripts\agents_lint.py --check-commands # 检查命令是否在 PATH 里
python scripts\agents_lint.py --json          # 机器可读输出
python scripts\agents_lint.py -r              # 单仓多包：递归检查子目录下所有 AGENTS.md / CLAUDE.md
```

   退出码：`0` 通过，`1` 有错误（`--strict` 下警告也算失败），`2` 调用错误。前置条件：`--check-commands` 依赖命令已在 PATH 中，`-r` 需在仓库根运行。

4. 让 Claude Code 读同一份文件：`CLAUDE.md` 的内容就是一行 `@AGENTS.md`。若两个文件都在但 `CLAUDE.md` 不导入 `AGENTS.md`，会得到 W070 警告（两份规则会漂移）。

5. 挂 SessionStart 钩子：复制 `.claude/settings.json`，用 `env` 指定安装/测试命令（原文示例）：

```json
{ "env": { "AGENTS_SETUP": "pip install -e .", "AGENTS_TEST": "python -m pytest -q" } }
```

   `AGENTS_SKIP_TESTS=1` 可关掉测试。Windows 上没有 Git Bash 时，改用 `.claude/settings.windows.example.json`：它的命令用相对路径，钩子从项目根启动，因此在任何 shell 下都能跑。

6. 接 CI：把 `.github/workflows/agents-lint.yml` 放进仓库（原文说该 CI 在 Ubuntu / Windows / macOS 上跑 linter 测试并做校验）。注意：这个 workflow 的具体内容原文没有贴出，要直接用仓库里的文件，不能照着 README 手写。

7. 建立维护循环：每次智能体犯错，就在 `Lessons` 里加一行。原文把这条列为长期收益最大的机制，也是「契约不腐坏」的配套：linter 只保证结构与事实（占位、路径、命令、密钥、大小）不退化，内容靠 `Lessons` 增长。

## 对应的研究问题

**能力发现**：`Lessons` 分节是「错误→一行规则」的沉淀器，等于用智能体自身的失败反推哪些约束必须显式写出来；当 agent 重复犯同一类错，就说明存在一条未被写下的规则。linter 的 `--check-commands`（W022）与路径检查（W050）能发现「文档里写了但环境里不存在」的命令和路径，暴露「以为能做其实做不了」的假设。原文没有正面讲「发现新能力」，只有这条间接线索。

**任务匹配**：一份 Markdown 跨 Claude Code / Codex / Cursor / Copilot 复用，Claude Code 通过 `@AGENTS.md` 导入同一份文件；W101 指出 Codex 默认在 32 KiB 截断指令，说明不同工具对同一份上下文的读取上限不同，契约应压在 1–4 KiB（原文称典型契约就是这个量级）。原文没有给出「什么任务配什么模型」的依据，只给了工具兼容层。

**条件供给**：这是全篇最扎实的一块。它给出了必须供给的信息清单：栈、命令（尤其测试命令）、约定、禁区、完成标准；也给出了权限与环境状态的自动化供给方式：SessionStart 钩子把「契约是否合规、改动前测试是否通过」直接送进上下文，省掉 agent 自己摸索仓库的那几步。Boundaries 把禁止项显式化，E040 防止密钥被写进契约。

**主动推进**：两种事件触发：SessionStart（会话开始或恢复时自动检查环境并跑测试），CI（推送时跑 lint，`--strict` 让警告也阻断）。都属于「检查型」自动推进，原文没有继续讲到持续任务执行。

**效果验证**：`bench/ab_test.py` 提供了一个可直接复用的验证框架：固定同一任务、同一 fixture、自动按 5 项标准打分，对比有/无契约的分数、步数、时间、成本；`bench/speed.py` 给 linter 性能基线；`python -m unittest discover -s tests -v`（15 个测试）验证 linter 本身；CI 在三平台跑。作者还写明「换成自己的 fixture 和任务」的方法，这是手册里可以直接借用的部分。

## 与已有做法的关系

- **Claude Code（adopt）**：直接相关且互补。`CLAUDE.md` 全文只有 `@AGENTS.md` 一行，把规则收敛到单一来源，并用 W070 防止两份文件漂移；`.claude/settings.json` 挂 SessionStart 钩子与 `env`；`AGENTS_SKIP_TESTS` 控制是否跑测试。如果手册已有 Claude Code 章节，这条就是「给 Claude Code 供给项目约束和开机自检」的具体实现。
- **Cursor（watch）**：README 只在「哪些 agent 读 AGENTS.md」处提到 Cursor，没有给配置、规则目录或任何实测。属于作者主张，不能据此写 Cursor 的操作步骤。
- **GitHub Copilot（drop）**：同样只被列在读取 AGENTS.md 的工具名单里，没有配置、没有证据，与清单里 drop 的状态一致，不构成改变判断的依据。
- 清单中没有其它「AGENTS.md 契约 / 上下文 lint / SessionStart 钩子」类条目。

## 证据与局限

原文给出的数据：

- **linter 速度**（`bench/speed.py`，Python 3.13 / Linux / 4 vCPU / 本地盘 / 每档 200 次）：1.3 KiB 文件 `check()` 中位 0.21 ms、p95 0.36 ms，CLI 冷启动中位 50 ms；15.9 KiB 为 2.04 ms / 53 ms；31.9 KiB 为 3.91 ms / 56 ms；128 KiB 为 15.70 ms / 87 ms，随大小线性增长。加路径检查后在 31.9 KiB 为 7.85 ms；网络盘上路径检查明显变慢，可用 `--no-paths` 关掉。典型契约（1–4 KiB）本身耗时不到 1 ms，全流程几乎全耗在 Python 启动（约 50 ms）。
- **A/B 实验**（`bench/ab_test.py --runs 5`，Claude Code headless `claude -p`，默认模型，玩具仓库「增值税计算」含 3 个从任务描述看不出的陷阱：真实费率在 `rates.yaml`、`invoice/generated/rates.py` 是生成物不许手改；裸 `unittest`/`pytest` 会挂，只能 `python3 run_tests.py`；改完必须写 `CHANGELOG.md`）：得分 4.8→5.0（满分 5）；测试通过 5/5=5/5；只改权威来源 5/5=5/5；生成物同步且未手改 5/5=5/5；新增测试 5/5=5/5；写 CHANGELOG 4/5→5/5；平均步数 5.6→3.8（−32%）；中位时间 18.2 s→12.9 s（−29%）；平均成本 $0.091→$0.084（−8%）。
- **linter 自身测试**：15 个单元测试覆盖必填分节、代码块内的测试命令、`CLAUDE.md` 导入、monorepo 递归、占位符（对 `List<T>`、`<br>` 不误报）、密钥、俄文标题、代码块内标题、文件大小、导入、路径、CLI 与退出码；CI 在三平台跑。

只是作者主张、没有数据的部分：「Cursor / Copilot 也读 AGENTS.md」；「一小时落地」；「大仓库上差距应该更大」（作者自己说明未测）；「Lessons 长期收益最大」；「不绑厂商」。README 里 A/B 的日期写作 18.10.2026，无法核实，可能是笔误。

作者自己写明的局限（应作为试用前提）：5 次/条件远不足以统计显著；只有一个任务、仓库很小；只测了 Claude Code，没测 Codex / Cursor / Copilot；模型与版本会影响结果；强模型在小仓库上不要契约也能过——它自己能看到 `DO NOT EDIT` 注释并找到 `run_tests.py`，真正的质量差异只出现在「从代码里根本推不出来」的规则（CHANGELOG）上，其余收益是省掉探索步骤与降低时间波动（有契约时稳定 3–4 步，无契约时 4–7 步）。

其它需要提醒的局限：仓库仅 40 stars、单人维护，未见第三方复现；README 为俄文，分节标题接受俄/英两套，多语言团队需先统一命名；钩子只覆盖 Claude Code，其它工具只能靠「读文件」这一层，没有任何强制力。

适用条件：仓库里存在「看代码看不出来」的隐性规则（生成物不许手改、测试要用特殊命令跑、必须更新 CHANGELOG、某些目录是禁区）；多人或多 agent 混用同一仓库；愿意把 agent 的每次出错沉淀成规则。

## 怎么试、怎么验证

最小试用（半天到一天）：

1. 选一个 1–2 周内、确实有隐性规则的真实仓库或其中一个模块，不要用玩具仓库。
2. 走上面第 1–4 步：复制模板、填五节、跑 linter 到 `--strict` 也是 0 错误。刻意把 3–5 条「新人上手必踩的坑」写进 Boundaries 和 Lessons，并留一条只有人知道、代码里没有的规则（比如「必须更新 CHANGELOG」），用来检验契约是否真的补上了那部分信息。
3. 走第 5–6 步接钩子与 CI，确认会话开头能看到「lint 通过 / 测试基线是否通过」这类信息。
4. 把 `bench/ab_test.py` 的 fixture 换成自己的仓库、任务换成一条真实待办，`--runs` 提到 ≥15–20（作者只跑 5 次，已自陈不足），记录每步输出。
5. 团队内并行 2 周：一半任务带契约，一半不带，用相同的验收口径。

判断是否改善的指标：

- **主指标**：人工返工次数与返工原因（是否正好踩在 Boundaries 写明的坑上）；违反隐性规则的比率（手改生成物、漏更 CHANGELOG、改动禁区目录）。
- **过程指标**：平均 agent 步数、中位耗时、每任务成本、需要用户追问的次数（原文的口径是 −32% 步数 / −29% 时间 / −8% 成本，可直接照抄对比）。
- **长期指标**：`Lessons` 行数的增长速度；同一类错误重复出现的次数（应下降）；CI 上 lint 拦截次数。
- **反向判定**：如果两周后步数、时间、返工率都没有改善，或维护 `AGENTS.md` 的时间超过它省下的时间，就降级为只在「隐性规则密集的仓库」使用，不做全组织推广。
