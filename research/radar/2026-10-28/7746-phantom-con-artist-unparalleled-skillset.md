# Phantom-Con-Artist/unparalleled-skillset

- 结论：**值得一试**。建议在低风险的 UI/网页改版中试点：安装对应 agent 技能，按截图审查闭环执行并保留人工验收；它给出了可复制的安装、Studio 请求队列和 Playwright 多宽度审查步骤，但仓库自述为 first working slice 且缺少效果数据，不宜直接全面采用。
- 原文：https://github.com/Phantom-Con-Artist/unparalleled-skillset
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-28T00:38:36.105Z

## 是什么
这是面向编程助手的两个可安装设计技能：unparalleled-ui（应用、仪表盘、表格、表单、设置）和 unparalleled-website（公开网站、作品集、落地页、产品故事），并附带一个本地 Unparalleled Studio，把页面上选中的元素和修改指令通过本地工具交给现有 IDE agent。README 还提供 Playwright 多宽度截图审查、对比度/设计 token 脚本和安装 CLI。仓库自述为 first working slice，36 stars。

## 具体做法
1. 前提：Node.js 20 或更新；一个受支持的编程助手（README 列了 Codex、Claude Code、Cursor、GitHub Copilot、Gemini CLI、Antigravity、Windsurf、Devin、OpenCode、Cline、Roo Code、Kiro）；截图审查需要 Playwright 或允许 capture 脚本安装到用户缓存。安装器只改技能目录和路由说明，不改 agent 权限；`hook --write` 是唯一会改项目 `.claude/settings.json` 的命令，且需你主动要求。
2. 安装技能（npm 发布前用 GitHub 形式）：
```bash
npx github:Phantom-Con-Artist/unparalleled-skillset setup
npx github:Phantom-Con-Artist/unparalleled-skillset doctor
# 或按项目/全局安装
npx github:Phantom-Con-Artist/unparalleled-skillset install all
npx github:Phantom-Con-Artist/unparalleled-skillset install website
npx github:Phantom-Con-Artist/unparalleled-skillset install ui
npx github:Phantom-Con-Artist/unparalleled-skillset install all --global
```
装完或更新后新开 agent 会话。可用 `agents` 查看检测到的助手，`--dry-run` 只看计划。可选：Claude Code 需要每个设计提示自动加结构化 brief 时运行 `npx github:Phantom-Con-Artist/unparalleled-skillset hook --write`。
3. 按任务选技能：应用/仪表盘/表格/表单/设置选 unparalleled-ui；公开网站/作品集/落地页/产品故事选 unparalleled-website。让 agent 先产出任务 brief、设计契约和一个代表性 specimen；完整新方向默认要用户审阅后再全量开发，除非明确放弃审阅。
4. 做截图审查闭环：先给 agent Playwright（Claude Code 可 `/plugin install playwright@claude-plugins-official`，其他可用 `npx @playwright/mcp@latest` 的 MCP server），或让脚本安装：
```bash
node .agents/skills/unparalleled-website/scripts/capture.mjs --install --url ./index.html --out ./shots
node .agents/skills/unparalleled-website/scripts/capture.mjs --url http://localhost:5173 --out ./shots --round 2 --viewports desktop,phone
```
每轮输出首帧和整页截图及 `report.json`；要求 agent 打开每张截图，按严重度/证据/修复/复测记录，修复一批后重拍并做前后对比。报告会标记 pill、卡片组、kanban、默认字体、SaaS 配色、emoji、横向溢出、运行时错误、占位文案、减少动态偏好下仍持续动画等模板痕迹；标记需要修复/复测、有证据的误报，或明确用户/品牌要求并做功能/可访问性检查，不是最终判决。
5. 检查对比度与 token（可选但适合作为验收证据）：
```bash
node .agents/skills/unparalleled-website/scripts/check-contrast.mjs --pairs ./pairs.json
node .agents/skills/unparalleled-website/scripts/generate-tokens.mjs --input ./tokens.json --output ./tokens.css
```
`pairs.json` 是对象数组，每项含 `name`、不透明 sRGB 十六进制 `fg` 和 `bg`、`req`（普通文本 4.5，合格大文本/有意义 UI 图形 3，或有意更高阈值 7）；`tokens.json` 是非空对象，把 CSS 自定义属性名映射到项目特定值。没有默认调色板或字体搭配。技能自身校验可用 `npm run validate-all`，但它只检查结构和本地 Markdown 链接，不认证生成网站或 UI。
6. 可选：用 Studio 做页面内选取和定向修改。先在仓库检出中运行：
```bash
npm run studio:demo
npm run studio -- --root /absolute/path/to/site --port 4310
```
让 IDE agent 在同一仓库中通过本地工具读取目标、取请求、读源码、打补丁：
```bash
npm run studio:agent -- --project /absolute/path/to/site context
npm run studio:agent -- --project /absolute/path/to/site next --wait 25000
npm run studio:agent -- --project /absolute/path/to/site inspect --selector '#heading'
npm run studio:agent -- --project /absolute/path/to/site read --file index.html
npm run studio:agent -- --project /absolute/path/to/site patch --input /tmp/studio-patch.json
```
补丁要带 `id`、`leaseToken`、`file`、`expectedHash`、`edits`（`search` 必须精确匹配一次，文件哈希必须仍一致）；多文件用 `files`，最多 12 个文件、总计 2 MiB；新建文件用 `create: true`、`expectedHash: null` 和 `content`。所有校验通过才写入，失败会回滚，undo 全有或全无。超过五分钟用 `renew`。MCP 可用时：
```bash
claude mcp add unparalleled-studio -- node /path/to/packages/studio-agent-tools/src/mcp.mjs --project /absolute/path/to/site
```
前提是 Studio 正在运行、agent 持续调用 `studio_next`；README 明确说没有东西能唤醒已停止监听的 agent。Vite 项目可加开发适配器：
```js
import { unparalleledStudio } from 'unparalleled/studio/vite';

export default {
  plugins: [unparalleledStudio()],
  server: { host: '127.0.0.1' }
};
```
仅本地 HTTP 且 Vite 自己持有 server；不要拿静态服务替代 React/Next/Nuxt 的开发服务器。

