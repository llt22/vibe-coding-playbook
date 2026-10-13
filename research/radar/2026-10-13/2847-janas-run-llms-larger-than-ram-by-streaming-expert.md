# Janas: Run LLMs larger than RAM by streaming experts from SSD

- 结论：**值得一试**。在一台空闲的 x86-64 机器上用官方预编译包跑 `janas-chat`，先用 `--cache` 限制内存、必要时 `JANAS_GPU=0`，再用 `janas-bench` 记录本机数字并和同机 llama.cpp 对比后再决定是否纳入工作流；理由是它给出了可复制的安装命令、安全开关和测速工具，并把“内存装不下的大 MoE 模型”变成能跑（48.4 GB 模型在 32 GB 笔记本上读写 62/24 tok/s，对照 llama.cpp 的 16/2.8），但项目自称实验品、只在一台机器上验证过，所以只能小范围试。
- 原文：https://github.com/prabanta-dev/janas
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T03:13:05.842Z

## 是什么

Janas 是一组用 C 写的 AI 工具（除 C 标准库外无依赖），第一个组件 **Janas-LLM** 让普通电脑跑大型 MoE（混合专家）语言模型：**权重留在磁盘上，每个 token 需要的专家从 NVMe SSD 流式读入，反复用到的专家留在内存缓存里**。原文称一台 32 GB 内存的笔记本能跑并回答 80B 参数（48.4 GB 文件）的模型。同一组工具里还有 `janas-chat`（聊天）、`janas-server`（OpenAI 风格的 HTTP API）、`janas-mcp`（MCP 服务器）、`janas-bench`（测速）、`janas-get`（取模型）以及若干服务工具（航班、地震、天气、地图、价格、GitHub、Git、维基）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提（原文明确给出的）**：x86-64；Linux（Ubuntu 22.04、Debian 12 及以后）或 Windows 10（1903 或以后）/11；机器要空闲（缓存会吃掉打开模型时的空闲内存，其余权重边回答边从磁盘读）；用 GPU 需要 Vulkan 驱动。作者的机器是 Debian 13、Intel Core Ultra 9 185H、集成 Arc GPU、32 GB DDR5、1 TB NVMe（约 5.7 GB/s）。

1. **Linux 上用预编译包试跑**（前提：有网、x86-64 Linux）

```sh
curl -LO https://github.com/prabanta-dev/janas/releases/latest/download/janas-linux-x86_64.tar.gz
tar xf janas-linux-x86_64.tar.gz && cd janas
./janas-chat                     # 列出它认识的模型：选一个，会自动下载并校验
```

2. **Windows 上用预编译包试跑**（前提：Windows 10 1903+ 或 11，x86-64）：下载 `janas-windows-x86_64.zip`，解压，在其中的 `janas` 目录里打开终端运行：

```
.\janas-chat
```

3. **从源码构建**（前提：想自己编译或改代码时；GPU 相关的三个包是可选的）

```sh
sudo apt install build-essential          # Debian/Ubuntu
sudo apt install libvulkan-dev glslang-tools vulkan-tools   # optional, GPU
sudo pacman -S vulkan-headers glslang vulkan-tools           # the same, Arch

./build.sh                                # everything into bin/x86_64-linux/
./build.sh release test                   # and run the tests
```

4. **先上安全阀再跑**（前提：不确定本机内存余量、或怕桌面被拖慢时）。`--cache <GiB>` 给它占用的内存加一个硬上限；`JANAS_GPU=0` 让它完全不用 GPU。出问题时 `Ctrl-C` 中止一次回复，`Ctrl-D` 退出聊天。

5. **取模型**（前提：需要模型文件）。已经转成 `.jns`（格式版本 2）的模型在 Hugging Face 的 `prabanta-dev` 账号下；也可以用 `janas-get` 下载，或把自己的 GGUF 文件转换（见 `docs/models.md`）。注意 `.jns` 是模型的衍生作品、不是 Janas 的衍生作品，保留原模型自己的许可证。

6. **测量自己的机器**（前提：机器空闲，原文说开着浏览器和编辑器时同一模型只保住约四分之三速度、磁盘等待长五倍）。原文给的示例是：

