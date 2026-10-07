# openqodex/openqodex

- 结论：**值得一试**。可以在一台 macOS/Linux 机器上用 `npx openqodex demo` 加一个非关键仓库的 `npx openqodex init` 做小范围试用，按“报告是否退出码 2、每条扫描告警是否有理由、每个改动行是否送到 reviewer 面前”三点验收；理由是它把“确定性扫描器 + 独立 LLM 评审逐条核对 + 完整性断言”做成了一条命令的流程，可复制的命令和配置原文都给全了，但项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1–3 分钟且消耗你自己的 Claude Code/Codex 额度，还不够格直接当默认门禁。
- 原文：https://github.com/openqodex/openqodex
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-07T10:47:16.792Z

## 是什么

OpenQodex 是给 Claude Code 和 Codex 用的开源 AI 代码评审工具，在 push 之前跑。一条 `openqodex review` 会：算出你的改动（未推送的提交 + 所有未提交内容）→ 只运行与改动文件匹配的扫描器、只保留落在改动行上的告警 → 启动一个独立的 Claude Code 或 Codex 进程作为 reviewer，让它读一份冻结的改动副本 → 用脚本检查它的回答 → 打印一份报告。除 Claude Code 或 Codex 外，不需要别的 key、账号或服务器。

内置 13 个扫描器，每个都 pin 到一个版本，只在改动里含有它读的文件时才跑。报告同时输出到终端和 `report.md`、`report.json`、`report.sarif`。

## 具体做法

**1. 先确认前提（缺一项就走不通）**
- Node 22 或更新 + git；macOS 或 Linux（Windows 用 WSL）。
- 装好并登录 Claude Code 或 Codex——reviewer 只能是这两个。缺了只能跑 `openqodex scan`（只扫描）或 `review --agent`（让你所在的 agent 自己评审）。
- 要跑 brakeman / rubocop 需要 Ruby 2.7 或更新，golangci-lint 需要 Go。OpenQodex **不**替你装语言运行时，缺了会在报告里列为未安装并给出原因。
- 首次运行要下载扫描器；osv-scanner 需要能访问 osv.dev。

**2. 先看 demo（第一次建议这么做）**
```
npx openqodex demo
```
它会建一个小仓库、种入已知 bug 并扫描，不碰你自己的代码。

**3. 人的安装**
```
npx openqodex init
```
它会找出机器上的 Claude Code、Cursor、Codex CLI 和 Cline，打印它将要写入的每个文件并只问一次。装完直接评审你当前的改动，或在没有改动时问你要评审什么。之后可以对 agent 说 “review my change with openqodex”，或自己跑 `openqodex review`。

**4. 给 agent 装的另一种方式**
```
npx skills add openqodex/openqodex
```
或把这段提示词粘进 agent：
```
Install the OpenQodex skill with `npx skills add openqodex/openqodex`.
Then review my current change with openqodex and tell me the verdict and the findings.
```

**5. 日常评审（在改动所在的仓库里跑）**
```
openqodex review
openqodex review --all
openqodex review <branch>
openqodex review '#42'
```
`--all` 评审整个仓库；`<branch>` 和 `'#42'` 评审不是当前工作的分支或 PR——OpenQodex 会自己 fetch、checkout 到临时目录，只评审它离开 base 之后新增的内容。

**6. 选 reviewer**
```
openqodex review --reviewer codex
```
或在 `~/.openqodex/config.yaml` 里写 `reviewer:`。默认 `auto` 的挑选顺序是：你运行命令时所在的 agent → Claude Code → Codex。两个 reviewer 的隔离方式不同，选之前要知道：
- Claude Code（`claude -p`）：只给 read / search / list 工具，在改动副本内运行，不带你的 settings、hooks、plugins、memory 或 instruction 文件；它的事件流记录每次读取，所以报告会列出它读过哪些文件。
- Codex（`codex exec`）：在只读沙箱里启动，读权限限制在改动副本和系统目录，命令无网络，不带你的 config、plugins、hooks 或仓库的 instruction 文件；但它仍会加载全局 `~/.codex/AGENTS.md`，而且事件流不显示每条命令，报告会注明“读取未被记录”。

