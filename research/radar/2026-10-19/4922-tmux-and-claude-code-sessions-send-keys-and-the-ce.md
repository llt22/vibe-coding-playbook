# Tmux and Claude Code: Sessions, Send-Keys, and the Ceiling

- 结论：**值得一试**。把 tmux 作为 Claude Code 的保活与脚本化外壳来使用：一个仓库一个会话，一个任务一个窗口，用 send-keys 驱动、用 capture-pane 读回、把日志写入文件，这样值得小范围试用，因为原文给出的命令和配置可直接照抄且能解决“断开即中断”和“多实例无入口”这两个真问题；但状态检测靠屏幕抓取、无完成事件、重启即失，这些边界要一并接受。
- 原文：https://crystl.dev/guides/tmux-for-ai-agents/
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-19T10:29:29.537Z

## 是什么

一篇面向 AI 编码智能体（主要是 Claude Code）的 tmux 实操指南。核心主张是：编码智能体是「长期运行、要一直挂在终端上的进程」，而 tmux 的三个特性正好对得上——服务端持有 pty，断开终端或 SSH 断了它仍在跑；一个窗口里容纳多个命名会话；任何外部 shell 都能往运行中的智能体里敲键或读屏（`send-keys` / `capture-pane`），不需要自己造 IPC 或接 API。

文章结构：先讲内置路径 `claude --worktree --tmux`，再讲内置路径覆盖不到的手工做法（多实例布局、配置增量、脚本驱动、读回、状态栏监控、SSH），最后明确 tmux 的边界，并顺势推荐作者自家的 crystl 终端作为「多智能体待审批」场景的替代品。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 说明：原文代码块在网页抓取后有多余空格（如 `out = ""`、`local dir = "${1:-$PWD}"`），照抄前需去掉 `=` 两侧空格。

### 第 0 步：先试内置路径（前提：较新的 Claude Code，`claude --help` 能看到 `-w/--worktree` 与 `--tmux`）

```
claude --worktree --tmux

# or name the worktree
claude --worktree auth-refactor --tmux
```

两个前提细节：`--tmux` 不带 `--worktree` 会报错（它是 worktree 的附属功能，不是通用会话开关）；在 iTerm2 上它用 native panes 而非真 tmux，后面所有 tmux 命令都无从附着。**要脚本化就必须加 `=classic`**：

```
claude --worktree --tmux=classic
```

单 agent、单分支的场景到此为止，不必往下看。

### 第 1 步：一会话一仓库，用 repo 名命名

组织规则：不是一任务一会话、也不是一智能体一会话，而是**一个 repo 一个 session**——任务是流动的，项目是稳定的。

```
# start a detached session in a project directory
tmux new-session -d -s api -c ~/code/api

# attach to it (creates it if it doesn't exist)
tmux new-session -A -s api -c ~/code/api
```

`-A` 是 attach-or-create，可以重复执行，因此适合包成 shell 函数：

```
# ~/.zshrc
agent () {
  local dir="${1:-$PWD}"
  local name="$(basename "$dir" | tr . -)"
  tmux new-session -A -s "$name" -c "$dir"
}
```

会话名不能含 `.` 或 `:`（tmux 用作 target 分隔符），所以有 `tr . -`。

巡检：

```
tmux ls
tmux list-sessions -F '#{session_name} windows=#{session_windows} attached=#{session_attached}'
```

### 第 2 步：会话内按任务开窗口，只为正在盯的开 pane

```
tmux new-window -t api -n auth -c ~/code/api
tmux new-window -t api -n tests -c ~/code/api
```

没在盯的智能体用 window（不占屏幕），要并排看的 2–3 个才用 pane：

```
# split the current window and tile whatever is in it
tmux split-window -h -c '#{pane_current_path}'
tmux split-window -v -c '#{pane_current_path}'
tmux select-layout tiled
```

`-c '#{pane_current_path}'` 极易漏写：漏了就会在会话初始目录开 pane，智能体被指到错误的仓库。两种命名布局：

```
tmux select-layout main-vertical
tmux set-window-option main-pane-width 60%
```

百分比值需要 tmux ≥ 3.2（`tmux -V` 查），旧版用绝对列数 `main-pane-width 120`。

### 第 3 步：写入 `.tmux.conf` 的「增量」配置

