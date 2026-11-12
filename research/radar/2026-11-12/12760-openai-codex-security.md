# openai/codex-security

- 结论：**值得一试**。建议先在一个真实仓库上按 README 的命令跑通 `cs login` + `cs scan .`，再用 GitHub Actions 定时扫描和修复后复扫来验证收益；原文给出了可直接照做的 CLI、SDK 和 Action 步骤，但效果只有厂商自述，且部分能力受 Trusted Access/Daybreak 等访问条件限制，尚不足以直接 adopt。
- 原文：https://github.com/openai/codex-security
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T06:28:31.226Z

## 是什么

Codex Security 是 OpenAI 提供的代码安全审计工具，形态有三种，同一套能力可以分别从三个入口使用：

- 在 Codex 会话中通过 Security 插件调用安全 workflow；
- 在终端用 `@openai/codex-security` CLI（命令名 `cs`，别名 `codex-security`）；
- 在自动化中用 TypeScript SDK、GitHub Action、Docker Compose 批量扫描。

README 声明的能力包括：扫描整个仓库、指定路径或 Git 变更；对候选发现做验证（validate）、生成补丁、验证已有修复；生成 `SECURITY.md` 策略与威胁模型；对发现去重、按自定义 rubric 评估严重性、从源码和 Git 历史推荐 owner；导入第三方扫描器结果；与 Linear、Jira、GitHub 联动；导出 SARIF/JSON/CSV；在 CI 与容器中批量扫描。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**1. 确认环境前提**
- Node.js 22.13.0+（限 22.x）或 Node.js 24.x/26.x；Python 3.10+；Python 3.10 还需安装 `tomli`。
- 需要有仓库的读取权限；CI 场景需在扫描进程环境中设置 `OPENAI_API_KEY` 或 `CODEX_API_KEY`；无头机器要走 device 或 SSH 登录（见 CLI 文档的 authentication 一节）。
- 部分网络安全请求与受保护的 findings 需要 Trusted Access for Cyber；有 Daybreak 权限的账号需按文档选择 program。

**2. 安装 CLI 并登录**

```bash
npm install --global @openai/codex-security
cs login
```

如果 `cs` 与已有命令冲突，改用 `codex-security`；不想全局安装或 npm 报 `EEXIST` 冲突时，把命令中的 `cs` 换成：

```bash
npx @openai/codex-security
```

**3. 跑第一次扫描（在仓库目录下执行）**

```bash
cs scan .
```

扫描完成后打开终端中 **REPORT** 路径指向的 Markdown 文件；在同一仓库执行 `cs scans show` 可再次找到最近一次完成的扫描。读报告时重点看源码证据与 exclusions（排除项）以及覆盖范围限制。

**4. 按需选择扫描范围与模式**

```bash
# Scan selected paths.
cs scan . --path src --path tests

# Scan committed changes from a base revision to HEAD.
cs scan . --diff origin/main

# Run a deep scan of the repository.
cs scan . --mode deep
```

给标准扫描加一个建议性时间上限（原文为 advisory 15 分钟）：

```bash
cs scan . --max-time 15
```

`cs --help` 看全部命令，`cs scan --help` 看扫描选项、成本上限和扫描后打补丁。跨仓库的系统审查和可断点续跑的批量扫描见文档对应小节。

**5. 在 Codex 会话里用插件（需要启用 Codex Security 插件并打开仓库）**

```
Run a Codex Security scan on this repository, focusing on authentication and
> authorization. Return the saved report, source evidence, and coverage limits.
```

扫描会保存报告与 findings；读报告中的源码证据与排除项后，再请求补丁，或让 Codex 验证一个已有修复。

**6. 生成或更新 SECURITY.md（扫描会复用根目录与组件级 SECURITY.md）**

```bash
cs policy .
cs policy . --path services/api --knowledge-base architecture.md
```

前提与注意：草稿保存在仓库之外，不改动现有文件；先看 diff 与说明、编辑草稿，然后只把 `SECURITY.md` 复制到命令显示的 **Policy target**；架构与威胁模型文档留在仓库外。若命令提示策略已是最新，则无需复制。若 `.github/SECURITY.md` 或 `docs/SECURITY.md` 里有漏洞上报说明，改写策略时要保留——这些位置不会自动成为全仓库扫描依据。

**7. 导出威胁模型（不重新跑分析）**

