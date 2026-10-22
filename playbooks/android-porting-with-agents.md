# 让 AI 按专家流程带你把主线 Linux 移植到安卓设备

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：主线 Linux 移植到安卓手机/平板是跨领域、经验密集的活，怎么让 AI 助手按一套经过实战的九步流程、选型规则和踩坑库工作，而不是每次都从零摸索。
> 先试这一步：先按 README 装好 skill（推荐 `npx skills add yzddmr6/android-mainline-port -g`，要求 Node.js 22+），然后给 AI 一个真实任务：“我想把主线 Linux 移植到一台骁龙 8 Gen 3 平板上，先帮我评估能不能做、大概要多久”。
> 最近修订：2026-10-23

## 解决什么问题

主线 Linux 移植到安卓设备是一件跨领域、经验密集的活：设备树匹配、首次点亮、外设、电源管理、发布与维护，每一步都有大量选型点和坑。这篇手册的做法是把一套已经跑过三台设备的九步流程、约 40 个关键选型点和九类问题模式，封装成 Agent Skill 交给 AI 助手，让它在你的具体设备上按流程提问、给步骤、给证据、给风险，而不是每次从零摸索。

## 适用与不适用

**适用**

- 你在做主线 Linux / Ubuntu 移植到安卓手机、平板，尤其是高通平台。
- 你使用支持 Agent Skill 的编程助手：Claude Code、Codex、Cursor、Gemini CLI、OpenCode（该 skill 也列出 GitHub Copilot 支持，但按现有工具清单仍不纳入常规流程）。
- 你想用 AI 做可移植性评估、技术选型、跨领域故障排查，或中途接手别人的移植项目并读文档继续。

**不适用**

- 只想刷个 ROM / 换系统，不做移植开发。
- 无法解锁 BL、没有恢复手段、不能承担清空数据风险的设备。
- 期待 AI 替你做完所有硬件调试——它给的是流程、经验和下一步，取证与验证仍要你上手。
- 非高通平台：原文对高通平台写得最具体，其他 SoC 的硬件细节需自行调研。

## 前置条件

- Node.js 22 或更高（走 `npx skills` 安装时需要）。
- 知道你所用的助手对应的 skill 目录：Claude Code 是 `~/.claude/skills`；Codex、Gemini CLI、Cursor、GitHub Copilot、OpenCode 可用 `~/.agents/skills`，或以各自文档里写的目录为准。
- 能给 AI 提供任务所需信息：设备 SoC 型号、BL 解锁状态、现象、日志或 pstore。
- 项目侧要有文档、技术债表和目录结构；经验反馈按 `experience/README.md` 的格式写。
- 设备侧要有恢复手段，刷机、root、备份都涉及设备权限和数据风险。

## 操作步骤

### 步骤 1 安装 skill（选一种做法）

**做法 A —— npx skills（推荐，跨助手）**

前提：Node.js 22+。装到用户目录则所有项目可用；不加 `-g` 只装到当前项目；可用 `-a` 指定助手（如 `-a claude-code -a codex`）。

```bash
npx skills add yzddmr6/android-mainline-port -g
```

更新与卸载：

```bash
npx skills update android-mainline-port -g
npx skills remove android-mainline-port -g
```

预期结果：助手的 skill 目录下出现 `android-mainline-port`。

**做法 B —— Claude Code 插件（希望跟随 marketplace 更新时）**

前提：在 Claude Code 会话或终端中。会话内执行：

```text
/plugin marketplace add yzddmr6/android-mainline-port
/plugin install android-mainline-port@android-mainline-port
```

终端也可执行：

```bash
claude plugin marketplace add yzddmr6/android-mainline-port
claude plugin install android-mainline-port@android-mainline-port
```

**做法 C —— Gemini CLI**

```bash
gemini skills install https://github.com/yzddmr6/android-mainline-port.git
```

**做法 D —— 手动 git clone（网络或权限受限、需要锁版本时）**

前提：知道所用助手的 skill 目录，且目录名必须是 `android-mainline-port`。以 Claude Code 为例：

