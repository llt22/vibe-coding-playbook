# tt-a1i/archify

- 结论：**值得一试**。先把它当作“把设计沟通做成可复用技能”的小范围试用对象：按 README 给出的安装命令和两段提示词，分别跑一次“从描述出图”和“从仓库出图”，并用 validate/deliver 的 JSON 收据衡量返工轮次是否下降。理由：安装、提示词、CLI 校验-预览-交付流程都是可直接照抄的，但全部证据来自项目自述（star 数、Trending 排名、案例均为创作者口径），缺少独立验证，不宜直接 adopt。
- 原文：https://github.com/tt-a1i/archify
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T05:28:00.228Z

## 是什么

Archify（仓库 `tt-a1i/archify`，MIT 许可，README 标注当前稳定版 `v3.0.1`）是一个 agent skill，也带一个零依赖 CLI。它把“一句话描述”或“一个代码仓库”转成可交互的**单文件 HTML** 图，支持五种图型：架构（Architecture）、工作流（Workflow）、时序（Sequence）、数据流（Data Flow）、生命周期（Lifecycle）。

它的工作管线（README「How it works」）：

1. **Generate**：agent 根据描述生成 typed JSON IR。
2. **Validate**：内置校验器与布局规则检查源文件；失败时给出机器可读 JSON，并定位到具体需要修的局部。
3. **Preview（可选）**：仅回环地址的本地会话监听一个 JSON 源文件，只有通过全部校验的版本才刷新，失败保留上一份 last-good 产物。
4. **Deliver**：同目录候选文件渲染并检查，**只有通过校验的产物才原子替换目标文件**，可选 `--open` 打开该文件。
5. **Iterate**：agent 更新源文件，不相关结构保持稳定。

输出为自包含 HTML，自带聚焦语义节点、上下游追踪、精确路由、角色对比、演示舞台、主题切换、导出 PNG/静态/动图/分享卡片等交互；README 明确它不是通用绘图编辑器，也不是 Mermaid 主题。

## 具体做法

前提：本地有 Node.js（README 的 Hermes 集成注明 Node `>=18`，DeepSeek Harness 集成注明 Node `^22.19.0 || >=24.0.0`）；走 Claude.ai 上传 zip 的路线时，功能取决于沙箱里是否有 Node.js 访问。

1. **安装 skill（全局）**

```bash
npx skills add tt-a1i/archify -g
```

Cursor 的非交互安装：

```bash
npx -y skills add tt-a1i/archify --skill archify --agent cursor --global --copy --yes
```

不想安装先试用：

```bash
npx skills use tt-a1i/archify@archify --agent codex
```

2. **从描述出图（不需要仓库）**——把下面这段原样发给 agent：

```text
Use Archify to diagram a web request: Browser calls the API,
the API checks Redis, and a cache miss queries PostgreSQL and fills the cache.
```

3. **从仓库出图（要源码证据）**——在打开仓库的会话里发：

```text
Analyze this repository, then use archify to create a high-level runtime architecture diagram.
Show 8–12 core components, one primary path, external dependencies, and trust boundaries.
Put supporting detail in cards instead of adding more edges.
```

README 的仓库案例是 `mco-org/mco`（commit `9f1a1cf`）；带证据的架构节点会标 `SRC n` 并可打开 Git 校验过的文件与行号范围，普通产物不带源码证据。

4. **在对话里迭代**——用聚焦请求继续改，例如 `add Redis`、`move auth to the left`、`highlight the rollback path`；typed source 会保留以供定向修改。

5. **选对图型**——按 README 的对照表把类型写进提示词：

| 类型 | 适用 | 提示词里要写 |
|---|---|---|
| Architecture | 组件、服务、存储、边界 | 范围、核心组件、主路径 |
| Workflow | CI/CD、审批、工具调用、runbook | 参与者、顺序、分支、异常 |
| Sequence | API 调用、缓存回退、鉴权、异步链路 | 调用方、被调方、返回、时序 |
| Data Flow | 管道、血缘、PII、消费方 | 来源、转换、存储、边界 |
| Lifecycle | 状态、重试、等待、终态 | 状态、事件、重试与取消路径 |

