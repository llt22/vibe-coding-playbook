# ratomirjovanovic/pandaward

- 结论：**值得一试**。建议在代码安全评估这一垂直场景小范围试用：用 Claude Code 安装 PandaWard 插件，先跑被动扫描、证据账本和修复复测，再决定是否启用人工批准的运行时测试。理由是有完整的安装、运行、复核、回归和证据校验步骤，但项目仍是 alpha、适配器未验证、内置规则对 Java 注入基准为 0.00，不能把结果当成安全结论。
- 原文：https://github.com/ratomirjovanovic/pandaward
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T12:02:19.819Z

## 是什么
PandaWard 是一个本地、基于证据的应用程序安全评估工具，形态是独立 Go CLI 加 Claude Code 插件。它默认只读仓库，不运行安装脚本、Makefile 或构建，不跟随符号链接，也不向目标发流量；需要联网的测试必须有人工填写并在交互终端批准的 scope manifest，AI agent 不能批准。

它维护一个本地 SQLite ledger：记录每个可检查控制项、检查方式、脱敏证据，以及无法判定的控制项。Finding 跨运行指纹化，只有复测不再看到问题时才从 `OPEN` 变为 `REMEDIATED`；文件移动或改名会保留 finding ID 和人工 triage 状态。输出支持 HTML、Markdown、JSON、SARIF、CSV。材料来自仓库 README，未提供实际运行记录或独立评测。

## 具体做法
1. 安装 Claude Code 插件。前提：已安装 Claude Code；macOS/Linux 与 Windows 只能选一个插件。

```text
/plugin marketplace add ratomirjovanovic/pandaward
/plugin install pandaward@pandaward            # macOS and Linux
# 或
/plugin install pandaward-windows@pandaward    # Windows
```

也可以从终端执行：

```sh
claude plugin marketplace add ratomirjovanovic/pandaward
claude plugin install pandaward-windows@pandaward   # Windows；macOS/Linux 用 pandaward@pandaward
```

安装后重启 Claude Code，`/mcp` 应列出 `plugin:pandaward:pandaward` 为 connected。更新时执行：

```sh
claude plugin marketplace update pandaward
claude plugin update pandaward-windows@pandaward   # 或 pandaward@pandaward
```

2. 在项目里一键启动完整评估。前提：Claude Code 已连上 PandaWard MCP。

```text
/pandaward:start
```

README 说明该命令会扫描项目、让 specialist reviewers 复核自动化无法判定的部分、做 triage、生成修复计划并写报告，带实时 checklist；结束时问一个问题：修复计划、记录 triage 结果、安装缺失 scanner，然后按选择执行，并在每次修复后复测。后续代码变化时会在会话中自行重测。改变 finding 状态的命令仍会显示确认提示；网络测试始终需要本人在终端批准 scope。

也可单独调用技能：

```text
/pandaward:init
/pandaward:scan
/pandaward:review
/pandaward:fix-plan
/pandaward:retest
/pandaward:report
/pandaward:status
```

3. 或者用 CLI 跑同一流程。前提：Go 安装方式需要 Go 1.26+；release 二进制无运行时依赖。

macOS/Linux 可用 brew：

```sh
brew tap ratomirjovanovic/pandaward https://github.com/ratomirjovanovic/pandaward && brew install ratomirjovanovic/pandaward/pandaward
```

Windows 可用 scoop：

```powershell
scoop bucket add pandaward https://github.com/ratomirjovanovic/pandaward; scoop install pandaward/pandaward
```

或用 Go：

```sh
 go install github.com/ratomirjovanovic/pandaward/cmd/pandaward@latest
```

在项目目录运行：

```sh
pandaward assess          # init、带进度扫描、报告和摘要
pandaward findings        # 查看 finding
pandaward fix-plan        # 生成有序修复步骤
```

4. 人工记录判定，不要让模型直接改状态。前提：已有 finding ID。

```sh
pandaward findings false-positive PW-0007 --by "Jane" --note "constant input, not user controlled"
pandaward findings accept-risk   PW-0003 --by "Jane" --note "internal tool" --expires 2027-03-01
pandaward findings apply --file decisions.json --by "Jane"   # 批量，全有或全无
```

`decisions.json` 是数组，元素含 `finding_id`、`action`、`note`、`expires`；`action` 为 `confirm`、`false-positive`、`accept-risk` 或 `reopen`，`accept-risk` 必须带 `expires`。每个条目写入前都会检查，一条坏条目会拒绝整批。

5. 如要做网络测试，先填 scope 并人工批准。前提：只对有权测试的目标；`staging-active` 需要 ZAP 和 Java 17+；批准必须来自交互终端。

