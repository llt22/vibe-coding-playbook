# claudememory/claude-memory

- 结论：**值得一试**。把这份清单当作“给 Claude Code 补充持久上下文”的选型表与安装手册来试用：先用免费的 CLAUDE.md + auto memory 作为基线，再按单人、团队或跨客户端需求叠加一个 MCP 或插件；理由是原文提供了可直接复制的安装命令、配置项和各方案取舍边界（但清单由 Glen 团队维护，排名第一项属于自荐，其性能数字不能当作独立证据）。
- 原文：https://github.com/claudememory/claude-memory
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-11T13:49:27.434Z

## 是什么

这不是一个工具仓库，而是一篇由 Glen 团队维护的选型长文（README 形式），对比了 10 种给 Claude / Claude Code / Claude Desktop 提供跨会话持久记忆的方案，每条给出“存什么、存在哪、怎么装、适合谁”，并附一张按需求选型的对照表和 FAQ。

覆盖的方案分三类：

- **内置能力**：Claude Code 的 `CLAUDE.md` 与 auto memory；Claude 应用（claude.ai / Desktop / 移动端）的聊天记忆。
- **本地单人方案**：claude-mem（`~/.claude-mem`）、Basic Memory（本地 Markdown）、MCP Knowledge Graph Memory（本地 JSON）、Cognee、Graphiti/Zep（时序知识图谱）。
- **团队/托管方案**：Glen（插件 + CLI + 远程 MCP，主打团队共享）、Supermemory（远程 MCP + API）、Mem0（面向自建应用的记忆基础设施）。

文末披露：清单由 Glen 团队维护，排名第 1 的 Glen 是自家产品，其余条目按各自文档描述。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### A. 零成本基线：`CLAUDE.md` + auto memory（前提：已安装 Claude Code）

1. **建立分层指令文件**。原文给出的作用域：
   - `~/.claude/CLAUDE.md`：个人级，跨所有项目生效；
   - `./CLAUDE.md` 或 `./.claude/CLAUDE.md`：项目级，可提交进 git 供团队共享；
   - 另有组织统一管理的文件；Claude Code 也会读取 `AGENTS.md`。
   实操：把“每次会话都必须遵守的规则”（技术栈、命名约定、禁改目录、提交规范）写进项目级 `CLAUDE.md` 并提交；把“只对自己成立的偏好”写进 `~/.claude/CLAUDE.md`。

2. **拆分过长文件**。用 `@path/to/file` 导入其他文件，或用 `.claude/rules/` 目录分片，避免单文件臃肿。

3. **确认 auto memory 状态**。前提：本地会话。原文说明它默认开启、按仓库隔离，每次会话加载前 200 行（或 25KB）。用 `/memory` 查看与开关；在项目设置里关闭的方式为：
   ```json
   "autoMemoryEnabled": false
   ```
   实操建议：保留开启，但每两周用 `/memory` 检查一次写入了什么——原文明确指出它“只在本机、只对本人”。

4. **明确它抓不到什么**：`CLAUDE.md` 靠手工维护会过期；auto memory 不跨机器、不跨人。跨人或跨机器需求进入 B/C 步。

### B. 单人跨会话自动捕获：claude-mem（前提：Claude Code，可用 Anthropic 套餐/自有 key/其付费 observer 之一做摘要）

```bash
npx claude-mem install
```

原理（原文）：挂到会话生命周期事件上，捕获 agent 行为，用 LLM 压缩成摘要，再注入后续会话；记忆存在本机 `~/.claude-mem`，云同步为可选；同时支持 Codex、Gemini、Copilot、OpenCode 等。

### C. 一行接入的 MCP 记忆服务（前提：Claude Code 的 `claude mcp add` 可用）

- **Supermemory（托管，跨客户端共享，OAuth 登录）**：
  ```bash
  claude mcp add --transport http supermemory https://mcp.supermemory.ai/mcp
  ```
- **Basic Memory（本地 Markdown，可手工编辑/进 git/Obsidian）**：
  ```bash
  claude mcp add basic-memory -- uvx --prerelease=allow basic-memory mcp
  ```
- **官方参考实现 MCP Knowledge Graph Memory（最小自托管，前提：Node.js 24+）**：
  ```bash
  claude mcp add memory -- npx -y @modelcontextprotocol/server-memory
  ```
  存储为本地 JSON，路径用 `MEMORY_FILE_PATH` 指定。
- **Cognee（知识图谱，本地或 Cognee Cloud，需要配置 LLM provider 与存储）**：
  ```bash
  claude plugin marketplace add topoteretes/cognee-integrations
  claude plugin install cognee-memory@cognee
  ```

### D. 团队共享记忆：Glen（前提：团队多人用 Claude Code / Codex / Cursor；免费额度为 3 人、15,000 条记忆）