拿不准用哪种时问 CLI：

```bash
node archify/bin/archify.mjs guide "Show an API request with Redis cache miss"
node archify/bin/archify.mjs guide "Map Kafka topics, consumer groups, replay, and DLQ" --json
```

6. **在仓库里跑完整命令链**（README「Useful repository commands」）：

```bash
cd archify
node bin/archify.mjs doctor
node bin/archify.mjs demo /tmp/archify-demo
node bin/archify.mjs guide "Show CI/CD checks, approval, deploy, and rollback"
node bin/archify.mjs validate workflow examples/agent-tool-call.workflow.json --quality showcase --json
node bin/archify.mjs preview workflow examples/agent-tool-call.workflow.json /tmp/workflow.html --quality showcase
node bin/archify.mjs deliver workflow examples/agent-tool-call.workflow.json /tmp/workflow.html --quality showcase --open --json
```

`preview` 是显式回环模式：监听一个 JSON 文件、随机 `127.0.0.1` 端口、失败时保留上一份已验证输出、Ctrl-C 停止，且不给生成的 HTML 加运行时代码；测试时可加 `--no-open`。

7. **失败时按收据修，不要盲重试**：`validate --json` 与 `deliver --json` 失败时只输出一个 JSON 对象，只应用 `diagnostics[]` 各 subject 的 `supportedFixes`，且限制在 skill 的**两轮**修正之内；视觉审查是另一件事。

8. **改架构前做差异评审**（Architecture Delta，含机器收据）：

```bash
node archify/bin/archify.mjs compare architecture base.json head.json architecture-delta.html --json
```

对比经过校验的 Before / Delta / After 快照；可以选择一个 authored change，或播放一次有限时长的 viewer-only Review。README 明确它**不推断**影响、风险或可合并性。

9. **设置输出元信息**（放进源的 `meta` 里）：

```json
{
  "meta": {
    "locale": "en",
    "animation": "trace",
    "visual_preset": "signal-flow"
  }
}
```

`meta.locale` 只本地化页面标题、Legend、状态/错误、a11y、HTML/SVG 的 `lang`，不会本地化你写的内容。内置 `en`/`zh-CN`；其他语言（如 `es`）需要 `meta.translations`（message key → 译文，可参考 `examples/locales/es.json`），否则渲染器回退英文并披露这一事实。静态导出省略 `animation`。

10. **交付与查看**：产物是一个 HTML 文件，下载后浏览器直接打开即可用，**看图不需要装 Archify**；转发给别人交互也一并带走，但外链和地图链接需要联网。查看侧快捷键：`?` 打开 Diagram Guide，`/` 查找并聚焦节点，`R`/`PATH` 探路径，`L`/`LENS` 对比角色，`M`/`MAP` 概览雷达，`F` 进入演示舞台，`S`/`T`/`E` 切样式/主题/导出，`+`/`-`/`0` 缩放重置。稳定链接可带 `#focus=<id>`、`#focus=<id>&reach=upstream|downstream`、`#relation=<id>`、`#route=<source>~<target>`、`#lens=<kind>~<kind>`。

11. **其他集成（可选，README 标注为社区集成、非官方产品、无遥测）**

```bash
hermes skills install skills-sh/tt-a1i/archify/archify -y
```

```bash
dsh plugin --profile web add @tt-a1i/archify-dsh@0.1.0
```

DSH 里的调用语：`Use the archify skill to map this repository's runtime architecture.`；移除：`dsh plugin --profile web remove @tt-a1i/archify-dsh`。DSH 集成要求 shell 文件使用精确的工作区路径，不能用 Web Produced Files。

