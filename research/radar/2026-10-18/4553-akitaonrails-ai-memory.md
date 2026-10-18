# akitaonrails/ai-memory

- 结论：**值得一试**。先在单机、单仓库、只接一个 agent（Claude Code 或 Codex）的情况下按 README 的两条命令装上并跑一到两周，用「新会话是否还要重新交代背景」来判断是否值得留下；因为原文确实给出了可直接复制的安装、接线、启动和回滚命令，但所有收益说法都只有项目自述、没有独立验证，且要常驻服务并采集提示词与工具调用，必须先小范围试。
- 原文：https://github.com/akitaonrails/ai-memory
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-18T02:19:14.220Z

## 是什么

ai-memory（akitaonrails/ai-memory，MIT，Rust 单二进制）是给 AI 编码智能体用的长期记忆层。它的管线在 README 里写得很清楚：

```
capture ──▶ consolidate ──▶ recall ──▶ handoff
 hooks        session-end      search     next agent,
 observe      summaries as     + brief    any harness
 silently     wiki pages       injection
```

agent 在你工作时通过生命周期钩子发出经过清洗（sanitize）的观察；会话结束时这些观察变成项目 wiki 里的 Markdown 页面（可选由 LLM 撰写，但不配 LLM 也有用）；下一次会话在任何 agent、任何机器上，先收到一段有长度上限的 brief，并且可以检索全部历史（全文、实体、链接，可选向量，融合成一个排序）。跨 agent 交接是显式的、带类型的 claim-once 协议：每个 handoff 有 owner，只会被领取一次。真相源是 git 托管的普通 `.md` 文件（可以 grep、用 Obsidian 打开、手工编辑、rsync），数据库只是可随时从文件重建的派生索引。默认路径零 LLM 调用：捕获、搜索、handoff 都不需要 API key。

主要卖点（README 自称）：跨 agent（二十多个 harness 共用一个记忆）、跨项目（一份工作习惯 profile 带到每个新仓库）、跨机器（记忆存在你自己跑的服务器上）、团队共享（多用户认证、按人归属、审计日志，且不是付费档）、记忆是纯 Markdown、静默捕获、无 LLM 的记忆老化（按 tier 衰减、被用得越多衰减越慢、冷笔记压成持久事实、近似重复合并、疑似矛盾标记）、可选的 LLM「dream」后台重写、以及自陈的诚实性（写入上限 ~700/s 是实测的）。

## 具体做法

以下命令与配置均按 README 原文照抄。请先在测试机上做第 1 步，确认有效再推到主力环境。

**1. Linux / macOS 原生安装（两条命令，无需 root；前提：能访问 GitHub releases 和 curl）**

```bash
curl -fsSL https://github.com/akitaonrails/ai-memory/releases/latest/download/install.sh | sh
ai-memory setup
```

`install.sh`：按你的 OS/CPU 下载对应 release，用发布页公布的 SHA-256 校验（不匹配就拒绝安装），把 `~/.local/bin/ai-memory` 链接好。

`ai-memory setup`：创建带 bearer token、权限为 owner-only 的数据目录；启动 per-user 服务（systemd `--user` 或 launchd LaunchAgent）；为它发现的每个 agent 接好 MCP、hooks 和 Agent Skills。它会先打印计划、显示每个 agent 是在哪里被找到的，然后询问：答 `y`，或输入要接线的 agent 编号。

相关开关（同一段原文）：`--plan` 只打印计划不做任何改动；`--web` 把计划显示成浏览器页面、勾选后应用；`--yes` 跳过询问；再次运行不会改动任何东西；`--agent` 指定要接的 agent。

装完后重启你的 agent，问它一句 “What do you remember about this project?”，如果它通过 ai-memory 回答，就说明接线成功。

**2. Windows（PowerShell，无需管理员；前提：Windows 环境，或只考虑 WSL2）**

```powershell
irm https://github.com/akitaonrails/ai-memory/releases/latest/download/install.ps1 | iex
ai-memory setup
```

`install.ps1` 校验 release zip 的 SHA-256，解到 `%LOCALAPPDATA%\Programs\ai-memory` 并加进用户 `PATH`。`setup` 做的事与 Linux/macOS 相同，只是用登录项代替系统服务：登录时启动服务器、无控制台窗口、失败会重启。README 把「原生 Windows」标为 Experimental，更稳的路子是 WSL2 或 Docker Desktop（见 `docs/windows.md`）。

