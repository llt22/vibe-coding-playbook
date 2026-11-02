# 在关键用户流程合并前用可回放端到端测试留证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：让团队小范围验证一套可回放、可分类、可人工审阅的端到端测试门禁，避免把 AI QA 平台的厂商说法直接当成全量采用理由。
> 先试这一步：先选一条关键用户流程，用纯英文 YAML 写 1 个测试并复用登录/填表 module，本地连续跑多轮看稳定性。
> 最近修订：2026-11-03

## 解决什么问题
关键用户流程的回归不能只靠手工点点点，也不能因为 AI QA 平台宣称能自动写测试、自动修复就直接全量上线。这篇手册给出一条可照做的小范围试用路径：先把一条关键流程写成可放进仓库、可在本地和 CI 运行的端到端测试，用退出码做门禁，失败时看截图/trace 分类，只接受人工审阅后的自动修复；稳定后再考虑让编码 agent 通过 MCP 参与、固化 skills 或试自主 QA 会话。

## 适用与不适用
适用：有 Web 或移动端 UI、已有 CI、能提供测试账号/SSO 和关键流程、有人工审阅测试 YAML 与自动修复 diff 容量的团队。适合重复性强的端到端回归、PR 验证、夜间运行和发布前检查。

不适用：纯 API 服务、没有 CI、没有稳定测试数据或测试账号、不愿审阅自动修复的团队。不要直接全量采用；不要把 auto-heal 当成应用缺陷修复；不要在没有稳定测试数据时先把退出码设为必过门禁。

## 前置条件
- 已有可访问的测试或预览环境、测试账号/SSO、仓库写权限。
- 已有 CI，CI 能访问测试环境和所需密钥。
- 已按官方文档安装 Node 与 Momentic CLI、完成登录；浏览器、项目配置和与 Momentic 的连接需就绪。材料没有给安装命令，不要照猜。
- 先梳理产品术语、业务规则和期望行为，作为知识库输入。
- 有人工审阅测试 YAML 和自动修复 diff 的容量。
- 若要试 MCP 或自主 QA：需配置 Momentic MCP server、托管浏览器或移动设备、组织 MCP server 和 secrets；原文没有给配置片段。

## 操作步骤
做法 A（先做）：第 1-7 步，先给一条关键流程加可回放、可分类、可人工审阅的门禁。做法 B（稳定后可选）：第 8-10 步，让编码 agent 参与写测试、固化应用知识或做探索性 QA。选择方式：目标只是给关键流程加门禁，先做 A；需要编码 agent 参与测试或做探索性 QA，再做 B。

### 做法 A：关键流程门禁（先做）
1. 体检环境。前提：已有可访问的测试或预览环境、CI、仓库写权限，并安装 Node 与 Momentic CLI且完成登录。运行：
```bash
momentic doctor
```
预期：检查 CLI 和 Node 版本、登录、浏览器、项目配置以及与 Momentic 的连接，能明确哪些项未就绪。页面还提到 `--fix` 可清理废弃选项，具体用法以文档为准。

2. 建立产品知识库。前提：先梳理产品术语、业务规则和期望行为。把术语、规则、预期结果写进 Knowledge base；AI 步骤运行时会查相关条目。对会话中产生的新建议先人工审阅，再决定是否加入知识库。预期：减少测试步骤和断言里的业务歧义。

3. 用纯英文 YAML 写关键用户流程。前提：准备测试 URL、测试账号，以及可复用的登录/填表模块文件。测试文件放进仓库，和代码一起评审。原文示例：
```yaml
fileType: momentic/test/v2
id: standard-user-checkout
url: https://shop.momentic.ai
description: End-to-end checkout flow
steps:
- module: ./log-in-username-password.module.yaml
- act: add the momentic backpack to the cart and go to checkout
- module: ./fill-out-personal-info.module.yaml
- assert: the item total matches the amount listed for each item
- click: Finish button
```
写法要点：步骤和断言用 plain English；重复流程抽成 module；断言写清期望结果。预期：测试可读、可复用，并能在仓库中评审。

