# smokeeaasd/flawless-ui-ux

- 结论：**值得一试**。建议小范围试用：在现有前端项目中安装该技能，让编程智能体按创建、重设计、精修、评审流程工作，并用 context、inspect、verify 做前后对比。理由是安装、调用和检查命令具体可照做，但 README 没有给出效果数据，CLI 也不覆盖完整可访问性、键盘流程、业务正确性和视觉质量。
- 原文：https://github.com/smokeeaasd/flawless-ui-ux
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-07T01:18:05.465Z

## 是什么
flawless-ui-ux 是面向编程智能体的 UI/UX 技能包，附带一个检查用 CLI。技能负责把产品语境、内容与视觉识别连接到布局、排版、颜色、密度、图像和交互；CLI 负责收集项目上下文、检查指定源码或运行中的界面，并在修正后对比结果。README 明确说“你的 agent 做修改，CLI 提供观察并记录实际检查了什么”，因此它不是替代 agent 的自动改码工具。支持 Codex、OpenCode、Antigravity、Kiro、Cursor、Kilo Code、GitHub Copilot CLI、Claude Code、Pi、Grok Build、Devin CLI、DeepSeek Harness 等 12 个宿主，安装要求 Node 22.12+，许可证 MIT。

## 具体做法
1. 前提：Node 22.12+，在项目目录中运行。按包管理器选择安装命令，交互式选择项目级或全局范围、一个或多个 agent，并确认目标路径后再写入；Ctrl+C 可在写文件前取消。
```bash
npx flawless-ui-ux@latest install
# 或
pnpm dlx flawless-ui-ux@latest install
# 或
bunx flawless-ui-ux@latest install
```
2. 前提：已确认要装到哪些宿主。也可用显式参数跳过菜单；`--yes` 在无其他参数时使用默认值（当前项目内所有支持的 agent）。
```bash
npx flawless-ui-ux install --codex
npx flawless-ui-ux install --codex --devin
npx flawless-ui-ux install --claude-code --global
npx flawless-ui-ux install --project ./app
npx flawless-ui-ux install --yes
```
3. 备选安装：通过 skills.sh 安装；其运行时要求和 agent 选择遵循该安装器。或用仓库 checkout 的 Bash 脚本；Bash 本地安装必须带 `--project`，Windows 需 Git Bash 或 WSL。
```bash
npx skills add smokeeaasd/flawless-ui-ux --skill flawless-ui-ux
bash /absolute/path/flawless-ui-ux/install.sh --codex --project
```
4. 前提：安装后如宿主未发现技能，开新会话。用自然语言点名技能，并在同一对话中持续迭代。Codex 用 `$flawless-ui-ux`，支持斜杠命令的宿主用 `/flawless-ui-ux`，Pi 用 `/skill:flawless-ui-ux`。
```text
Use the flawless-ui-ux skill to build a financial dashboard for freelancers.
```
5. 前提：已有前端项目、知道入口源码文件。先收集上下文并检查源码；`--source` 可重复，或用 `--selector` 检查局部。
```bash
npx flawless-ui-ux context --project . --format json
npx flawless-ui-ux inspect --project . --source src/App.tsx --format json
```
6. 前提：应用已启动、已准备兼容 Chromium、输出目录的父目录存在。先安装 Playwright Chromium，再按实际开发服务器 URL 检查并保存基线。默认采样视口为 1440×900 和 390×844，可用 `--viewport WIDTHxHEIGHT` 重复指定其他视口。
```bash
npx playwright@1.64.1 install chromium
# 或：pnpm dlx playwright@1.64.1 install chromium
# 或：bunx playwright@1.64.1 install chromium
npx flawless-ui-ux inspect --project . --source src/App.tsx --url http://localhost:5173 --output ../app-before --format json
```
7. 前提：agent 已完成修正，且基线 `run.json` 存在。对保存的范围重复验证，并比较 persistent、new、no-longer-observed 三类结果；缺失的已确认目标和变化过的条件仍属未验证。
```bash
npx flawless-ui-ux verify ../app-before/run.json --output ../app-after --format json
```
8. 评审而不改文件时，直接给 agent 明确只报告不改文件的任务。
```text
Review this dashboard for readability, navigation, accessibility, and repeated generic patterns. Report findings without editing files.
```
9. 读取退出码判断覆盖状态：0 表示完成覆盖且无确认错误，1 表示完成覆盖但有确认错误，2 表示输入无效或请求的覆盖不完整；安装器在用户拒绝确认时返回 0，提示中断时返回 130。