只列与智能体负载相关的差异项：

```
# agents produce a lot of output, and you will want to scroll back through it
set -g history-limit 100000

# 24-bit colour, so agent TUIs render the way they were designed to
set -g default-terminal "tmux-256color"
set -ga terminal-overrides ",*256col*:Tc"

# scroll and click between panes with the mouse
set -g mouse on

# don't let a running process rename the window out from under you
set -g allow-rename off
set-window-option -g automatic-rename off

# 1-indexed windows match the number keys on your keyboard
set -g base-index 1
set-window-option -g pane-base-index 1
set -g renumber-windows on

# flag windows whose agent produced output while you were elsewhere
set-window-option -g monitor-activity on
set -g visual-activity off

# status line refreshes often enough to be a monitor
set -g status-interval 5

# no delay when an agent's TUI reads an escape sequence
set -sg escape-time 10

# jump panes without the prefix key
bind -n M-h select-pane -L
bind -n M-j select-pane -D
bind -n M-k select-pane -U
bind -n M-l select-pane -R

# reload without restarting the server
bind r source-file ~/.tmux.conf \; display-message "config reloaded"
```

两条解释值得记：`allow-rename off` 是因为智能体 TUI 爱改终端标题，会把命名好的 `auth` 窗口改成它自己想叫的名字；`escape-time 10` 治「方向键在智能体里发粘」。

### 第 4 步：用 `send-keys` 驱动智能体

目标语法 `session:window.pane`：

```
tmux send-keys -t api:auth "run the test suite and fix what fails" Enter
```

三个坑，按出现频率排序：

1. 裸参数会被当键名。`Enter`、`C-c`、`Escape`、`Space` 是键不是文本，提示词里出现这些词会被当按键发出。用 `-l` 发字面量：

```
tmux send-keys -t api:auth -l "press Enter to continue was the old flow"
tmux send-keys -t api:auth Enter
```

`-l` 完全禁用键名解析，所以换行要单独一次调用。

2. 分号会截断 tmux 命令。文本里的 `;` 要转义成 `\;`。

3. 智能体 TUI 需要在文本和回车之间留一拍。很多输入框会 debounce 或粘贴后重绘，同一帧到达的 Enter 会被吞。可靠写法：

```
tmux send-keys -t api:auth -l "$PROMPT"
sleep 0.3
tmux send-keys -t api:auth Enter
```

打断失控的智能体用同一套机制：

```
tmux send-keys -t api:auth C-c
```

### 第 5 步：用 `capture-pane` 读回

```
# the visible screen
tmux capture-pane -p -t api:auth

# the last 200 lines, with wrapped lines joined back together
tmux capture-pane -p -J -S -200 -t api:auth

# the entire scrollback
tmux capture-pane -p -J -S - -t api:auth

# keep the colour escape sequences
tmux capture-pane -p -e -t api:auth
```

`-J` 比看上去重要：不合并折行时，一行在终端宽度处断成两行，之后任何 grep 在接缝处都是错的。

### 第 6 步：落盘成全量日志

```
tmux pipe-pane -o -t api:auth 'cat >> ~/agent-logs/api-auth.log'

# stop it
tmux pipe-pane -t api:auth
```

`-o` 是 toggle，跑两次即关闭。输出是原始流（含转义序列），要可读需过一道 `sed -E 's/\x1b\[[0-9;]*[a-zA-Z]//g'`。

### 第 7 步：状态栏监控（可选，作者自己说它是补丁）

```
set -g status-interval 5
set -g status-right '#(~/bin/tmux-agent-status) | %H:%M'
set -g status-right-length 100
```

```
#!/usr/bin/env bash
# ~/bin/tmux-agent-status
out=""
while read -r target; do
  screen="$(tmux capture-pane -p -J -S -8 -t "$target" 2>/dev/null)"
  name="${target%%:*}"
  case "$screen" in
    *"Do you want"*|*"❯ 1."* ) out+="⏸ $name " ;;   # parked on a prompt
    *"esc to interrupt"* )     out+="● $name " ;;   # working
    * )                          out+="○ $name " ;;   # idle
  esac
done < <(tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}')
printf '%s' "$out"
```

轻量替代（不抓屏，用 tmux 原生活跃度追踪）：

