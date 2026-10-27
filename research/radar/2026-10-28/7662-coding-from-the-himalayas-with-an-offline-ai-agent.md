# Coding From the Himalayas With an Offline AI Agent

- 结论：**值得一试**。先按文中步骤（OpenCode + Ollama + Qwen3.5 9B）在联网时完成一次安装和冒烟测试，再拿一个自带测试的小项目做离线修复试用，并用原始测试自行验收；之所以值得小范围试，是因为原文给出了可直接复制的命令、配置字段和离线连通性验证方法，但公开证据只有一次单行 bug 修复，还不足以直接 adopt。
- 原文：https://latent.space/p/offline-coding/
- 来源：rss:src-latent-space，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-27T18:27:14.135Z

## 是什么

一篇实操型 walkthrough：在一台笔记本上完全离线运行编码智能体，用 **OpenCode**（开源终端编码 agent，负责读文件、提议修改、执行测试等命令，并在执行前弹出权限确认）＋**Ollama**（在本机 localhost 提供模型服务）＋ **Qwen3.5 9B**（可下载权重的开源模型）。作者在喜马拉雅山麓工作，常遇断网断电，因此验证“模型、项目依赖、测试工具都在本地时，断网还能不能继续编码工作流”。

作者给出的离线可做/不可做边界：可以解释不熟悉的函数、排查失败的测试、小范围重构、帮忙完成一个小功能；不能下载新包、不能上网查资料。

选型依据（原文表格，数据来自 Qwen 模型卡，不是本机实测）：

| 模型 | LiveCodeBench v6 | BFCL-V4（函数调用） | 下载体积 |
|---|---|---|---|
| Qwen3.5 4B | 55.8 | 50.3 | 3.3–4.0 GB |
| Qwen3.5 9B（本文用） | 65.6 | 66.1 | 6.6–7.6 GB |
| Qwen3.5 27B | 未给出 | 未给出 | 17–20 GB |
| gpt-oss-20b | 74.6 | 未报告 | 未给出 |

内存提醒：下载体积不等于内存需求，原文引用 Voltti 的预算——6.6 GB 的 9B 构建需 12–16 GB 内存；本文的 64k token 上下文配置还要更多，需给上下文和其他应用留余量。

## 具体做法

前提：笔记本内存足够（9B 建议 12–16 GB 以上，64k 上下文再留余量）；装有 Python3；项目及其依赖、测试、README 已在本地；**先在一次联网会话里完成安装和模型下载**。原文说完整安装步骤在 GitHub README 中（安装工具、下载项目、安装 OpenCode 1.19.4），本材料未包含 README 内容。

1. 联网状态下按仓库 README 完成安装，Terminal A 保持在项目目录。

2. 配置项目级 `opencode.json`（原文只描述字段，完整 JSON 在仓库里，**不要凭空补全**）：
   - `model` 与 `small_model` 都指向 Qwen3.5 9B；
   - `baseURL` 指向 Ollama：`http://127.0.0.1:11434/v1`；
   - 只启用 local provider；
   - 编辑文件、执行 shell 命令前需要确认；
   - 禁用 web 工具。

3. Terminal B 启动 Ollama 并保持常驻（把模型服务限制在 localhost，关闭 Ollama 云端功能，设置上下文长度）：

```
OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 OLLAMA_CONTEXT_LENGTH=65536 ollama serve
```

4. Terminal A 下载模型，等下载完成：

```
ollama pull qwen3.5:9b
```

5. 先建立基线，记录失败项（示例是 expense calculator：5 笔支出含一笔退款，正确总额 25.50，起始程序只打印最后一笔 8.00）：

```
python3 expense_total.py
python3 -m unittest -v
```

原文记录：3 个用例失败（十进制运算、退款、样例支出），空输入和单条输入已通过。

6. 联网时先做一次冒烟测试（`--pure` 关闭外部插件）：

```
.tools/node_modules/.bin/opencode --pure
```

确认选中的是本地 Qwen3.5 9B，输入诊断提示词：

```
Read expense_total.py and run the tests. Explain the bug without editing any files.
```

逐条查看权限提示再放行。原文的教训：agent 一开始提议用 pytest，而项目用的是内置 unittest——下一次任务应在提示词里写明确切测试命令 `python3 -m unittest -v`。完成后 `/exit`，Ollama 继续在 Terminal B 运行。

7. 断网：关闭 Wi-Fi，拔掉网线/关闭手机热点。然后验证“本地通、外网断”：

```
curl --noproxy '*' --fail http://127.0.0.1:11434/api/tags
curl --noproxy '*' --connect-timeout 5 --max-time 10 --head https://example.com
```

预期：第一条返回并列出已下载的 `qwen3.5:9b`；第二条失败（原文为 `Could not resolve host`）。

8. 断网状态下重开 agent，下修复任务：

```
.tools/node_modules/.bin/opencode --pure
```

```
Fix the bug in expense_total.py so the existing tests pass. Don't change the tests or install anything. Run the tests and explain your fix.
```

审阅 diff 后再批准编辑。原文记录模型提议一行改动并跑通 5 个测试：

```
total = Decimal(amount)      # before
total += Decimal(amount)     # after
```

9. **独立验收**：先 `/exit` 退出 agent，再自己跑测试和样例：

```
python3 -m unittest -v
```

确认 5 个测试全通过、样例输出 25.50、源码确实是 `total += Decimal(amount)`、测试文件与初始版本一致（未被改动）。

10. 同一套配置下再练两个任务（作者自述尚未完成这两个的离线跑通）：

```
Complete examples/csv-report/csv_report.py using its README. Keep the tests unchanged and don't install anything. Run this example's tests and explain what you changed.
```