```sh
janas-bench --prompt 1024 --gen 16
janas-bench --rounds 3
```

`janas-bench` 的报告是作者最希望收到的反馈（见 `docs/hardware.md#helping-it-run-on-more-hardware`）。

7. **接进现有工作流**（前提：想当服务用）。`janas-server` 提供遵循 OpenAI 的 HTTP API（含 `/v1/completions` 的 `suffix` 和 llama.cpp 的 `/infill`），可用于编辑器光标处的代码补全（VSCodium / VS Code，配合 llama.vscode 或 Continue）；`janas-mcp` 把模型当作工具给 Claude Code、编辑器和其他 MCP 客户端。**具体配置本文只给了文档链接**（`docs/serving.md`、`docs/code-completion.md`、`docs/chat.md`），README 里没有可复制的配置片段。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现**：把“因为内存装不下所以本地跑不了”的 MoE 模型变成可跑——原文唯一的量化例子是 Qwen3-Next-80B-A3B（48.4 GB）在 32 GB 笔记本上读 62 tok/s、写 24 tok/s（llama.cpp 同一文件 16 / 2.8）。此外它可作为编辑器代码补全的后端（如 Qwen3-Coder-30B-A3B），以及作为工具暴露给 MCP 客户端。
2. **任务匹配**：最适合 **MoE** 模型（每个 token 只激活少数专家，所以可以只把要用的专家从 SSD 读进来）；dense 模型也有覆盖，但相对 llama.cpp 的优势更小（Qwen3-4B 193 vs 164，Gemma-4-12B-it 65 vs 46）。带自带回溯块的模型在聊天里更快（Qwen3.5、Qwen3.6、Qwen3-Next 自带预测块，Gemma 4 自带小起草模型；80B 靠它从 24 提到 37 tok/s）；Qwen3-30B-A3B 和 densed Qwen3 没有这个块。GPU 走 Vulkan，原文机器用集成 Arc；关掉 GPU 时 Qwen3-4B 读 85 tok/s、写 27。
3. **条件供给**：需要 NVMe SSD（跑 80B 时专家缓存约 19 GB，其余从盘读）、空闲内存（缓存吃掉打开模型时系统空闲的内存）、模型文件（HF 上预转换的 `.jns`，或自行转换 GGUF）、用 GPU 时的 Vulkan 驱动。给用户的控制手段：`--cache <GiB>`（内存硬上限）、`JANAS_GPU=0`（完全不用 GPU）。反馈通道：把 `janas-bench` 的报告发回仓库。数据写入只发生在 `~/.cache/janas`（它学到的本机信息、读过的系统消息）和你指定的模型输出位置。
4. **主动推进**：原文**没有**给出靠时间/事件/状态触发的持续运行方式；`janas-chat` 是交互式的，`janas-bench` 是按需跑的。唯一沾边的常驻用法是把模型当服务跑（`janas-server` / `janas-mcp`）供编辑器或 MCP 客户端每次请求时调用——触发来自调用方而不是 Janas 自身（代码补全原文说每次提案 1.5–2.2 秒）。
5. **效果验证**：`janas-bench` 取三轮均值，并与同机同文件上的 llama.cpp 对比（`llama-bench -p 1024 -n 16 -ngl 99 -t 12`，Vulkan 后端）。原文给了逐模型的“读 prompt / 写回复”tok/s 表，以及 draft 存活率（Qwen 系与 Gemma 两个较大模型 74–89%，Gemma E2B/E4B 63–72%；意大利语散文上 Qwen3.5-2B 只剩约三分之一且几乎没有收益），并提醒 64 token 的一轮有 ±10% 噪声、首轮更慢（缓存在填）。

## 与已有做法的关系（对照给出的清单条目）

清单中有两条相关：

- **Claude Code（状态 adopt）**：README 说 `janas-mcp` 可以把这个模型作为工具提供给 Claude Code、编辑器和其他 MCP 客户端；但本文只有这句话和一串文档链接，没有可复制的 MCP 配置，不能直接照做。
- **Cursor（状态 watch）**：本文没有提到 Cursor。沾边的编辑器用法是 VSCodium / VS Code 的代码补全（llama.vscode 或 Continue），同样没有给出配置片段。