4. 本地运行同一套测试。前提：项目配置和浏览器已就绪。运行：
```bash
momentic run
```
页面还给出两个可选能力：`momentic run --from-snapshot` 可回放测试快照；`--parallel auto` 可按主机 CPU 数自动设置并行度。预期：先在本地确认流程能跑通，并连续跑多轮观察稳定性。

5. 接入 CI，用退出码做门禁。前提：CI 能访问测试环境和所需密钥。在 CI job 里执行同一命令，把 CLI 退出码作为合并或部署前的 required check。原文没有给具体 CI YAML，不要照猜；先非阻断运行，稳定后再设为必过。
```bash
momentic run
```
预期：每次 PR 或部署前都留下同一套端到端测试的运行结果。

6. 失败后先看证据再分类。前提：拿到失败 run 的 ID 或 URL。检查失败步骤、截图和 trace，把失败分成应用 bug、测试不稳定、环境问题三类，再路由给对应处理人。可用：
```bash
momentic ai classify --interactive
```
预期：避免把应用 bug 当成 flake 直接重跑，也避免把环境问题误判为产品缺陷。

7. 只接受人工审阅后的自动修复。前提：确认失败是 UI 文案或控件变化导致，而不是应用 bug。运行：
```bash
momentic ai heal
```
它会提议测试文件修复；审阅 diff，应用后重跑验证。页面示例的改动是：
```diff
- click: Finish button
+ click: Place Order button
```
预期：只修测试选择器或文案变化，不掩盖真实缺陷。不要把 auto-heal 用来掩盖应用 bug。

### 做法 B：稳定后可选
8. 让编码 agent 通过 MCP 参与测试。前提：配置 Momentic MCP server；原文没有给 MCP 配置片段，按官方文档配置。把变更后的流程交给编码 agent，让它通过 MCP 编写测试、在实时会话中检查，并把 YAML 和代码一起提交。页面提到 stdio MCP server 可启动/终止浏览器会话、拼接步骤、运行步骤区间；移动端 MCP 可从 Claude Code 或 Cursor 驱动模拟器。预期：agent 产出可评审测试，而不是自动放行。

9. 把反复出错的应用知识固化成 skills。前提：先观察 agent 在你们应用上反复犯什么错。把纠正规则提交到 `.momentic/skills`；页面说 explore、triage、result-classification agents 运行时会读取。预期：减少同类错误重复出现。

10. 可选：试自主 QA 会话。前提：有托管浏览器或移动设备，且组织 MCP server 和 secrets 可挂到会话。可从 coding agent、应用、PR 评论或 qa CLI 启动；按 low/medium/high/max 选投入，页面说大约从 15 分钟一个 PR 到 2 小时整个应用；单独 agent 会先复现每个功能 bug 再报告。预期：作为补充探索，报出的 bug 仍需人工复核，不替代第 5 步门禁。

## 怎么判断变好了
最小试用：选一条关键流程，例如登录到结账或核心创建流程，写 1 个 YAML 测试并复用 1-2 个 module；本地连续跑多轮看稳定性；接入 CI 先非阻断，观察一段时间；只对稳定测试设 required check。同时开启失败分类，人工复核分类是否正确；开启自动修复，但只接受审阅后的 diff。

可观察指标：测试编写时间、CI 运行时长和并行效果、flake 率、误报率、自动修复接受率、每次 UI 变更后的维护时间、pre-merge/pre-deploy 捕获的真实 bug 数、缺陷逃逸率、发布频率。

对照方法：同一流程保留原有测试或手工检查做基线；用历史已知 UI bug 回放看捕获率；人工复核 AI 报的 bug 是否真实、分类是否正确。

试多久：材料没有给出固定试用时长；按原文的“先非阻断观察一段时间”，至少覆盖多次代码变更和 UI 变更，直到能判断 flake 率、误报率和维护成本，再决定是否设为必过。若误报长期偏高、维护成本不低于原有测试，或自动修复开始掩盖真实缺陷，就不要把它设为门禁。

