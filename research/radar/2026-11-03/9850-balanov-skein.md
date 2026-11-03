# Balanov/skein

- 结论：**值得一试**。先装好，用示例任务图跑一次，再用 `skein stop` 演练“旧 epoch 排队任务失效 + 迟到完成被拒绝 + 进程树被终结”，验证通过后再考虑把你自己的多步子任务迁到显式任务图上；它给出了可照做的安装、运行、停止命令和明确的退出码语义，但仍是 0.2.0 早期版本、单机自测基准，且明确不覆盖沙箱、鉴权和外部副作用恰好一次。
- 原文：https://github.com/Balanov/skein
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-03T06:53:01.401Z

## 是什么

Skein 是一个面向本地多智能体协作的「执行控制面」（execution control plane），不是 agent 框架、也不是模型运行时。核心机制是：显式任务图（DAG）+ 有界并发 + 持久化的 **epoch fence**。紧急停止时，它会让旧 epoch 的排队工作失效，并**拒绝**旧 epoch 的迟到完成，而不是仅仅把任务标记为 canceled。

工程属性：Go 编写的静态二进制，无守护进程、无数据库、无运行时依赖；MIT 许可；版本 0.2.0，作者自述为早期发布。

README 反复强调它的定位是「控制面」：管调度、停止、围栏和进程树终结，不管模型调用质量。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：Linux / macOS / Windows，amd64 或 arm64；或者本机有 Go 1.26+ 用于源码构建。

1. 安装（Linux、macOS）：

```sh
curl -fsSL https://raw.githubusercontent.com/Balanov/skein/main/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/Balanov/skein/main/install.ps1 | iex
```

两个脚本会按当前 OS/架构选二进制，用 `SHA256SUMS` 校验后装进用户目录；用 `SKEIN_INSTALL_DIR` 可改安装位置。替代路径：从 releases 下载，或源码构建：

```sh
go build -trimpath -o bin/skein ./cmd/skein
```

2. 用仓库自带的示例任务图跑起来（状态目录 `.skein`，2 个 worker）：

```sh
skein run --state .skein --workers 2 --include-tasks examples/fanout.json
```

运行产物落在 `.skein/runs/<run-id>/` 下：`report.json`、`events.jsonl`、lease 与 payload 数据。

3. 演练「停止证明」（这是它区别于普通任务队列的关键动作）：

```sh
skein stop --state .skein --reason "manual emergency stop"
skein status --state .skein   # {"stopped":true,"epoch":2}
skein reset --state .skein    # inspect first; epoch is never reused
```

注意 `reset` 前要先检查，epoch 永不复用——这是围栏语义成立的前提。

4. 用退出码做分流判断，把「失败」和「被停止」分开处理：

```text
0  成功
3  某个任务失败
4  运行被停止
1  运行/运维错误
2  用法错误
```

5. 编写任务清单（manifest）。前提：去读 `docs/INTEGRATION.md`，README 只给概述、没给完整 schema。已知要点：JSON 格式；argv 数组、**没有隐式 shell**；依赖图；可复用的多趟（multi-pass）块；worker 与 pass 上限；每趟超时。

6. 需要嵌进自己的程序时，用 Go 的嵌入 API：`import skein "github.com/Balanov/skein"`，可运行示例在 `examples/embed-go/`。

7. 从源码构建后做自检：

```sh
go test -count=1 ./...
go vet ./...
go test -race -count=1 ./... # requires CGO and a C compiler
```

## 对应的研究问题（对照五个问题逐条说明，只写有依据的）

- **能力发现**：有限。它不扩大「AI 能做什么」，但揭示了一类可以直接交出去的工作：把原本塞进一个长对话里的多步任务，改写成显式 DAG 交给执行控制面来跑。
- **任务匹配**：README 明确划了适用范围。适合：单次本地运行内的调度、需要可中断的依赖图任务、需要并发上限和每趟超时的批式子任务。不适合：远程或脱离本机的作业、已经越过外部边界的副作用、需要分布式共识的场景。
- **条件供给**：需要提供的是显式 manifest（argv 数组、依赖关系、并发/趟数上限、超时）、一个持久状态目录，以及——如果外部系统要认它的 lease——一个会校验 lease 的网关。README 明确：lease 是 fencing token，不是凭证（credential），外部系统只通过网关才认它。另外 manifest 里的命令沿用当前 OS 用户的权限，不可信负载要另用 OS 沙箱。
- **主动推进**：这是最相关的一条。持久化、幂等的停止锁存 + epoch 围栏 + 拒绝迟到完成，正是「让任务持续跑、又能随时安全收手」所需的底层语义。但 README 没有给出时间触发、事件触发或状态触发的具体功能，只给了任务图与停止机制。
- **效果验证**：给了可直接用的判据——退出码语义（尤其 3 与 4 的区分）、`report.json` 与 `events.jsonl`、停止证明（终止被跟踪的进程树、冻结子进程心跳）、迟到完成被拒绝。它自己的基准也是按这套口径自证的（360/360 结果校验、160/160 进程树终结）。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的数据**（Windows 11 / Ryzen 9 5950X，每个热态结果是同一图上 15 次交错采样的中位数）：

