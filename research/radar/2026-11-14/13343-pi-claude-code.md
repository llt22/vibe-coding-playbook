# @aehyok: 我没想到使用 Pi 又省钱，而且正确率还这么高，甚至高过了 Claude Code

- 结论：**值得一试**。按作者给出的顺序先装「模型配置+状态栏+联网」三个 Pi 插件并照着配置，再按需加装审查类插件；因为这三种做法都有明确的安装命令、命令入口和可见的量化指标（token/费用/context 占用），足以支持小范围试用，但作者「比 Claude Code 更省钱、正确率更高」的结论没有任何数据支撑，不能直接写进手册当结论。
- 原文：https://x.com/aehyok/status/2121156019095240859
- 来源：ingest:x，初筛相关度 2，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-14T05:53:53.927Z

## 是什么

一条推文，作者说自己常用终端里的极简 agent Pi，陆续装了 11 个开源插件，逐个给出用途、仓库地址和使用命令，并给了一份「新手怎么选」的分批安装顺序。内容本质是一份**终端 agent 的工具供给组合清单**：模型接入、状态栏可视化、联网、MCP 省 token、子 agent、计划批注、写入时 lint 反馈、多会话互通、自动实验循环、system prompt 替换。

注意：原文里的可照做部分只有「安装命令 + 插件命令入口 + 一两处配置项」，各插件的完整配置细节并未展开，需要到各自仓库 README 补齐。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：已在本地安装并可运行 Pi 终端 agent；能用 npm 安装全局包；有可用的模型 API（第三方中转或官方均可）。

### 第一批：作者建议先装这三个

1. **装模型配置插件**（前提：使用中转/第三方 API，不想手改 models.json）
   ```
   pi install npm:pi-thirdparty-model-settings
   ```
2. **配置模型**：输入 `/dsf-config` 打开本地网页，填 Base URL、API Key、模型名，保存后 `/model` 里立即可见，**不用重启**。
   - 支持四种协议：OpenAI 兼容、Responses、Anthropic、Gemini。
   - 可从 `/models` 接口拉取模型列表，点选添加。
3. **装状态栏插件**（前提：想让 context 占用和费用常驻可见）
   ```
   pi install npm:pi-powerline-footer
   ```
   提供的信息与交互：模型、思考档位、git 分支、context 占用、token 与费用；context 超 70% 变黄、超 90% 变红；`Alt+S` 暂存输入；常驻 bash 模式；`/vibe` 自定义加载文案。
4. **装联网插件**（前提：无；不配置也能用）
   ```
   pi install npm:pi-web-access
   ```
   - 提供 `web_search` 和 `fetch_content` 两个工具；默认走 Exa MCP。
   - 可接 Brave、Tavily、Kimi、博查等几十家搜索服务（需各自的服务凭据）。
   - GitHub 链接会直接 clone 到本地；能解析 PDF；配了 Gemini 还能看 YouTube 视频。

### 第二批：用顺手之后再加

5. **context 占用排查**：装 pi-context-view 后，`/context` 用图展示 context 被哪些内容占用；`/context injections` 能看到平时看不到的 system prompt、工具定义和其他插件注入的内容。作者称插件本身不占 context。
6. **子 agent 派活**：装 pi-subagents，内置 scout（读代码）、reviewer（审代码）、oracle（给第二意见）、worker（写代码）等角色。用法是自然语言，例如「用 reviewer 审一下这个 diff」；支持并行和后台运行。作者建议一开始只用 reviewer 和 oracle。
7. **计划批注**：装 plannotator（注意包名和仓库名不一样）
   ```
   pi install npm:@plannotator/pi-extension
   ```
   Agent 出计划时自动在浏览器打开，可像批 PR 一样逐行批注，再一键把意见发回 Agent；也能 review 本地 diff 和 GitHub PR。启动时加 `--plan`，或用 `/plannotator-plan-mode` 切换。
8. **MCP 省 token**：装 pi-mcp-adapter，把几百个工具定义收成一个约 200 token 的 mcp 代理工具，server 用到时才启动、闲置 10 分钟自动关闭；Cursor、Claude Code、Codex 里配好的 MCP 可一键导入。**副作用：装上后会自动关闭 Pi 自带的 MCP，卸载后要手动打开。**

### 作者标注「暂时不用急」的四个

9. **pi-lens**：Agent 每次写入或修改文件时实时跑 LSP、linter、formatter 和结构规则检查，把问题直接反馈给 Agent，还能拦下「没读过文件就动手改」的操作。作者提醒它比较重，依赖各语言的 LSP 和 linter。
10. **pi-intercom**：同一台机器上多个 Pi 会话互发消息（`Alt+M`），例如研究会话把结论交给执行会话；`/handover` 会把当前会话总结后交接给另一个会话。只在多开会话时有用。
11. **pi-autoresearch**：自动实验循环——改代码、跑 benchmark，结果变好就保留，变差就回滚，一直循环。适合测试速度、包体积、构建时间这类**有明确指标**的优化。
    - 建议在 `.auto/config.json` 里设置 `maxIterations` 上限，并在**单独的分支**里跑（因为它会自动 commit）。