```sh
pandaward scope init                       # 写入 .pandaward/scope.yaml，初始不可用
# 填写 owner、书面许可引用、purpose、targets、limits、acknowledged: true
pandaward scope approve --by "Jane"        # 仅交互终端，绑定文件 SHA-256
pandaward test --profile production-observe
pandaward test --profile staging-active    # staging 或本地目标，需要 ZAP
```

编辑 `scope.yaml` 会使批准失效；批准还绑定项目外的每用户 key，随仓库带来的 scope 或 ledger 不算已批准。引擎最多按配置速率向列出的 origin 发 `max_requests_total` 个 GET，不跟随重定向，连接时检查每个解析地址；loopback、私有、link-local 地址除非 manifest 明确允许本地 fixture，否则拒绝；云 metadata 地址始终拒绝。

授权检查的配置示例：

```yaml
identities:
  - {name: alice, tenant: acme, header: Authorization, value_env: PANDAWARD_ID_ALICE}
  - {name: bob,   tenant: beta, header: Authorization, value_env: PANDAWARD_ID_BOB}
  - {name: carol, tenant: acme, header: Authorization, value_env: PANDAWARD_ID_CAROL}
  - {name: alice-logged-out, tenant: acme, header: Authorization, value_env: PANDAWARD_ID_OLD, revoked: true}
authorization_checks:
  - {name: acme invoice, kind: object,   method: GET, path: /api/invoices/inv_acme_1, allowed: [alice]}
  - {name: user admin,   kind: function, method: GET, path: /admin/users,            allowed: [carol]}
```

凭据只通过环境变量提供，不写进文件；缺少凭据变量会在第一个请求前停止。授权检查只允许 GET 和 HEAD，不改数据、不需要清理；证据只保留状态、大小、content type 和 body hash，不保留 header、body 或凭据。

6. 移动端运行时检查。前提：Android 是可调试测试构建并运行在 emulator 上；iOS 是运行在已启动 simulator 的测试构建，且为 macOS；真实设备会被拒绝。

```yaml
# .pandaward/config.yaml
runtime:
  android_package: com.acme.shop
  ios_bundle_id: com.acme.shop
```

```sh
pandaward test --profile local-runtime
```

Android 使用 `adb` 的 `emulator-*` serial，并要求 `ro.kernel.qemu=1`；通过 `run-as` 读取 `shared_prefs`，仅对 debuggable 构建有效。iOS 使用 `xcrun simctl get_app_container booted`，只接受 CoreSimulator 内容器，再读 preferences plist。凭据类 key 下非空值记为 K-003 或 L-002，只记录 key 名，不记录值。

7. 在 CI 和提交前加门禁。前提：GitHub Actions 需要 `contents: read` 和 `security-events: write`；action 版本 v0.1.3 或更高，SHA 要 pinned。

```yaml
permissions:
  contents: read
  security-events: write
steps:
  - uses: actions/checkout@<pinned-sha>
  - id: pandaward
    uses: ratomirjovanovic/pandaward@<pinned-sha>
    with:
      fail-on: high
      new-only: "true"
  - if: always()
    uses: github/codeql-action/upload-sarif@<pinned-sha>
    with:
      sarif_file: ${{ steps.pandaward.outputs.sarif-file }}
```

`new-only` 会在单独 worktree 扫描 base commit，只对指纹为新的 finding 计数。提交前可用 pre-commit：

```yaml
repos:
  - repo: https://github.com/ratomirjovanovic/pandaward
    rev: v0.2.7
    hooks:
      - id: pandaward-system
```

先在项目里跑一次 `pandaward init`。hook 执行 `pandaward scan --quiet --fail-on high`，存在 open 的 high 或 critical finding 时阻止提交；它扫描工作树，不只扫描 staged 文件。

8. 如不需要自动重测，可在 `.pandaward/config.yaml` 关闭：

```yaml
hooks:
  auto_retest: false
```