```
set-window-option -g monitor-silence 30
set -g visual-silence on
```

```
set-hook -g alert-silence 'run-shell "osascript -e \"display notification \\\"agent idle\\\"\""'
```

### 第 8 步：SSH / 远程机器（tmux 最不可替代的场景）

```
# attach or create, in one command, with a tty allocated
ssh devbox -t tmux new-session -A -s agents
```

断线后重跑同一条命令即回到同一会话。链路太差可配 mosh。嵌套 tmux 冲突两种解法：远端改前缀 `set -g prefix C-a`，或按两次 prefix（`bind C-b send-prefix`）。

### 第 9 步：知道它会活过什么、活不过什么

| 事件 | 智能体继续跑？ |
| --- | --- |
| 关终端窗口 | 是 |
| detach 客户端 | 是 |
| SSH 断开 | 是 |
| `tmux kill-session` | 否 |
| `tmux kill-server` | 否 |
| 重启机器 | 否 |

配套命令：`tmux detach-client`、`tmux attach -t api`、`tmux switch-client -t web`、`tmux kill-session -t api`。滚动缓冲随服务端停止而丢失，要留证据只能 `pipe-pane` 落盘。另一处细节：detached 会话的 pane 按最后一次 attach 的客户端尺寸算，从未 attach 过则按 80x24，重连后要等 TUI 重绘；多客户端不同尺寸时开 `set-window-option -g aggressive-resize on`。

## 对应的研究问题

**1. 能力发现**
原文把两类「以前不会交给 AI」的用法显式写出来：一是跨终端/跨 SSH 的长跑任务（不再需要人守着）；二是「从 cron、git hook 或另一个智能体去驱动智能体」——`send-keys` 是脚本化下指令的通用口子。

**2. 任务匹配**
- 单 agent、单分支：内置 `claude --worktree --tmux` 就够，不必手搓 tmux。
- 需要隔离的并行任务：worktree（内置）或「一会话一仓库 + 一任务一窗口」（手工）。
- 远程机器上的长跑任务：tmux 是「真正难以替代」的答案，作者明确建议这块继续用 tmux。
- 需要人频繁审批、数量到五六个以上的多智能体：作者认为问题已不是「多路复用」，转向有结构化状态信号的终端（即其自家产品）——这条带推销性质。
- 没在盯的用 window，要并排盯的 2–3 个用 pane，`main-vertical` 适合「一个主驱动 + 其余堆叠」。

**3. 条件供给**（本文最强项）
给出的是可核对的清单：真 tty（`ssh -t`）、git worktree 隔离、`--tmux=classic` 而非 iTerm2 native panes（否则无法脚本化）、`history-limit` 与 `escape-time` 等终端侧参数、`-l` 字面量模式、`sleep 0.3` 的输入节拍、`capture-pane -J` 的读回参数、`pipe-pane` 的日志落盘、`aggressive-resize` 的尺寸一致。

**4. 主动推进**
有触发机制但没有完成事件：`send-keys` 可由 cron / git hook / 另一个 agent 触发；`monitor-silence` 在 pane 静默 N 秒时告警，可挂 `set-hook alert-silence` 发通知。但作者自己点明「静默只是『做完了』的代理指标，不是报告」——大文件思考中的智能体同样静默。

**5. 效果验证**
原文基本没有给。唯一沾边的是状态栏脚本（工作/等审批/空闲），作者还主动说明它是「对 TUI 渲染帧做字符串匹配 + 5 秒轮询 + 匹配串随版本变化」，属于脆弱近似。没有任何关于产出质量是否提升的数据。

## 与已有做法的关系

清单中只有 **Claude Code（tool，adopt）** 一条。本文不是 Claude Code 的替代，而是它的**运行时/编排层补充**：

- `claude --worktree --tmux` 是 Claude Code 自带能力，本文的价值在于指出它的两个陷阱（必须配 `--worktree`；iTerm2 下要 `=classic` 才能被脚本化）。
- 其余部分（会话保活、`send-keys` 驱动、`capture-pane` 读回、`pipe-pane` 落盘、SSH）都在 Claude Code 之外，属于「怎么让 Claude Code 持续跑、批量跑、远程跑」的供给侧做法。
- 文末的 crystl 是作者自家 macOS 终端，不在清单中，且属商业推荐，只能当线索看。