**3. Arch Linux / Fedora 走包管理器（前提：对应发行版）**

```bash
yay -S ai-memory-bin    # 预编译 Linux x86_64/aarch64 二进制
yay -S ai-memory        # 从源码构建
ai-memory setup         # 数据目录、用户服务、agent、自检
```

```bash
sudo dnf install ./ai-memory-*.rpm
ai-memory setup
```

系统级服务装法用 `/var/lib/ai-memory` 与 `/etc/ai-memory/`，细节在 `docs/install.md#arch-linux-native-packages-aur`。

**4. macOS 菜单栏 App（前提：Rust 工具链 + Xcode / Swift 6）**

```bash
git clone https://github.com/akitaonrails/ai-memory
cd ai-memory
./companions/ai-memory-macos/build.sh
open "companions/ai-memory-macos/dist/AI Memory.app"
```

把 **AI Memory.app** 拖到 `/Applications`，在菜单项里点 **Install & Start Server**（无 Dock 图标）。App 会读取 `init` 写进数据目录的 bearer token，状态图标自行变绿。再接 agent 时用 App 自带的二进制，并用 `--no-service` 把服务交给 App 的 LaunchAgent：

```bash
BIN="/Applications/AI Memory.app/Contents/Resources/runtime/ai-memory"
"$BIN" setup --no-service
```

Wiki、SQLite、config、模型都放在 `~/Library/Application Support/ai-memory`，替换 App 只是更新，不会重写这棵目录树。

**5. Docker（前提：Docker 或 Podman + 一个支持 MCP 的 agent CLI）**

注意：这段官方 quick-start **没有认证**——容器没跑 `init`，所以不带 token 启动；服务只绑 loopback，机器外面的东西够不着，但本机进程和浏览器页面可以。

```bash
# 1. 安装 ai-memory CLI wrapper（一个小 shell 脚本，在容器里跑二进制并挂载 $HOME）。
#    这是唯一需要放在宿主文件系统上的东西。
mkdir -p ~/.local/bin
wrapper_tmp="$(mktemp -d)"
trap 'rm -rf "$wrapper_tmp"' EXIT
wrapper_base=https://github.com/akitaonrails/ai-memory/releases/latest/download/ai-memory-wrapper
curl -fsSL "$wrapper_base" -o "$wrapper_tmp/ai-memory-wrapper"
curl -fsSL "$wrapper_base.sha256" -o "$wrapper_tmp/ai-memory-wrapper.sha256"
expected="$(awk 'NR == 1 { print $1 }' "$wrapper_tmp/ai-memory-wrapper.sha256")"
if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$wrapper_tmp/ai-memory-wrapper" | awk '{ print $1 }')"
else
    actual="$(shasum -a 256 "$wrapper_tmp/ai-memory-wrapper" | awk '{ print $1 }')"
fi
[ -n "$expected" ] && [ "$actual" = "$expected" ] || { echo "wrapper checksum mismatch" >&2; exit 1; }
install -m 0755 "$wrapper_tmp/ai-memory-wrapper" ~/.local/bin/ai-memory
rm -rf "$wrapper_tmp"
trap - EXIT
# 多数发行版会自动把 ~/.local/bin 加进 PATH。如果 `which ai-memory` 是空的，
# 把下面这行加进 ~/.bashrc / ~/.zshrc：
#     export PATH="$HOME/.local/bin:$PATH"

# 2. 启动服务器。--restart unless-stopped 让它在 docker 守护进程重启和机器
#    开机后回来（前提是 docker 服务本身已 enable）。只绑 loopback
#    （127.0.0.1:49374），机器外部够不着。想要零 LLM 模式就删掉 LLM /
#    EMBEDDING 那几行——没有 key，FTS5 搜索照样能用。
docker run -d --name ai-memory \
    --restart unless-stopped \
    -p 127.0.0.1:49374:49374 \
    -v ai-memory-data:/data \
    -e AI_MEMORY_LLM_PROVIDER=anthropic \
    -e ANTHROPIC_API_KEY=sk-ant-... \
    -e AI_MEMORY_EMBEDDING_PROVIDER=openai \
    -e OPENAI_API_KEY=sk-... \
    docker.io/akitaonrails/ai-memory:latest

# 3. 两条命令把 agent CLI 接上。wrapper 负责挂载和各客户端的配置路径探测。
#    换成 --agent codex、--agent command-code、--agent devin、--agent opencode、--agent opencode2、--agent gemini-cli、
#    --agent grok、--agent kimi-code、--agent kiro-cli、--agent copilot-cli、--agent droid、--agent muse、--agent omp、
#    --agent oh-my-pi、--client cursor、
#    --client gemini-cli、--client grok、--client kiro-cli 等可以接更多 agent；
#    完整列表在 docs/install.md。
ai-memory install-mcp   --client claude-code --apply
ai-memory install-hooks --agent  claude-code --apply
```