```bash
git clone --depth 1 https://github.com/yzddmr6/android-mainline-port ~/.claude/skills/android-mainline-port
```

更新时在该目录执行 `git pull`。

**做法 E —— claude.ai 网页与桌面 App**

从 Releases 下载 `android-mainline-port.zip`；在 Settings → Capabilities 打开 `Code execution and file creation`；打开 Customize → Skills，点加号上传该 zip。

**做法 F —— 让 AI 自己装**

把下面这段原样发给 AI 编程助手：

```text
请帮我安装这个 Agent Skill：https://github.com/yzddmr6/android-mainline-port
1. 先判断你自己的用户级 skill 目录：Claude Code 是 ~/.claude/skills，Codex、Gemini CLI、Cursor、GitHub Copilot、OpenCode 可用 ~/.agents/skills，或以你自己文档里写的目录为准。
2. 执行 git clone --depth 1 https://github.com/yzddmr6/android-mainline-port <skill目录>/android-mainline-port；如果目录已存在，改为在里面执行 git pull --ff-only。
3. 目录名必须是 android-mainline-port，和 SKILL.md 里的 name 一致。
4. 确认目录里有 SKILL.md、references/、experience/，且 SKILL.md 开头写着 name: android-mainline-port。
5. 不要改动其他 skill 和设置。最后告诉我装在哪里，是否需要重启或重新加载。
```

**怎么选**：日常在 Claude Code 里且希望跟随更新 → B；多个助手、多台机器 → A；只用网页版 → E；网络受限或要固定版本 → D；不想手动折腾、让助手自己判断目录 → F。

### 步骤 2 确认装上了

Claude Code 输入 `/android-mainline-port`（插件方式为 `/android-mainline-port:android-mainline-port`）；其他助手直接问，例如“我想把主线 Linux 移植到一台安卓平板上，先帮我评估”。

前提：步骤 1 已完成。预期结果：助手会读取这个 skill 再回答，而不是凭空猜测。同时检查目录里有 `SKILL.md`、`references/`、`experience/`，且 `SKILL.md` 开头写着 `name: android-mainline-port`。

### 步骤 3 第一个任务：可移植性评估

使用时不需要特别命令，像平常一样描述情况。示例：评估骁龙 8 Gen 3 平板能否跑主线 Linux + Ubuntu、大概要多久。

前提：已装 skill，并提供 SoC 型号、BL 解锁状态等基本情况。预期结果：产出四件事——能否移植、走哪条路线、大概多久、需要你决定什么。若答不出这四件事，说明它没读 skill 或信息不足，补充信息再问。

### 步骤 4 第二个任务：用一个已知故障考验它

示例：`fastboot boot` 返回 OKAY 但停在 Fastboot、pstore 为空。

预期结果：它先去查设备树的 `msm-id`/`board-id`，而不是怀疑镜像大小——这说明它真的命中了经验库里的条目。

### 步骤 5 正式推进时按九步流程走

流程为：0 立项 → 1 构建环境 → 2 取证与备份 → 3 首次启动 → 4 点亮与内存桌面 → 5 安装到存储 → 6 外设 → 7 发布 → 8 维护。

做法：每次先让助手定位“我现在在第几步、这一步的完成标准是什么、下一步是什么”，再动手。前提：已安装并让助手读取对应流程文件。每一步都写清做什么、做到什么程度算完成；`references/verification.md` 里有状态词、证据、冷启动、测试自动化、性能预算。发布要求按公开文档从零安装验收，维护要求每次更新冷启动验证。

### 步骤 6 边做边喂经验、登记技术债

在 `experience/` 对应文件里按 `experience/README.md` 的格式追加条目：

- 只写确认了根因的问题；写清现象、原因、怎么确认、怎么解决、适用范围。
- 不写设备型号、序列号、地址、校准数据、个人信息；芯片型号、驱动名、错误码可以写。
- 为快速跑通而用的临时做法全部登记进统一技术债表，链路跑通后集中还债；上游合入就删本地实现。

预期结果：下一个接手的人或 agent 只看文档就能继续。

