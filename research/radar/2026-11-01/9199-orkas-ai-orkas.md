# Orkas-AI/Orkas

- 结论：**值得一试**。建议小范围试用 Orkas 的“项目 + 待办 + 自动推进 + 定时自动化”工作流，把它当作多智能体协作的编排层；理由是 README 给出了可运行的安装/配置步骤、外部 CLI 接入方式和明确的复核/权限机制，但缺少效果数据和按钮级操作步骤，不宜直接全面采用。
- 原文：https://github.com/Orkas-AI/Orkas
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-01T06:06:35.247Z

## 是什么
Orkas 是 MIT 许可、local-first 的多智能体桌面应用。用户把目标告诉 Commander，它会把较大的工作拆成步骤，分派给 16 个内置专家 agent，或交给本机已安装的 Claude Code、Codex、OpenCode、OpenClaw、Hermes-Agent 等 CLI agent 一起完成。它围绕“持续项目”设计：project 保存目标、规则、记忆和文件；to-dos 把人跟 agent 的工作分开；Auto-advance 自动接下一个待办；scheduled automations 按小时/天/周/月重复任务；connectors 连接 Gmail、Google Calendar、Sheets、Drive、Notion、Slack、Shopify、Stripe 等。它不是本地 LLM，而是调用内置 Orkas 模型、用户自己的 API key 或本地 OpenAI-compatible endpoint。开源源码版不支持 shared projects、cloud sync 和 web-app publishing，这些只在打包应用中提供。

## 具体做法
说明：第 1-4、10-11 步是 README 明确给出的操作；第 5-9 步是 README 描述的功能，原文没有给出按钮级路径，需在应用内按功能名操作。

1. 选择运行方式。前提：macOS 12+（Apple Silicon/Intel）或 Windows 10+ 可直接用打包安装包；Linux 源码运行需 glibc 2.34+ 的 x64/arm64，且不支持 Alpine/musl。源码方式需要 Node 22.12+；保留 Python 3 和 C/C++ 构建工具链，用于少数原生模块回退编译。

2. 从源码运行时执行：
```bash
git clone https://github.com/Orkas-AI/Orkas.git
cd Orkas
./run.sh
```
Windows 使用：
```bash
run.cmd
```
前提：首次启动会安装锁定的 npm 依赖，并准备 pinned Python、uv、Node、embedding model（约 95 MB）、OfficeCLI、FFmpeg、whisper.cpp 和多语言语音模型资源；需要网络和磁盘空间。工作区在 macOS/Linux 的 `~/.orkas/`，Windows 下在最小非系统盘符的 `.orkas` 目录。

3. 配置模型。前提：打包应用首次启动需登录，自带 500 credits；也可以用自己的 provider key。安装包内到 `Settings → AI Providers` 添加 API key 或 OAuth。支持 Claude、OpenAI、Gemini、DeepSeek、Kimi、GLM、Qwen、MiniMax、Doubao，或本地 OpenAI-compatible endpoint。

4. 配置本地模型。前提：已有 Ollama、LM Studio 等本地 OpenAI-compatible 或 Anthropic-compatible 服务。到 `Account settings → Models → Chat → Add model → Custom`，选择 `OpenAI-compatible` 或 `Anthropic-compatible`，填入 base URL、exact model ID、API key，然后在任务的模型控件中选择保存的模型。

5. 建一个 project。前提：先准备目标说明、工作规则、约束、参考文件和验收标准。按 README 的功能说明，在应用内创建 project，把目标、规则、记忆和文件放进去，让后续每次对话都从同一上下文开始，不必反复交代背景。

6. 拆 to-dos，并谨慎开启 Auto-advance。前提：每个 to-do 有明确交付物和人工验收人。先把工作拆成人或 agent 可执行的待办，先手动运行并复核一轮；确认质量后再开启 Auto-advance，让团队自动接下一个待办并把完成结果交回复核。README 只说明有该功能，未给出具体开关路径。

7. 设定 scheduled automations。前提：电脑保持唤醒且 Orkas 正在运行；它不能在电脑关机时继续工作。对例行任务设置 hourly、daily、weekly 或 monthly 自动运行。README 说明从 v1.9 起，电脑唤醒或 Orkas 启动后，每个自动化会在 12 小时内补跑最近一次错过的运行。

8. 连接 connectors。前提：只给最小必要权限，并保留默认确认。可连接 Gmail、Google Calendar、Sheets、Drive、Notion、Slack、Shopify、Stripe 等；README 明确默认在发送、发布或删除任何东西之前询问用户。

9. 接入外部 CLI agent。前提：本机已经安装并可使用 Claude Code、Codex、OpenCode、OpenClaw、Hermes-Agent。Orkas 把它们作为本地会话运行，由 Commander 把任务分给更合适的 agent；外部 CLI agent 保留自己的模型设置。README 还说明 Commander 通过 `dispatch_to`、`hand_off_to`、`run_worker` 做任务路由，但未给出用户侧配置步骤。

10. 视频参考复刻可直接用这条提示词：
```text
Use reference.mp4 as a reference for a 30-second vertical promo. Keep its hook, typography and pacing, replace the content with my product and screen recordings, and show me the breakdown and plan first.
```
前提：reference.mp4 是可被 agent 读取的视频文件；README 明确不支持社交平台分享链接直接下载。适合 motion-graphic explainer、SaaS/app demo、用现有素材做的产品广告；精确运镜、真人表演和逐帧匹配不保证。

