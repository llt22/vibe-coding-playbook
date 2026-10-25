# aws/agent-toolkit-for-aws

- 结论：**值得一试**。如果团队在 AWS 上开发且已使用 Claude Code、Codex、Cursor、Devin、Kiro 或 fx，建议先安装 aws-core 并在只读权限下小范围试用；它把 MCP 服务、Agent Skills、插件和审计控制打包，能直接补齐智能体访问 AWS 的能力与权限供给，但证据主要来自官方 README，缺少独立效果数据。
- 原文：https://github.com/aws/agent-toolkit-for-aws
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-25T07:12:54.198Z

## 是什么
这是 AWS 官方发布的 Agent Toolkit for AWS README。它把 AWS MCP Server 配置、Agent Skills、插件和项目级 rules 打包，给 Claude Code、Codex、Cursor、Devin、Kiro、fx 等编码智能体提供访问 AWS API、沙箱脚本执行、实时文档检索和任务指导的能力。官方把它定位为 AWS Labs 中 MCP servers、skills、plugins 的继任者，并强调 IAM 条件键、CloudWatch 指标和 CloudTrail 审计等企业控制。仓库状态为 GA，许可证 Apache-2.0。

## 具体做法
1. **先确认前提。** 目标任务应是 AWS 上的构建、部署、管理、数据分析或 DevSecOps；使用 README 支持的编码智能体。API 调用和脚本执行需要本地已配置 AWS 账号凭据；仅做文档检索或技能发现不需要认证。Kiro、fx 和其他 agent 的手动安装路径还要求本机安装 `uv`。首次接入建议只装 `aws-core`，它覆盖服务选择、CDK/CloudFormation、无服务器、容器、存储、可观测性、账单、SDK 使用和部署。
2. **Claude Code：从官方 marketplace 安装 `aws-core`。** 前提是使用 Claude Code，且默认已添加 `claude-plugins-official` marketplace。
```text
/plugin install aws-core@claude-plugins-official
```
若提示 `Plugin not found`，先更新索引：
```text
/plugin marketplace update claude-plugins-official
```
按任务再装其他插件：
```text
/plugin install aws-agents@claude-plugins-official
/plugin install aws-data-analytics@claude-plugins-official
```
DevSecOps 插件可从本仓库或官方 marketplace 安装，并按 README 执行 setup：
```text
/plugin marketplace add aws/agent-toolkit-for-aws
/plugin install aws-agents-for-devsecops
/reload-plugins

# Or from Claude's official marketplace:
/plugin install aws-agents-for-devsecops@claude-plugins-official
/reload-plugins

# Setup:
/aws-agents-for-devsecops:setup
```
创业公司顾问插件从本仓库 marketplace 安装：
```text
/plugin marketplace add aws/agent-toolkit-for-aws
/plugin install aws-startup-advisor@agent-toolkit-for-aws
/reload-plugins
```
3. **Codex：添加仓库 marketplace 后安装。** 前提是使用 Codex。
```text
codex plugin marketplace add aws/agent-toolkit-for-aws
```
启动 Codex 后运行 `/plugins`，浏览并安装 `aws-core`。
4. **Cursor：通过 Team Marketplace 导入。** 前提是使用 Cursor。进入 **Settings → Plugins → Team Marketplaces → Add Marketplace → Import from Repo**，指向 `aws/agent-toolkit-for-aws`；Cursor 会索引 `.cursor-plugin/marketplace.json` 中的插件。然后在 **Plugins** 面板安装 `aws-core`，需要时再装 `aws-agents`、`aws-data-analytics`。每个插件都包含 AWS MCP Server 配置和 agent skills。
5. **Devin：用 CLI 或 Web UI 安装。** 前提是已登录 Devin。
```text
devin auth login
devin plugins install aws/agent-toolkit-for-aws#plugins/aws-core
```
加 `--local` 只装到本机；不加则加入个人插件，在 Devin cloud sessions 和 Devin Desktop 也加载。要装其他插件，把 `aws-core` 替换为 `aws-agents` 或 `aws-data-analytics`。Web UI 路径是 **Customize → Plugins → Add plugin → From repository**，仓库填 `aws/agent-toolkit-for-aws`，子目录填 `plugins/aws-core`。
6. **Kiro：MCP Server 与本地 skills 分开装。** 前提是安装 `uv`，API 调用和脚本执行需要本地 AWS 凭据。先把 AWS MCP Server 写入 `.kiro/settings/mcp.json`：
```json
{
  "mcpServers": {
    "aws": {
      "command": "uvx",
      "args": [
        "mcp-proxy-for-aws-cli@latest",
        "https://aws-mcp.us-east-1.api.aws/mcp",
        "--metadata",
        "AWS_REGION=us-west-2"
      ]
    }
  }
}
```
再安装 skills：
```text
npx skills add aws/agent-toolkit-for-aws/skills
```
skills 会装到 `~/.kiro/skills/` 或 `.kiro/skills/`；每个 skill 是含 `SKILL.md` 的目录，可选 `references/`。Kiro 会自动发现并在任务匹配时按需加载。
7. **fx：同样分 MCP Server 和 skills 两部分。** 前提是安装 `uv`，并配置 AWS 凭据。可用命令添加 MCP Server：
```text
fx mcp add aws uvx mcp-proxy-for-aws-cli@latest https://aws-mcp.us-east-1.api.aws/mcp --metadata AWS_REGION=us-west-2
```
或手工写入 `~/.fx/mcp.json`：
```json
{
  "mcp": {
    "aws": {
      "type": "local",
      "command": [
        "uvx",
        "mcp-proxy-for-aws-cli@latest",
        "https://aws-mcp.us-east-1.api.aws/mcp",
        "--metadata",
        "AWS_REGION=us-west-2"
      ]
    }
  }
}
```
若会话已打开，运行 `/mcp reload`。安装 skills：
```text
npx skills add aws/agent-toolkit-for-aws/skills -a fx
```
默认装到项目级 `.fx/skills/`，加 `-g` 装到 `~/.fx/skills/`。fx 也会发现 `.agents/skills/`、`.claude/skills/`、`.codex/skills/` 中已安装的 skills。
8. **其他 agent：手动配置 MCP Server，再装 skills。** 按 AWS MCP Server getting started guide 配置好后运行：
```text
npx skills add aws/agent-toolkit-for-aws/skills
```
9. **加入项目级 rules。** README 建议使用 `rules/` 中的项目级配置文件，告诉 agent 如何更有效地使用 AWS，例如优先使用 AWS MCP Server、发现可用 skills、先搜文档再行动。README 没有展开具体 rules 内容，实施时应打开 `rules/` 目录，按项目复制或改写。
10. **先设权限和审计，再放开写操作。** README 说明该工具链提供 IAM 条件键区分 agent 动作与人类动作、CloudWatch 指标和 CloudTrail 审计日志；可据此先配置只读或最小权限策略，再逐步放开。具体 IAM/CloudWatch/CloudTrail 配置未在 README 给出，需按组织策略和用户指南落地。

