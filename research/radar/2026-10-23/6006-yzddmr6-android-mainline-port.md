# yzddmr6/android-mainline-port

- 结论：**值得一试**。建议按 README 的 npx skills 或 git clone 安装后小范围试用：先让 AI 做一次设备可移植性评估和一次已知故障排查，再决定是否纳入常规流程；理由是该仓库把专家流程、决策规则和踩坑库封装成 Agent Skill，并给出安装、使用和维护规范，但效果尚无独立验证且只读到 README。
- 原文：https://github.com/yzddmr6/android-mainline-port
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-22T19:33:46.408Z

## 是什么
这是一个以 Agent Skill 形式组织的“主线 Linux 移植到 Android 手机/平板”操作手册与经验库，AI 编程助手和人都可直接使用。它来自三台高通平板从零到公开发布的移植（主线内核 6.17 到 7.2，Ubuntu 26.04 + GNOME），目标是从头再移植一台设备时效率最高、少走弯路。结构上外层是 SKILL.md 和 references/，经验库是 experience/；提供九步流程、约 40 个关键选型点、九类问题模式，并要求记录技术债和文档以便交接。

## 具体做法
1. 前提是 Node.js 22 或更高。推荐安装到用户目录，所有项目可用；不加 `-g` 只装到当前项目，也可用 `-a claude-code -a codex` 指定助手：
```bash
npx skills add yzddmr6/android-mainline-port -g
```
更新用 `npx skills update android-mainline-port -g`；卸载用 `npx skills remove android-mainline-port -g`。
2. Claude Code 插件方式，前提是在 Claude Code 会话或终端中。会话内可执行：
```text
/plugin marketplace add yzddmr6/android-mainline-port
/plugin install android-mainline-port@android-mainline-port
```
终端也可执行：
```bash
claude plugin marketplace add yzddmr6/android-mainline-port
claude plugin install android-mainline-port@android-mainline-port
```
3. Gemini CLI 安装：
```bash
gemini skills install https://github.com/yzddmr6/android-mainline-port.git
```
4. 手动 git clone，前提是知道所用助手的 skill 目录，且目录名必须是 `android-mainline-port`。以 Claude Code 为例：
```bash
git clone --depth 1 https://github.com/yzddmr6/android-mainline-port ~/.claude/skills/android-mainline-port
```
更新时在该目录执行 `git pull`。不要用 GitHub 的 Download ZIP，解压目录名带 `-main`，部分助手不识别。原文还列出了 Codex、Gemini CLI、Cursor、GitHub Copilot、OpenCode 的用户级和项目级 skill 目录。
5. claude.ai 网页与桌面 App：从 Releases 下载 `android-mainline-port.zip`；在 Settings → Capabilities 打开 `Code execution and file creation`；打开 Customize → Skills，点加号上传该 zip。
6. 让 AI 帮装，把下面这段原文提示词发给 AI 编程助手：
```text
请帮我安装这个 Agent Skill：https://github.com/yzddmr6/android-mainline-port
1. 先判断你自己的用户级 skill 目录：Claude Code 是 ~/.claude/skills，Codex、Gemini CLI、Cursor、GitHub Copilot、OpenCode 可用 ~/.agents/skills，或以你自己文档里写的目录为准。
2. 执行 git clone --depth 1 https://github.com/yzddmr6/android-mainline-port <skill目录>/android-mainline-port；如果目录已存在，改为在里面执行 git pull --ff-only。
3. 目录名必须是 android-mainline-port，和 SKILL.md 里的 name 一致。
4. 确认目录里有 SKILL.md、references/、experience/，且 SKILL.md 开头写着 name: android-mainline-port。
5. 不要改动其他 skill 和设置。最后告诉我装在哪里，是否需要重启或重新加载。
```
7. 确认安装：Claude Code 输入 `/android-mainline-port`（插件方式是 `/android-mainline-port:android-mainline-port`）；其他助手直接问“我想把主线 Linux 移植到一台安卓平板上，先帮我评估”，助手会读取这个 skill 再回答。
8. 使用时不需特别命令，像平常一样描述情况。原文示例包括：评估骁龙 8 Gen 3 平板能否跑主线 Linux + Ubuntu 及大概时间；`fastboot boot` 返回 OKAY 但停在 Fastboot、pstore 为空；休眠一两秒就被唤醒；接手移植项目先读文档问当前步骤和下一步。按九步流程推进：0 立项，1 构建环境，2 取证与备份，3 首次启动，4 点亮与内存桌面，5 安装到存储，6 外设，7 发布，8 维护。前提是已安装 skill 并让助手读取对应流程文件。
9. 维护经验库：在 `experience/` 对应文件按 `experience/README.md` 的格式追加条目；只写确认了根因的问题，写清现象、原因、怎么确认、怎么解决、适用范围；不写设备型号、序列号、地址、校准数据、个人信息，芯片型号、驱动名、错误码可以写。为快速跑通而用的临时做法全部登记进统一技术债表，链路跑通后集中还债。