在 Linux/macOS 上，Docker wrapper 会通过校验过 checksum 的**原生宿主客户端**去跑 `install-hooks`，所以装上的 hook 会在事件进入 spool 或网络之前就执行客户端的捕获策略（如 `[capture] ignore_paths`、allowlist 模式）。只有当确实需要旧的 shell 兼容路径时，才显式设 `AI_MEMORY_HOOK_PLATFORM=posix`——安装器会警告那条路径无法强制 capture policy v1。用 Podman 就把 `docker` 换成 `podman`；wrapper 在没装 Docker 时会自动用 Podman，两者都有时用 `AI_MEMORY_DOCKER=podman` 强制。

**6. 首选启动方式：用 `ai-memory run` 启动 harness（前提：先完成上面的安装）**

```bash
ai-memory run claude
ai-memory run codex --yolo   # 同一 workstream + 本地 Claude 历史 dossier
ai-memory run --profile work claude  # 可复用的 config.toml env/account 预设
ai-memory continue           # 恢复最新的 managed checkout
# 启动器死掉留下 lease 时（仅限同一操作者）
ai-memory run --force-unlock codex
ai-memory resume             # 只在这个 checkout 的所有 workstream 里挑
ai-memory resume --search auth # 按名字找 workstream（不区分大小写）
ai-memory resume --all       # 跨所有已链接的 checkout 挑
```

为什么推荐：它第一次跑某个 harness 时会自动给那个 harness 装上 ai-memory 的 hooks + MCP（这样就不会忘了单独跑 `install-hooks`/`install-mcp`），按构造接好正确的项目 scope，并在共享记忆之上再加一层跨 harness 的**会话**连续性。所有操作幂等，每个 harness 和 config home 只做一次。服务器不可达时 `run` 会警告并照常本地捕获 spool，服务器恢复后跑 `ai-memory recover`；要失败关闭就加 `--require-server`。

`--force-unlock` 立即让选中 workstream 的活动 lease 过期——只在你确定上一个启动器已经没了的时候用；它不会杀原生进程，也无法驱逐另一个已认证操作者的运行。

在真正的 harness 切换时，接手的 managed agent 会被要求：当你要求继续、而有界可移植包缺细节时，去查 `AI_MEMORY_PREVIOUS_SESSION_HISTORY`。该变量指向一个私有的临时 Markdown 投影，由上一个 harness 的 checkout 校验过的只读适配器生成，managed 子进程退出时文件消失，且只存在于启动器所在机器。这条路径需要 3.1.0 或更新的宿主客户端；如果变量没出现，先在启动 shell 里跑 `type -a ai-memory` 和 `ai-memory --version`，PATH 里靠前的旧 Cargo/包管理器二进制会遮蔽更新过的 wrapper。

自动接线默认开，用 `ai-memory run --no-autowire` 或 `AI_MEMORY_RUN_AUTOWIRE=false` 关闭。

**7. 更新与卸载（前提：装过；卸载只删它自己装的东西）**

原生路径更新：`ai-memory upgrade`（校验 checksum 的 GitHub release 替换 + 刷新 hook）。2.x 升 3.0 前先读 `docs/upgrading-to-3.0.md`。

```bash
ai-memory uninstall --apply
```

它会清掉 `ai-memory run` 的自动接线记录，所以下次 managed 启动会重新接线；要保持不接线就用 `--no-autowire` 启动或设 `AI_MEMORY_RUN_AUTOWIRE=false`。安装命令幂等，写文件时会在旁边留时间戳备份。

