# expo/skills

- 结论：**值得一试**。在 Expo/React Native 项目里按 README 命令装一套 Expo skills（或插件）小范围试跑，重点验证“SKILL.md 技能包 + MCP 实时动作”这种把领域知识和可执行能力一起供给 agent 的封装方式能否迁移到自己的领域；理由是原文给出了可直接复制的安装/更新命令、按 agent 区分的安装路径和技能分组，但通篇没有效果数据，且只覆盖 Expo 这一垂直场景。
- 原文：https://github.com/expo/skills
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T06:47:11.952Z

## 是什么

Expo 官方发布的一组 AI agent 技能包（skills），用于构建、部署、升级和调试 Expo 应用。核心机制是：把“什么时候该用哪个 Expo API、常见工作流怎么组织、Expo/EAS/React Native/iOS/Android 有哪些约束”这类聚焦的领域知识写成 `SKILL.md`，装到 agent 的技能目录里，让 agent 在处理 Expo 任务时自动选用。

README 明确划定边界：Expo 文档、Expo CLI、EAS CLI 才是 source of truth，skills 只是教 agent 如何正确应用它们。

技能分三组：
- **Start Here**：`expo-overview`，任何 Expo/EAS 任务先加载，再路由到具体技能（请求含糊或用户没点名工具时的入口）。
- **Framework（开源免费）**：15 个，覆盖项目结构、Expo Router、动画、原生 UI、设计系统、数据获取、DOM 组件、Web 迁原生、原生模块、brownfield、dev client、examples、App Clip、SDK 升级。
- **Services & paid distribution**：7 个，核心依赖付费的 EAS（应用商店构建提交、EAS Hosting、EAS Workflows、EAS Observe、EAS Update、Update Insights、远程模拟器）。每个 services 技能开头都带成本/套餐限额说明。
- **Experimental**：`expo-migrate-module`，单独放在 `expo-experiments` 插件里。

配套还有一个 **Expo MCP server**：skills 教“怎么做”，MCP 给 agent 实时动手能力——按需读最新文档、用 `npx expo install` 装兼容依赖、触发并监控 EAS 构建和工作流、拉 TestFlight 崩溃数据、给运行中的模拟器截图。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提：已有一个 Expo / React Native 项目，并已选定一个 AI 编码 agent（Claude Code、Codex、Cursor、OpenCode 等）。**

1. 选择安装路径。README 给了二选一：

   | 路径 | 适合 |
   | --- | --- |
   | Plugin 安装 | Claude Code 或 Codex，更新由官方插件市场托管 |
   | Skills CLI | Cursor、OpenCode、GitHub Copilot、Windsurf、Gemini、Cline、AMP、Factory Droid、Antigravity、Kiro CLI 及其他 AI 编码 agent |

2. 若用 Claude Code，从官方插件市场装：

   ```text
   claude plugin install expo@claude-plugins-official
   ```

   也可以在 Claude Code 内执行：

   ```text
   /plugin install expo@claude-plugins-official
   ```

3. 若用 Codex，从 OpenAI curated 市场装：

   ```text
   codex plugin add expo@openai-curated
   ```

   也可以在 Codex 内打开 `/plugins`，从 OpenAI-curated 市场安装 `expo`。

4. 若用 Cursor / OpenCode / 其他 agent，用 skills CLI 装全部 Expo 技能（在项目根目录执行）：

   ```text
   npx skills@latest add expo/skills --skill '*'
   ```

   说明：这条命令选的是“全部 Expo 技能”，不是“全部 agent”。CLI 之后仍会询问装到哪里；要直接指定某个 agent，加 `--agent <agent>`。README 称对多数 agent 这一条命令即可。

5. 装完后重启或刷新 agent 会话，让它能发现已安装的 `SKILL.md` 文件（README 明确要求这一步，否则技能不被发现）。

6. 用 README 给的示例提示词验证路由是否正常：

   ```text
   Build a native-feeling Expo Router screen with tabs, modals, and animations.
   ```

   ```text
   Create an EAS workflow that builds previews on pull requests.
   ```

   ```text
   Help me upgrade this app to the latest Expo SDK.
   ```

   ```text
   Check whether this EAS Update rollout is healthy.
   ```

   观察点：agent 是否根据任务上下文和各技能描述自动选中正确技能（README 说选择机制就是“任务上下文 + 技能描述”）。