关掉 reviewer 的联网工具（Claude Code 的 WebSearch/WebFetch、Codex 的缓存 web 搜索）：在 `~/.openqodex/config.yaml` 里写 `reviewer_web: off`。

**7. 读报告，并检查完整性**
报告打在终端，同时写 `report.md`、`report.json`、`report.sarif`。判定“评审完成”的条件是三条同时成立：每个阶段都跑了、每条扫描告警都被提升或带理由丢弃、每一行改动都送到了 reviewer 面前（在 brief 里、在 OpenQodex 后来的消息里，或对 Claude Code 而言在它读过的文件里）。任何一条不满足就打 “Review incomplete” 并列出缺什么，退出码为 2。注意：只删除代码的改动也可能带告警——删除处相邻的行算作改动行。

**8. 接门禁与 CI**
- push gate（Claude Code 和 Codex 各一套）+ 可选的 git pre-push hook：两者都只去找“正好是这次要推送的内容”的评审，自己不做扫描也不做评审；默认 warn，只有 `.openqodex/config.yaml` 里设了 `review.block_on_severity` 才 block。
- GitHub Action：workflow 给了 Anthropic API key 时对 PR 跑完整评审，没给就只跑 `openqodex scan`。
- pre-commit hook：只跑扫描器，不是一次评审。

**9. 加自定义扫描器**
在仓库的 `.openqodex/config.yaml` 里写：
```yaml
scanners:
  custom:
    - source: https://github.com/aquasecurity/trivy
      run: trivy config --format sarif --output {report} {target}
```
然后必须批准才会跑：
```
npx openqodex trust
```
`trust` 会挑出对应你机器的 release asset 并下载，显示版本、asset、它的 sha256 和 run 行，然后问 yes/no。改过这条配置就要重新批准。

**10. 扫描器安装与管理**
首次使用会把扫描器下到 `~/.openqodex/tools/`，只下你这次改动需要的。单个安装超过 45 秒会转后台继续，报告里把它标为 installing，下次运行才加入。要一次装齐：
```
npx openqodex doctor --install
```
关掉 brakeman（它的 license 不是开源的）：`scanners.disable: [brakeman]`。

**11. 离线与自动更新控制**
`--offline` 会跳过 osv-scanner 和 semgrep，并关掉扫描器下载、版本检查、以及分支/PR 评审的 fetch 和 `gh` 调用。自动更新用 `openqodex update --off`、`~/.openqodex/config.yaml` 里的 `update: off` 或环境变量 `OPENQODEX_AUTO_UPDATE=0` 关闭（`--offline` 和设置了 `CI` 时也自动关）；`openqodex update --rollback` 回退。用 `npx openqodex guide <topic>` 可离线看文档页。

## 对应的研究问题

