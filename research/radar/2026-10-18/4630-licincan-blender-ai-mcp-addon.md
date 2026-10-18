# LiCinCan/blender-ai-mcp-addon

- 结论：**值得一试**。建议在 Windows x64 + Blender 4.2+ 环境小范围试用：按 README 安装扩展，先用单助手跑通“检查场景→创建对象→复制排列”的提示词，再视任务复杂度配置 Manager/Worker/Reviewer 团队链；理由是它把场景工具、模型选择、审批与审核流程都做成了可照做的集成，但只有 README 级证据，缺少效果数据且平台受限。
- 原文：https://github.com/LiCinCan/blender-ai-mcp-addon
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-18T11:08:13.839Z

## 是什么

`mcp-for-blender-pro` 是一个 Blender 扩展（发布版本 1.0.0，MIT 许可），把 AI 助手接入 Blender 场景，并内置一个 Model Context Protocol (MCP) server。它提供可视化 Studio 工作区（聊天、场景对象、视口快照、审批、任务板），支持多家云模型、本地 Ollama 和自定义端点，暴露 21 个场景工具，并可选“单助手”或“Manager/Worker/Reviewer”团队链。目标用户是希望加快迭代的艺术家、自动化重复工作的技术美术，以及把 AI 工具接到 Blender 的开发者。

## 具体做法（编号步骤）

1. **前提**：Windows x64，Blender 4.2 或更高版本；使用 Studio 或外部客户端时保持 Blender 打开。
2. 从仓库 Releases 下载 `mcp-for-blender-pro.zip`。
3. 在 Blender 中打开 **Edit → Preferences → Get Extensions → menu → Install from Disk**，选择该 ZIP，启用 **mcp-for-blender-pro**。
4. 打开 **3D Viewport → N → MCP Pro**。
5. 选择一个 provider（支持 OpenAI、Anthropic Claude、Google Gemini、OpenRouter、OpenCode Zen、Ollama 和自定义 API），填入连接信息，选择模型。注意：应选择支持 tool calling 的模型；具备图像能力的模型还可以解读视口截图。
6. 在 Blender 中发送消息，或点击 **Open Studio Window** 进入可视化工作区。
7. **多步任务改用团队链**：配置 Team chain，给每个角色单独的职责、指令和模型：
   - **Manager**：把请求拆成任务和验收标准。
   - **Workers**：执行分配的场景操作。
   - **Reviewers**：检查结果并批准，或退回具体发现。
   任务按顺序执行以保证场景编辑有序；被阻塞的任务有一次纠正机会，第二次审核失败则停止工作流。任务板会展示分配、尝试和审核发现。
8. **接外部 MCP 客户端**：从侧边栏启动 **OpenCode Portable**（OpenCode 管理自己的 provider 登录和模型选择），或其他兼容客户端连接经过认证的本地端点（见 `docs/CONNECTIONS.md`）。
9. **可直接试的提示词**（原样来自 README）：

```
Inspect this scene and explain its object structure before making any changes.
```

```
Create a simple product-display scene with a pedestal, a camera and three lights. Give the pedestal a matte blue material.
```

```
Duplicate the selected object into a neatly spaced row of five and show the viewport.
```

```
Find an appropriate Poly Haven asset for this scene and ask before importing it.
```

10. **可用工具组**（共 21 个场景工具）：
    - 场景检查：`get_scene_info`、`list_objects`、`get_object_info`
    - 对象创建：`add_cube`、`add_sphere`、`add_cylinder`、`add_plane`、`add_light`、`add_camera`
    - 编辑：`move_object`、`duplicate_object`、`delete_object`、`parent_objects`、`set_material`
    - 视觉反馈与脚本：`viewport_screenshot`、`execute_code`
    - Blender API 与导出：`bpy_api_lookup`、`describe_node_type`、`export_scene`
    - 资产工作流：`search_assets`、`import_asset`