7. 接入 MCP 以获得实时动作能力。Claude Code 和 Codex 的 `expo` 插件已内置该 MCP 配置，装插件即自动接线；其他 agent 或想单独加，按 Expo MCP setup guide（https://docs.expo.dev/eas/ai/mcp/）配置。没有 MCP 时 agent 只能“讲怎么做”，不能直接跑构建、装依赖、截图。

8. 更新：

   ```text
   npx skills@latest update
   ```

   只更新单个技能：

   ```text
   npx skills@latest update expo-router
   ```

   Claude Code / Codex 的插件安装通过各自官方插件市场更新。

9. 反馈回路：每个技能都内置了提交具体、可操作反馈的指令：

   ```text
   npx --yes @expo/agent-cli@latest feedback
   ```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
README 的 “Try It” 和技能表本身就是一份“可以交给 agent 做什么”的清单，且是原来看不出该交给 AI 的细粒度工程活：搭带 tabs/modals/动画的 Router 屏幕、写 PR 预览构建的 EAS workflow、做 SDK 升级、判断 EAS Update rollout 是否健康、用 `@expo/ui` 写跨端原生组件、把 Next.js/Vite/CRA 应用迁成原生 App、写 Expo 原生模块（Swift/Kotlin/config plugin/autolinking）、往现有 iOS/Android App 里加 Expo（brownfield）、在 EAS 云端的远程模拟器上跑并驱动 App 并截图。价值在于：这些是项目专属操作，之前默认只能人做。

**2. 任务匹配**
- README 明确按 agent 分流：Claude Code / Codex 走官方插件市场（自动更新），Cursor、OpenCode、GitHub Copilot、Windsurf、Gemini、Cline、AMP、Factory Droid、Antigravity、Kiro CLI 走 skills CLI。这是“同一批能力、不同 agent 用不同供给方式”的现成对照。
- 技能内部再分层路由：`expo-overview` 是入口技能，请求含糊时先加载它再分发；具体技能靠描述被选中。这是把“任务匹配”做成一层显式路由的样本。
- 技能按成本分界线分组（Framework 免费 / Services 付费），且 services 技能开头写明成本与套餐限额——把“这个任务要花钱”作为匹配条件之一。

**3. 条件供给**
- 信息：`SKILL.md` 文件即上下文载体，需装在项目根目录下并被 agent 会话发现（装完要重启/刷新会话）。
- 工具与权限：MCP server 提供实时访问——读最新 Expo 文档、`npx expo install` 装兼容依赖、触发并监控 EAS 构建与工作流、拉 TestFlight 崩溃数据、截模拟器图。README 把“skills 教方法 / MCP 给动作”明确拆成两层，这是可迁移的供给结构。
- 事实源约束：声明文档与 CLI 是 source of truth，skills 只负责正确应用，避免技能里的知识漂移变成错误依据。
- 反馈：每个技能内置 `npx --yes @expo/agent-cli@latest feedback` 的提交指令。

**4. 主动推进**
有部分依据但较弱：`eas-workflows`（CI/CD 自动化 YAML）、`eas-update`（OTA 发布）、`eas-update-insights`（rollout gates、崩溃率、启动次数、payload 大小）、`eas-observe`（路由/事件/版本指标）属于事件或状态触发的自动化对象。但 README 没有描述 agent 自身如何被时间/事件/状态触发并持续运行，这一条只能算“提供了可被触发的动作接口”，不能算已验证的主动推进机制。

**5. 效果验证**
依据最少。可用的只有：`eas-observe` 与 `eas-update-insights` 提供上线后指标（崩溃率、启动次数、payload 大小、rollout gates），可作为“改动是否真的改善结果”的观测面；`feedback` 命令提供对技能本身的反馈通道。README 完全没有给出“装了 skills 后 agent 表现变好多少”的任何度量、基准或案例。

## 与已有做法的关系

