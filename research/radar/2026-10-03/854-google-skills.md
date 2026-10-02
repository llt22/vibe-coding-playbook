# google/skills

- 结论：**值得一试**。建议小范围试：用 npx skills add google/skills 或对应 agent harness 的插件市场，按当前任务只安装一个 Google 相关技能，并先在测试项目验证；README 给出了可复制的安装流程和大量技能分类，但未展开单个技能的具体步骤与效果数据，暂不宜直接全面采用。
- 原文：https://github.com/google/skills
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T18:27:56.563Z

## 是什么

google/skills 是 Google 维护的 Agent Skills 仓库，收录面向 Google 产品与技术的技能，包括 Google Cloud、AI/ML、基础设施、数据库与分析、开发者工具、管理工具、安全与身份、Web/应用托管、广告、分析等。README 提供 skills.sh 安装命令，也支持作为 Claude Code、Codex、Antigravity CLI 的插件市场安装。技能列表以链接形式指向具体 skill 目录。

## 具体做法

前提：本机有 Node.js/npx，网络可访问 GitHub 和 skills.sh；使用 Google Cloud 相关技能需要相应的 Google Cloud 账号、项目和权限。插件安装需已安装对应 agent harness。

1. 通过 skills.sh 安装并交互选择技能。

```bash
npx skills add google/skills
```

从 npx install 命令中可选择本仓库中的具体 skills 安装。

2. 使用 Claude Code 时，添加插件市场并安装插件。

```bash
claude plugin marketplace add google/skills
claude plugin install <plugin>@google-plugins
```

将 `<plugin>` 替换为要安装的插件名。

3. 使用 Codex 时，添加插件市场，然后在 Codex 中从 `/plugins` 浏览器安装。

```bash
codex plugin marketplace add google/skills
```

4. 使用 Antigravity CLI 时，按插件路径安装。

```bash
agy plugin install https://github.com/google/skills/<plugin-path>
```

将 `<plugin-path>` 替换为具体插件路径。

5. 按任务匹配选择技能。从 README 的 Available Skills 列表按类别查找，例如 gcloud CLI Skill for AI Agents、BigQuery Optimization Workflow、GKE 故障排查、IAM 策略管理等。先选一个与当前任务最接近的技能，不要一次安装全部。

6. 使用前确认前提和权限。README 只给出列表和链接，具体每个技能需要哪些信息、工具、权限和配置，需要进入对应 skill 目录查看；Google Cloud 技能通常依赖账号、项目、认证和 IAM 权限。

## 对应的研究问题

1. 能力发现：README 列出大量可交给 AI 执行的具体技能，如 gcloud CLI、BigQuery 优化、GKE 故障排查、IAM 策略管理、SecOps 调查、Google Ads API 诊断等，说明这些工作已有可安装的 Agent Skill 形式。

2. 任务匹配：仓库按产品和技术分类组织技能，并提供 Claude Code、Codex、Antigravity CLI 的插件安装方式，可作为按 agent harness 和任务类型匹配工具的来源。

3. 条件供给：安装需要 Node/npx 或对应 agent harness；Google Cloud 技能需要 Google Cloud 账号、项目、认证和权限。README 本身未展开每个技能需要哪些信息、工具、权限，只给出目录链接。

4. 主动推进：README 未说明 skills 是否支持时间、事件或状态触发。部分技能名称暗示可处理告警配置、故障排查、成本优化等，但原文没有给出触发机制。

5. 效果验证：仓库提供 Agent Platform Eval Flywheel Skill、检测覆盖评估等可能涉及评估的技能，但 README 没有给出验证方法或指标，不能据此判断效果改善。

## 与已有做法的关系

清单中已有 Claude Code（adopt）、Agent skills（concept，adopt）、skills.sh（source，try）。google/skills 是 Agent Skills 概念在 Google 产品上的一组具体集合，并直接支持 Claude Code 插件安装；它通过 skills.sh 安装，与 skills.sh 条目直接相关。它可作为已有 Agent Skills 实践的技能来源扩展，而不是替代。

## 证据与局限

证据：README 给出安装命令、插件安装命令、大量技能链接和分类；GitHub 指标显示 20653 stars、今日 78 stars。安装方式来自官方仓库 README。

局限：原文只有 README，未展示任何具体 skill 的完整步骤、提示词、配置样例；未提供使用案例、效果数据或对比；Google Cloud 技能依赖账号、项目、权限和可能计费；不同 agent harness 的插件安装命令未在 README 中给出完整插件名或路径；npx 和插件安装需要网络及运行环境。仓库主张这些技能可用，但未在材料中验证实际改善。

## 怎么试、怎么验证

最小试用：在隔离环境或测试项目中，用 Node/npx 安装一个与当前工作最相关的技能。例如先运行 `npx skills add google/skills`，只选择一个技能（如 BigQuery 优化或 gcloud CLI）。若使用 Claude Code，按插件方式只安装一个插件。在测试项目执行一个具体任务，记录是否减少查文档或手写命令的时间、命令/配置正确率、需要人工纠正次数、权限申请次数。

验证指标：任务完成时间、一次性通过率、人工干预次数、错误率、权限范围是否收敛。与未使用技能时做对照；若没有对照，至少记录使用前后同一类任务的耗时和返工次数。不要在正式环境直接试高权限技能。