## 对应的研究问题
- **能力发现：** README 明确列出可交给 agent 的 AWS 工作：服务选择、CDK/CloudFormation、无服务器、容器、存储、可观测性、账单、SDK 使用和部署；用 Bedrock/AgentCore 构建 AI agent；用 S3 Tables、Glue、Athena 做数据湖、分析和 ETL；做事件调查、代码审查、UAT、漏洞扫描和渗透测试；做创业公司架构/成本/安全建议及从 Azure、GCP、Heroku、OpenAI、Gemini 迁移。
- **任务匹配：** 按任务选插件：`aws-core` 是起点；`aws-agents` 面向 Bedrock/AgentCore；`aws-data-analytics` 面向数据湖/分析/ETL；`aws-agents-for-devsecops` 面向 DevSecOps；`aws-startup-advisor` 面向创业公司架构、成本和迁移。运行时 AWS API 访问、沙箱脚本执行、实时文档检索由 AWS MCP Server 提供；任务型指导由本地 skills 提供，两者独立。
- **条件供给：** 需要给 agent 提供 MCP Server 配置、AWS 凭据、`uv`、插件/skills、项目级 rules，以及 IAM 条件键、CloudWatch、CloudTrail 等权限和审计条件。文档检索和技能发现不需要 AWS 认证，API 调用和脚本执行需要。
- **主动推进：** 证据只到“skills 按需加载、任务匹配时激活”和 agent 可调用 AWS API/沙箱脚本；README 没有给出时间、事件或状态触发的持续工作流，因此这方面只能算部分相关，不能据此宣称可定时自动推进。
- **效果验证：** README 声称 skills 经过端到端评估，并提供 CloudWatch 指标和 CloudTrail 审计日志；但没有给出评估方法、成功率、时延或成本数据。可验证的是调用审计、权限边界和任务是否完成，不能直接引用其效果数字。

