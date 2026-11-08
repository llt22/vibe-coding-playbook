# 把自己的编码会话微调成本地模型，并用行为对比证明它真的变好了

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：如何把编码 agent 的历史会话变成可自托管的本地模型，并且在不白烧钱、不泄漏隐私的前提下，用行为对比而不是 loss 判断它是否值得上线。
> 先试这一步：先用合成 transcript 跑通 collect→normalize→anonymize→build_dataset→train_tinker.py 离线 smoke test（不加 --train，全程零费用），确认流水线可用再碰自己的会话。
> 最近修订：2026-11-08

## 解决什么问题

日常和编码 agent 的会话里，藏着大量“这个仓库该怎么改、工具该怎么调、上下文被压缩后怎么接着干”的经验。但它们默认 30 天就被删掉，也不会回流到模型里。

这篇手册给出一条可照做的路径：把 Claude Code 这类编码 agent 的历史会话收集、清洗、匿名化、切成训练数据，在 Tinker 上训一个 LoRA，用行为对比确认它真的比 base 强，再合并导出 GGUF 用 llama.cpp 本地服务。重点不是“跑通训练脚本”，而是三件事：先零成本验证流水线、花钱前先看 token 账单、训练后用行为而不是 loss 判断成败。

## 适用与不适用

**适用**

- 你手上有自己有权使用的编码 agent 会话（主要是 Claude Code transcripts），想把“照这个仓库的约定干活”固化进模型。
- 你接受本地/自托管服务，愿意走 llama.cpp + GGUF 这条路。
- 你有 Tinker 账号，愿意为一次小规模 LoRA 付小额费用。
- 你要改善的是工具调用、仓库约定、compaction 后继续这类 agent 行为，而不是通用聊天能力。

**不适用**

- 会话不属于你，或包含他人代码/凭证且未经同意：不要做。
- 想要开箱即用的量化 benchmark 结论：这份材料只有 README，没有独立评测或任务成功率数据。
- 以为能无人值守持续跑：README 没有按时间/事件/状态自动运行的机制，不能据此认定可无人值守推进。
- 期望它替代 Claude Code / Codex / OpenCode：它是这些工具之上的微调与本地部署流水线，不替代它们。

## 前置条件

- Python 3.11+、uv 或 pip、git。
- Tinker API key（训练必需）；W&B key 可选。
- 自己的身份信息（用户名、全名、邮箱、handles、公司、域名），参考 `identity.example.json`。
- 服务时使用的 system prompt 文件，以及每行的 tool definitions。
- 第 8–9 步需要已构建的 llama.cpp checkout 和足够磁盘空间。
- 训练前就要拍板的四件事：排除哪些项目、用哪个模型与上下文长度、服务 harness 的 system prompt 和 tool definitions、学习率（Tinker 在没有校准默认值时必须自己定）。
- 跨 agent：Claude Code / Codex / OpenCode 通过 Agent Skills 装到各自的 skills 目录；其他 agent 需先产出 `references/claude-code-transcripts.md` 的消息 schema，再从第 2 步继续。

## 操作步骤

### 步骤 1：装好 skill 环境

前提：已具备 Python 3.11+ 与 git，并知道自己的 agent 的 skills 目录（下面是 Claude Code 的个人目录，Codex / OpenCode 换成对应路径）。

```bash
git clone https://github.com/drost-ai/tinker-ai-skill.git ~/.claude/skills/tinker-ai-skill
cd ~/.claude/skills/tinker-ai-skill
uv venv && source .venv/bin/activate && uv pip install -r requirements.txt
```

预期：skill 装进 skills 目录，虚拟环境里依赖装好，后续脚本能在仓库目录内直接执行。

### 步骤 2：先用合成 transcript 做零成本 dry run

前提：已完成步骤 1，当前在仓库目录。这一步不读你的任何真实会话，也不花钱。

```bash
python scripts/make_sample_transcript.py --out ./demo-claude-projects --turns 14 --long-results
python scripts/collect_sessions.py   --claude-dir ./demo-claude-projects --data-dir ./demo-data --min-bytes 1000
python scripts/normalize_sessions.py --data-dir ./demo-data
python scripts/anonymize_sessions.py --data-dir ./demo-data --name "Taylor Quintrell"
python scripts/build_dataset.py --data-dir ./demo-data --model Qwen/Qwen3.6-35B-A3B --max-len 8192 --system-prompt-file assets/system-prompt.md
python scripts/train_tinker.py       --data-dir ./demo-data --name qwen3.6-35b-a3b-8k   # offline smoke test
```