```bash
cs export --scan SCAN_ID --artifact threat-model --output threatmodel.md
```

省略 `--scan` 则使用当前仓库最近一次完成的扫描。

**8. 接入 GitHub Actions 做每周扫描（GitHub 托管 Ubuntu）**
1. 把 OpenAI API key 加为仓库 secret `CODEX_SECURITY_API_KEY`。
2. 把 weekly workflow 示例（`github-action/examples/repository.yml`）复制到 `.github/workflows/codex-security.yml`，并把其中的 `REPLACE_WITH_REVIEWED_COMMIT` 换成 Action 发布中经过审查的分发 commit SHA。
3. 想在下个定时点前试跑：打开 **Actions → Codex Security repository → Run workflow**。

该示例的估算限额是每次扫描 5 美元，只报告 findings 而不让 job 失败；进行中的请求可能超出限额。

**9. 用 TypeScript SDK 做自动化**

```bash
npm install @openai/codex-security
```

```ts
import { CodexSecurity } from "@openai/codex-security";

const security = new CodexSecurity();

try {
  const result = await security.run("/path/to/repository");
  console.log(result.reportPath);
} finally {
  await security.close();
}
```

深度扫描配置、验证、严重性分级、owner 建议与结果处理见 SDK 文档。

**10. 需要共享扫描历史时固定状态目录**

关联的 Git worktree 在使用同一个 Codex Security 状态目录时共享扫描历史与已保存 findings；保持 `CODEX_SECURITY_STATE_DIR` 稳定，以保留共享历史和登录范围。

**11. 可选：容器化批量扫描与多 provider**
- 用仓库自带的 Docker Compose 配置扫描一组仓库，跨运行保留结果和认证；workflow runner 可在容器中分阶段跑 CLI，并可连接单独部署的 findings 服务。
- 扫描支持 OpenAI、Amazon Bedrock、OpenRouter、Fireworks AI、Cheaper Inference；Bedrock 用 AWS 凭证，不需要单独 OpenAI 登录；其余需设置对应 provider 的 API key 并选择受支持的模型。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：原文直接给出了一类容易被忽略、可交给 AI 的工作：代码安全审计，不只是“找漏洞”，还包含验证候选发现、生成补丁、验证已有修复、起草 `SECURITY.md`、保存并导出威胁模型、从源码与 Git 历史推荐 owner、给发现去重并按自定义 rubric 评级。这些都可作为“AI 还能接哪些活”的具体候选。

**2. 任务匹配**：原文按使用场景给了三条路径：交互式排查放在 Codex 会话（插件 + 自然语言提示词，可指定聚焦 authentication/authorization）；本地单次扫描用 CLI；周期性与规模化用 GitHub Action、SDK、Docker Compose 批量扫描。同时给了模型 provider 的选择面（OpenAI / Bedrock / OpenRouter / Fireworks AI / Cheaper Inference），并说明 Bedrock 用 AWS 凭证、不需 OpenAI 登录。

**3. 条件供给**：需要的输入包括仓库读权限、`OPENAI_API_KEY` 或 `CODEX_API_KEY`（CI）、登录态（无头机器走 device/SSH 登录）、既有的根级与组件级 `SECURITY.md` 指导、可选的 `--knowledge-base architecture.md` 架构资料；状态供给上要求 `CODEX_SECURITY_STATE_DIR` 保持稳定以共享历史。成本侧有 `--max-time` 与 `cs scan --help` 中的 cost limits，GitHub Action 示例给的是每次 5 美元估算上限。

**4. 主动推进**：最明确的是 GitHub Actions 的每周定时仓库扫描，可手动触发试跑；此外支持在 CI 与容器中自动扫描、跨仓库/跨组件批量扫描（一次可断点续跑的 campaign）、`--diff origin/main` 只扫提交变更，适合挂到 PR/提交事件上。

**5. 效果验证**：工具内置验证环节——验证候选 findings、生成 patch、验证已有修复；报告带源码证据与 exclusions/coverage limits，可据此判断结论的覆盖边界；发现可去重、按自己的 rubric 评严重性；结果可导出 SARIF/JSON/CSV 或发布到 Cloud，接入 Linear/Jira/GitHub 跟踪。这些都是“判断是否真的改进了结果”的可用抓手。

## 与已有做法的关系

清单中只有一条相关条目：`X @OpenAI`（source，状态 watch）。没有同类安全扫描/审计工具条目可直接对照。