## 常见坑
- 把厂商页面、客户 quote 和自报 benchmark 当成独立第三方验证，直接向团队承诺同样的效果。
- 跳过小范围试用，直接全量采用或全量替换原有测试。
- 失败后不看失败步骤、截图和 trace，直接重跑或直接改测试。
- 用 auto-heal 掩盖应用缺陷，而不是只处理 UI 文案或控件变化。
- 误报长期偏高仍把退出码设为必过门禁，导致团队绕过或长期忽略红灯。
- 没有稳定测试数据、测试账号/SSO 或 CI 访问权限就上线门禁。
- 没有人工审阅测试 YAML 和修复 diff 的容量，却开启自动修复。
- 原文缺失安装、CI 和 MCP 配置细节时照猜命令或配置；应先查官方文档。
- 纯 API 服务、没有 UI 的场景直接套用这套端到端流程。
- 只试自主 QA 会话的探索性发现，却没有第 5 步的稳定门禁和人工复核。

## 证据与来源
以下依据本次调研《Launch HN: Momentic (YC W24) – Agents that catch bugs by using your app》。

- 第 1、3、4 步（环境体检、纯英文 YAML、本地运行）：页面明确给出 `momentic doctor`、`momentic run`、`--from-snapshot`、`--parallel auto` 和 YAML 示例，并说明 CLI 可在本地和 CI 运行；安装命令和具体 CI YAML 原文未给。
- 第 2、6、7 步（知识库、失败分类、自动修复）：页面列出 Knowledge base、失败分类和 auto-heal 机制，给出 `momentic ai classify --interactive`、`momentic ai heal` 命令及 heal diff 示例；分类与修复仍应人工复核。
- 第 5 步（CI 退出码门禁）：页面说明用 CLI 退出码做合并或部署前检查；先非阻断、稳定后再设必过，是本次调研建议，不是页面验证结论。
- 第 8、9、10 步（MCP、skills、自主 QA）：页面列出 stdio MCP server、移动端 MCP 从 Claude Code 或 Cursor 驱动、`.momentic/skills`、自主 QA 会话和 low/medium/high/max 投入档；MCP 具体配置片段原文未给，自主 QA 的时长和投入档是页面说法。
- 页面数据：77,813 个测试创建、70,607,819 次测试运行、339,166 次变更验证、80,290 个 PR 验证、8,932,104 次自动修复、117,010 个 bug 捕获；QA Bench 使用 1,396 个标注 bug，Mo 找到约 269 个标注 bug，次优 agent 约 86 个；客户 quote 数字包括 6.3x 并行、3x 写测试更快、110 个 prompt 14 分钟完成、每日测试执行从 7 小时降到 30 分钟、500+ 手工用例被替代、8x 发布频率、每月节省 40+ 工程小时、发布周期快 80%、测试生成时间降 75%、缺陷逃逸率降 89%、生产事故降 85%/30%、E2E 测试创建快 6x。这些是厂商页面、客户 quote 和自报 benchmark，不是独立第三方验证；累计计数没有统计口径，客户数字缺少方法和样本说明。
- 页面 bug 案例（新设备 2FA 被跳过、移动端建页流程断掉、司机 ETA 卡在 calculating、锁屏后计时器重置、结账时已存卡被丢弃、分页后筛选被清空、促销码在最后一步被拒、字幕语言错误、一天抓到 12 个 legacy API 问题）是案例叙述，不是可复现实验。
- 本次建议中小范围试用而非全量采用、先非阻断再设必过、最小试用与判断指标、不要把 auto-heal 用来掩盖真实缺陷，均属调研结论或作者主张，需要在你们环境中验证。

## 依据的调研

- [Launch HN: Momentic (YC W24) – Agents that catch bugs by using your app](../research/radar/2026-11-03/9675-launch-hn-momentic-yc-w24-agents-that-catch-bugs-b.md)：值得一试，建议在一条关键用户流程上小范围试用 Momentic 的“纯英文 YAML 测试 + CI 退出码门禁 + 人工审阅自动修复”流程，而不是直接全量采用；理由是该页给出了可照做的测试编写、运行、失败分类和修复步骤，但效果数据主要来自厂商自述，需先验证误报率和缺陷捕获率。