## 对应的研究问题
- 能力发现：原文把创建、重设计、精修、聚焦改进和评审列为可交给 agent 的任务，并给出“评审但不编辑文件”的用法；这说明界面评审和局部视觉改进是可尝试纳入 AI 的工作，而不仅是生成代码。CLI 还能检查运行中的界面。
- 任务匹配：给出了宿主匹配和调用方式差异（Codex、Claude Code、Pi 等），以及源码检查与运行界面检查两类路径；但没有给出模型选择标准，不能据此判断哪种模型更适合 UI/UX。
- 条件供给：需要 Node 22.12+、项目目录、支持的 agent 宿主、入口源码文件、运行中的开发服务器 URL、Playwright Chromium、可写的输出目录父目录，以及一致的浏览器条件。设计任务还需要在提示中提供产品语境、内容、品牌色等上下文；CLI 本身不启动服务器、不下载浏览器、不提交表单。
- 主动推进：材料只支持按需调用技能和在修正后手动或由 agent 触发验证；没有时间、事件或状态触发的持续自动化流程。因此主动推进方面依据很弱。
- 效果验证：CLI 可采集选定 axe 对比度和可访问名称规则、采样宽度下的计算字号与水平溢出、可见破图与未捕获 JS 错误、重复短语和箭头提示、源码中的字面像素字号等；并用基线/验证对比区分 persistent、new、no-longer-observed。退出码也提供覆盖完成度和确认错误的信号。

## 与已有做法的关系
- Claude Code 在清单中为 adopt，README 明确支持 `--claude-code`，可作为该技能的优先试用宿主。
- skills.sh 在清单中为 try，README 提供 `npx skills add smokeeaasd/flawless-ui-ux --skill flawless-ui-ux` 安装路径，与该来源定位一致。
- Cursor、OpenCode、DeepSeek Harness 在清单中为 watch；README 的支持列表包含 Cursor、OpenCode、DeepSeek Harness，但仍应按清单状态先小范围观察，不因本技能直接升级。
- DeepSeek 在清单中为 try，但 README 点名的是 DeepSeek Harness，未点名 DeepSeek 本身，不能视为已支持 DeepSeek。
- GitHub Copilot 在清单中为 drop；README 虽支持 GitHub Copilot CLI，但不应据此改变清单中的 drop 判断。
- Cline 在清单中为 watch，但 README 的 12 个宿主列表未包含 Cline，不能声称兼容。
- 与已有做法相比，这个条目的增量主要是“技能文件 + 可重复的检查/验证 CLI”，而不是新的模型或编辑器；它把 UI/UX 工作拆成设计指导与检查证据两层。

## 证据与局限
原文是仓库 README，给出了安装命令、调用示例、CLI 命令、默认视口、输出结构、退出码和支持宿主列表；输入指标显示 64 stars，但没有效果数据、案例研究或基准结果。README 中的“技能引导设计与实现”“精修发展预期特征”等属于作者主张，未给出量化证据。CLI 自述的检查范围也有限：采样不能证明完整 WCAG 合规、完整键盘旅程、业务流正确或视觉质量；小字号和重复内容需要结合语境判断；检查不编辑文件、不启动服务器、不下载浏览器、不提交表单；缺失的已确认目标和变化条件仍属未验证。由于未读取 docs、evals 和实际代码，以上只能依据 README 判断，不能确认安装后在各宿主上的真实可用性和跨版本稳定性。

## 怎么试、怎么验证
最小试用：选一个前端页面和单一 agent，在分支上以项目级安装，例如用 Claude Code 时运行 `npx flawless-ui-ux install --claude-code`。先运行 `context` 和带源码或运行 URL 的 `inspect` 保存 before；让 agent 做一次有边界的评审或精修；修正后运行 `verify` 保存 after。对照 before/after 的 persistent、new、no-longer-observed 数量，确认错误是否减少、是否新增问题、覆盖是否完整；同时人工抽检键盘操作、业务流程和视觉质量，因为 CLI 明确不覆盖这些。辅助指标可记录：完成同一界面任务的时间、返工轮次、确认错误数、退出码变化、以及内容或行为是否被意外改变。只有在小样本中看到可重复的错误减少且无新增回归，才考虑扩大适用范围。