关系与差异：本工具与该源同属 OpenAI 生态，可视为该 watch 条目下一个“有具体命令与自动化路径”的落地产出，而不是又一条资讯。相对清单现状，它把“关注 OpenAI 动向”推进到了“可在自己仓库上跑出报告并接入 CI”的层面；但它是否值得从 watch 升级为常规做法，取决于小范围试用的验证结果。

## 证据与局限

**原文给出的具体内容**：环境版本要求（Node 22.13.0+/24.x/26.x、Python 3.10+、tomli）、CLI 与 SDK 的安装命令、`cs scan` 的范围/模式/时间选项、`cs policy` 与 `cs export` 的确切用法、GitHub Actions 的三步接入与 `CODEX_SECURITY_API_KEY` secret 名、SDK 的可运行代码片段、`CODEX_SECURITY_STATE_DIR` 的作用、支持的 provider 列表。仓库热度指标为 11923 stars、当日新增 52。这些属于“可照做”的部分。

**只是作者/厂商主张、没有数据支撑的部分**：没有任何 benchmark、真实漏洞检出案例、误报率/漏报率、平均成本或耗时统计；唯一带数字的成本项是 GitHub Action 示例的“估算每次 5 美元限额”，原文同时说明进行中的请求可能超出限额。因此“能改善安全审计结果”目前只是功能声明。

**适用条件与限制**：
- 需要付费 API 额度与登录；CI 需要 secret；部分网络安全请求和受保护 findings 需要 Trusted Access for Cyber，有 Daybreak 权限的账号还需显式选择 program——即并非所有账号都能用全部能力。
- 覆盖范围天然有限：原文反复要求读报告中的 exclusions 与 coverage limits，说明扫描有明确排除项；`--max-time` 是建议性时间预算，Deep Scan 还有其上限。
- 报告、威胁模型、策略草稿等产物需要人工复核后才落库（草稿存仓库外、只复制 `SECURITY.md`），说明流程设计上仍以人为最后关口。
- 大量细节在 docs 链接里（agent-workflows、cli.md、sdk.md、github-action/README.md、docker/README.md），本次材料只覆盖 README 层面，落地时需按链接补读。
- 清单侧证据薄弱：只有一条 watch 级来源条目，无同类的效果对比基线。

## 怎么试、怎么验证

**最小试用（半天到一天）**
1. 选 1 个有真实业务代码、且已知若干历史安全问题（或有内部安全 backlog）的仓库，记录已知问题清单作为基线。
2. 按第 1–3 步装 CLI、`cs login`、`cs scan .`，先跑一次默认 Standard 扫描；再对核心模块跑一次限定范围扫描：

```bash
cs scan . --path src --max-time 15
```

3. 逐条人工复核报告 findings：标注“确认成立 / 误报 / 无法判断”，并核对报告中的 exclusions 是否漏掉了你关心的目录。
4. 对确认成立的 1–2 条请求补丁并应用，然后用同一命令复扫，看该条是否消失、是否引入新 finding。
5. 再用 `cs scan . --diff origin/main` 模拟增量扫描，看是否只覆盖变更范围、是否漏报。
6. 若第 1–5 步结果可接受，再按第 8 步接入每周 GitHub Action（先用 workfl 试跑，确认成本落在估算附近）。

**判断是否改善的指标（都用本次试用自采数据，不引用厂商数字）**
- 精确率：报告 findings 中“人工复核确认成立”的比例。
- 召回：基线已知问题清单中被报告命中的比例。
- 修复闭环率：确认成立的 findings 中，生成补丁并复扫确认消失的比例。
- 复扫噪声：修复后复扫新增的、经复核为误报的条数。
- 人时成本：从扫描到完成人工复核所花的时间，对比不用工具时同一仓库的一次人工审计耗时。
- 金额成本：单次扫描实际花费，对比 GitHub Action 示例的“估算每次 5 美元”量级。
- 稳定性：连续两次同范围扫描的 findings 差异（去重后新增/消失条数），用来判断结果是否可复现。

**判定门槛建议**：若确认成立比例与已知问题召回都达到可接受水平、且复扫能确认修复闭环，再把它写进手册作为“安全审计”类工作的推荐做法；若误报过多或覆盖范围（exclusions）恰好避开关键代码，则降级为 study，只借鉴“扫描→验证→打补丁→复扫→导出 SARIF 接入 CI”这一流程骨架。