```bash
npx @tryglen/cli@latest install
```

安装器会探测 Claude Code（及 Codex、Cursor、Pi），装入插件与 hooks 并登录。随后邀请成员：

```bash
glen invite teammate@company.com
```

原文给出的日常命令：

```bash
glen search "<question>"
glen code-search <path:start-end>
```

以及两个开关：`glen incognito`（本次会话不进入记忆）、`glen silent`（记录但不注入）。

### E. 自建应用场景：Mem0（前提：要给自己的 agent/产品加记忆）

```bash
npm install -g @mem0/cli
mem0 init --agent --agent-caller claude-code
```

另提供 `pip install mem0ai` / `npm install mem0ai` 的 SDK 与可自托管服务端。

### F. 按需求选型（原文的决策表，可直接照抄使用）

| 需求 | 选 |
| --- | --- |
| 想知道同事的 agent 学到了什么 | Glen |
| 每次会话都遵守的项目规则 | `CLAUDE.md` |
| Claude Code 记住你自己在一台机器上的纠正 | auto memory 或 claude-mem |
| claude.ai 聊天里的记忆 | Claude 应用记忆 |
| 你自己在做的应用里的记忆 | Mem0、Supermemory、Claude API memory tool |
| 想手工编辑 Markdown 记忆文件 | Basic Memory |
| 自托管知识图谱 | MCP Knowledge Graph Memory、Cognee、Graphiti |

原文给出的推荐组合是**叠加而非二选一**：`CLAUDE.md` 管规则，auto memory 管个人偏好，团队级记忆（Glen）管“同事已经踩过的坑”。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 还能接管哪些没想到的工作）**
- 记忆的自动捕获与注入属于“容易被忽略的一类工作”：会话结束后的整理、摘要、去重、过期决策淘汰，可以交给插件自动完成，而不是人手工写笔记（claude-mem 的会话钩子 + LLM 摘要；Glen 的“新决策覆盖旧决策后旧的不再被召回”）。
- `glen code-search <path:start-end>` 把 `git blame` 回溯到写下这些行的 agent 对话，即“查为什么这么改”这件事可以由 AI 承担，而不只是查 diff。这是一个大多数人不会想到交给 AI 的任务类型。

**2. 任务匹配（什么工作适合什么模型/工具/协作方式）**
- 原文的选型表本身就是一套匹配规则：单人 vs 团队、本地文件 vs 托管、稳定规则 vs 随时间变化的事实。
- 有明确边界判断的依据：事实会变化 → Graphiti/Zep 的时序图（记录“某事实何时为真”）；只想手工管理少量笔记 → Basic Memory；只要最小自托管 → 官方 MCP Memory；目标是“把记忆做进自己的产品” → Mem0；目标是“记住团队编码历史” → Glen。
- 明确的反向匹配：官方 MCP Memory 是参考实现，无自动捕获、无高级搜索、无共享；Cognee 配置成本高于普通插件。

**3. 条件供给（需要提供哪些信息、工具、权限、反馈）**
- 信息：项目规则写进 `CLAUDE.md`（可提交、可分片、可 `@import`）；个人偏好由 auto memory 从“你的纠正”中自动沉淀。
- 工具/权限：MCP 与插件的安装入口各不相同（`claude mcp add` / `claude plugin marketplace add` / `npx xxx install`）；Glen 提供远程 MCP（OAuth）与 CLI 访问同一份记忆，并“在召回时逐人做权限校验”，即 Claude 只能看到该用户本来就有权看的内容。
- 隐私边界：`glen incognito` / `glen silent`；Claude 应用的 incognito 会话不被记忆。
- 反馈：auto memory 的输入就是用户对 Claude 的纠正——这是原文唯一明确写出的“反馈如何变成供给”的机制。

**4. 主动推进（时间/事件/状态触发并持续完成）**
- 事件触发有明确依据：claude-mem “hooks into session lifecycle events”，在会话生命周期上自动捕获与压缩，无需人发起。
- 状态触发：Glen 在“每一轮”把相关观察注入上下文，Claude 不需要主动去问；以及“旧决策被新决策推翻后不再被召回”的状态维护。
- 时间触发型（定时整理、定期复盘记忆）原文未涉及。

**5. 效果验证**
- 原文只给了一个量化结果（见下节），且是厂商自测；给出的可观察量是“合并速度”和“每任务 token 数”。
- 原文未给出任何验证方法论（如何设对照组、样本量、如何排除模型版本差异），这部分需要自行设计。

## 与已有做法的关系

