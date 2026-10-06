# b3s3da/qemu-harness

- 结论：**值得一试**。先在一台 Windows 或 Linux/macOS 机器上按 README 跑通「qh up → qh exec → qh down」这条最小链路，再用自带的 skill/SKILL.md 把它接给 Claude Code，让需要真实系统验证的任务在 guest 里执行；理由是原文给出了可直接复制的安装命令、完整 CLI 用法、qh.json 配置和排障路径，能补上 agent 缺少真实内核/网络执行环境这一环，但项目体量小、自带 overlay 为 lab 用途，适合小范围试用而非全盘采用。
- 原文：https://github.com/b3s3da/qemu-harness
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-06T11:43:42.142Z

## 是什么

qh（b3s3da/qemu-harness）是一个面向 AI agent（也面向人）的 QEMU 封装：几秒内启动一个裸内核镜像或现成的 Alpine 镜像，通过客户机内的 bridge agent（作者描述为「类似 qemu-guest-agent，但很小且与内核无关」）在 guest 里执行命令，`qh exec` 把 stdout/stderr/exit code 以 JSON 返回。

- 面向 IoT / 嵌入式内核仿真：支持 aarch64、arm32、riscv64、x86_64 guest，可指定任意 machine/DTB/cmdline。
- rootfs = Alpine userland + 你的 overlay 目录，在宿主机上打包成 initramfs（`qh reload`），无需 root、无需 WSL、无需 mount。
- 对没有 virtio-net 的原版内核也能用：agent 把以太网帧通过串口通道隧道进 QEMU 的 user-mode 网络。
- 自带 `skill/SKILL.md`，让 Claude Code / Grok / 其他 SKILL.md-aware 的 agent 知道怎么驱动它。
- Windows 优先（作者称在 Windows 10 + QEMU 11 上测过），宿主机侧纯 Python 标准库，只有交叉编译 guest agent 时需要 Go；Linux/macOS 也可用。

## 具体做法

前提（README 明确列出）：Python >= 3.8；QEMU（`qemu-system-<arch>` 在 PATH，或位于 `C:\Program Files\qemu`）；Go >= 1.22（供 `qh setup` 用）；首次运行需要联网。

1. Windows 一行安装（会把 harness 下载到 `~\tools\qemu-harness`，通过 winget 询问安装 Python / QEMU / Go，构建 guest agent，把 `qh` 加进 PATH，并为 Claude Code 和 Grok 安装 agent skill）：

```powershell
irm https://raw.githubusercontent.com/b3s3da/qemu-harness/main/install.ps1 | iex
```

2. 如果想非交互安装，或一次装全部架构并做烟雾测试：

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/b3s3da/qemu-harness/main/install.ps1))) -Yes -Arch all -Smoke
```

   可选参数：`-Yes`（从不询问）、`-Arch all`、`-Dir`、`-NoDeps`、`-NoPath`、`-NoSkills`、`-Smoke`。注意原文自己指出：把脚本直接 pipe 给 `iex` 是无审查执行的；若想先读再跑，就 clone 仓库（或只下载 `install.ps1`），阅读后执行 `.\install.ps1`。安装器是幂等的，重跑会原地升级并保留 `cache/`。

3. Linux / macOS：

```bash
git clone ... && ./install.sh
```

   （需要 Python 3、`qemu-system-*`、Go。）

4. 新开一个终端让 PATH 生效，然后在任意项目目录里创建 lab 并跑最小链路：

```powershell
mkdir lab ; cd lab
qh up --kernel alpine:aarch64          # or --kernel path\to\Image
qh exec 'uname -a; ip -4 -o a show eth0'
qh down
```

5. 用项目级 `qh.json` 固化配置（README 示例，找不到时回落到 `qh.example.json`）：

```json
{ "kernel": "alpine:aarch64", "mem": "512M", "smp": 2, "fs": ["fs"], "pkgs": ["dropbear", "mosquitto"], "fwd": ["2222:22"] }
```

   每个键都有对应 CLI 开关：`--arch --kernel --initrd --bios --machine --cpu --mem --smp --dtb --disk --append --net --fs --pkg --fwd --chan --nic --bus --chan-tty --qemu-arg`；`kernel` 也可写成 `alpine:<arch>[:virt|lts]`。

6. 定制 guest（让镜像里有你要的东西）：
   - Overlay：`fs` 里列出的目录下的内容会覆盖 Alpine rootfs（后者胜出），用来放固件、配置、服务；可执行位会被推断（`#!`、ELF、`bin/`、`sbin/`）。`fs/etc/qh.d/rc.local` 在 VM 被宣告 ready 之前运行；cmdline 上的 `qh.init=/path` 会运行一个钩子。
   - 包：`pkgs` 里的名字按 Alpine 索引解析（含依赖）并在宿主机上解包，不需要 `apk`。
   - 内核模块：放完整模块树（`lib/modules/<ver>/modules.dep` + 未压缩 `.ko`）由 init 执行 `modprobe` virtio/tun/9p；散放的 `*.ko` + `modules.order` 走 `insmod`。
   - 自带的 overlay 会启动 dropbear（root、空密码，原文明确标注 lab only）、mosquitto 和 httpd。