另外文中反复出现的 **llama.cpp** 是它自己选的对照基准，不在给出的清单条目里。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**证据（原文给的）**：两张基准表，同机同文件对比 llama.cpp（build `2b18470`，2026-09-18，Vulkan 后端），测量日期 2026-10-09~11；方法为 `llama-bench -p 1024 -n 16 -ngl 99 -t 12` 对 `janas-bench --prompt 1024 --gen 16`，多数模型两边各三轮取均值（`llama-bench -r 3` 与 `janas-bench --rounds 3`）。80B 模型上 Janas-LLM 不加任何选项，专家缓存约 19 GB；llama.cpp 在 48.4 GB 文件上常规构建会爆内存，需要不带 repack 的构建（`GGML_CPU_REPACK=OFF`）再加 `--no-host 1 -lm mmap`，得到 16 tok/s 读、2.8 tok/s 写（开 GPU 时写 2.0）。另有 Windows 11 上的一组数（Qwen3-4B 写 25.6 tok/s、读 346 对 Linux 的 193）。

**只是作者主张**：“另一台机器会得到另一组数字”，引擎按自身测量自己选线程与配置——原文说这部分是设计成可迁移的，但从未在其他 CPU（尤其没有 AVX-VNNI 的、或 AMD）、独立显卡、更慢的磁盘、更多或更少内存上试过。

**局限与适用条件**：全部开发与测量只在**一台**机器上完成（Debian 13、Intel Core Ultra 9 185H、集成 Arc、32 GB DDR5、1 TB NVMe 约 5.7 GB/s）；作者自称**这是实验而不是产品**：API 和命令行每周都在变、稳定性“Not verified”；它会刻意吃满空闲内存并以 `O_DIRECT` 全速读盘，余量不足的机器可能被推进 swap、桌面变慢甚至无响应，用 GPU 曾导致一次驱动复位；因此适用条件基本是“一台余量充足（原文 32 GB 内存跑 48 GB 模型）、有 NVMe、且可以独占使用的 x86-64 机器”。两套工具的测量方式并不完全相同（llama-bench 写之前没有 prompt，janas-bench 在 1024 token 之后），且都是单机数据。表中的模型名与日期均按原文，未独立核实。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用**（半小时内，务必在空闲机器上、先关掉浏览器等大程序）：

1. 先看空闲内存，按它给 `--cache` 设一个上限，别让它吃满。
2. Linux 解压预编译包后先跑 `JANAS_GPU=0 ./janas-chat` 建立无 GPU 基线；Windows 用 `.\janas-chat`。
3. 选一个和你内存相当或略超的 MoE 模型（先用 30B-A3B 级别，再试 48.4 GB 的 80B），问一个英文问题（原文用的是 “explain how bread is made at home”），录下读 prompt 和写回复的手感速度。
4. 跑 `janas-bench --prompt 1024 --gen 16 --rounds 3` 拿本机数字，并用同机同一个模型、同一组参数跑 llama.cpp 作对照。
5. 确认要接进工作流时，再用 `janas-server` / `janas-mcp`，按 `docs/serving.md`、`docs/code-completion.md` 配置（README 没给片段，这一步必须读文档）。

**判断有没有改善的指标**：

- **能不能跑起来**：一个“内存装不下”的大 MoE 模型是否真的能加载并给出回答。
- **速度**：读写 tok/s 是否达到可用（原文 80B 上 24–37 tok/s）；与同机 llama.cpp 同模型同参数相比是否明显更快。只快一点点甚至更慢，就不值得引入。
- **代价**：桌面是否被推进 swap 或变卡、是否出现驱动复位；加上 `--cache` 上限后是否稳定。
- **质量**：同样的 prompt 下输出是否可用（模型本身相同，差异应只体现在速度上）。
- **采纳门槛**：“能跑起本来跑不动的模型”和“明显快于现有本地方案”两者至少满足一个、且机器不失控，才把它写进日常工作流；否则只当作思路储备。
