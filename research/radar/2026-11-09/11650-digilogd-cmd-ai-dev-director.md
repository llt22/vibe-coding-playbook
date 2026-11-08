# digilogd-cmd/ai-dev-director

- 结论：**值得一试**。可以在 Windows 环境下用两个已登录的订阅 CLI 小范围试用，把 HEAD/BUILDER/REVIEWER 分工、隔离 worktree、独立审查、Scope Guard 这套编排流程借鉴到自己的多代理编码验证中；理由是 README 给出了可复制的安装、运行命令与硬性安全规则，但 macOS/Linux 未验证、缺少效果量化数据，尚不宜全面采用。
- 原文：https://github.com/digilogd-cmd/ai-dev-director
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-08T18:53:55.538Z

## 是什么

`ai-dev-director` 是一个本地编排器，把三个订阅制 AI 编码 CLI（Claude Code、OpenAI Codex、Google Antigravity）组织成一家“公司”的三个角色：

- **HEAD**：把一句话目标拆成 ORDER（工作规格，写明允许路径、文件数量、diff 上限），并对结果做 PASS/FAIL/修改指示；
- **BUILDER**：以“整文件 JSON”方式提交代码提案；
- **REVIEWER**：独立审查。

流程为：`goal → HEAD 出 ORDER → BUILDER 提案 → Director 用 Scope Guard 检查 → 写入隔离的 git worktree → 跑构建/测试（Verifier）→ REVIEWER 独立审查 → HEAD 决策`。原项目目录永不被直接修改。

除单次 NORMAL 流水线外，还有 Mission（把一句话目标拆成多个里程碑逐步推进）、HEAD 代理自主模式（除支付/实盘下单/真实凭据/不可逆外部动作外自动重试与切换供应商）、TRIAD 研究模式。作者称这是其个人环境每天在用的代码，MIT 许可，Windows 优先、韩语界面。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **确认前提**：Windows 10/11（macOS/Linux 代码已备但作者未验证）、Python 3.9+、Git，以及至少两个**已用订阅账号登录**的 CLI：`claude`、`codex`、`agy`。不需要 API key（代码会把所有 `*_API_KEY` 从环境里剔除）。

2. **装依赖并跑测试**（不需要真实 CLI，用桩）：
```bash
pip install -r requirements.txt
python -m pytest -q            # 604개 테스트, CLI 없이 스텁으로 돕니다 (약 25분)
```

3. **启动控制台**（Windows）：
```powershell
.\start-companion.ps1          # http://127.0.0.1:8081  (TRINITY 무대)  ·  /classic (작업실)
.\stop-companion.ps1
```
macOS/Linux（作者标注未验证）：
```bash
chmod +x start-companion.sh stop-companion.sh
./start-companion.sh           # python3 companion_server.py 를 백그라운드로, PID는 data/companion.pid
./stop-companion.sh
```

4. **配置 `config.yaml`**（单文件配置）：设置角色对应供应商（`head/builder/reviewer`）、超时、安全上限、**项目级验证命令**、自主模式（`autonomy`）与档位（`quick / standard / deep`）。关键设计：验证命令放在 `config.yaml` 而不是项目内，使 BUILDER 无法弱化它。若某平台没有 `agy`，把 BUILDER 改成 `codex` 或 `claude`，两个 CLI 也能跑。

5. **单次运行**（一句话目标 → 经审查的代码）：
```bash
python director.py run -p D:/work/my_project -g "src/calc.py에 add(a, b)를 만들고 테스트를 추가해"
```

6. **多里程碑 Mission**（每步从上一个 PASS 快照出发，依据测试/评审证据重新规划）：
```bash
python director.py mission -p D:/work/my_project -g "회원가입 흐름을 끝까지 구현"
```

7. **一步到位**（Mission + 自动回写，用 quick 档）：
```bash
python director.py do -g "로그인 버그 고쳐" --profile quick
```

8. **查看状态、清理隔离工作本**（先 dry-run）：
```bash
python director.py status
python director.py clean-worktrees -p D:/work/my_project --dry-run
```

9. **依赖代码强制的硬规则**（用之前先确认这几条确实生效）：
- 禁用按量付费 API，只用已登录订阅 CLI；
- 所有构建只发生在 `.director_worktrees/` 的 git worktree 内，原项目不被修改；
- Scope Guard 检查 ORDER 的允许路径、保护路径、文件数、diff 上限，BUILDER 不能放宽；
- REVIEWER **fail-closed**：无响应或返回损坏即判 FAIL，而非 PASS；
- 支付、实盘下单代码（`OrderSend` 等）、账号创建、外部不可逆行为必须由人决定；
- 卡住的 CLI 连同子进程一起超时终止；
- 聊天里说“停止/stop”或按控制台停止按钮 → 运行的 CLI 立即终止、Mission 固定为 STOPPED、重启也不恢复。

10. **安全边界**：控制台只绑定 `127.0.0.1`；改变状态的请求要本地来源校验 + 桥接 token（`data/solomon-bridge.token`，首次运行生成）；`companion.json` 里放端口和（可选）允许的项目列表。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：仓库示范了一类此前少有人交给 AI 的工作——让三个不同供应商的 CLI 互相制衡地完成“一句话目标 → 经过独立审查和测试的代码”，并把失败（JSON 破损、token 超限、路径越界、评审意见、配额耗尽）作为可自动重试/换供应商/重规划的对象，而非报错终止。Mission 模式还展示了 AI 自行把大目标拆成多个里程碑推进的能力。