7. 常用命令（全部支持 `--json`；状态存放在你运行命令的目录下的 `./.qh/<name>/`，多个 VM 用 `-n NAME`）：

| 命令 | 作用 |
|---|---|
| `qh setup [--arch A\|all]` | 拉取 Alpine minirootfs、构建 guest agent（缓存在 `cache/<arch>`） |
| `qh up [--kernel K] [-n NAME]` | 构建 initramfs、启动、等待 agent |
| `qh exec [--json] [--timeout N] [--bg] CMD…` | 在 guest 内执行；退出码会传播；支持 `--cwd`、`-e K=V`、`--stdin`、`--argv` |
| `qh put SRC DST` / `qh get SRC DST` | 拷贝文件或目录（线上用 zlib；文件要小，见性能） |
| `qh reload [任意 VM 选项]` | 重建 rootfs 并复用同样的端口重启；kernel/dtb/mem/cmdline 可改 |
| `qh fwd HOST:GUEST` | 运行时新增 host→guest TCP 转发（`0` = 自动选空闲宿主端口） |
| `qh logs [-f] [--tail N]` / `qh console --send CMD` | 串口控制台日志 / 与之对话 |
| `qh probe [--kernel K]` | 探测内核支持什么、qh 会选哪种传输方式 |
| `qh dtb -o m.dtb` | 导出 QEMU 生成的设备树（packed），用 `dtc` 改后再用 `--dtb` 喂回 |
| `qh kernel fetch ARCH [virt\|lts]` | 下载 Alpine 内核 + virtio/tun/9p 模块 |
| `qh up --dry-run` | 打印确切的 QEMU 命令行 |
| `qh ls` / `down` / `rm` / `qmp CMD` | 生命周期管理与原始 QMP |

8. 让 agent 来用：安装器默认把 `skill/SKILL.md` 装给 Claude Code 和 Grok（用 `-NoSkills` 可关掉）；此后由 SKILL.md-aware 的 agent 自行调 `qh up` / `qh exec` / `qh put` 等命令完成任务。

9. 排障（README 的 Troubleshooting）：
   - `agent did not respond`：先 `qh logs --tail 80`，再 `qh probe`。若内核既没有 virtio-console 也没有 8250-PCI，需要 `--chan serial --chan-tty /dev/ttyXX`，或 `--initrd X --no-wait` + `qh console`。
   - Git Bash 会把 `/tmp/x` 这类参数改写成 Windows 路径——设 `MSYS_NO_PATHCONV=1`。
   - 不弹控制台窗口：QEMU 和 daemon 以 `CREATE_NO_WINDOW` 启动。
   - aarch64/arm/riscv64 在 x86 宿主上走 TCG（偏慢但可用）；同架构宿主上可用 `--qemu-arg "-accel whpx"` / KVM。

10. 性能前提（决定你该怎么用它）：有 virtio-net 时网络是正常速度；在没有 NIC 驱动、virtio 为模块的原版 Android GKI 镜像上，隧道约 15 KB/s 入 guest、75 KB/s 出——够跑脚本、MQTT、HTTP 探针，大 payload 应放进 `fs/` 再 `qh reload`。

## 对应的研究问题