12. **不想联网/不想被提醒**：Archify 可能 GET 固定的 stable manifest 以显示可选更新提醒，它自己不下载也不安装更新；成功检查后约 24 小时（±20%）再查，活跃使用下失败后 6 小时、再 24 小时重试；服务端只看到普通 HTTP 元数据，收不到版本、Agent、项目数据、提示词、账号/设备 ID 或 ETag。设 `ARCHIFY_UPDATE_CHECK_DISABLED=1` 可关闭联网与提醒状态写入。

## 对应的研究问题

**1. 能力发现。** README 把原本手工做的“画图/画流程”交给 agent：从一句话或一个仓库生成架构、工作流、时序、数据流、生命周期五类交互图；社区案例还延伸到非工程场景——团队协作、旅行行程、法律引证核查、合同审查、事故复盘，以及把架构图带进飞书/钉钉讨论。

**2. 任务匹配。** 给出了明确的选型表（见上第 5 步），并划出边界：不是通用绘图编辑器、不是 Mermaid 主题；自动解析 Mermaid、通用自动布局、托管分享、所见即所得编辑被明确排除在当前范围外。仓库图适合“高层运行期架构 + 一条主路径 + 外部依赖 + 信任边界”，并建议把细节放进卡片而不是加更多边。

**3. 条件供给。** 需要：Node 环境、安装 skill、给 agent 的提示词（图型、范围、核心组件、主路径/参与者/状态等）。仓库图需要 agent 读取仓库、并把证据固定到一个 public commit 的文件与行号。需要提供 `meta.translations` 才能本地化非内置语言。架构图的 `deployment-ownership` profile 需要 authored 的 owner、区域位置、私有数据库范围、具名跨界项，缺任一项就 **fail closed**（不会隐式补全，也不检查真实基础设施）。

**4. 主动推进。** 有两处：`preview` 会话持续监听一个 JSON 文件，只在最新候选通过全部门禁后刷新，失败保持上一份已验证产物（可 Ctrl-C 停止）；更新检查按“成功后约 24 小时、失败后 6/24 小时”的节奏自行重试，可整体关闭。除此之外，README 没有给出由时间、事件或状态触发并持续产出图的机制。

**5. 效果验证。** 这是 README 里最实的一块：`validate --json` 与 `deliver --json` 返回稳定规则码、精确 subject、实测证据和**只包含受支持修复手段**的 `diagnostics[]`；交付走“同目录候选渲染 → 全部检查通过 → 原子替换目标文件”的流程；有 `--quality showcase` 这类质量档位；架构变更用 `compare` 出机器收据，且明确不声称运行期影响、风险或合并安全；官方 Proof Lab 收录 11 个已检入场景及其 JSON 源和验证收据。

## 与已有做法的关系

- **Claude Code（adopt）**：README 明确支持，安装位置 `~/.claude/skills/` 或 `.claude/skills/`，能力为“完整渲染器 + 校验工作流”。这是清单里最直接相关、且能力最完整的对接点。
- **Cursor（watch）**：README 明确支持，并给出非交互安装命令；安装位置未列出，走 `npx skills add ... --agent cursor` 路线。
- **OpenCode（watch）**：README 明确支持，安装位置 `~/.config/opencode/skills/`、`.opencode/skills/` 或 `.agents/skills/`，能力同 Claude Code。
- **DeepSeek Harness（watch）**：有 opt-in 集成（`dsh plugin --profile web add @tt-a1i/archify-dsh@0.1.0`），README 注明其为社区集成、非 DeepSeek 官方产品、无遥测，并限定 Node 版本与工作区路径要求。
- **Hermes（watch）**：有 opt-in 集成命令，README 注明 Node `>=18`、非 Nous 官方产品、无遥测，也不是 agent switcher 的目标。
- **DeepSeek（try）**：清单中的 DeepSeek 只以 DeepSeek Harness 集成的形式出现，README 未给出针对 DeepSeek 模型本身的用法。
- **GitHub Trending（try）**：README 自称“#1 on GitHub Trending's weekly, all-language repository list”，并给出创作者本人在 2026-09-01 发布的排名截图链接——属于自述来源。
- **Trendshift（watch）**：README 带 Trendshift 徽章，链到 repositories/31352。