**8. NixOS（前提：NixOS + flakes）**

```nix
{
  inputs.ai-memory.url = "github:akitaonrails/ai-memory";

  outputs = { nixpkgs, ai-memory, ... }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ai-memory.nixosModules.default
        {
          services.ai-memory = {
            enable = true;
            # enableWeb = true;  # 默认关，Web UI 是 opt-in
            # enableApi = true;  # 只要 API 的伴生组件，无浏览器 UI
            settings = {
              allowed_hosts = [ "localhost" "127.0.0.1" "::1" "homelab.example" ];
              log_level = "info";
            };
            # Loopback（默认）：密钥可省；缺 env 文件也容忍。
            # 非 loopback：必须设 ageSecret、sopsSecret 或 environmentFile 之一。
            # ageSecret = "ai-memory-env";  # config.age.secrets.<name>（agenix）
            # sopsSecret = "ai-memory/env"; # config.sops.secrets.<name>（sops-nix）
          };
        }
      ];
    };
  };
}
```

关键约束（原文明确）：`settings` 里的任何东西（包括 `llm_headers`）会落到 world-readable 的 Nix store 路径，所以 API key 不要放那里；`AI_MEMORY_AUTH_TOKEN`、`AI_MEMORY_LLM_HEADERS` 要放 `ageSecret` / `sopsSecret` / `environmentFile`（三者互斥）。非 loopback 绑定必须有其中一个；loopback 可省并容忍 env 文件缺失（systemd `EnvironmentFile=-…`）。LAN/WAN 绑定前面要放 TLS，见 `docs/https-via-proxy.md`。`git` 是运行时依赖（hook 捕获和 `ai-memory doctor` 要用它读仓库），模块会把 `pkgs.git` 放进服务 `PATH`。

**9. 可选：服务器渲染的管理控制台（前提：编译时和运行时双重 opt-in）**

用 `--features management-ui` 编译，然后 `serve --transport http --enable-management-ui`。提供用户管理、会话检视与删除、个人 MCP API key。

**10. 可选：让记忆「做梦」（前提：配了 LLM，且明确 opt-in）**

配置了 LLM 之后，一个 opt-in 的后台 pass 会在你空闲时把整簇冷笔记重写成连贯页面，你一回来工作就取消。它从不删源（合并前的版本仍可取），默认关，且必须先通过一次 recall eval 才可能成为默认行为。

**11. 自查命令（用于验证第 1 步是否真的成功）**

```bash
ai-memory status
ai-memory doctor
ai-memory --version
```

## 对应的研究问题

**1. 能力发现——AI 已经能做哪些还没想到交给它的工作**
原文把几类以前要人做的工作明确交给自动化：会话结束后的知识沉淀（观察→Markdown 页面）、跨 agent 的交接（claim-once handoff，带 owner、只被领取一次）、跨机器的项目续接（同一个项目在桌面机离开、笔记本上继续）、跨项目的个人工作习惯复用（包管理器、测试布局、架构习惯这份 profile 在每次会话开始时到达每个新仓库，位置在每个仓库规则文件之下，作为默认值）、以及团队级知识检索（一个人会话学到的东西，所有人的 agent 都能检索；按项目共享，个人 handoff 保持私有）。这些都是「不用再交代一遍」的边界扩展。

**2. 任务匹配——什么工作适合怎样的模型、工具和协作方式**
原文给了明确的分工：**默认零 LLM 调用**路径覆盖捕获、搜索、handoff，不需要 API key；**需要 LLM 才有**的主要是会话结束时把观察写成 wiki 页面（但原文说「即使没有 LLM 也有用」），以及 opt-in 的冷簇「dream」重写；**向量检索**是可选融合项，不是必需。检索是全文 + 实体 + 链接（+ 可选向量）融合成一个排序。多 agent 协作靠显式的 claim-once handoff 协议，而不是共享上下文窗口。工具侧给出了二十多个 harness 的首方集成（MCP 注册、生命周期钩子或两者）。