12. **pi-purge**：`/purge` 替换 Pi 内置的 system prompt，可只用你自己的提示词运行，适合做 prompt 实验和对比。注意 strict 模式下连 `AGENTS.md` 和 skills 都不加载。

### 通用纪律（作者明确给出的）

13. 插件以**你的用户权限**运行，装之前先看一眼 README。
14. 不用的一定要卸载，「直接跟 Pi 讲就好了」。作者原话：先把模型、状态栏、联网这三件事配好，Pi 就已经很顺手了。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现（AI 已能做但没想到交给它的）**：联网后 GitHub 链接直接 clone 到本地、解析 PDF、配 Gemini 看 YouTube——这三类「读外部材料」的动作原文都点名了；子 agent 中的 oracle（给第二意见）属于容易被忽略的用法。自动实验循环（改代码→跑 benchmark→保留或回滚）是典型的「没想到可以完全交出去」的整段工作。
- **任务匹配（什么工作适合什么模型/工具/协作）**：模型侧原文只给了协议维度（OpenAI 兼容 / Responses / Anthropic / Gemini 四种），没有给「什么任务配什么模型」的判断。工具侧有较明确的分工：审代码用 reviewer、第二意见用 oracle、读代码用 scout、写代码用 worker；有明确数值指标的优化适合 autoresearch，开放式的探索则不然；写文件类操作适合挂 pi-lens 做即时检查；多会话才需要 pi-intercom。
- **条件供给（需要给的信息、工具、权限、反馈）**：
  - 信息：Base URL、API Key、模型名（`/dsf-config` 网页填写）；可选搜索服务的 key；`/models` 接口用于拉模型列表。
  - 工具：已配好的 MCP 可从 Cursor / Claude Code / Codex 一键导入；pi-lens 需要预装对应语言的 LSP 和 linter。
  - 权限：原文明确「插件以你的用户权限运行」，装前看 README。
  - 反馈：这是本文最有价值的供给点——状态栏常驻 token/费用/context 占比（70%/90% 变色），`/context injections` 暴露 system prompt 与工具定义，pi-lens 把 lint 结果直接回灌给 Agent，plannotator 把人的逐行批注回传。
- **主动推进（时间/事件/状态触发并可持续完成）**：autoresearch 是唯一真正意义上的持续循环（指标驱动，变好保留变差回滚，需设 `maxIterations` 上限）；pi-mcp-adapter 的「用到才启动、闲置 10 分钟自动关闭」是资源层面的状态触发；子 agent 支持后台与并行运行；pi-lens 由「写文件」事件触发。
- **效果验证（怎么判断改善了结果）**：状态栏的 token 与费用、context 占用百分比，是可即时观测的成本指标；autoresearch 的「benchmark 变好保留、变差回滚」是一个内置的验证回路，作者点名适用指标为测试速度、包体积、构建时间。但原文没有任何「改善了多少」的数字。

## 与已有做法的关系

清单相关条目及状态，逐条对照：

- **Claude Code（adopt）**：原文两处提到它——一是作为被比较对象（作者称 Pi「正确率甚至高过 Claude Code」，无数据）；二是作为 pi-mcp-adapter 的 MCP 配置来源（可一键导入 Claude Code 已配好的 MCP）。**可动作的结论**：如果已按手册在用 Claude Code，pi-mcp-adapter 的导入路径能复用已有 MCP 配置，不必重配。
- **Cursor（watch）**：同样只作为 MCP 配置来源出现，无独立评价。
- **pi-mcp-adapter（watch）**：原文给了机制细节（几百个工具定义收成一个约 200 token 的代理工具、按需启动、闲置 10 分钟关闭、可一键导入）和一个明确副作用（**会自动关闭 Pi 自带 MCP，卸载后需手动打开**）。比清单现有状态多了「副作用」这一条可写进手册的注意事项。
- **pi-powerline-footer（avoid）**：**与原文推荐冲突**。原文把它列进「第一批装上就能感觉到变化」，理由是 context 和费用一直显示在眼前。清单标注 avoid，可能基于其他材料；本次材料中作者只给了功能描述和 70%/90% 变色阈值，没有任何对比证据。建议保持 avoid，或仅作为「成本可见性」这一设计思路的参考，不写进手册的安装清单。
- **pi-subagents（drop）**：**与原文推荐冲突**。原文建议作为第二批安装，并具体说「一开始只用 reviewer 和 oracle 两个就够」。这是角色分工的说法，不是效果证据。建议维持 drop，但「按角色拆子 agent（读/审/第二意见/写）」这一模式值得作为思路保留。
- **pi-web-access（watch）**：原文给出了具体能力边界（两个工具、默认 Exa MCP、可换 Brave/Tavily/Kimi/博查、GitHub 链接 clone 到本地、PDF 解析、Gemini 才能看 YouTube）和一条零配置可用的路径。这些细节足以让 watch 状态更有依据。
- **Tavily（watch）**：原文仅在「可接的搜索服务」列表中提及 Tavily 一家，无任何配置细节或对比，未提供新增判断。

