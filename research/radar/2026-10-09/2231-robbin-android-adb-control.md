# robbin/android-adb-control

- 结论：**值得一试**。先把该技能装到一台可信测试机上，用最低风险任务（如“打开系统设置首页并只读确认”）跑通观察—一步操作—验证的闭环，再考虑扩大范围；README 给了可照做的安装路径、调用方式和安全预算，但作者自述本版本尚未完成真机端到端验收。
- 原文：https://github.com/robbin/android-adb-control
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-09T11:45:03.078Z

## 是什么

一个 **instruction-only 的 Agent Skill**（不是独立程序、不是 MCP Server、不是后台服务），让已有 Agent 通过 ADB 操控安卓手机：观察界面、执行一步、验证结果，再决定下一步。

README 声称的用途：

- 打开 App、查找页面、点击、滑动、长按和输入文字。
- 查看授权范围内的界面信息、处理有限列表、复现测试操作。
- 准备消息草稿；明确授权后执行指定发送动作。

前置条件：基础操作只需 ADB 和已授权设备；自绘界面需要截图工具与视觉模型；中文输入可选 ADBKeyboard。技能格式与加载方式兼容 Pi Agent、Codex CLI/IDE、Claude Code、OpenCode 四类宿主，但作者明确说明“不代表已在四个宿主上完成真机验收”。云端会话或远程容器不会自动获得本地 USB 设备。

明确排除的用途：绕过锁屏、验证码、支付验证或企业策略；无人值守监控、自动交易、无限重试。

## 具体做法（编号步骤）

**1. 确认本机 ADB（前提：有可执行命令行的开发环境）**
先检查，避免重复安装：

```bash
command -v adb
adb version
```

**2. 缺失时安装 Android SDK Platform-Tools**
macOS 可用：

```bash
brew install --cask android-platform-tools
```

Windows 需使用官方 Platform-Tools 并适配路径、引号和截图输出。

**3. 安装技能（先审阅仓库）**
Pi、Codex、OpenCode 可共用一份：

```bash
mkdir -p "$HOME/.agents/skills"
git clone https://github.com/robbin/android-adb-control.git \
  "$HOME/.agents/skills/android-adb-control"
```

前提与注意：目标已存在时先检查，不要覆盖。

**4. 只用 Claude Code 时的安装方式**
把目标目录改为 `~/.claude/skills/android-adb-control`；若已装共享版本，可建兼容链接：

```bash
mkdir -p "$HOME/.claude/skills"
ln -s "$HOME/.agents/skills/android-adb-control" \
  "$HOME/.claude/skills/android-adb-control"
```

注意：OpenCode 也会扫描 `.claude/skills`，兼容链接可能引起同名告警；确认最终加载路径，不要再安装第二份副本。

**5. 项目内安装（可选）**
只想在项目内使用时，装到项目的 `.agents/skills/android-adb-control/`；Claude Code 用 `.claude/skills/android-adb-control/`。不要无意重复安装用户级和项目级技能。父项目已有 Git 时，按团队规范处理嵌套仓库或子模块。

**6. 让宿主发现技能**
Pi 执行 `/reload`；其他宿主若未发现技能，检查技能权限并重开会话。OpenCode 的技能不一定注册为同名斜杠命令。各宿主的调用方式：

| Agent | 用户级目录 | 调用方式 |
|---|---|---|
| Pi Agent | `~/.agents/skills/android-adb-control/` | `/skill:android-adb-control` |
| Codex CLI / IDE | `~/.agents/skills/android-adb-control/` | `$android-adb-control` 或 `/skills` |
| Claude Code | `~/.claude/skills/android-adb-control/` | `/android-adb-control` |
| OpenCode | `~/.agents/skills/android-adb-control/` | 请求加载同名技能，由原生 `skill` 工具调用 |

**7. 连接手机（前提：设备已获授权）**
在手机上开启开发者选项和 USB 调试，用数据线连接，手动解锁并确认电脑的 RSA 授权，然后运行：

```bash
adb devices -l
```

设备应显示为 `device`。多个设备时明确指定目标；遇到 `unauthorized`、`offline` 或 Linux `no permissions`，先解决连接问题。无线调试是可选项，见 references/troubleshooting.md。不要将 ADB 端口暴露到公网。

**8. 从低风险任务开始调用**
例如 Pi：

```text
/skill:android-adb-control 打开系统设置首页，确认页面，不修改设置。
```

也可用自然语言请求加载技能，再描述目标和边界——尤其要把“停在哪个动作之前”写清楚：

```text
使用 android-adb-control，在指定测试联系人会话里输入“我稍后回复”，
停在发送前。不要点击发送，也不要按可能触发发送的回车。
```

```text
查看这个测试列表的前 20 个项目，只记录名称和可见编号。
同名项目不要直接合并；到 20 个或预算用完就停止。
```

**9. 遵守默认预算与安全约束**
默认最多 30 个设备状态变更动作、5 分钟，并为恢复操作预留预算。长任务提前约定有限预算和检查点。发送状态不明时不会自动重发。

- 只操作获授权的设备、Android 用户和 App。
- 发送、购买、删除、安装、导出个人资料及修改安全/网络设置需要明确授权。
- 截图和 UI XML 可能含私人内容，交给云端模型前应确认数据与日志策略；不要提交到本仓库或公开 Issue。
- ADBKeyboard 的部分实现允许其他本地应用发送控制广播：优先用于可信测试设备，不用于凭据输入；使用前说明风险，结束后恢复本次改变的输入法状态。
- 默认不改休眠时间、不切换 VPN、不安装辅助 App。
- 无法验证或恢复时停止并报告。
- 技能规则不是技术沙箱，仍需宿主权限控制与人工监督。