## 与已有做法的关系
- **Claude Code（adopt）：** README 给出官方 marketplace 安装 `aws-core` 等插件的具体命令，可直接作为 Claude Code 的 AWS 能力扩展方式。
- **Cursor（watch）：** README 给出 Team Marketplace 导入仓库和安装插件的路径，可作为 Cursor 侧小范围试点的操作依据。
- **Agent skills（adopt）：** 该工具包的 skills 采用 `SKILL.md` 加可选 `references/` 的目录结构，按需加载，与清单中的 Agent skills 概念一致。
- 清单中没有单独的 MCP 服务器条目；本线索可作为“MCP + skills + 插件 + rules + 权限审计”的组合供给案例。

## 证据与局限
- 证据来自 AWS 官方 README，仓库状态为 GA，许可证 Apache-2.0；仓库指标显示约 3196 stars、当日新增 13（输入数据）。
- README 给出了多 agent 的安装命令、Kiro/fx 的 MCP JSON 配置、skills 安装命令和插件覆盖范围，这些是可照做的部分。
- 局限：只有官方文档，没有独立测评或客户案例；没有给出 skills 端到端评估的具体指标；没有给出 IAM 条件键、CloudWatch、CloudTrail 的配置样例；没有 rules 文件内容；没有提示词模板；插件目前只覆盖 Claude Code、Codex、Cursor、Devin，Kiro/fx/其他 agent 需要手动配置 MCP 并另装 skills。
- 适用条件：AWS 相关工作、使用支持的编码智能体、具备 AWS 账号和本地凭据；示例区域为 `us-west-2`，实际使用需按自己的区域和权限调整。

## 怎么试、怎么验证
1. **最小试用：** 选一个 AWS 仓库和一个边界清晰的任务，例如“只读查询并解释某项 AWS 资源”“生成 CDK/CloudFormation 草案但不部署”“检索 AWS 文档并给出服务选型建议”。只安装 `aws-core`，在沙箱账号或只读权限下运行。
2. **建立基线：** 同一任务先用未装工具包的 agent 做一次，记录完成情况、耗时、需要人工纠正的次数、文档查错次数。
3. **接入后对比：** 安装工具包后重复同类任务，观察是否更快完成、是否需要更少人工纠正、是否能正确调用 AWS API/检索文档。
4. **验证权限与审计：** 用 IAM 条件键限制 agent 只读；检查 CloudWatch 指标和 CloudTrail 是否记录 agent 请求；确认没有越权写操作。
5. **判断改善：** 至少应看到任务能端到端完成、人工纠正次数下降或完成时间下降，且审计日志完整、无未授权写操作；若做不到，降级为 `study` 或只保留其“MCP + skills + rules + 审计”的设计思路。