**1. 能力发现：哪些还没想到交给 AI 的工作**
- push 前的代码评审本身。原来要人肉比对 diff、判断每条 scanner 告警是否落在改动行上、逐条决定采信还是丢弃；现在这条链路交给了工具。
- 评审非当前工作：`review <branch>` / `review '#42'` 由工具自动 fetch、checkout 到临时目录，只评审相对 base 的增量。
- 核对“改动里的沉默动作”：改动新增的 suppression 注释（如 `# nosec`）和被改动的 scanner 配置文件会被专门展示出来交给 reviewer 逐条核对——这是人容易漏的地方。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**
- 确定性检查交给扫描器：13 个内置扫描器、版本 pin 死、按改动文件类型触发，只保留改动行上的告警。
- 语义判断交给 LLM reviewer：独立的 Claude Code 或 Codex 进程，逐条核对扫描器结果，并被要求对每条告警给出“提升或带理由丢弃”。
- 两个 reviewer 能力不同：Claude Code 侧工具被限死为 read/search/list 且读取可记录；Codex 侧沙箱更强但读取不可记录、不能作为在 Codex 自己沙箱内运行时的 reviewer。
- 协作方式：人在终端一条命令，或在 agent 里说一句 “review my change with openqodex”。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**
- 工具：Node 22+、git、Claude Code 或 Codex 已登录；按需语言运行时（Ruby 2.7+、Go）；首次下载扫描器到 `~/.openqodex/tools/`；osv-scanner 需要网络到 osv.dev，semgrep 每次运行从 registry 拉规则包（`p/default`、`p/security-audit`、`p/secrets`）。
- 权限：reviewer 被刻意剥夺你的 settings / hooks / plugins / memory / 仓库 instruction 文件；Codex 侧读权限限于改动副本和系统目录，其命令无网络。
- 反馈：三种报告格式 + 完整性断言（每阶段跑完、每条告警有理由、每一改动行送到 reviewer 面前）。
- 人工兜底：自定义扫描器必须经 `openqodex trust` 批准，显示版本 / asset / sha256 / run 行后 yes/no，改过要重新批准。

**4. 主动推进：时间、事件或状态触发**
- 时间：安装后每天最多一次后台找新版本并自动更新，且只在 release 至少 24 小时、其 npm provenance 显示由本仓库 release workflow 构建时才装；用一次重命名切换，失败或中断不影响在跑的版本。
- 事件：git pre-push hook 和 Claude Code/Codex 的 push gate 去找“正好是这次要推送的内容”的评审；GitHub Action 在 PR 上触发；pre-commit hook 只跑扫描器。
- 状态：每个扫描器只在改动包含它读的文件时才运行；安装超过 45 秒转后台，报告标为 installing，下次运行自动加入。

**5. 效果验证**
原文的验证标准是**流程完整性**而非检出率：三条断言任一不满足就打 “Review incomplete” 并 exit 2（可被 CI 当失败）；删除处相邻行计为改动行；改动的 suppression 注释和 scanner 配置会被展示并逐条核对，扫描把它算作一次 minor finding。原文明确“没有哪次评审能找出全部问题”，也明确 Codex 侧“读取未被记录”这一已知验证缺口。原文**没有**给出检出率、误报率、返工时间等效果数据。

## 与已有做法的关系

清单中有三个相关条目：

- **Claude Code（adopt）**：OpenQodex 把 Claude Code 当作**被约束的评审进程**来用（`claude -p`），而不是编码助手——只给 read/search/list 工具，不带用户设置、hooks、plugins、memory 或 instruction 文件，并用事件流回放它读过哪些文件。`init` 还会往仓库的 `CLAUDE.md` 和 `AGENTS.md` 里加一段 review 说明。也就是说这是在 Claude Code 已有的用法之上叠了一层“独立核对者”的角色。
- **Cursor（watch）**：`init` 会在机器上探测 Cursor，但原文明确“No Cursor reviewer”，理由是 `cursor-agent` 无法把工具限制到只读、也无法跳过你的规则和设置。所以 Cursor 在这里只是被探测到的宿主，不能当 reviewer。
- **Cline（watch）**：`init` 同样探测 Cline，但原文列出的 reviewer 只有 Claude Code 和 Codex，没有说 Cline 能做 reviewer。关系仅止于“安装时会被发现”。

其余清单条目在这份 README 里没有被提到。

## 证据与局限

**原文给出的数据/案例**
- 13 个内置扫描器各自的版本、触发条件、下载体积（Apple Silicon / Linux x64 两列，例如 gitleaks 2.9 MB / 3.0 MB，osv-scanner 31.8 MB / 32.1 MB，hadolint 102.6 MB / 55.7 MB）。
- 首次运行实测：Apple Silicon Mac、空工具目录、2 MB/s 带宽下，第一次 `openqodex demo` 一分钟内打出报告，报告里只含已装完的扫描器，其余标为 installing；下一次 `scan` 包含全部 8 个。
- 磁盘占用：demo 需要的 8 个扫描器在 Apple Silicon Mac 上约占 700 MB，其中 semgrep 连它的 Python 约占 440 MB。
- 单次评审 1–3 分钟，用你自己的 Claude Code 或 Codex 额度。

