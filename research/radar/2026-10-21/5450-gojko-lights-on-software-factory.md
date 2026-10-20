# gojko/lights-on-software-factory

- 结论：**值得研读**。先把它作为 Claude Code 软件工厂的架构样例研读，重点看确定性命令监管、编辑后 lint 反馈和计划到多智能体脚本生成；README 缺少完整配置与步骤，暂不建议直接采用，待补读仓库内文档后再小范围试。
- 原文：https://github.com/gojko/lights-on-software-factory
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-20T22:55:09.939Z

## 是什么

这是一个面向 Claude Code 的“软件工厂”脚手架仓库，目标是把容器沙箱、Bash 命令监管、编辑后 lint 反馈、计划/执行工作流和多智能体工作流脚本生成组合成一套可复用的项目起点。README 称其基于 Votito 的实践，编排器相较“裸 Claude 工作流”降低约 80% token 消耗。仓库包含 workspace 示例项目、.claude 配置、agents、commands、workflow 工具以及 plans 进度记录。

## 具体做法

README 只给出仓库结构和入口，未包含 GETTING-STARTED、SETTINGS、REGULATOR、ORCHESTRATOR 等文档正文，因此下面只列原文明确给出的操作入口，不能视为完整安装教程。

1. 前提：按 README 指向，从 GETTING-STARTED.md 开始完成容器设置和第一次变更；本材料不含该文件，无法给出首次设置的全部命令。
2. 使用仓库根目录 makefile 的容器目标。README 明确列出的目标包括：

```
docker-image
init
claude
shell
test
lint
root
```

3. 在 workspace 中启动 Claude Code：

```
make claude
```

4. 把项目规则和上下文放在 workspace 的 CLAUDE.md 与 CONTRIBUTING.md；把 hooks、环境变量、权限和偏好放在 workspace/.claude/settings.local.json；角色放在 .claude/agents/（workflow-worker、workflow-gate、workflow-check）；命令放在 .claude/commands/（impact-analysis、plan-execution、execute、regulator）。
5. 按 README 描述的工作流入口运行：

```
/impact-analysis
/plan-execution
/execute
/regulator
```

6. 扩展规则的方式：每次 Claude 请求批准时，让 Claude 增加自定义 regulator 规则；每次发现自己重复给设计/代码反馈时，让 Claude 写自定义 lint 规则；需要时让 Claude 为 HTML/CSS 等文件类型实现自定义 eslint 语言解析器。README 未给出这些请求的原话提示词。
7. 由计划生成多智能体工作流脚本：README 说明 orchestrator 根据 implementation workflow 产出的 plan 创建 Claude workflow scripts，组织测试和 gate，把机械编排从推理移到命令行工具；具体生成命令需看 ORCHESTRATOR.md，材料未提供。

## 对应的研究问题

- 能力发现：把命令审批、代码风格检查、工作流脚本组装等机械工作交给确定性工具；用 workflow-worker、workflow-gate、workflow-check 做多智能体分工。
- 任务匹配：面向 Claude Code 环境下的代码修改任务，流程是先影响分析、再计划、再执行，并由测试和 gate 把关；示例项目是 JavaScript/ESLint，适合作为同类代码任务的参考。
- 条件供给：需要容器/工作区隔离（只共享 workspace）、CLAUDE.md/CONTRIBUTING.md 规则、settings.local.json 的 hooks/env/permissions/preferences、agents/commands 定义、plans 进度记录、测试与 lint 配置，以及 regulator 和 linter 规则。
- 主动推进：PostToolUse hook 在 Claude 每次编辑 JavaScript 文件后自动跑 linter；orchestrator 根据 plan 生成 workflow scripts 并组织测试与 gate；WORKFLOW/ORCHESTRATOR 还提到 watching、progress 和 resume。
- 效果验证：用 workflow gate、make test/lint、linter hook 的错误提示和进度记录判断执行质量；token 消耗降低是作者声称的指标，但 README 没有给出测量方法和原始数据。

## 与已有做法的关系

清单中有 Claude Code（tool，adopt）。本仓库是 Claude Code 的上层脚手架和工作流，依赖并扩展 Claude Code 的 hooks、agents、commands、settings 和权限机制；清单中没有 regulator、linter hook、orchestrator 等具体条目。

## 证据与局限

证据：README 给出仓库结构和组件清单；提到 Votito 案例中编排器相较裸 Claude 工作流降低约 80% token 消耗；仓库含一个示例模块 format-greeting、测试、eslint 配置、两个 lint 规则、多个 agents 和命令入口。局限：本材料只有 README，缺少 GETTING-STARTED、SETTINGS、REGULATOR、ORCHESTRATOR、WORKFLOW 等正文，无法核对实际配置、提示词、规则和安装步骤；80% 是作者主张，没有实验设计和数据；示例偏向 JavaScript/ESLint，迁移到其他语言需要自行实现规则；仓库只有 55 stars，成熟度未验证。

## 怎么试、怎么验证

先做架构研读：读 GETTING-STARTED、SETTINGS、REGULATOR、LINTER-HOOK、ORCHESTRATOR、WORKFLOW 和 workflow/README.md，确认能否在自己的技术栈复现。若要小范围试，在隔离容器中按 GETTING-STARTED 跑通示例变更，再选一个真实的小型代码任务做对照：基线用裸 Claude Code，实验组用本脚手架。记录每个任务的 token 用量、人工批准次数、人工代码评审意见数、lint 违规和修复轮次、测试通过率、从计划到完成的时间、恢复运行是否成功，并同时检查结果质量。只有当结果质量不低于基线且 token 或人工干预明显下降时，才考虑扩大使用。