**3. 条件供给——需要提供哪些信息、工具、权限和反馈**
需要提供：一个你自己跑的服务器（同机、homelab 或任意位置）；数据目录和 bearer token（`setup`/`init` 自动创建，owner-only 权限）；agent 侧要重启 agent 让 hooks/MCP 生效，Codex 需要信任 `/hooks`；Codex 的 `--yolo`、`--profile` 是可选配置。非 loopback 绑定时必须提供 `ageSecret` / `sopsSecret` / `environmentFile` 之一，并在前面放 TLS。捕获边界由 `[capture] ignore_paths` 和 allowlist 模式控制，且必须在客户端生效（这就是为什么推荐原生主机客户端而非 legacy shell 路径）。反馈信号：审计日志记录每一次变更；会话结束把观察consolidate成页面。

**4. 主动推进——哪些工作可由时间、事件或状态触发并持续完成**
原文里全是这类机制：hook 在你工作时静默捕获 prompt、工具调用、会话边界（事件触发）；会话结束自动 consolidate（时间/事件触发）；下一次会话自动注入有界 brief（状态触发）；记忆按可调 tier 曲线衰减，但被使用过的衰减**更慢**——打开页面、搜索它、通过链接到达它都算使用；冷掉的 episodic 笔记可以压成持久事实（文件路径、错误码、决策）而不是被丢掉；近似重复合并成一个，疑似矛盾被标记；LLM「dream」在你空闲时重写冷簇、你回来即取消；访问加权保留永远开着，因为它只会让记忆留得更久；会改写或丢弃内容的部分（压缩、去重、分 tier 曲线）默认关，要你开了才跑。

**5. 效果验证——怎样判断确实改善了结果**
原文给出的可操作验证点：重启 agent 后问一句 “What do you remember about this project?” 看它是否通过 ai-memory 回答；`ai-memory status`、`ai-memory doctor`、`ai-memory --version` 做健康与版本核查；`type -a ai-memory` 排查 PATH 遮蔽（同机切换时 `AI_MEMORY_PREVIOUS_SESSION_HISTORY` 缺失要查这个）；审计日志记录每次 mutation；写入上限 ~700/s 是「量出来的，不是猜的」；「dream」必须通过 recall eval 才可能变默认；`restore-page` 从版本链恢复，没有任何东西被硬删除。要注意这些都是作者自陈，不是第三方评测。

## 与已有做法的关系

清单里直接相关的条目：

- **Claude Code（status: adopt）**：README 把它列为 Supported 的首行集成，且专门解释差异——Claude Code 自带记忆（`MEMORY.md` 之类）是「per-laptop」的，只在单机、单 agent 内可见；ai-memory 是把这份记忆同步到多机、多 agent、可搜索、可团队共享，并且还捕获工具生命周期。所以它是**叠加层，不是替代**。
- **OpenAI Codex（status: adopt）**：同样在支持矩阵里，且有跨 harness 交接的具体机制（`ai-memory run codex` 拿到共享 workstream + 上一 harness 的本地历史投影）。
- **Cursor（watch）、OpenCode（watch）、GitHub Copilot CLI、DeepSeek Harness、Hermes Agent、OpenClaw、ZCode、Kiro CLI、Gemini CLI** 等：均在支持矩阵中出现（Cursor = Supported、OpenCode V1/V2 自动探测 = Supported、Copilot CLI = Supported、DeepSeek Harness (DSH) = MCP-only、Hermes Agent = Supported、OpenClaw = Supported、ZCode = Supported）。**ZCode 在清单里是 avoid，但 README 说它 Supported——这是清单与该工具支持面的直接冲突，采用前应先确认。**
- **Obsidian（status: drop）**：README 明确说记忆就是普通 `.md` 文件，「open it in Obsidian, edit it by hand」。如果清单里已经判定 Obsidian 不值得用，这点不构成采用理由，但它说明产物格式是开放的、不锁死。
- **Agent skills（status: adopt）**：`ai-memory setup` 会「wires MCP, hooks and Agent Skills for every agent it finds」，属于同一生态里的互补件。
- **arXiv（status: try）**：README 只引了一篇 `A-MEM`（arXiv:2502.12110）作为 Zettelkasten 式原子笔记的来源，没有别的论文级内容。

清单里没有 Mem0、Zep/Graphiti、mcp-memory-service、basic-memory、Hindsight/OpenViking、Supermemory 等条目，但 README 自带一张对照表逐条比它们（README 说完整对比和 published benchmark 在 `docs/comparison.md`，本次原文里没有具体数字）。`catalog_related` 里也没有这些。