**10. 静态检查与更新（前提：需要 Bash、Git 和 uv；静态检查不连接手机）**

```bash
uv run --no-project python scripts/check_docs.py
```

更新前检查安装目录的本地修改，确认可接受上游变更后再运行 `git pull --ff-only`，然后刷新 Agent 会话。

## 对应的研究问题

**能力发现**：原文点出一些平时未必交给 Agent 的手机端工作——打开 App、查找页面、点击/滑动/长按/输入文字；查看授权范围内的界面信息、处理有限列表、复现测试操作；准备消息草稿，并在明确授权后执行指定发送动作。

**任务匹配**：这是指令型技能，匹配的是“已有 Agent + 本机 ADB + 已授权设备”的组合。纯 ADB 的基础操作不需要视觉；自绘界面需要截图工具与视觉模型；中文输入可选 ADBKeyboard。云端会话或远程容器拿不到本地 USB 设备，因此不匹配。适配四类宿主（Pi/Codex/Claude Code/OpenCode），但兼容性只到“格式与加载方式”，未做四宿主真机验收。

**条件供给**：需要给到的东西很具体——ADB 可执行权限、已授权并解锁的设备（含 RSA 授权）、正确的技能安装目录与调用方式、明确的授权边界（发送/购买/删除/安装/导出资料/改安全网络设置）、截图与 UI XML 的数据与日志策略、以及任务预算（默认 30 个状态变更动作 / 5 分钟）。用 ADBKeyboard 时要先说明风险，结束后恢复输入法状态。

**主动推进**：原文给的是“观察—执行一步—验证—再决定下一步”的循环，以及默认动作数/时长预算、长任务约定检查点、发送状态不明不自动重发。**没有**时间/事件触发的持续运行、无人值守监控或无限重试——这些被明确排除。

**效果验证**：每一步后验证结果再决定下一步；“发送状态不明时不自动重发”是一种保守的验证策略；仓库提供验证清单 docs/testing.md（真机验收步骤）与静态检查脚本 scripts/check_docs.py。但输入中未包含 testing.md 的具体内容，因此只能确认存在这套检查方法，不能复述其判据。

## 与已有做法的关系

清单中相关条目：

- **Agent skills（concept，adopt）**：本项目正是 Agent Skill 规范下的一个具体技能，安装路径与四宿主加载方式可直接并入“技能装载”这一做法。
- **Claude Code（tool，adopt）**：给出了 Claude Code 专用安装路径 `~/.claude/skills/android-adb-control` 与调用 `/android-adb-control`，以及从 `.agents/skills` 建符号链接的兼容做法（并提示 OpenCode 扫描 `.claude/skills` 可能产生同名告警）。
- **OpenCode（tool，watch）**：列为其兼容宿主之一，走 `.agents/skills` 路径，由原生 `skill` 工具调用，不一定注册为同名斜杠命令。

## 证据与局限

原文提供、可核对的内容：安装命令与目录（含 Claude Code 专用路径和符号链接做法）、四宿主调用方式对照表、三条示例提示词（“不修改设置”“停在发送前”“只记录前 20 项”）、默认预算（30 个设备状态变更动作 / 5 分钟）、安全与授权清单、静态检查命令、以及引用文档（SKILL.md、references/adb-commands.md、references/troubleshooting.md、docs/droidclaw-notes.md、docs/testing.md）。仓库标称 40 stars，MIT 许可。

局限与未证实之处：

- 作者自述“本版本已做文档审查和静态检查，尚未完成修订版真机端到端验收”，并称不同 ROM、App、输入法版本和视觉链路仍需测试。
- “兼容四个宿主”是格式与加载层面的兼容声明，作者明确说不代表已在四个宿主完成真机验收。
- 输入只包含 README。具体 ADB 命令、故障处理、验证清单、DroidClaw 笔记的内容均未给出，因此本报告无法提炼这些文档里的具体步骤。
- 没有给出任何效果数据（成功率、耗时、错误率），也没有真实案例结果；方法来源是 DroidClaw 的启发，但明确不是其官方产品或运行时。
- 适用条件受限：仅限获授权设备与 App，不用于绕过锁屏/验证码/支付验证/企业策略，不提供无人值守监控与自动交易。

## 怎么试、怎么验证

**最小试用方式**

1. 准备一台可信测试机（非承载凭据的主力机），开启开发者选项与 USB 调试，解锁并确认 RSA 授权，`adb devices -l` 显示 `device`。
2. 按第 3～6 步安装技能到对应宿主目录，重开会话或 `/reload`，确认技能能被发现并调用。
3. 先只跑只读任务：`/skill:android-adb-control 打开系统设置首页，确认页面，不修改设置。`
4. 再跑一条“停在动作前”的边界任务（可用测试联系人会话，输入草稿但明确不发送）。
5. 最后跑一条有限列表任务（前 20 项，只记录名称与编号，到 20 个或预算用完即停）。

**判断有没有改善的指标**

- 任务一次跑通的步骤数与你手动操作步数的对比；是否比手动更快。
- 人工接管次数（每次接管记一次，越少越好）。
- 越界动作次数：未经授权的发送/购买/删除/安装/改设置次数应为 0；“停在发送前”这类约束是否 100% 被遵守。
- 是否守住预算：动作数是否超过 30、时长是否超过 5 分钟，超预算时是否正确停止并报告。
- 不可验证/不可恢复时的行为：是否如约停止并报告，而不是继续猜着做。
- 可复现性：同一任务重复执行多次的成功率与结果一致性。

若上述指标在测试机上稳定达标，再考虑扩到真实业务设备；若出现越界动作或无法恢复的状态，按原文要求停止使用并报告。