11. **资产集成**：Poly Haven、Sketchfab、Poly Pizza；需要 key 的服务先配置 key，并遵守所用资产的许可。
12. **控制与安全**：内置聊天支持操作审批、当前步骤后取消、命名的撤销步骤；Python 工具验证用于拦截不允许的操作，但**不是安全沙箱**。外部 MCP 客户端自行管理审批策略。连接凭证存于用户设置，聊天历史仅当前会话有效，Studio 本地运行并对发往 Blender 的请求做认证。

## 对应的研究问题

1. **能力发现**：README 明确把“检查场景、构建对象、编辑材质、查找资产、执行多步工作流”交给 AI；工具清单还覆盖 `bpy_api_lookup`、`describe_node_type`、`export_scene`，即查 Blender API、解释节点类型、导出场景，这些是不容易想到让 AI 直接做的。
2. **任务匹配**：单助手适合快速、对话式改动；较大任务用 Manager/Worker/Reviewer 团队链。模型需支持 tool calling；图像模型可读视口截图。支持云 provider、本地 Ollama 和自定义端点（OpenAI Chat Completions、Anthropic Messages、Ollama 协议）。
3. **条件供给**：需要提供场景上下文（`get_scene_info`、`list_objects`、`get_object_info` 先检查再行动）、21 个工具权限、provider 连接凭证、资产服务 key；反馈通过 `viewport_screenshot`、审批/取消/命名撤销、审核发现和任务板提供。
4. **主动推进**：任务按顺序自动推进，被阻塞任务自动获得一次纠正；但没有提到由时间、事件或状态触发的持续运行。
5. **效果验证**：内置 Reviewer 角色检查结果并批准或退回具体发现，任务板暴露尝试和审核发现；README 未给出量化指标或基准测试。

## 与已有做法的关系

清单中有 **OpenCode**，状态为 watch。本文提到可从侧边栏启动 **OpenCode Portable** 完成 Blender 自动化，OpenCode 管理自己的 provider 登录和模型选择；OpenCode-only 免费模型可通过 OpenCode 客户端使用。其他兼容 MCP 客户端可连接文档所述的已认证本地端点。除此之外，清单中没有其他直接相关条目。

## 证据与局限

- **可核验信息**：仓库指标显示 705 stars；README 标注 Release 1.0.0、Blender 4.2+、Windows x64、MIT 许可；工具清单、安装步骤、提示词和角色分工都是原文给出的。
- **仅为作者主张**：更快迭代、自动化重复工作、把创意简报变成场景操作等价值描述，没有用户案例、成功率、耗时对比或基准数据支撑。
- **适用条件**：release bundle 面向 Windows x64 + Blender 4.2 或更高版本；需要自备 provider 凭证；资产服务可能需要 key，并须遵守相应许可；Python 工具验证不是安全沙箱，不能当作隔离机制；外部 MCP 客户端的审批策略不由本扩展管理；聊天历史只保留当前会话。

## 怎么试、怎么验证

**最小试用方式**：在一台 Windows x64 + Blender 4.2+ 机器上按上述步骤 2–6 安装并选中一个支持 tool calling 的模型，依次运行 README 给出的四条提示词，先只做“检查场景→创建 product-display 场景→复制选中对象为五件排列”，全程观察审批、撤销和视口截图。跑通后再把同一任务交给 Manager/Worker/Reviewer 团队链重做一次。

**判断有没有改善的指标**：
- 同一场景任务从提出到可接受的耗时（手工 vs 单助手 vs 团队链）。
- 需要人工接管或手动修正的次数。
- 触发撤销/回退的次数。
- Reviewer 退回任务的次数与第二次失败导致工作流停止的次数。
- `execute_code` 报错或 Python 工具验证拦截的次数。

如果这些指标相比纯手工没有改善，或团队链的审核开销大于收益，就退回单助手模式或放弃该集成。