- **Agent skills（adopt）**：本文正是该概念的一个官方、成规模的具体实例——一套 20+ 个 `SKILL.md`，带入口技能、分组、成本标注和实验区。可直接作为“一个领域的技能包长什么样”的参照模板。
- **Claude Code（adopt）**：给出了官方插件市场安装命令 `claude plugin install expo@claude-plugins-official` 与会话内 `/plugin install`，且插件自带 MCP 配置。是 Claude Code 生态里“插件 = 技能 + MCP”的例子。
- **skills.sh（try）**：技能通过 `npx skills@latest add expo/skills --skill '*'` 分发，更新走 `npx skills@latest update`，badge 指向 skills.sh。本文给出了该来源在真实项目中的使用路径。
- **Cursor（watch）、OpenCode（watch）、Cline（watch）**：三者都在 README 的 skills CLI 支持列表里，但原文只说明“可用这条命令安装”，没有针对它们的适配细节或验证，与清单中的 watch 状态一致。
- **GitHub Copilot（drop）**：README 把 GitHub Copilot 列在 skills CLI 支持清单中。这是一个与清单现状不一致的信号，可复查该条目的 drop 判断是否仍成立，但原文没有 Copilot 专属说明，不足以据此改判。

## 证据与局限

**原文给出的具体内容**：可复制的三条安装命令（Claude Code / Codex / skills CLI）、更新命令、单技能更新命令、反馈命令、四类示例提示词、完整技能清单与各自用途、免费 vs 付费分组、实验性技能单独插件、MCP 能力范围。这些都是可照做的。

**只是作者主张的部分**：
- “Skills give AI agents focused Expo knowledge… these skills help agents apply them correctly”——没有任何对照实验、成功率或耗时数据支撑。
- “Agents choose the right skill from the task context and each skill's description”——路由有效性是设计声明，未给误选率。
- stars 3658、今日 +90 只是热度信号，不等于效果证据。

**适用条件与限制**：
- 强绑定 Expo / React Native / EAS 技术栈；非 Expo 项目无法直接受益，只能借鉴封装方式。
- 部分能力要付费：Services 组核心依赖 EAS，`expo-dev-client` 的本地构建免费但 EAS Build/TestFlight 是付费步骤，`eas-simulator` 使用 EAS 云端资源。
- 原文只是 README，未包含任何 `SKILL.md` 的实际内容，因此“技能写得有多细、是否真的能照做”无法从本次材料判断。
- 实验性技能（如 `expo-migrate-module`）内容可能变更或下线。

## 怎么试、怎么验证

**最小试用（约半天）**
1. 选一个真实的、正在进行中的 Expo 项目，在项目根目录执行：

   ```text
   npx skills@latest add expo/skills --skill '*' --agent <你的 agent>
   ```

   重启/刷新 agent 会话。同时准备一个不安装 skills 的对照分支或对照会话。

2. 用 README 的四条示例提示词各跑一遍（Router 屏幕、PR 预览 EAS workflow、SDK 升级、EAS Update rollout 健康检查），记录 agent 选中的技能名是否符合预期。
3. 再跑一个真实任务（例如一次 SDK 小版本升级），skills 组与对照组各做一次，尽量同人同项目。
4. 若要验证 MCP 这一层，配好 Expo MCP server 后重跑同一任务，看是否减少“只给建议不动手”的情况。

**判断有没有改善的指标（试用前先定基线）**
- 首次产出可运行结果的时间（从提问到能跑起来）。
- 交互轮次：完成任务用了多少轮澄清/纠正。
- 人工纠正次数与类型：版本冲突、用了已废弃 API、目录结构不符合项目约定、绕过 `npx expo install` 手改版本号等。
- 技能路由准确率：示例提示词下选错技能的次数。
- 任务结果：SDK 升级后是否一次构建通过；EAS workflow 首次运行是否成功；agent 给出的 rollout 健康判断与 `eas-update-insights` 实际指标是否一致。
- 成本：services 技能触发的 EAS 用量与费用是否在预期内。

**迁移验证（这才是对本项目最 relevant 的一步）**
拿自己团队的一个高频领域（比如某内部平台的上线流程）做一个最小技能包：1 个入口路由技能 + 2~3 个具体 `SKILL.md` + 1 个能真正执行动作的 MCP/CLI 封装，然后重复上面的对照测法。若在非 Expo 领域也能复现“轮次下降、纠正减少”，说明这套“技能包 + MCP”的供给结构可写进手册；若只有 Expo 场景成立，则手册里只作为案例引用。
