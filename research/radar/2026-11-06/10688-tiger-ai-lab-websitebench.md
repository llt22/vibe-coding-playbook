# TIGER-AI-Lab/WebsiteBench

- 结论：**值得一试**。可以小范围试用 WebsiteBench，用其提供的命令评估 AI 智能体通过浏览器探索重建网站的能力，以界定全栈网站逆向工程的能力边界；理由是仓库给出了可运行的评测流程和任务包，但 README 未提供评分标准和结果数据，需结合文档进一步确认。
- 原文：https://github.com/TIGER-AI-Lab/WebsiteBench
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-05T20:19:49.130Z

## 是什么
WebsiteBench 是一个评测基准，用于检验 AI 智能体能否通过浏览器探索一个生产级网站，并逆向工程出一个全栈版本，使其外观和行为尽可能接近原网站。仓库提供任务包、运行脚本和文档，支持用不同 agent 和模型运行评测。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
前提：需要安装 git、uv、Docker，并有可用的 agent 凭证（如 codex 的凭证）和模型标识符；`<model>` 需替换为实际模型标识符。
1. 克隆仓库并进入目录：
```sh
git clone https://github.com/TIGER-AI-Lab/WebsiteBench.git
cd WebsiteBench
```
2. 安装依赖：
```sh
uv sync
```
3. 运行单个任务（以 `local-tasks/medium` 为例，使用 codex agent）：
```sh
uv run harbor run --path ./local-tasks/medium \
  --agent codex --model '<model>'
```
4. 运行全部任务：
```sh
uv run harbor run --path ./local-tasks \
  --agent codex --model '<model>' --n-concurrent 1
```
5. 结果写入 `jobs/` 目录。更多运行选项、其他 agent 和 oracle checks 见 `docs/running.md`。

注意：README 提到 “Use complete task bundles under `local-tasks/`, Docker, and your agent credentials.” 所以需要 Docker 和 agent 凭证。任务数据与轨迹在 HuggingFace 数据集 TIGER-Lab/WBArtifacts。

## 对应的研究问题
- 能力发现：WebsiteBench 直接测试 AI 智能体通过浏览器探索重建网站的能力，可用于发现智能体在全栈网站逆向工程上的能力边界（依据：任务描述）。
- 任务匹配：支持通过 `--agent` 和 `--model` 参数指定不同 agent 和模型，便于比较不同模型/工具组合在网站重建任务上的表现（依据：运行命令中的参数）。
- 条件供给：运行评测需要完整任务包（`local-tasks/`）、Docker 环境、agent 凭证，以及可用的模型标识符；这些是完成任务所需的条件（依据：README 的 Quickstart 和 Evaluate 部分）。
- 主动推进：原文未涉及由时间、事件或状态触发并持续完成的工作流。
- 效果验证：WebsiteBench 本身是效果验证工具，通过让智能体重建网站并检查输出（结果在 `jobs/`，文档提到 oracle checks）来评估能力；但 README 未给出具体评分指标（依据：仓库定位和 `docs/running.md` 中的 oracle checks 描述）。

## 与已有做法的关系
清单中没有相关条目。

## 证据与局限
原文仅为 GitHub README。证据：给出了可复制的安装和运行命令、任务目录结构、结果输出位置，以及指向文档和数据集。局限：没有提供任务数量、评分标准、基线结果或案例数据；没有说明如何判断重建的“外观和行为尽可能接近”的具体指标；需要 Docker、agent 凭证和模型访问权限；仓库 star 数 30，社区采用情况不明。作者主张（“agents must reverse-engineer...”）需要结合文档和实际运行验证。

## 怎么试、怎么验证
最小试用：按上述步骤克隆、安装依赖，选择一个任务（如 `local-tasks/medium`），用你已有的 agent 和模型运行。观察是否成功产出重建网站并写入 `jobs/`。验证改善：阅读 `docs/running.md` 了解 oracle checks 和结果解读；比较不同模型（替换 `<model>`）在同一任务上的输出质量（如外观和行为匹配度，具体指标需参考文档）。由于 README 未给出量化指标，建议先跑通单个任务，再决定是否批量运行。判断有没有改善的指标：任务完成率、重建页面与原页面的视觉/行为匹配程度（需文档定义），以及运行日志中的错误信息。