## 证据与局限

**原文给出的东西：** 安装命令、两段可直接复制的提示词、CLI 命令链（doctor/demo/guide/validate/preview/deliver/compare）、`meta` 配置示例、五类图型选型表、键盘快捷键与稳定链接格式、失败修复契约、以及若干具体案例：`mco-org/mco` 在 commit `9f1a1cf` 的架构图、官方 Proof Lab 的 11 个已检入场景、社区做的上海 CityWalk 四天行程（含 D1–D4 切换、地点卡、地图链接、到达打卡与站点备注）、把架构图带进飞书/钉钉讨论、从手绘多 agent 架构改成交互图后加 Kimi 执行池。给出的指标为 stars 75411。

**只是主张、没有独立验证的：** “#1 GitHub Trending 周榜”（创作者自发的截图）、星标数、QbitAI 采访与报道、社区认可度；“布局判断优于通用自动布局”“校验门禁带来可靠性”“truthful interaction 不发明拓扑、不声称运行期影响”等工程优势描述；社区案例均由作者自述，没有第三方对结果改善的度量。整份材料的来源是项目 README 本身，没有对照实验、没有与 Mermaid 等方案的横向数据、也没有大规模仓库的性能边界说明。

**适用条件与限制：** 需要 Node 环境；Claude.ai 上传 zip 的路径取决于沙箱是否有 Node.js 访问，Project Knowledge 上传只能走“prompt 驱动的架构降级方案”；`deployment-ownership` 在缺 authored 信息时 fail closed，且不检查真实基础设施；查看产物不需要装 Archify，但外链与地图链接需要联网；导出中的阅读驱动动画是有限的、尊重 `prefers-reduced-motion`，且**不进入**规范化导出。

## 怎么试、怎么验证

**最小试用（半天内可完成）：**

1. 选一个自己很熟的仓库（8–12 个核心组件的规模），按第 1 步安装，按第 3 步的提示词出一张运行期架构图。
2. 对同一系统再用第 2 步的“一句话描述”出一条流程（如缓存未命中路径），比较两条路线的可用度。
3. 跑一次 `validate ... --json` 与 `deliver ... --open --json`，记录是否一次通过、`diagnostics[]` 有几条、用了几个 round。
4. 把产物 HTML 发给一位不了解该系统的同事，让他不看别的资料回答“请求是怎么走的、缓存未命中会怎样”。

**判断有没有改善的指标：**

- 从“开始提问”到“一张可拿去讨论的图”的**返工轮次**与耗时（对照：手工画图或写一段文字说明的耗时）。
- `validate --json` 的**一次通过率**与 `diagnostics[]` 条数；两轮修正内能否收敛。
- **事实正确性抽查**：图上的组件与边，对照真实系统数一数错边、缺组件、方向反了的条数——README 声明不会发明拓扑，这一点必须自己验。仓库图另外检查 `SRC n` 跳转的文件与行号是否真的对得上。
- **沟通效率**：同事能否只靠这张交互图回答原本要口头解释的问题；能否用稳定链接（`#focus=`、`#route=`）指到具体位置而不用截图。
- **迭代成本**：提一句 `add Redis` / `highlight the rollback path` 到看到新图的往返时间。

**试用时要注意的：** 把“#1 Trending”“75411 stars”“社区热捧”这类自述当成待核实信息，不要写进手册当作采用理由；先在一个非关键仓库上试，避免把架构图当作变更评审的唯一依据——README 自己也写明 `compare` 不推断影响、风险或合并安全。