## 证据与局限

**原文给出的数据和案例：** 支持矩阵中每一行都是 first-party 集成（MCP 注册、生命周期钩子或两者），且在 CI 中被检查；支持二十多个 harness（Claude Code、Codex、Cursor、Gemini CLI、OpenCode、Grok、Devin、Kimi、Kiro 等）；写入上限 ~700/s「是量出来的，不是猜的」；默认路径零 LLM 调用；记忆是 git 托管的 Markdown，数据库可随时从文件重建；access-weighted retention 永远开着；改写/丢弃类功能默认关。GitHub metrics：stars 9944、今日 +178（来自输入元数据，不是 README 内容）。

**只是作者主张、没有独立证据的：** 所有收益性描述（「不用再重新解释架构、失败的尝试、未决问题」）；「零 API 调用」完成衰减、提取式压缩、DBSCAN 冷簇去重、访问强化、矛盾标记；「dream」必须先过 recall eval；与各竞品对比表里的优劣结论；声称的 published benchmark（原文未给出数字）。README 是项目自述，不是评测。

**明确的局限与适用条件：** 安装脚本是从网络管道直接执行的（虽然校验 SHA-256，但你要先信任这个链路）；hooks 会记录提示词和工具调用，是实打实的隐私边界，README 说会在「typed privacy boundary」处清洗后才存，但这同样是自述；跨项目 profile 对单用户默认**开**，共享服务器上才是 opt-in 且按人私有（`docs/cross-project-profile.md`）；本地 transcript 永远不会发给远端服务器（远端只收到 harness 和 session 身份）；原生 Windows 是 Experimental，推荐 WSL2；Docker quick-start 默认无认证（只绑 loopback，本机进程和浏览器页面仍可访问）；需要常驻服务/登录项；managed workstreams 是 opt-in；跨机器切换拿不到只存在于第一台机器的原生 transcript；NixOS 模块的 `settings` 会进 world-readable 的 Nix store，密钥必须走 secret 源。

## 怎么试、怎么验证

**最小试用（建议 1～2 周）**

1. 先 dry-run：`ai-memory setup --plan`，只看到计划，确认它打算改哪些 agent 的哪些配置文件。
2. 只在一台机器、一个仓库、只接一个 agent：跑 `ai-memory setup --agent claude-code`（或 `--web` 在浏览器里勾一个），安装脚本先按 `docs/install.md` 的方法自行校验再执行。
3. **先不要配 LLM 和 embedding key**，用零 LLM 模式跑，确认没有 API 花费、FTS5 搜索可用。
4. 日常不用改习惯，但用 `ai-memory run claude` 启动会话（这样能拿到自动接线 + 跨 harness 连续性）。
5. 中途故意切换一次：Claude Code 里干到一半退出，`ai-memory run codex` 接着干，看它是否需要你重新交代。
6. 一周后用 `ai-memory status` / `ai-memory doctor` 查健康，翻一翻 wiki 里的 Markdown，确认没有不该被记录的路径或内容；需要就用 `[capture] ignore_paths` 收窄。
7. 不满意：`ai-memory uninstall --apply` 完全回退（只删它自己装的东西，且安装时留了时间戳备份）。

**判断有没有改善的指标**

- **重复交代次数**：新会话开始时，你还需要花多少话解释架构、试过的失败方案、未决问题。人工记 3～5 次，对比装之前。这是最直接的指标，也正是它的核心承诺。
- **交接质量**：随机抽查几次会话开头的 handoff，看它说的「上次停在哪 / 什么失败了 / 还有什么没定」是否准确。出现明显错误说明 consolidate 没抓住重点。
- **跨 agent 接力成本**：从 Claude Code 切到 Codex 后，达到同等产出所需的前几句话长度。
- **健康度**：`ai-memory status`、`ai-memory doctor` 是否正常；服务器被停掉再启动后 `ai-memory recover` 能否补齐。
- **隐私**：wiki 中是否出现密钥、敏感路径、不该留的客户信息。出现一次就应该停下来重设捕获策略。
- **可选进阶**：零 LLM 模式稳定跑顺之后，再考虑开 LLM consolidation 或 embedding；按 README 的说法，「dream」默认关且必须过 recall eval，先别开。
