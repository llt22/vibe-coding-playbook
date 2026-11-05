# trustabl/agent-reliability-skills

- 结论：**值得一试**。建议在单个使用受支持 Agent SDK 的仓库做小范围试点：按 README 安装 MCP、生成并人工审查 SKILL.md 后再让编码代理使用；理由是流程具体且把可靠性规则前置到编码阶段，但目前仅 RC/README、无效果数据，不宜直接推广。
- 原文：https://github.com/trustabl/agent-reliability-skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-05T00:45:44.390Z

## 是什么
Agent Reliability Skills 是 Trustabl Forge 的 MCP server。它读取仓库依赖清单（如 `package.json`、`pyproject.toml`、`requirements.txt`、`go.mod`），识别仓库使用的 agent SDK，并按 Trustabl 的检测规则生成仓库专属的 `SKILL.md`。目标是让编码代理在写代码时就读到并应用可靠性规则，而不是等事后扫描才暴露问题。

它不是固定安装的一套 skill，而是按仓库生成，并会随依赖和 Trustabl 规则变化。README 声称支持 Claude Agent SDK、OpenAI Agents SDK、Google ADK、MCP、LangChain/LangGraph、CrewAI、Pydantic AI、Vercel AI SDK、AutoGen。

## 具体做法
1. 前提：Node.js 22 或更高；目标仓库有依赖清单；仓库确实使用受支持的 agent SDK；客户端支持 MCP。先选一个仓库试点，不要全量铺开。
2. 在 Claude Code 中安装 MCP server：
```bash
claude mcp add agent-reliability-skills -- npx -y https://github.com/trustabl/agent-reliability-skills/releases/download/v0.1.0-rc.1/agent-reliability-skills-0.1.0-rc.1.tgz
```
3. 在 Cursor 中安装：把下面配置加入项目内的 `.cursor/mcp.json`，或加入 `~/.cursor/mcp.json` 以对所有项目生效。
```json
{
  "mcpServers": {
    "agent-reliability-skills": {
      "command": "npx",
      "args": ["-y", "https://github.com/trustabl/agent-reliability-skills/releases/download/v0.1.0-rc.1/agent-reliability-skills-0.1.0-rc.1.tgz"]
    }
  }
}
```
4. 在 Claude Desktop 中安装：打开 Settings → Developer → Edit Config，把同样的 `mcpServers` 条目加入 `claude_desktop_config.json`，重启 Claude Desktop。Claude Desktop 没有项目文件夹，因此提问时要给出仓库路径。
5. 调用 `trustabl_forge` 工具生成 skill。参数包括：`path`（仓库绝对路径；README 说明只有客户端通过 MCP roots 报告 workspace 时才可省略，而 Claude Code/Cursor/Claude Desktop 的该项状态都标为 pending，因此试点时按必填处理）；`output_path`（通常设为 `.claude/skills/trustabl-pre-coding/SKILL.md`）；可选 `policy`（为尚未出现在清单中的 SDK 补充类别，如 `openai_sdk`）；可选 `lang`（`python`、`typescript`、`go`）。
6. 如果使用 Claude Desktop，可直接用 README 给出的提示词：
```text
Generate the Trustabl pre-coding skill for /Users/me/code/my-agent and write it to .claude/skills/trustabl-pre-coding/SKILL.md.
```
7. 注意写入约束：只有提供 `output_path` 才会写文件；路径必须留在仓库内；已有文件只有在是 Forge 生成时才会被替换，手写文件不会被覆盖。生成后先人工审查 `SKILL.md`，确认识别到的 SDK 正确、规则适用、没有敏感信息，再让编码代理读取使用。
8. 首次调用会下载 analyzer 二进制和 Trustabl 规则仓库，之后从缓存离线工作。若 GitHub 匿名限流，可设置 `GITHUB_TOKEN`；也可用 `TRUSTABL_BIN` 指向本地 analyzer 构建。相关环境变量：
```bash
export TRUSTABL_VERSION=v0.1.15
export GITHUB_TOKEN=你的_token
export TRUSTABL_BIN=/path/to/trustabl
```
9. 依赖或 Trustabl 规则变化后，重新生成并审查 skill；不要把它当成一次生成就永久有效的固定文件。

## 对应的研究问题
1. 能力发现：AI 可以自动从依赖清单发现 agent SDK，并生成仓库专属的编码前可靠性 skill，把规则前置到编码阶段。这是 README 明确描述的能力。
2. 任务匹配：适合使用受支持 SDK、且团队用 Claude Code/Cursor/Claude Desktop 等 MCP 客户端的代码仓库。不是通用代码生成工具，也不覆盖未支持的 SDK 或没有依赖清单的仓库。
3. 条件供给：需要仓库路径、MCP 客户端、写入仓库内 `.claude/skills/...` 的权限、首次联网下载 analyzer 和规则；限流时需要 `GITHUB_TOKEN`。还需要人工审查生成结果，并在依赖/规则变化后重新生成。
4. 主动推进：README 没有提供时间、事件或状态触发机制；目前是按需调用 `trustabl_forge` 生成。只能在流程上约定“依赖变更或规则更新后重新生成”，这不是工具自动推进。
5. 效果验证：README 只有“编码时应用规则比事后扫描更好”的主张，没有数据、案例或验证命令。试用时需要自己用测试、扫描发现数和人工审查来验证。

## 与已有做法的关系
清单中有 `Claude Code`（adopt）和 `Cursor`（watch）。本工具作为 MCP server 接入二者：Claude Code 有直接安装命令，Cursor 有 `mcp.json` 配置。它不替代 Claude Code/Cursor，而是给它们提供仓库专属的可靠性 skill，属于对现有编码代理工作流的补充。Cursor 在清单中仍是 watch，本工具对 Cursor 的配置可用，但同样缺少效果验证。清单中没有其他直接相关条目。

## 证据与局限
证据来自仓库 README：安装命令、MCP 配置、`trustabl_forge` 参数、环境变量、写入保护和 checksum 校验等流程信息较具体；仓库显示 42 stars，版本为 `v0.1.0-rc.1`。

局限也很明显：没有给出实际生成的 `SKILL.md` 样例，没有展示具体检测规则，没有案例、前后对比数据或独立评测；README 中 Claude Code/Cursor/Claude Desktop 的 workspace 报告状态均为 pending；首次使用依赖联网下载二进制和规则；安全细节只指向未提供的 `SECURITY.md`。因此“提升可靠性”目前只是作者主张，生成 skill 的质量取决于上游规则，且该工具仍是 RC 版本。适用条件是 Node.js 22+、受支持 SDK、可用 MCP 客户端，并接受人工审查生成内容。

## 怎么试、怎么验证
最小试用：选一个使用受支持 SDK 的小仓库，先记录基线（现有测试通过率、lint/类型检查结果、团队已有的可靠性扫描 findings、人工 review 中与可靠性相关的意见）。然后安装 MCP，调用 `trustabl_forge` 生成到 `.claude/skills/trustabl-pre-coding/SKILL.md`，人工审查后让编码代理完成 1–3 个同类小任务；再用同一套测试和检查比较。

判断指标：生成文件是否准确覆盖仓库实际使用的 SDK；任务后测试是否不退化；lint/类型检查是否不退化；可靠性相关 findings 或人工 review 意见是否减少；代理是否因为读取 skill 而提前避开规则问题；生成过程是否没有覆盖手写文件。若生成内容 SDK 识别错误、规则不适用或引入敏感信息，应停止试用并回到人工规则清单。由于 README 未给出 analyzer 的扫描命令，验证时使用团队现有测试和扫描工具，不要虚构命令。