预期：六条命令依次完成；最后一条默认是离线 smoke test，会打印解码后的训练行、token 数和 resolved configuration。只有加 `--train` 才真正启动付费训练。全程应当零费用、匿名化不泄漏。任何一步失败就先排查，不要带着失败状态进入真实数据。

### 步骤 3：准备并保住自己的会话

前提：已有 Claude Code 会话，且你有权使用这些数据。

先提高会话保留期，否则默认 30 天后删除：

```json
"cleanupPeriodDays": 3650
```

写入 `~/.claude/settings.json`。然后复制 `.env.example` 为 `.env`，填入 `TINKER_API_KEY` 和 `WANDB_API_KEY`；写 `identity.json`（用户名、全名、邮箱、handles、公司、域名，参考 `identity.example.json`）。在收集前就把要整项目排除的私有仓库列出来。

预期：历史会话不会被清理；凭证与身份信息在仓库外或已 gitignore 的位置；排除清单明确。

### 步骤 4：按九步流水线执行

前提：已决定排除哪些项目、用哪个模型与上下文长度、服务时用的 system prompt 和 tool definitions。九步的顺序与职责是：

1. 收集 `collect_sessions.py`：逐字复制 transcript、校验和、跳过 subagent 和过小会话。
2. 清洗 `normalize_sessions.py`：转成 OpenAI-style messages、去 harness 噪声。
3. 匿名化 `anonymize_sessions.py`：按值替换凭证、按会话随机化身份；发现泄漏则失败。
4. 切片/压缩/划分 `build_dataset.py`：用模型真实 renderer 量上下文、不拆开 tool call 与结果、给后续切片补 working-context block 和 continuation bridge、按 seeded hash 留出整段 session。
5. 训练 `train_tinker.py`。
6. 检查 `sample_checkpoint.py`。
7. 导出 `export_checkpoint.py`。
8. 转 GGUF `make_gguf.sh`。
9. 本地服务 `serve_gguf.sh`。

**做法 A：让 agent 按 `SKILL.md` 执行。** 直接用自然语言触发，例如：

```text
fine-tune Qwen3.6-35B-A3B on my Claude Code sessions from the last three months.
```

适合你已经把排除项目、模型、上下文长度想清楚，希望 agent 顺着九步自己推进。

**做法 B：自己按顺序跑脚本。** 每一步都能看到产物，便于定位是哪一步坏了。

**怎么选**：第一次跑用做法 B；流程熟悉、参数固定之后用做法 A 省事。两条路产生的是同一批中间文件，可以混用。

### 步骤 5：训练前审查数据安全

前提：匿名化已经跑完。

- 确认 `data/`、`demo-*/`、`runs/`、`export/`、`wandb/`、`.env` 都被 git 忽略。
- 人工抽查匿名化后的行，确认没有残留学号、域名、凭证、他人代码。
- 匿名化器发现泄漏会失败而不是写文件——这是保护机制，失败时停下来查，不要绕过。
- 不要未经同意发布别人的 transcript 数据集。

### 步骤 6：付费闸门——先看 token 数与成本，再加 --train

前提：步骤 2 的离线 smoke test 已通过。`train_tinker.py` 默认只做离线 smoke test，先打印 token 数和配置；确认后再加 `--train` 真正启动付费训练。

README 给出的成本口径（2026 年 11 月价格）：100 行个人语料约 5M train tokens，Qwen3.6-35B-A3B 约 $6；1,000 行约 45M tokens，约 $55。这是作者口径，不是你的账单——用自己的语料跑一次 smoke test 看真实 token 数再决定规模。

### 步骤 7：用行为对比验证 base 与 checkpoint

前提：训练完成。用 `sample_checkpoint.py` 对 base 和 checkpoint 使用相同渲染采样，按行为判断，而不是看 loss。评价维度见下一节。

### 步骤 8：导出与本地服务

前提：行为对比通过；已构建 llama.cpp 并有磁盘。

- `export_checkpoint.py` 下载 LoRA 并合并成 bf16 HuggingFace 模型（或者导出给 vLLM / SGLang 的 PEFT adapter，按你的服务栈二选一）。
- `make_gguf.sh` 转 GGUF、量化、导出 vision projector 和 draft head。
- `serve_gguf.sh` 用与训练匹配的 template 和 sampling flags 启动 llama-server。