## 对应的研究问题
- 能力发现：原文明确可让 AI 做设备可移植性评估、按九步流程推进、技术选型决策、跨领域故障排查、中途接手项目并读文档继续。使用示例直接给出这些任务。
- 任务匹配：适合支持 Agent Skill 的编程助手，原文列了 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode；复杂专业工作被拆成相对稳定的外层框架加持续追加的经验库。原文提到子 agent 出现在 discipline/testing 相关文件，但没有展开模型选择和协作细节。
- 条件供给：需要安装 skill；需要提供设备 SoC、BL 解锁状态、现象、日志或 pstore 等信息；项目侧要有文档、技术债表和目录结构；经验反馈要按 experience/README.md 格式写清根因和适用范围；刷机、root、备份涉及设备权限和恢复手段。原文还给出了让 AI 帮安装的提示词和安装目录。
- 主动推进：流程有步骤和完成标准，可推动从立项到维护；原文要求上游合入就删本地实现、还技术债、每次更新冷启动验证。但原文没有明确设计时间、事件或状态触发器，主动推进更多是流程驱动而非自动触发。
- 效果验证：每一步写清做什么、做到什么程度算完成；references/verification.md 包含状态词、证据、冷启动、测试自动化、性能预算；发布要求按公开文档从零安装验收；维护要求每次更新冷启动验证。可据此判断是否少走弯路、文档能否交接，但原文没有量化效果数据。

## 与已有做法的关系
清单中有 Claude Code（adopt）、Cursor（watch）、GitHub Copilot（drop）、OpenCode（watch）。该 skill 明确支持这些助手，并给出 Claude Code 插件市场命令以及 Cursor、OpenCode 等走 skills 目录的方式；GitHub Copilot 虽被该 skill 列为支持，但清单状态为 drop，本文不改变该判断。清单中没有其他相关条目。

## 证据与局限
原文给出的证据：来自三台设备完整移植，小米平板 6 Pro（SM8475）、一加平板 2 Pro（SM8750）、小米平板 8 Pro（SM8750），主线内核 6.17 到 7.2，Ubuntu 26.04 + GNOME，与 Android 双系统共存；列出具体经验，如 `fastboot boot` 返回 OKAY 却停在 Fastboot 先查设备树 msm-id/board-id、simpledrm 只用于首次点亮、高通平台休眠默认用 s2idle、睡眠时长只看墙上时间、ccache 按约 0.3 GB 一次完整内核构建来配且 10 GB 足够并设 base_dir；以及九步流程、约 40 个选型点、九类问题模式。局限：只依据 README，未读取 SKILL.md、references/、experience/ 正文，无法验证步骤细节和决策规则质量；没有效率提升的量化数据；stars 为 31，属于个人项目；内容基于 2026 年上游状态，版本号、接口名、上游进度有时效性；高通平台写得最具体，其他 SoC 硬件细节需自行调研；刷机有清空数据和无法启动的风险。作者主张的“效率最高、少走弯路”未被独立验证。

## 怎么试、怎么验证
最小试用：选一台已有移植项目或一台候选设备，按 `npx skills add yzddmr6/android-mainline-port -g` 或 git clone 安装；先给 AI 一个可移植性评估任务，再给一个已知故障任务，例如 `fastboot boot` 返回 OKAY 但停在 Fastboot，要求它先读 skill、给步骤、证据和风险。记录 agent 是否引用具体经验条目、是否按九步流程定位当前步骤、是否给出可执行下一步、是否提示备份恢复和技术债登记。验证指标建议包括：评估任务是否产出“能否移植、走哪条路线、大概多久、需要用户决定什么”；故障任务首轮是否命中原文经验，例如先查 msm-id/board-id 而不是镜像大小；人工纠偏次数；交接测试中另一人或 agent 只看文档能否继续；发布时按公开文档从零安装是否通过；冷启动验证是否通过；技术债是否登记并偿还。建议与不装 skill 的同一 agent、同一任务做前后或并行对比；没有基线时至少记录是否减少重复排查、是否按完成标准收敛。以上指标为试用设计，原文未给基线数据。
