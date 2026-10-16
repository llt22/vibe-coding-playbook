# EL4CTEO/blender-skills

- 结论：**值得一试**。建议小范围试用：按 README 给出的安装步骤把 blender-skills 装到 Claude Code 或通用 agents 目录，用示例提示词驱动 Blender 任务，验证其 20 个技能是否真能减少手工步骤。理由是仓库提供了可复制的安装、调用和测试命令，但 README 未展示各技能内部的具体提示词、脚本和 QA 规则，需实测确认效果。
- 原文：https://github.com/EL4CTEO/blender-skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-16T10:38:41.622Z

## 是什么

Blender Agent Skills 是一个把 20 个 Blender 专业工作流封装成 **Agent Skills** 的仓库，面向 Claude Code、Codex、OpenCode、Gemini CLI、GitHub Copilot、Cursor 等 AI 编码代理，基于 Blender 5.2 LTS+。技能覆盖完整 3D 管线：建模、UV、PBR、烘焙、绑定、动画、优化、导出、渲染、模拟和资产 QA。

安装后代理可通过自然语言任务调用这些技能。README 提供了两种安装方式：Claude Code 插件市场，或克隆仓库后运行安装脚本。可选 Blender MCP server 让代理在已打开的 Blender 中工作；没有 MCP 时代理在后台运行 Blender。

## 具体做法

1. **前提**：安装 Blender 5.2+。选择要接入的代理：Claude Code，或 Codex / OpenCode / Gemini CLI / GitHub Copilot / Cursor。

2. **Claude Code 插件安装**：在 Claude Code 中执行：

```
/plugin marketplace add EL4CTEO/blender-skills
/plugin install blender-agent-skills@blender-agent-skills
```

3. **通用安装**：克隆仓库并运行安装脚本。

macOS / Linux：

```bash
git clone https://github.com/EL4CTEO/blender-skills
./blender-skills/install/install.sh
```

Windows：

```powershell
git clone https://github.com/EL4CTEO/blender-skills
.\blender-skills\install\install.ps1
```

4. **选择安装目标**：默认安装到 `~/.claude/skills` 和 `~/.agents/skills`。`.agents/skills` 可被 Codex、OpenCode、Gemini CLI、Copilot 和 Cursor 读取。可用选项：

```
--agent claude|codex|opencode|gemini|copilot|cursor|all
--project DIR   # 安装到单个项目
--uninstall     # 卸载
```

5. **可选配置 MCP 协作**：如果希望代理直接操作你已打开的 Blender，配置 Blender MCP server；如果不配，代理会在后台启动 Blender 运行。

6. **用自然语言任务调用技能**：README 给出的示例提示词可直接复制：

```
Make a game-ready crate for Unreal with baked normals and LODs.
```

```
Rig this character with Rigify and export it to Unity with a walk cycle.
```

```
Check this model for z-fighting and floating parts, then export it for Roblox.
```

7. **开发与验证**（若 fork 或修改技能包）：在仓库目录运行：

```bash
python tools/validate_skills.py   # spec + token budget checks
python tools/run_tests.py         # 43 headless Blender tests (BLENDER_EXE to override)
```

前提：具备 Python 环境；Blender 可执行路径可通过 `BLENDER_EXE` 环境变量覆盖。

8. **技能清单中的路由入口**：README 说明从 `blender-core` 开始，它负责运行代码、路由任务和 5.x API 规则。其余技能覆盖场景设置、硬表面建模、雕刻、重拓扑/UV、PBR 材质、纹理烘焙、几何节点、角色绑定、面部形态键、动画、游戏优化、导出管线、渲染、灯光 Lookdev、模拟、插件开发、管线自动化、资产 QA 和完整工作流配方。

## 对应的研究问题

1. **能力发现**：README 列出 20 个可交给 AI 代理执行的 Blender 任务，包括建模、UV、PBR、烘焙、绑定、动画、优化、导出、渲染、模拟和 QA，说明这些专业 3D 工作已有技能化封装。但每个技能只给了一句话描述，未展示能力边界和失败场景。