## 怎么判断变好了

**最小试用方式**：选一台已有移植项目或一台候选设备，装好 skill，先给一个可移植性评估任务，再给一个已知故障任务，然后才决定是否纳入常规流程。原文没有量化基线，建议与“不装 skill 的同一 agent、同一任务”做前后或并行对比。

**观察指标**

- 评估任务是否产出四件事：能否移植、走哪条路线、大概多久、需要用户决定什么。
- 故障任务首轮是否命中经验条目（例：先查 `msm-id`/`board-id` 而不是镜像大小）。
- 人工纠偏次数是否下降。
- 是否按九步流程定位当前步骤、是否给出可执行下一步、是否提示备份恢复与技术债登记。
- 交接测试：另一人或 agent 只看文档能否继续。
- 发布时按公开文档从零安装是否通过；每次更新冷启动验证是否通过。
- 技术债是否登记并偿还。

**试多久**：以“一次评估 + 一次故障排查”为一个试用单元，跑完再决定是否纳入常规流程（原文结论如此，未给出时长与效率数据）。

## 常见坑

- 用 GitHub 的 Download ZIP 安装：解压目录名带 `-main`，部分助手不识别。改用 git clone 或 npx skills。
- 目录名不是 `android-mainline-port`、与 `SKILL.md` 里的 `name` 不一致 → 助手不会加载。
- 把 skill 当成“AI 全自动移植”：它给的是流程、选型规则和踩坑库，取证与验证仍要你做。
- 信息给太少：不给 SoC、BL 状态、日志或 pstore，评估和排障只能泛泛而谈。
- 经验库写成设备档案：型号、序列号、地址、校准数据、个人信息不要写；只写确认根因的问题。
- 只跑通不还债：临时做法不登记技术债、上游合入后不删本地实现，越拖越难交接。
- 把高通平台的经验直接套到其他 SoC：其他平台硬件细节需自行调研。
- 忽视时效性：内容基于 2026 年上游状态，版本号、接口名、上游进度会变，按当前上游核对。
- 忽视刷机风险：可能清空数据、无法启动，先确保有恢复手段。

## 证据与来源

- 做法 A–F 的安装命令、目录名要求、确认方式、“让 AI 帮装”的提示词，以及九步流程 0–8、`references/verification.md` 的内容项、`experience/README.md` 的写法与隐私要求：来自调研《yzddmr6/android-mainline-port》（依据该仓库 README）。
- 设备与版本背景：来自三台设备的完整移植——小米平板 6 Pro（SM8475）、一加平板 2 Pro（SM8750）、小米平板 8 Pro（SM8750），主线内核 6.17 到 7.2，Ubuntu 26.04 + GNOME，与 Android 双系统共存；仓库提供九步流程、约 40 个关键选型点、九类问题模式。
- 具体经验条目：`fastboot boot` 返回 OKAY 却停在 Fastboot 先查设备树 `msm-id`/`board-id`；simpledrm 只用于首次点亮；高通平台休眠默认用 s2idle；睡眠时长只看墙上时间；ccache 按约 0.3 GB 一次完整内核构建来配，10 GB 足够并设 `base_dir`。
- 局限：调研只读到 README，未读取 `SKILL.md`、`references/`、`experience/` 正文，步骤细节与决策规则质量无法验证；没有效率提升的量化数据；仓库 stars 为 31，属个人项目；“效率最高、少走弯路”是作者主张，未经独立验证。
- “怎么判断变好了”中的指标与最小试用设计属于试用方案建议，原文未给基线数据。

## 依据的调研

- [yzddmr6/android-mainline-port](../research/radar/2026-10-23/6006-yzddmr6-android-mainline-port.md)：值得一试，建议按 README 的 npx skills 或 git clone 安装后小范围试用：先让 AI 做一次设备可移植性评估和一次已知故障排查，再决定是否纳入常规流程；理由是该仓库把专家流程、决策规则和踩坑库封装成 Agent Skill，并给出安装、使用和维护规范，但效果尚无独立验证且只读到 README。