## 对应的研究问题
- 能力发现：README 明确把完整评估编排、只读 specialist reviewers 复核、triage、修复计划、报告和变更后重测交给 Claude Code 插件；这展示了 AI 可以做的不仅是“跑扫描”，还包括串联本地工具、读取账本、组织复核和回归。
- 任务匹配：确定性静态检查交给 CLI 和内置/可选适配器；需要数据流分析的 Java 注入应交给 Semgrep 等工具；网络测试交给经人工批准的 ZAP；移动端存储检查交给 adb/simctl；AI 负责编排、复核和解释，人工负责批准 scope 和记录判定。
- 条件供给：需要项目读权限、`.pandaward/` 配置与 SQLite ledger；可选 scanner（gitleaks、semgrep、osv-scanner、trivy、apktool、MobSF、ZAP）；网络测试需要填好的 `scope.yaml` 和交互批准；授权检查需要测试身份的环境变量；CI 需要 pinned action 和 SARIF 上传权限；移动端需要 emulator/simulator 和对应工具。
- 主动推进：hooks 会在 Claude 编辑文件后标记 stale，并在回合结束时跑 changed-only passive retest，最长 40 秒，把新出现或重开的 finding 交回 Claude；`/pandaward:start` 会在每次修复后复测；CI 可在 PR 上用 `new-only` 只拦新增问题；pre-commit 可在提交前拦截 high/critical。SQLite ledger 让状态跨会话保留。README 没有描述按时间计划触发的定时任务。
- 效果验证：ledger 用 `PASS`/`FAIL` 作为决定性结果，`BLOCKED`、`ERROR`、`SUSPECTED`、`INCONCLUSIVE`、`STALE` 都不算安全；finding 有指纹和生命周期，复测不再出现才变 `REMEDIATED`；证据是脱敏、SHA-256 寻址的记录；`pandaward diff` 看两次评估差异，`pandaward evidence verify` 校验证据，`pandaward export --bundle` 和 `verify-bundle` 校验导出包；`pandaward benchmark` 输出每条规则的 TP/FP/FN/TN 和 precision/recall，`pandaward selftest` 用敌意 fixture 检查是否被仓库内容带偏。

## 与已有做法的关系
清单中有 Claude Code（adopt）。PandaWard 以 Claude Code 插件和本地 stdio MCP server 的形式接入，补充安全评估技能、只读 specialist agents、hooks 和证据账本；它不是替代 Claude Code，而是在 Claude Code 上增加一个可审计的垂直工作流。清单中没有其他安全评估或证据账本类条目。

## 证据与局限
README 给出的可验证材料包括：可选工具适配器在 CI 中按 gitleaks 8.30.1、semgrep 1.182.0、osv-scanner 2.7.0、trivy 0.76.1 测试，扫描捆绑的漏洞 fixture，适配器未完成或 parser 漏掉预期 finding 时 CI 失败；`pandaward benchmark` 每次 release 附 `benchmark.json`；`pandaward selftest` 在 CI 和每次 release 运行，失败即阻止。README 还展示了捆绑 demo 的扫描结果：38% decisive coverage、33 个 open findings，findings explorer 中 20 个 confirmed、11 个 suspected，以及 critical 的 `pull_request_target` 和硬编码 secret 案例。这些是项目自带 fixture 的演示数据，不是独立真实项目评测。

关键局限：项目标为 alpha；所有适配器当前是 `implemented_unvalidated`；每条内置规则在 benchmark 中只有 1 个漏洞案例和 1 个安全案例，因此没有任何规则达到“至少 3 个漏洞案例和 3 个安全案例、precision/recall 均不低于 0.95”的 `implemented_and_benchmarked` 标准；在公开 OWASP Benchmark for Java 上，内置规则得分 0.00，因为它们只匹配单行、不跟踪数据流。README 明确说不能用它证明应用安全，`BLOCKED`、`UNSUPPORTED`、`SUSPECTED`、`INCONCLUSIVE`、`ERROR`、`STALE` 都不代表安全；登录/重置/MFA、API 合同与运行时对比、针对 LLM 端点的 prompt-injection 测试目前标为 `UNSUPPORTED`；报告不是认证、attestation、法律意见或独立签署的渗透测试。安全默认、隐私、密钥不泄漏等表述在材料中属于作者主张，未见独立验证。适用条件是自己的代码、本地评估、获得授权的测试目标；不适合把结果直接当作合规或安全保证。

## 怎么试、怎么验证
1. 选一个自有、非生产仓库，先只装 Claude Code 插件或 CLI，跑被动扫描：`/pandaward:start` 或 `pandaward assess`。记录 `pandaward status` 的 decisive coverage、open findings、confirmed/suspected 数量，作为基线。
2. 用 `pandaward fix-plan` 或 `/pandaward:fix-plan` 生成有序修复；每修一项后跑 `pandaward retest --changed`，或让 hooks 自动重测；用 `pandaward diff` 看新增、重开、修复、移动、waived 的 finding。
3. 对确认的 finding 跑 `pandaward evidence verify`；需要交给他人复核时跑 `pandaward export --bundle out.zip`，再用 `pandaward verify-bundle out.zip` 复算哈希。
4. 判断是否改善：确认的高危/严重 finding 被修复且复测不再出现；决定性覆盖率上升；人工 triage 的误报率不升高；没有新增回归；从扫描到 triage/修复的时间下降。不要把“0 findings”当改善，因为 `BLOCKED`、`SUSPECTED`、`INCONCLUSIVE` 不算安全。
5. 若要评估规则本身，跑 `pandaward benchmark` 和 `pandaward selftest`；但 benchmark 是项目自有语料，数字只描述这些案例，不代表真实世界准确率。