1. 能力发现：它把「在真实（仿真）系统里执行并拿到可判定结果」交给 agent——`qh exec` 返回 stdout/stderr/exit code 的 JSON，`qh put/get` 搬文件，`qh probe` 先探内核能力。原文支撑的是「跑命令、验证内核/网络行为、跑 MQTT/HTTP 探针」这类此前通常不交给 LLM 的工作；更高层的具体任务清单原文没有列，只能由使用者自行设计。
2. 任务匹配：README 明确的目标域是 IoT / 嵌入式内核仿真，需要真实系统测试、跨架构（aarch64/arm32/riscv64/x86_64）验证的任务与之匹配。协作方式是 CLI + 项目级 `qh.json` + `SKILL.md`，即让 SKILL.md-aware 的 agent 自主驱动一个 VM。不适合的任务：需要大文件/高带宽传输的场景（隧道只有约 15–75 KB/s）。
3. 条件供给：需要先装 Python >= 3.8、QEMU、Go >= 1.22，并联网首次下载 Alpine minirootfs；需要提供 kernel（`alpine:<arch>` 预设或自己的 Image）、可选 dtb/mem/cmdline/machine/cpu；需要提供 `fs` overlay 目录来放固件、配置、服务；需要 `SKILL.md` 让 agent 知道怎么用；需要时可放内核模块树。`qh probe` 用于预先弄清内核支持与传输选择，`qh up --dry-run` 用于核对实际 QEMU 命令行。
4. 主动推进：有部分机制——`qh reload` 重建 rootfs 并复用端口重启；`fs/etc/qh.d/rc.local` 在 VM 被宣告 ready 前自动运行；cmdline 的 `qh.init=/path` 钩子；`qh fwd` 在运行时加转发；`-n NAME` 可并行多个 VM。但原文没有给出按时间/事件/状态触发的持续任务调度或循环执行机制，这一条只能算有可反复调用的执行接口，依据有限。
5. 效果验证：有可用的验证抓手——`qh exec` 传播退出码且支持 `--json`（便于自动判定成败）、`qh probe` 检查内核支持与传输选择、`qh up --dry-run` 输出确切命令行。但原文没有任何关于「用了它以后 AI 的结果是否更好」的评测数据或基线对比。

## 与已有做法的关系

清单中相关条目：Claude Code（tool，adopt）。README 明确说仓库自带 `skill/SKILL.md`，安装器会为 Claude Code（和 Grok）安装该 skill，因此 qh 是接在 Claude Code 这类 agent 之下的执行层补充：Claude Code 负责理解与编排，qh 提供真实 guest 系统的执行与文件拷贝。除此之外，清单中没有其他相关条目。

## 证据与局限

原文给出的具体数据（均为作者自述，无第三方复现）：
- `qh up` 到 agent 可应答约 2–5 秒；
- rootfs 打包成 initramfs 约 0.3 秒（`qh reload`）；
- 无 virtio-net 的原版内核（如 Android GKI）隧道约 15 KB/s 入、75 KB/s 出；
- 在 Windows 10 + QEMU 11 上测试过。

案例非常有限：只有 Alpine 内核，以及一段 Android GKI 的性能说明，没有 benchmark 脚本、没有对照基线，也没有第三方使用报告。

明确的安全限制：自带 overlay 会以 root、空密码启动 dropbear，README 自己标注 lab only——不可放到不可信网络。

适用条件：Windows 优先，Linux/macOS 也可；首次运行需联网；宿主机侧纯 Python 标准库，Go 仅用于交叉编译 guest agent；跨架构 guest 在 x86 宿主上走 TCG，偏慢。

属于主张而非证据的部分：「为 IoT/嵌入式内核仿真而生」「秒级就绪」「小且与内核无关的 guest agent」等，均为作者陈述，原文未提供可复现的测量方法。项目体量小（30 stars），成熟度与长期维护状况未知，这也是不建议直接 adopt 的主要原因。

## 怎么试、怎么验证

最小试用方式：
1. 在一台 Windows（或 Linux/macOS）机器上按最小链路跑通：`qh up --kernel alpine:aarch64` → `qh exec 'uname -a; ip -4 -o a show eth0'` → `qh down`，确认 exec 输出 JSON 且退出码正确传播（可故意跑一个失败命令验证非零退出码）。
2. 再做一次 `qh reload`：改 `fs/` 里的一个文件或加一个 `pkgs` 条目，确认变更生效。
3. 把一件真实的小任务交给 Claude Code + 已安装的 SKILL.md 自主完成（例如在 guest 里起 mosquitto，再从宿主侧经 `qh fwd` 做一次探针）。

判断有没有改善的指标：
- `qh up` 到 agent 可应答的耗时（对照作者声称的 2–5 秒）；
- `qh exec` 的退出码与宿主侧预期是否一致（正确性，最关键）；
- `qh reload` 后变更是否生效及其耗时（对照声称的 ~0.3 秒）；
- 同一任务在有/无该 harness 时，agent 的成功率与人工介入次数；
- 是否出现因隧道带宽（约 15 KB/s 入）而失败的任务——若有，检查是否已改为 `fs/` + `qh reload` 传大 payload。

判为改善的标准：原本无法验证的任务（内核/驱动/网络行为）现在能被 agent 自动跑通并给出可判定的退出码，同时启动与重建开销保持在秒级。若主要工作不涉及真实系统执行，或必须频繁传大文件，则收益有限，不值得引入。

（注：以上仅依据仓库 README，未获取仓库代码或其他外部资料；README 未给出的内容一律未在此补足。）