清单中没有相关条目的部分：pi-thirdparty-model-settings、pi-context-view、plannotator、pi-lens、pi-intercom、pi-autoresearch、pi-purge。

## 证据与局限

**原文给出的、可核对的**：11 个插件的名称与 GitHub 仓库地址；4 条可复制的安装命令；若干命令入口（`/dsf-config`、`/model`、`/context`、`/context injections`、`/vibe`、`Alt+S`、`Alt+M`、`/handover`、`/purge`、`--plan`、`/plannotator-plan-mode`）；一处配置项 `.auto/config.json` 的 `maxIterations`；一处具体数值（mcp 代理工具约 200 token、MCP 闲置 10 分钟关闭、context 70% 黄 / 90% 红）。

**只是作者主张、没有证据的**：标题与开头「又省钱、正确率还这么高、甚至高过了 Claude Code」——没给任务、样本、对比方法或任何数字；「第一批装上就能感觉到变化」「提升最直接」等排序判断也是个人体感。互动量很低（点赞 28、转发 7、回复 17），属于单人经验分享而非可复现评测。

**适用条件与风险**：
- 全部内容绑定 Pi 这一个终端 agent，插件是 Pi 生态专属，不能直接迁移到 Claude Code / Cursor 等（能迁移的只有「MCP 配置可互相导入」）。
- 插件以用户权限运行，存在安全面；原文只给了「装前看 README」这一条。
- pi-lens 依赖各语言的 LSP/linter，环境不齐会失效或变重。
- pi-purge 的 strict 模式会不加载 `AGENTS.md` 和 skills，等于放弃项目约定，容易让输出偏离规范。
- autoresearch 会自动 commit 且烧 token，必须在独立分支 + 迭代上限下跑。
- 原文未提及版本号、Pi 版本要求、插件之间的兼容性问题。

## 怎么试、怎么验证

**最小试用（建议 1 周，1 个真实任务）**

1. 只装第一批三个，且只在一台机器、一个日常使用的真实项目上试：
   ```
   pi install npm:pi-thirdparty-model-settings
   pi install npm:pi-powerline-footer
   pi install npm:pi-web-access
   ```
2. 用 `/dsf-config` 配好一组模型（先只配一个主力模型，不要一次配多家），确认 `/model` 能看到且不用重启。
3. 挑一个**必须查外部资料**的任务（读一个 GitHub 仓库、读一份 PDF），跑一遍，记录联网前后各自的轮数与结论质量。
4. 不装 pi-lens / pi-autoresearch / pi-purge，先保持基线干净。

**判断有没有改善的指标（都取自原文可观测项）**

- **成本**：同一任务在状态栏读到的 token 数与费用，与不用插件时的基线比；作者声称「省钱」，就以此验证，不看标题。
- **context 效率**：任务结束时 context 占用百分比是否长期停在 70% 以下；一旦反复触碰 90%，说明需要清理或改用 `/context` 排查注入内容。
- **联网收益**：需要外部信息的任务，是否减少了「让模型凭记忆编」的情况——用「回答中引用了实际抓取到的文件/页面」作为判据。
- **正确率**：不要采信「高过 Claude Code」的说法；自己取 10–20 个有标准答案的任务，同一提示词分别在 Pi（装插件）和现有工具上跑，人工或脚本判分对比。这是原文没做、而手册必须补的一步。
- **子 agent 与 lint（若进入第二批）**：装 reviewer 后，统计「reviewer 提出的问题中被你采纳的比例」；装 pi-lens 后，统计「写入后需要你手工修的次数」是否下降。
- **autoresearch（若试用）**：只选一个客观指标（构建时间或包体积），在独立分支、`.auto/config.json` 设 `maxIterations` 上限后跑，比较首末两次 benchmark 的数值与总 token 花费，判断「指标改善 / 花费」是否划算。

**淘汰规则**：一周后逐个回答「这个插件有没有改变我的某个具体动作」。答不出来的，按作者原话直接卸载——「直接跟 Pi 讲就好了」。