清单中没有其他相关条目。

## 证据与局限

**给的是命令与配置，不是数据。** 全文没有基准、没有对照实验、没有失败率统计。可作为「可照做」依据的是命令本身（`tmux send-keys -l`、`capture-pane -J -S -200`、`ssh -t tmux new-session -A` 等在 tmux 语义下成立），而不是任何效果声明。

**来源带利益相关。** 文章发表在 crystl 官方博客，正文大半是中立的技术说明，但结尾把边界清单一一映射到自家产品功能（浮动审批卡、agent 活动面板、结构化输出、项目/分片、worktree 支撑的隔离），并给出「什么时候别用 tmux」的建议。这部分按宣传处理，不进入采纳。

**作者自己承认的脆弱点（可直接采信为局限）：**
- 状态栏脚本是「对一个 TUI 渲染帧做字符串匹配」，匹配串是「你的智能体这周恰好打印的东西」，UI 一改解析就坏。
- `capture-pane` 拿到的是渲染帧——spinner、框线、截断列、ANSI——不是「智能体说了什么、调了哪个工具、成功没有」。
- 会话之间无共享状态：两个会话里的智能体互相看不见，要交接得自己用文件、锁、轮询搭。
- `history-limit 100000` × 十几个 pane 是实打实的内存，且服务端一停就没了。
- 重启后一切全失，tmux 服务端只是你的用户进程。

**需要在本地核实的适用条件：** 「recent versions」才有的 `-w/--worktree` 和 `--tmux`（旧版没有，需要退回手工 tmux + 手动 `git worktree`）；`main-pane-width` 百分比需 tmux ≥ 3.2；`set-hook alert-silence` 需较新的 tmux；文中示例日期写的是 2026 年，说明是较新版本环境。另外原文代码在抓取中出现了空格错位（`out = ""`、`local dir = "..."`），照抄脚本必须先修语法。

## 怎么试、怎么验证

**最小试用（半天，一个仓库）：**

1. 先跑 `claude --help` 确认 `-w/--worktree`、`--tmux` 存在；不存在则跳到第 3 步手工路径。
2. 用内置路径起一次：`claude --worktree try-tmux --tmux=classic`，确认它是真 tmux（`tmux ls` 能看到）而不是 iTerm2 分屏。
3. 按第 3 步只改五条关键配置：`history-limit 100000`、`escape-time 10`、`allow-rename off` + `automatic-rename off`、`base-index 1`、`monitor-activity on`。其余等有需要再加。
4. 建 `agent` shell 函数，在同一仓库开两个窗口（如 `auth`、`tests`）。
5. 写一个提示词文件，用 `send-keys -l` + `sleep 0.3` + `Enter` 三行驱动一次，再用 `capture-pane -p -J -S -200` 读回结果。
6. 对该窗口开 `pipe-pane` 落盘，跑完 `grep` 一次日志，确认能查到失败原因。
7. 中途关掉终端窗口、断开 SSH 各一次，验证任务仍在跑并能 `attach` 回来。

**判断有没有改善的指标（都能人工数出来，不需要造基准）：**

- **连续性**：断线/关窗后任务仍完成的比例（试用前 vs 试用后，各记 5 次）。
- **人工介入步数**：从「想给智能体下一条指令」到指令真的发出去，需要几次鼠标/键盘操作（目标从「切窗口+找输入框」降到一条命令）。
- **误判率**：状态栏（或人工）判断「在跑 / 在等审批 / 已停」与实际的偏差次数。这是检验第 7 步是否值得保留的关键——如果一周内误判超过几次，就别用抓屏方案，退回 `monitor-silence`。
- **可回溯性**：事后能否只靠 `pipe-pane` 日志还原「它调了什么、为什么失败」，成功率记 10 次。
- **产出质量对照**：同一类任务，前台直接跑 vs tmux 常驻跑，各 3 次，比人工返工次数与返工原因——原文没给这个数据，必须自己产。

**不建议照搬的部分：** 状态栏抓屏脚本（先按上面的误判率验证再决定是否长期保留）、crystl 相关推荐（属商业信息）、以及在没有 `--worktree` 支持的版本上硬套 `--tmux` 参数。