11. 原生依赖出错时，在仓库 checkout 内执行：
```bash
npm run native:repair
```
只检查不安装时执行：
```bash
npm run native:check
```
前提：使用 Node.js 24 LTS，最低 22.12.0。该命令会恢复可选包、修复 Electron 的 SQLite、准备隔离图像处理用的 bundled Node，并检查 SQL、sqlite-vec 和 sharp。

## 对应的研究问题
- 能力发现：README 给出了一份可参考的候选能力清单，包括研究报告、SEO 审计、市场分析、内容写作、PPT、图片/视频/配音、UI、代码、Word/Excel/PPT/PDF、电商选品/文案/评论分析/销售分析/目录操作，以及“多 agent 组合完成报告+幻灯片+发布视频”。这些是产品声称的能力，不是独立验证结果，但可用于扩展“还能交给 AI 什么工作”的候选池。
- 任务匹配：Orkas 的匹配方式是 Commander 自己处理通用工作，专家工作通过 `dispatch_to`、`hand_off_to`、`run_worker` 分派；外部 Claude Code、Codex、OpenCode 等作为本地 CLI agent 参与。不同 agent 有独立并发控制和技能/记忆，模型可统一配置，也可让外部 CLI 保留自己的模型设置。原文给出了架构，但没有给出“什么任务该给哪个 agent”的判定规则。
- 条件供给：project 提供目标、规则、记忆和文件；Library 把文档切段并建本地 SQLite 向量索引，支持带引用地回答；connectors 提供外部数据和操作权限；模型配置提供 API key 或本地 endpoint；默认发送/发布/删除前询问，属于权限与反馈条件。
- 主动推进：to-dos + Auto-advance 由“下一个待办”状态触发；scheduled automations 由时间触发，支持小时/天/周/月；v1.9 起支持错过后 12 小时内补跑；空闲时后台 review 可更新 agent 的自我评估、可复用方法和学习技能。限制是必须电脑唤醒且 Orkas 运行。
- 效果验证：README 提到完成工作会交回用户复核，连接器操作默认先询问；DeepResearcher 声称会核对来源、标记矛盾并产出可审计报告；ProductDeveloper 声称结果可验证；Library 回答可引用原文段落。但这些都是功能描述，没有给出准确率、返工率、成本或前后对比数据。

## 与已有做法的关系
清单中没有 Orkas 本身的直接条目。它与已有条目的关系是：
- Claude Code（adopt）：Orkas 可以把 Claude Code 作为团队中的一个 CLI agent 运行，并在外面加上 project、to-dos、automations 和跨 agent 编排；不是替代 Claude Code。
- OpenCode（watch）、OpenClaw（watch）、Hermes（watch）：Orkas 声称可以把它们作为本地 CLI agent 接入并统一分派任务，但这不改变这些条目本身仍处于 watch 的判断。
- DeepSeek（try）：Orkas 支持把 DeepSeek 作为模型 provider 使用。
- OfficeCLI（try）：Orkas 首次启动会准备 OfficeCLI，内置 OfficeWorker 负责 Word/Excel/PowerPoint/PDF 的创建、编辑、检查和批量交付。
- Cline（watch）：README 只在对比表中提到 Cline，没有描述集成方式。

## 证据与局限
证据方面：项目是 MIT 开源，README 给出了源码运行命令、平台要求、模型配置路径、原生依赖修复命令、一条可直接使用的视频复刻提示词，以及任务路由/上下文/记忆/执行限制的实现文件链接；GitHub 显示 6785 stars、当日 1044 stars，说明关注度高。
局限方面：README 主要是产品说明，没有独立基准、客户案例数据或前后对比；16 个 agent 的能力、DeepResearcher 的“verified sources”、ProductDeveloper 的“verifiable results”都是作者主张。项目/待办/自动化的按钮级操作步骤没有给出，任务路由的具体判定标准也没有展开。打包应用需要登录，内置模型走 Orkas 管理服务；源码版不支持共享项目、云同步和 web app 发布。自动化依赖电脑唤醒和 Orkas 运行，不能关机后继续。视频复刻不支持社交平台分享链接下载，也不保证精确运镜、真人表演和逐帧匹配。后台学习 review 也可能判断没有值得保存的内容。

## 怎么试、怎么验证
最小试用：选一个边界清楚、交付物明确的流程，例如“每周研究简报 + 幻灯片”或“一条 30 秒产品推广视频”。先记录当前人工/单 agent 做法的基线。安装打包应用或从源码运行，配置一个模型 provider，建一个 project，放入目标、规则、参考文件和验收标准；拆 3-5 个 to-dos，先手动跑第一项并复核，再只对下一项开启 Auto-advance。加一个 daily 或 weekly 的 scheduled automation，连接一个低风险 connector，并保持默认发送/发布/删除前确认。若本机已有 Claude Code 或 Codex，可让一个 agent 做实现、另一个做复核，与单 agent 做法对比。视频场景直接用上面的提示词，要求先给 breakdown 和 plan。
验证指标：与基线相比看首次草稿时间、总周转时间、人工修改次数、返工率、遗漏或重复操作次数、权限误操作次数、credits/API 成本、引用准确率、自动化按时运行率、复核通过率。若时间下降且返工和权限风险没有上升，可继续扩大范围；若主要收益只是“看起来自动化”但复核成本更高，则退回 study，只保留其 project/to-dos/权限门控的设计思路。