```
Fix examples/log-analyzer/log_analyzer.py using its README. Keep the tests unchanged and don't install anything. Run its tests and explain your fix.
```

11. 断网工作前的准备清单（原文“What helps”一节）：把项目依赖和会用到的文档预先存到本地；联网时用**完全相同**的命令/模型/配置跑通一次；提示词里给明确切测试命令；任务保持小而聚焦，看 diff 并自己跑测试；保留原测试；注意内存压力；把权限提示、重试、失败也记录下来。

## 对应的研究问题

**1. 能力发现**：原文明确列出可交给 agent 的离线任务——解释不熟悉的函数、调查失败的测试、重构一小段代码、帮忙完成一个功能；示例中还包括“补完一个未完成的函数”（CSV 报告）。明确的能力边界：下载新包、上网查资料仍需联网。

**2. 任务匹配**：终端型编码 agent（OpenCode）＋本地开源权重模型（Qwen3.5 9B）的组合；用 BFCL-V4 之类的函数调用分数来选“会用工具”的模型；Aider 是可替代项（引导式编辑工作流，也支持 Ollama），原文为保持一致性全程用 OpenCode。反向边界：大仓库、陌生框架未经验证；越小的自包含任务越匹配。

**3. 条件供给**：需要给的包括——本地模型权重、项目文件、项目依赖与离线文档、明确切测试命令、`opencode.json`（baseURL 指向本地、只启用本地 provider、编辑/命令前确认、禁用 web 工具）、`OLLAMA_NO_CLOUD=1` 与足够上下文长度、逐条批准的权限提示、以及充足内存余量。缺任何一项都会退化成“在线才能用”。

**4. 主动推进**：原文主要是人工触发。可勉强提炼的是 agent 在一次任务内会连续完成“读文件→提议修改→请求权限→跑测试”的循环，且能自行调用测试套件作为反馈；但没有给出时间/事件/状态触发的持续代理机制，这部分只能算弱依据。

**5. 效果验证**：核心可复制做法是“用项目自带测试作为独立判据”：任务前记录失败基线，任务后自己（不是 agent）跑同一套测试，检查 diff 大小与测试文件未被修改，并核对样例程序的期望输出（25.50）。原文还建议把失败与权限提示一并记录。

## 与已有做法的关系

- **OpenCode（watch）**：本文就是给该工具做离线本地模型配置，可视为其落地条件的具体化。
- **Claude Code（adopt）**：对照项——本文场景（断网、数据不出本机）正是云端的补充路径；若网络与合规允许，二者可并存。
- **goose（watch）**：原文引用预印本 *The Scaffold Effect in Coding Agents*，在 50 个 Terminal-Bench Pro 任务上用两个云端模型比较 Goose / OpenCode / OpenHands-SDK：OpenCode 50% / 46%，Goose 48% / 38%（括号为 95% 置信区间），作者提醒多数差异在统计上不清晰；同时 OpenCode 每解决任务的 token 用量约为 Goose 的 40 倍。
- **OpenClaw、Laya（watch）**：清单中有，本文未涉及。
- **Latent Space（adopt，来源）**：本文出处。

## 证据与局限

原文给出的实证：
- 一次完整的离线记录：断网后本地 API 可访问、外网请求失败；agent 提议并执行一行修复，测试从 3 失败变为 5 通过，样例输出 25.50。
- Qwen 模型卡上的 LiveCodeBench v6 / BFCL-V4 分数（作者明说是发布数据，非本机测量）。
- 预印本中 OpenCode / Goose / OpenHands-SDK 的 pass rate 与置信区间，以及 OpenCode token 用量约 40 倍于 Goose；作者注明这些用云端 API 和不同模型，**不能用来预测本地 Qwen3.5 9B 的表现**。
- 下载体积表与（二手引用的）Voltti 12–16 GB 内存预算。

只是作者主张或未验证：
- 只有一次“一行修复”的成功案例；CSV 报告和日志分析器作者自述尚未跑离线版。
- 没有本机速度、延迟、成功率、内存峰值的量化数据。
- 未测大仓库、陌生框架、复杂依赖项目；示例只用 Python 标准库，因此绕开了“依赖是否齐备”这个离线最大坑。
- 单作者、单机（Mac）、单项目，工具/模型版本与部分环境变量（如 `OLLAMA_NO_CLOUD`、`qwen3.5:9b`、OpenCode 1.19.4）需在自己环境核实后再照抄。
- `opencode.json` 完整内容不在本材料内，只有字段描述。

## 怎么试、怎么验证

最小试用：挑一个 1–2 小时内能读完、**已有测试套件**的小仓库（最好依赖已装好），在一次联网会话里完成安装、`ollama pull` 和在线冒烟；记录测试失败基线；断网；跑 5–10 个同类小任务（解释、定位、一行修复、补完小函数各若干），每个任务都用“agent 改完 → 退出 → 自己跑原测试”的方式验收。

判断有没有改善的指标：
- **独立验证通过率**：自己跑原测试全通过的任务数 / 总任务数（不看 agent 的自述）。
- **测试完整性**：测试文件被改动的次数（目标为 0）。
- **越界行为**：尝试联网、尝试装包的次数（目标为 0）。
- **人工返工量**：需要追加提示或人工再改的行数/次数。
- **耗时比**：从下提示到测试通过的实际耗时 ÷ 自己手动完成的耗时。
- **资源**：内存峰值、每任务 token 数、是否 OOM/超时；以及权限提示数与误提议次数（如误提 pytest）。

建议的采纳门槛：小任务集上独立验证通过率不低于手动基线、测试零改动、零联网尝试，且耗时不超过手动的约 1.5 倍，则可纳入断网/隐私受限场景的标准工作流；否则先只用于“解释代码、定位失败测试”这类低风险任务。
