# drost-ai/tinker-ai-skill

- 结论：**值得一试**。建议小范围试：先用合成 transcript 跑通数据处理和离线 smoke test，再用自己的少量会话做一次 LoRA 并以行为对比验证；理由是 README 给出了可照做的命令和九步流程，但关键脚本与超参未在材料中展开，成本和效果仍需实测。
- 原文：https://github.com/drost-ai/tinker-ai-skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-08T00:49:17.705Z

## 是什么
这个仓库是一个 Agent Skill，把 Claude Code 等编码智能体的历史会话转成监督微调数据，在 Tinker 上训练 LoRA，合并后导出 GGUF，用 llama.cpp 本地运行。README 声称这是 Tess-4 / Tess-4.5 背后的蒸馏版流水线，覆盖从原始 transcript 到量化 GGUF 的九步流程，并提供脚本、参考笔记和合成 transcript 生成器。

## 具体做法
1. 准备环境。前提：Python 3.11+、uv 或 pip、git；训练需要 Tinker API key，W&B key 可选；第 8-9 步需要已构建的 llama.cpp checkout 和磁盘空间。安装到 Claude Code 个人 skills 目录（Codex/OpenCode 换成对应路径）：
```bash
git clone https://github.com/drost-ai/tinker-ai-skill.git ~/.claude/skills/tinker-ai-skill
cd ~/.claude/skills/tinker-ai-skill
uv venv && source .venv/bin/activate && uv pip install -r requirements.txt
```

2. 先用合成 transcript 做五分钟 dry run。前提：已完成上一步，进入仓库目录。以下命令来自 README 的 Quick start：
```bash
python scripts/make_sample_transcript.py --out ./demo-claude-projects --turns 14 --long-results
python scripts/collect_sessions.py   --claude-dir ./demo-claude-projects --data-dir ./demo-data --min-bytes 1000
python scripts/normalize_sessions.py --data-dir ./demo-data
python scripts/anonymize_sessions.py --data-dir ./demo-data --name "Taylor Quintrell"
python scripts/build_dataset.py --data-dir ./demo-data --model Qwen/Qwen3.6-35B-A3B --max-len 8192 --system-prompt-file assets/system-prompt.md
python scripts/train_tinker.py       --data-dir ./demo-data --name qwen3.6-35b-a3b-8k   # offline smoke test
```
最后一条默认是离线 smoke test，会打印解码后的训练行、token 数和 resolved configuration；加 `--train` 才真正启动付费训练。

3. 准备自己的会话。前提：已有 Claude Code 会话，且有权使用这些数据。先提高会话保留期，否则默认 30 天后删除：
```json
"cleanupPeriodDays": 3650
```
写入 `~/.claude/settings.json`。然后复制 `.env.example` 为 `.env`，填入 `TINKER_API_KEY` 和 `WANDB_API_KEY`；写 `identity.json`（用户名、全名、邮箱、handles、公司、域名，参考 `identity.example.json`）。在收集前决定要整项目排除的私有仓库。

4. 按九步流水线执行。前提：已决定要排除的项目、模型与上下文长度、服务时使用的 system prompt 和 tool definitions。让 agent 按 `SKILL.md` 执行，或直接跑脚本：收集用 `collect_sessions.py`（逐字复制 transcript、校验和、跳过 subagent 和过小会话）；清洗用 `normalize_sessions.py` 和 `anonymize_sessions.py`（转 OpenAI-style messages、去 harness 噪声、按值替换凭证、按会话随机化身份，泄漏则失败）；切片/压缩/划分用 `build_dataset.py`（用模型真实 renderer 量上下文、不拆开 tool call 与结果、给后续切片补 working-context block 和 continuation bridge、按 seeded hash 留出整段 session）；训练用 `train_tinker.py`；检查用 `sample_checkpoint.py`；导出用 `export_checkpoint.py`；GGUF 与服务用 `make_gguf.sh`、`serve_gguf.sh`。

5. 训练前先看成本。前提：离线 smoke test 通过。`train_tinker.py` 会先打印 token 数和配置；确认后再加 `--train`。README 的成本口径：100 行个人语料约 5M train tokens，Qwen3.6-35B-A3B 约 $6；1,000 行约 45M tokens，约 $55。

6. 检查、导出、服务。前提：训练完成；第 8-9 步需要 llama.cpp。用 `sample_checkpoint.py` 对 base 和 checkpoint 用相同渲染采样，按行为判断而不是 loss；用 `export_checkpoint.py` 下载 LoRA 并合并成 bf16 HuggingFace 模型（或给 vLLM/SGLang 的 PEFT adapter）；`make_gguf.sh` 转 GGUF、量化、导出 vision projector 和 draft head；`serve_gguf.sh` 用训练匹配的 template 和 sampling flags 启动 llama-server。