2. **任务匹配**：README 将不同代理与 Blender 技能匹配：Claude Code 用插件安装；Codex、OpenCode、Gemini CLI、Copilot、Cursor 通过 `.agents/skills` 读取；可选 MCP 让代理操作打开的 Blender，或不配 MCP 时后台运行。没有给出不同模型在 Blender 任务上的能力对比。

3. **条件供给**：需要提供 Blender 5.2+ 环境、安装技能包、可选 Blender MCP server；安装脚本可指定代理和项目目录。输入侧给出了示例提示词格式。反馈侧提到 `blender-asset-qa` 可检查 z-fighting、浮空部件、坏法线和权重，以及 `validate_skills.py` 和 `run_tests.py` 做验证。具体权限要求未详述。

4. **主动推进**：README 未提及由时间、事件或状态触发并持续完成的机制。仅有 `blender-pipeline-automation`（批量作业和文件转换）和 `blender-rendering`（批量渲染）的技能名称暗示可批量执行，但没有触发条件、调度方式或持续运行细节。

5. **效果验证**：提供了 `validate_skills.py`（规范与 token 预算检查）和 `run_tests.py`（43 个 headless Blender 测试），以及 `blender-asset-qa` 技能用于质量检查。但 README 没有给出改善前后的对比数据或量化指标。

## 与已有做法的关系

- **Claude Code**（清单状态 adopt）：本仓库提供 Claude Code 插件市场安装方式，可作为 Claude Code 上 Agent Skills 的实例。
- **Agent skills**（清单状态 adopt）：本仓库正是把 Blender 专业工作流封装成 Agent Skills 的落地案例，与“给智能体供给领域知识、工具与 QA”的思路一致。
- **Cursor**（清单状态 watch）：安装说明称 `.agents/skills` 可被 Cursor 读取。
- **OpenCode**（清单状态 watch）：同上，安装说明称 `.agents/skills` 可被 OpenCode 读取。
- **GitHub Copilot**（清单状态 drop）：README 仍列出支持 Copilot，但与清单中的 drop 状态不一致；README 只说明 `.agents/skills` 会被读取，未提供 Copilot 上的实际验证。

## 证据与局限

**原文给出的证据**：安装命令、支持代理列表、20 个技能名称与一句话描述、三条示例提示词、开发验证命令、43 个 headless Blender 测试、MIT 协议。仓库 metrics 显示 42 stars。作者声称“Every script is tested in a real Blender.”，并称技能为 Blender 5.2 LTS+ 构建。

**局限**：目前只看到 README，没有看到各技能内部的提示词、脚本、配置文件或 QA 规则，因此无法据本材料复现具体 Blender 工作流。无法验证 43 个测试是否全部通过、是否真在 Blender 5.2+ 实测。42 stars 不能说明社区验证强度。Blender 5.2 LTS+ 与 MCP server 的可用性需自行确认。README 没有提供性能数据、前后对比案例或失败模式。

**适用条件**：使用 Blender 5.2+；代理环境支持 Agent Skills（Claude Code 插件或 `.agents/skills` 目录）；可选 Blender MCP server。若上述条件不满足，本仓库的安装方式不一定可直接照做。

## 怎么试、怎么验证

**最小试用方式**：

1. 在隔离环境安装 Blender 5.2+。
2. 按 README 的 Claude Code 插件方式或通用安装脚本安装 blender-skills。
3. 选择一个具体任务，例如 README 示例中的“Make a game-ready crate for Unreal with baked normals and LODs.”
4. 让代理执行该任务，同时手工记录不用技能包时完成同类任务的步骤数和耗时。
5. 导出资产并导入目标引擎（Unreal / Unity / Roblox）做一次实际检查。

**判断改善的指标**：

- 任务完成时间（技能包 vs 手工/普通代理）。
- 人工干预次数（代理需要人纠正或补做的次数）。
- 导出资产能否通过目标引擎导入检查。
- `blender-asset-qa` 是否报出 z-fighting、浮空部件、坏法线或权重问题。
- `validate_skills.py` 和 `run_tests.py` 是否通过。

**验证命令**：

```bash
python tools/validate_skills.py
python tools/run_tests.py
```

若失败，记录错误并检查 `BLENDER_EXE` 设置；若通过，再用一个真实项目资产做端到端导出，对比不用技能包时的手工时间。