- **Claude Code（adopt）**：本文第 2 条正是 Claude Code 的内置记忆机制，给出作用域、导入方式、auto memory 的默认行为与关闭配置；第 4/9 条是 Claude Code 插件，第 6/7/8 条是 `claude mcp add` 接入的 MCP 服务。可作为 Claude Code 现有用法的直接补强项，尤其是“项目级 `CLAUDE.md` 提交进 git 让团队共享规则”这一条。
- **Cursor（watch）**：Glen 的安装器会探测并接入 Cursor，并把 Cursor 会话记录进团队共享记忆；原文没有给出 Cursor 侧的其他配置细节。
- **OpenCode（watch）**：claude-mem 声明支持 OpenCode 等客户端，未给具体命令。
- **Obsidian（drop）**：Basic Memory 的记忆是纯 Markdown 文件，原文提到可“在 git 或 Obsidian 中打开、编辑、版本化”。仅此一句交集，不构成对该条目的重新评估。

## 证据与局限

**原文给出的具体数据/事实（非观点）**
- Glen 自测：重放 100 个已合并 PR 的基准中，“Codex with Glen” 合并快 21%、每任务 token 少 29%——但只有这一句，无样本构成、无对照设置、无模型版本，且是自家基准，只能视为厂商主张。
- 免费额度：Glen 最多 3 人、15,000 条记忆，无需信用卡。
- 技术约束：官方 MCP Memory 需要 Node.js 24+；auto memory 每次加载前 200 行或 25KB；claude-mem 存在 `~/.claude-mem`；Graphiti 的 MCP server 标注为 experimental 且需要 Neo4j 之类的图数据库。
- 功能边界描述（来自各项目自身文档转述）：Claude 应用记忆不触达 Claude Code / API / 其他 agent；`CLAUDE.md` 手工维护会过期；auto memory 仅本机本人；官方 MCP Memory 无自动捕获与共享。

**只是作者主张、未给证据的部分**
- “Most Claude memory tools stop at… Glen covers…”这类定位对比；
- “Glen 记住整个团队”的效果断言，除上述自测外无第三方复现；
- 各条目“Best for”的适配判断多为定性描述。

**结构性局限**
- 清单由 Glen 团队维护，第 1 名是自家产品并被标为 “Top pick”，存在排序与措辞上的商业倾向；其余条目虽声称按各自文档描述，仍可能有选择性。
- 页面标注 “Last updated: November 2026”，时间标注本身可疑，安装命令与路径可能已随版本漂移，执行前需回查各项目 README。
- 部分命令有隐含前提未写全：`uvx` 需要 uv 环境；`npx` 需要 Node；Cognee 还需额外配置 LLM provider 与存储；Glen 需要注册与团队邀请。
- 未涉及记忆污染/错误记忆的纠正成本、合规与数据出境问题（只有一行“访问控制在召回时校验”）。

## 怎么试、怎么验证

**最小试用（单人，1–2 周，零成本）**
1. 选一个你每周至少用 Claude Code 三次的仓库。写一份 20–40 行的 `./CLAUDE.md`：技术栈、目录禁改项、测试命令、提交信息格式、常用代码风格。提交进 git。
2. 确认 auto memory 开启（`/memory` 查看）。不改其他配置，跑 3–5 个真实任务。
3. 记录基线对照：前一周（不写 `CLAUDE.md`）与后一周各记三项指标——
   - 每次会话你重复解释同一约定的次数；
   - 首个产出（PR/补丁）需要返工的轮数；
   - 单任务 token 消耗（若可读）。
4. 第 2 周只加一个变量：按需接入一个 MCP 记忆（本地优先选 Basic Memory 或官方 MCP Memory；跨客户端选 Supermemory），重复同样任务类型，比较上述三项。
5. 用 `/memory` 抽查 auto memory 写入内容，标出“错记/过期”的条目占比——这是判断记忆机制是否净收益的关键负向指标。

**团队试用（前提：≥2 人共用 Claude Code）**
1. 先用提交进 git 的项目级 `CLAUDE.md` 统一规则，观察一周。
2. 再叠加 Glen 免费额度（≤3 人），只邀请 2–3 人，跑 2 周。
3. 指标：同一问题被不同人重复问 agent 的次数、新人首次提交达到可合并状态所需时间、`glen search` 的命中率（抽 10 次查询人工判定是否有用）。
4. 对照组不可省略：把 Glen 的 21%/29% 当作待验证假设而非预期值；若无法做 A/B，至少用“开启前两周 vs 开启后两周”的同仓库数据。

**判定改善的标准（建议事先写定）**
- 重复解释次数下降 ≥30%，且错误记忆导致的返工不增加；
- 首轮正确率上升或返工轮数下降；
- token/任务不升（记忆注入本身有成本，需净额比较）。
三项中至少两项达标，才把该方案写进团队标准流程；否则退回只用 `CLAUDE.md` + auto memory 的基线。