7. 数据安全。前提：训练前审查匿名化后的行。`data/`、`demo-*/`、`runs/`、`export/`、`wandb/`、`.env` 被 git 忽略；匿名化器发现泄漏会失败而不是写文件；不要未经同意发布别人的 transcript 数据集。

## 对应的研究问题
- 能力发现：README 把过去常手工做的数据工程交给 agent：收集会话、去噪、凭证替换、按会话随机化身份、按真实 renderer 量 token 切片、补 compaction context、留出整段 session、训练 LoRA、采样检查、合并导出 GGUF、按训练匹配参数服务。还给出自然语言触发示例：“fine-tune Qwen3.6-35B-A3B on my Claude Code sessions from the last three months.”
- 任务匹配：适合编码智能体个性化。输入是 Claude Code transcripts；训练用 Tinker + tinker-cookbook 的 LoRA；服务用 llama.cpp GGUF；README 点名 Qwen3.6-35B-A3B、Inkling 2 Small、Qwen3.8-27B 的成本档。它强调 agent transcripts 不是 chat data，必须保留 tool definitions/system prompt、thinking history、compaction context，并用模型真实 tokenizer/renderer。跨 Claude Code/Codex/OpenCode 通过 Agent Skills 安装；其他 agent 需先产出 `references/claude-code-transcripts.md` 的消息 schema 再从第 2 步继续。
- 条件供给：需要会话保留期设置、Tinker/W&B key、`identity.json`、system prompt 文件、每行 tool definitions、llama.cpp 与磁盘；人工决定排除哪些项目、模型与上下文长度、服务 harness 的 prompt 和 tool definitions、学习率（Tinker 无校准默认值时）。数据安全要求匿名化失败即不写文件、训练前审查、未经同意不发布他人数据。
- 主动推进：有 agent 驱动的九步顺序和“花钱前停下”的 gate：`train_tinker.py` 默认离线 smoke test 并先打印 token 数和配置，加 `--train` 才启动付费训练。README 没有给出按时间/事件/状态自动持续运行的机制，不能据此认定可无人值守推进。
- 效果验证：README 要求用相同渲染对 base 和 checkpoint 采样，按行为判断而不是 loss；并给出失败模式作为检查点：无 tool definitions 的行会让工具使用回退但 NLL 变好；tokenizer 变化使行数变化 14% 并超预算；两个“collapse”的 loss 单调下降；chat template 去掉早期 thinking 或 llama.cpp 默认 min-p 会把好 checkpoint 变成乱码。原文没有给量化 benchmark。

## 与已有做法的关系
清单中有 Claude Code（adopt）、OpenAI Codex（adopt）、OpenCode（watch）和 Agent skills（adopt）。这个 skill 本身是一个 Agent Skill，直接安装到 Claude Code/Codex/OpenCode 的 skills 目录；输入依赖 Claude Code transcripts；README 声称兼容三者，但清单里 OpenCode 仍是 watch，需自行验证。它是这些工具之上的微调/本地部署流水线，不替代它们。清单中没有 Tinker 微调、LoRA 合并、GGUF 转换或 llama.cpp 本地服务相关条目。

## 证据与局限
证据：README 声称 Tess-4-27B、Tess-4.5-27B 用同一方法从作者自己的 Claude Code 会话构建并开源；给出九步流程、脚本清单、合成数据 quick start、成本表（100 行约 5M tokens，Qwen3.6-35B-A3B 约 $6；1,000 行约 45M tokens 约 $55；均为 2026 年 11 月价格口径）。局限：我们只拿到 README，未拿到 `SKILL.md`、11 个脚本和 6 份参考笔记，无法核验具体超参、失败处理和数据格式；成本是作者口径，“one afternoon”“production-tested”是主张；没有独立评测或任务成功率数据；适用条件是有权使用的编码会话、Tinker 账号、llama.cpp 环境和足够磁盘，且模型/tokenizer/renderer 要匹配。数据涉及隐私和他人代码，必须先匿名化和审查。

## 怎么试、怎么验证
最小试用：先按 Quick start 用 `make_sample_transcript.py` 生成合成 transcript，跑通 collect→normalize→anonymize→build_dataset→`train_tinker.py` 离线 smoke test；成功标准是命令完成、打印解码训练行/token 数/resolved config、匿名化不泄漏、不产生费用。第二步用自己有权使用的少量会话（README 的 100 行个人语料档）跑一次真实 LoRA，先 smoke test 看成本再 `--train`。验证：留出整段 session，用 `sample_checkpoint.py` 对 base 和 checkpoint 相同渲染采样；人工盲评任务完成、工具调用正确性、遵循仓库约定、compaction 后继续能力、服务端输出是否乱码；同时记录训练 token/费用/耗时。只有当 fine-tuned 在留出会话行为上稳定优于 base 且无明显回退，才认为改善。