| 1000 节点图 | Skein | Python asyncio | LangGraph |
| --- | ---: | ---: | ---: |
| Independent | 1.580 ms | 3.530 ms | 876.910 ms |
| Serial chain | 3.272 ms | 4.479 ms | 534.907 ms |
| Fan-out / join | 2.080 ms | 3.795 ms | 892.522 ms |

另有冷进程测试：每次运行起 24 个真实 Python SHA-256 worker，15 次全新进程运行，Skein 中位 156.463 ms，asyncio 288.644 ms，LangGraph 998.010 ms，每个候选都 360/360 结果校验通过。停止证明：160/160 真实父子进程树被终结、160/160 子进程心跳被冻结，20 次运行中位 141.663 ms。

**作者主动承认的短板**：100 个独立任务时 asyncio 中位更低（0.740 ms vs 1.040 ms），Skein 并非处处领先；并声明这些是本地观测，「不是通用排名，也不是模型质量结果」。

**明确不覆盖**（原文清单，直接决定适用边界）：任意命令的沙箱化、鉴权或签名 lease、agent 输出的语义校验、外部副作用恰好一次、崩溃后自动恢复、分布式共识、远程或脱离本机的作业、以及已经越过外部边界的副作用。

**其他局限**：0.2.0 早期版本，作者自己要求「先在你自己的工作负载上验证停止证明，再用于生产」；基准全部在作者单机、单一 OS 上测得，无第三方复现；256 stars、单作者项目，社区验证有限；manifest 的完整契约不在 README 里，需另读文档。因此这里给的是「值得小范围试」，而不是「直接采用」。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天内可做完）**

1. 按上面的第 1 步安装，跑 `go vet` / `go test` 之外至少跑通示例：

```sh
skein run --state .skein --workers 2 --include-tasks examples/fanout.json
```

记录 `.skein/runs/<run-id>/report.json` 与 `events.jsonl`，作为基线。

2. 另起一次运行，在任务执行中途执行停止，检查三件事：

```sh
skein stop --state .skein --reason "drill"
skein status --state .skein
```

- 退出码是否为 `4`（而不是 `3` 或 `0`）；
- `status` 是否为 `{"stopped":true,"epoch":<递增后的值>}`；
- 旧 epoch 的迟到结果是否被**拒绝**，而不是被记成普通的 canceled。

3. 换成你自己的一个真实任务图：把现在用脚本/对话串行跑的 3～5 个子步骤写成 manifest（argv 数组、依赖关系、`--workers` 上限、每趟超时），其中至少一个步骤是真实子进程。重复第 2 步的停止演练。

**判断有没有改善的指标**

- 停止后仍然存活的子进程数——应为 0（原文自证是 160/160，你的负载上要自己复现）。
- 迟到完成被接受的比例——应为 0；这一项是与「只把任务标记 canceled」的做法的核心差别。
- 从 `skein stop` 到全部终结的时延——对照原文中位 141.663 ms，看你的机器与子进程形态下的实际值。
- 同一图多次运行的 `report.json` 一致性（可重复性）。
- 与现有做法（自写脚本 / asyncio）在同一张任务图上的端到端耗时对比。注意原文显示小规模（100 个独立任务）时 asyncio 反而更快，所以别只测大图、也别假设它一定更快。

若上述三项安全指标在你的负载上成立，且你的任务确实是「本地 + 有依赖 + 需要可中断」，再考虑扩大使用；若你的场景涉及外部系统写入、不可信命令或跨机调度，按原文的「不覆盖」清单，应另外补沙箱、网关和幂等层，不能指望 Skein 提供。