## 对应的研究问题
- 能力发现：可把 UI/网站设计从“给一句提示”推进到产品证据→设计契约→代表性 specimen→实现→截图审查→修复的闭环；还能让 agent 自查模板化视觉痕迹、生成对比度检查和设计 token。
- 任务匹配：明确区分应用型 UI 与公开网站两类任务；框架选择要求基于产品需求、现有代码、托管和产出给一个可信替代方案及取舍；2D/3D/动效管线按任务选择，Blender、图像生成、Remotion 是任务依赖能力，不是安装器强装依赖。
- 条件供给：需要 Node 20+、受支持 agent、项目源码可读写、Playwright/浏览器、可运行页面；Studio 需要本地 server/agent 工具或 MCP；用户要提供 brief、品牌/既有约束和 specimen 审阅反馈。安装器不碰权限，source-edit 是单独能力。
- 主动推进：Studio 有持久请求队列、`next --wait`、lease/renew/reply，页面刷新或引擎重启后请求仍在；截图审查可按轮次重复执行。但它是“agent 持续轮询”的半主动，不是无人值守自动推进。
- 效果验证：五宽度 + reduced motion 截图、`report.json` 模板痕迹、前后对比、严重度/证据/修复/复测账本、对比度检查、source hash 校验、lease/undo 和实际验收检查。README 也承认脚本结果本身不证明设计质量。

## 与已有做法的关系
清单中“Agent skills”是 adopt，这个仓库就是可安装 agent skills 的具体实现，关系最直接。它支持 Claude Code（清单 adopt）作为主路径之一；也支持 Cline、Cursor、OpenCode（清单 watch），可作为这些工具的试点集成；虽然支持 GitHub Copilot，但清单把 Copilot 标为 drop，不建议把它作为引入该技能的主要理由。对已有 Agent skills 做法是补充“设计技能 + 视觉审查 + 本地 Studio 请求队列”，不是替代模型或 IDE。

## 证据与局限
README 给了可执行命令、12 个助手集成、截图审查细节、Studio 的 lease/hash/undo 机制、测试命令 `npm run test:studio`，这些是可操作证据；但仓库只有 36 stars，自述 Studio 是 first working slice，且明确列出若干未实现能力（如专用 IDE 唤醒、多文件事务、自动组件插桩、视觉变体生成、跨 frame 检查、3D 对象拾取等）。README 同时把 MCP transport 列为未实现项，与上文 MCP 用法存在文档不一致，实际可用性需核验。没有客户案例、前后测数据、质量基准或“比人做得更好”的证据。截图 capture 是独立渲染，不保证等于用户当前标签页；运行时源码映射只是线索；Vite 适配器有本地 HTTP 限制；浏览器扩展是开发版；npm 发布前要从 GitHub 安装。设计禁令（禁卡片网格、kanban、药丸控件、通用 SaaS 配色等）是作者主张，适合作为约束试点，不是普遍真理。

## 怎么试、怎么验证
最小试用：选一个低风险内部仪表盘或一个落地页，安装对应技能，让 agent 按“brief→设计契约→一个 specimen→用户审阅→实现→截图审查”走一遍；只在一个页面/一个组件范围内比较。验证指标：每轮 `report.json` 的 flags 数与类型、阻塞/重大问题数、从开始到“无 blockers/majors 且实际验收通过”的轮次和耗时、人工返工次数、横向溢出/运行时错误/对比度失败数、用户是否接受 specimen 与最终页面。若这些指标相对现有做法没有改善，或 agent 只产出漂亮截图但源码修改不可控，就降级为 study 或停止。保留人工验收，不把脚本通过当成设计质量证明。