- **任务匹配**：角色与模型是显式映射的（`head/builder/reviewer` 各自可选供应商），说明作者认为“规划、实现、审查”应分给不同模型；当 HEAD 与 REVIEWER 落到同一供应商时，系统会标注 `REDUCED_INDEPENDENCE` 并放行——即给出了“独立性不足时如何取舍”的明确处理方式，而非隐藏。profile（quick/standard/deep）对应不同成本/深度档位。

- **条件供给**：需要（a）至少两个已登录订阅 CLI 的会话；（b）一个 git 仓库（v3.0 起空文件夹也可 greenfield）；（c）写在 `config.yaml` 里的项目级验证命令；（d）ORDER 中的允许路径、保护路径、文件数、diff 上限；（e）控制台的端口/允许项目列表与桥接 token。反馈来自测试结果、Verifier、REVIEWER 与 HEAD 决策。

- **主动推进**：Mission 由用户一句话触发，之后每个里程碑由 HEAD 依据上一步真实证据（测试、评审）自行规划；自主模式对可逆摩擦自动重试、换供应商、重规划，只有支付/实盘/凭据/不可逆外部动作才停下问人；进程树超时与“停止即停止”的语义保证可按事件/状态中断。

- **效果验证**：Verifier 在隔离 worktree 里跑构建/测试；REVIEWER 独立审查且 fail-closed；HEAD 出 PASS/FAIL/修改指示；schema 中有 Provenance（来源追踪）。测试套件以桩 CLI 隔离运行（作者称 604 个测试，约 25 分钟；真实三 CLI 的 E2E 是 opt-in 标记）。

## 与已有做法的关系

清单中的 **Claude Code**（adopt）与 **OpenAI Codex**（adopt）正是本项目的两个后端 CLI，**Google Antigravity**（watch）是可选第三个。也就是说，本项目不是替代这些工具，而是在它们之上加了一层“编排 + 隔离 + 独立审查 + 安全护栏”的流程。可借鉴的增量价值在于角色分工、worktree 隔离、Scope Guard、fail-closed 评审、验证命令外置这几条**流程约束**，而不是某个 CLI 本身。

## 证据与局限

- **给出的数据/案例**：作者称这是每天在用的代码；2026-11-04 基准 593/596 通过，3 个已知漂移失败（两个是旧 UI 测试期待“拒绝非仓库文件夹”而 v3.0 起支持空文件夹，一个是快照排除列表 fixture 漂移），安全门/策略/Mission 测试全过；MIT 许可；42 stars。
- **只是作者主张**：没有任何“用了它之后代码质量/交付速度提升多少”的量化对比，没有基准或对照实验；每日使用是自述。
- **文本自身有出入**：布局说明写“604 tests”，快速开始写“593/596”，两处数字不一致，需以实际运行为准。
- **适用条件与局限**：Windows-first、韩语 UI；macOS/Linux 代码齐备但**未在真机验证**，部分测试假定 Windows 盘符路径（`C:/...`）；整文件 JSON 提案方式在大型改动上会撞 CLI 输出上限（先压缩重试，再换供应商）；完全受各 CLI 订阅配额约束；HEAD 与 REVIEWER 同供应商时以 `REDUCED_INDEPENDENCE` 放行，独立性会打折；真实三 CLI 端到端只以 opt-in 标记运行，日常测试用的是桩。

## 怎么试、怎么验证

**最小试用**：
1. 在一台 Windows 机器上准备两个已登录的订阅 CLI（如 `claude` + `codex`），选一个**小仓库**，把它的构建/测试命令写进 `config.yaml` 的 `projects` 段。
2. 先跑 `python director.py run -p <repo> -g "<一个明确的小改动>"`，观察 ORDER 的路径/文件数/diff 上限是否合理、Scope Guard 是否拦住越界、REVIEWER 是否真的独立于 BUILDER。
3. 再对一个中等目标跑 `python director.py mission`，看里程碑拆分是否基于上一步的真实证据。
4. 全程确认原项目目录未被改动、停止按钮/“stop”能立刻终止进程树。

**对照设计**：选 3–5 个规模相近的任务，一半用 Director 流水线、一半直接单用 Claude Code（或 Codex）完成，任务与验收标准事先固定。

**判断改善的指标**：
- 首次构建即通过测试的比例（第一轮 PASS 率）；
- 人工介入次数与介入原因（是否只剩真正需要人决策的支付/凭据类）；
- REVIEWER 独立抓出的真实缺陷数（而非风格挑刺）；
- 端到端耗时与订阅配额消耗；
- 原仓库是否始终保持干净（`git status` 无意外改动）；
- 失败恢复能力：人为制造 JSON 破损/超时/配额耗尽，看是否按设计重试、换供应商、重规划而不是卡死或误判 PASS。

若上述指标相对单代理对照没有明显改善，或隔离/评审机制被绕过，则应降级为 study（只借鉴流程思路），不必继续使用该工具本身。