预期：服务端输出正常、不出现乱码；采样参数与训练时一致。

## 怎么判断变好了

**流水线阶段（零成本）**

- 步骤 2 的六条命令全部完成，`train_tinker.py` 打印出解码后的训练行、token 数、resolved configuration。
- 匿名化不泄漏、不产生费用。
- 数据集行数与 token 数在预算内；若换过模型或 renderer，行数出现明显变化（README 提到 tokenizer 变化会让行数变化 14% 并超预算）就要停下来重新量。

**模型阶段（花钱后）**

- 在留出的整段 session 上，用相同渲染对 base 和 checkpoint 采样，人工盲评：任务完成度、工具调用正确性、遵循仓库约定、compaction 之后继续干的能力、服务端输出是否乱码。
- 同时记录训练 token、费用、耗时，作为下一轮规模的依据。

**最小试用方式**：先合成 dry run（步骤 2）；再用自己有权使用的少量会话，按 README 的 100 行个人语料档跑一次真实 LoRA——先 smoke test 看成本，再 `--train`；最后做一轮 base/checkpoint 行为盲评。

**试多久**：材料没有给时间预算，作者说的“one afternoon”“production-tested”只是主张，不要当计划依据。以“dry run 通过 + 一次 100 行档 LoRA + 一轮盲评”为一轮来试。判定标准是：fine-tuned 在留出会话的行为上稳定优于 base，且没有明显回退；只在 NLL/loss 上好看不算数。

## 常见坑

- **忘了 `--train` 才是付费**：不加时只是 smoke test；反过来，不看打印出的 token 数就直接开训，预算会失控。
- **行里缺 tool definitions**：工具使用会回退，但 NLL 反而变好——只看 loss 会挑到更差的 checkpoint。
- **换模型或 renderer 后没重新量**：tokenizer 变化会让行数变化 14% 并超预算。
- **把 loss 单调下降当成功**：README 提到两个 “collapse” 的场景，loss 单调下降并不等于模型变好。
- **服务端参数与训练不匹配**：chat template 去掉早期 thinking，或 llama.cpp 用默认 min-p，会把好 checkpoint 变成乱码。
- **没设 `cleanupPeriodDays`**：默认 30 天删除，等你想起要训练时会话已经没了。
- **绕过匿名化失败**：失败即不写文件是设计，不是 bug。
- **把第一次真实训练当上线**：材料只有 README，没有 `SKILL.md`、11 个脚本和 6 份参考笔记，超参与失败处理无法核验。
- **默认 OpenCode 也可用**：README 声称兼容 Claude Code / Codex / OpenCode，但清单里 OpenCode 仍是 watch，需自行验证。

## 证据与来源

- **步骤与命令**：全部来自 drost-ai/tinker-ai-skill 的 README（经本次调研报告转述），包括九步流水线、六条 quick start 命令、`cleanupPeriodDays` 设置、`.env` 与 `identity.json` 准备、export / GGUF / serve 环节，以及自然语言触发示例。
- **成本数字**（100 行约 5M tokens ≈ $6；1,000 行约 45M tokens ≈ $55；2026 年 11 月价格口径）：作者口径，未独立核验，实际以自己 smoke test 打印的 token 数为准。
- **“Tess-4 / Tess-4.5 用同一方法构建并开源”“production-tested”“one afternoon”**：作者主张，材料中没有独立评测或任务成功率数据。
- **失败模式**（无 tool definitions 时 NLL 变好但工具使用回退；tokenizer 变化导致行数变化 14% 并超预算；loss 单调下降的 collapse；chat template 与 min-p 导致乱码）：来自 README 自述，本手册把它们当检查清单使用，未做复现实验。
- **局限**：只拿到 README，未拿到 `SKILL.md`、11 个脚本和 6 份参考笔记，具体超参、失败处理和数据格式无法核验；适用前提是有权使用的编码会话、Tinker 账号、llama.cpp 环境与足够磁盘，且模型 / tokenizer / renderer 必须匹配。

## 依据的调研

- [drost-ai/tinker-ai-skill](../research/radar/2026-11-08/11446-drost-ai-tinker-ai-skill.md)：值得一试，建议小范围试：先用合成 transcript 跑通数据处理和离线 smoke test，再用自己的少量会话做一次 LoRA 并以行为对比验证；理由是 README 给出了可照做的命令和九步流程，但关键脚本与超参未在材料中展开，成本和效果仍需实测。