**只是作者主张、没有量化支撑的部分**
- “no review finds everything”——作者自己承认的边界，同时也是对完整性的兜底承诺。
- “每个阶段都跑、每条告警都被核对、每个改动行都送到 reviewer 面前、跳过的都点名”——这是设计声明，原文只给了断言机制（退出码 2、报告列缺什么），没给独立评测。
- 更新只在 release ≥24 小时且 provenance 通过时才装——是机制描述，没有失败率数据。
- 没有任何检出率、误报率、节省时间之类的效果数字。

**适用条件（不满足就得降级用法）**
- 必须有已登录的 Claude Code 或 Codex，否则 `review` 只能打印 “Full review unavailable”、把未核对的扫描结果落盘、并给出 `review --agent` 让当前 agent 自己看；这类报告会注明是哪个 agent 评审的。
- 在 Codex 自己的沙箱里跑 `openqodex review` 时，不能再拿 Codex 当 reviewer。
- 没有 Cursor reviewer；没有自备 API key 的评审路径；没有 MCP 工具服务；没有 Homebrew / 安装脚本 / Docker，只能走 npm；除 WSL 外不支持 Windows；没有离线漏洞库，依赖检查每次打 osv.dev。
- 成熟度：项目自述“new and on the way to 1.0”，minor 版本之间命令、flag 和配置文件都可能变（仓库 30 stars）。
- brakeman 的 license 是 Brakeman Public Use License，不是开源 license，OpenQodex 不打包它、运行时下载到你的机器上。

## 怎么试、怎么验证

**最小试用（不改动任何现有流程）**
1. 在一台 macOS/Linux 机器上备齐 Node 22+、git、已登录的 Claude Code 或 Codex。
2. 先跑 `npx openqodex demo`，看它的报告长什么样、安装日志怎么显示 installing 的扫描器——这一步不需要你自己的代码。
3. 挑一个非关键仓库跑 `npx openqodex init`（它会先打印要写的每个文件并只问一次），然后对一次真实改动跑 `openqodex review`。先不要打开 push gate 的 block。
4. 把这次改动的人工审查和报告对一遍。

**判断有没有改善的指标**
- **硬指标**：报告是否落到了 `report.md` / `report.json` / `report.sarif`；退出码是 0 还是 2。“Review incomplete”+exit 2 说明有阶段没跑完、有告警没给理由、或有改动行没送到 reviewer 面前——这是它自己定义的失败信号。
- **覆盖核查**：报告里列出的“reviewer 读过的文件”，是否覆盖你全部改动行；只删除代码的改动有没有把相邻行算进去；改动新增的 suppression 注释和被改动的 scanner 配置有没有都出现并被逐条核对。
- **告警核对质量**：拿一次真实改动，人工看一遍扫描器告警，跟报告里“每条告警被提升或带理由丢弃”对一遍，看有无漏项、理由是否站得住。
- **成本核算**：单次 1–3 分钟 + 你自己的模型额度；首次扫描器磁盘占用（demo 那 8 个约 700 MB）。这两项决定它适不适合放进你每次 push 的路径。
- **不要用它验证的东西**：原文没有给缺陷检出率、误报率、返工时间或线上故障率，所以第一步只能验证“流程完整性 + 告警核对质量”，不能假定它会直接减少事故。
- **开门的时机**：先保持默认 warn 跑一段时间，确认报告质量稳定后，再在 `.openqodex/config.yaml` 里设 `review.block_on_severity` 打开拦截，避免误挡推送。
