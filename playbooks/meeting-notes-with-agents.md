# 开完会立刻拿到可执行清单，录音和草稿都不出本机

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：让 Mac 上的会议记录自动完成转写和实时笔记，并在会后把跟进项拆成 AI 可起草和只有你能做，同时把录音与草稿留在本机。
> 先试这一步：先安装 MacCap 并跑 `scripts/demo-call.py` 的 90 秒假通话，不录真实声音，确认从录音、实时笔记到会后回调整条链路能跑通。
> 最近修订：2026-11-12

## 解决什么问题

会议开完，真正费时间的不是听录音，而是把“谁说了什么、下一步谁做什么”整理成可执行清单；同时录音和转写往往包含敏感信息。这篇手册给一套在 Mac 本机完成的方法：MacCap 在获得同意后自动录音和实时转写，每分钟生成“要点 / 问题 / 行动项”三部分笔记；会后由 Claude Code 读完整转录，把步骤分成“Claude 可以起草的”和“只有你能做的”，只写 Markdown，不发送。

## 适用与不适用

适用：

- 你用 Apple silicon Mac，macOS 15+；要跑实时笔记和 demo 需 macOS 26+。
- 会议发生在 Zoom/Meet/Teams/Slack/FaceTime/WhatsApp/Webex/Discord，或你在 Mac 上接听 iPhone 通话。
- 你愿意在每次录音前征得所有人同意，并接受录音只留在本机。
- 你想把会后跟进拆成“可起草 / 待你处理”，而不是让 AI 直接发消息。

不适用：

- Intel Mac 或系统版本不够。
- 不能或不愿走同意流程；MacCap 首次启动必须同意“只录已同意的人”，否则完全不录。
- 你需要可量化的转写准确率或节省时间承诺；报告没有给出效果数据。
- 你希望 Claude Code 自动发送邮件或消息；它的调用方式不给工具，Hand off 只写 Markdown。
- 你依赖 `narrow_tap_to_call_apps` 在真实通话中稳定工作；作者自述未在真实通话上验证，默认关闭。

## 前置条件

- Apple silicon Mac；macOS 15+；实时笔记与 demo 需要 macOS 26+。
- 安装 ffmpeg；从源码构建还需 Xcode 命令行工具。
- 会后两步需要安装并登录 Claude Code。
- 准备一段同意话术；默认话术见步骤 5。
- 要接自己的助手，准备一个可执行程序，能按 JSON lines 读写 stdin/stdout。

## 操作步骤

### 1. 选安装方式：做法 A 或做法 B

**做法 A：直接用 release。** 前提：只想用，不改代码。

```bash
# 下载 MacCap-<version>.dmg（Developer ID 签名 + 公证），拖进 Applications
brew install ffmpeg
```

**做法 B：从源码构建。** 前提：要跑 demo、改代码或自写回调。报告说 demo 必须走源码构建这条。

```bash
xcode-select --install
brew install ffmpeg
git clone https://github.com/jhammant/maccap.git && cd maccap
./build.sh test       # build, then run the self-tests (no microphone needed)
./build.sh install    # copy to /Applications/MacCap.app
open /Applications/MacCap.app
```

预期：`./build.sh test` 跑自测且不需要麦克风；`./build.sh install` 后能在 Applications 里打开 MacCap。要跑 demo 或改代码，选 B；否则 A 更省事。

### 2. 源码重建时固定签名

前提：你走做法 B 且会反复重建。否则每次重建都要重新授权麦克风。把 `MACCAP_SIGN_IDENTITY` 设为你的签名身份（写进环境变量或未提交的 `build.local.env`）；`MACCAP_BUNDLE_ID` 可改 bundle ID（默认 `io.maccap.MacCap`）。预期：重建后权限仍认到同一个 app。

### 3. 先跑不录音的 demo，验证整条链路

前提：已按做法 B 构建。demo 用 Mac 内置语音合成一段假通话，不录真实声音、不写入录音目录。

```bash
python3 scripts/demo-call.py                              # writes demo-call.m4a (90 s)
build/MacCap.app/Contents/MacOS/MacCap demo demo-call.m4a # live window, then meeting finished
```

需要双速播放时在 demo 命令后加 `--speed 2`。预期：生成 90 秒的 `demo-call.m4a`，出现实时窗口，结束后走到 meeting finished；全程不需要麦克风权限，也不产生真实会议录音。先跑通这一步，再碰真实通话。

### 4. 授权麦克风与系统音频

前提：第一次真实录音前。首次录音会请求 **Microphone** 与 **System Audio Recording**，两项都要授给 `MacCap.app` 本身。**必须通过 app bundle 启动**；从终端直接启动时 macOS 会把权限记到终端头上。

```bash
open -W -n -a MacCap.app --args record --seconds 20   # test recording
MacCap.app/Contents/MacOS/MacCap callers               # who is using audio now
MacCap.app/Contents/MacOS/MacCap finalize-pending      # save unfinished sessions
```

预期：第一次 `record` 弹出两项权限；授权后测试录音成功。`callers` 显示当前谁在占用音频；`finalize-pending` 保存未完成的会话。

### 5. 先走同意流程，再开始录

前提：每次录真实通话前。报告强调这是产品设计的一部分，不是可选项：首次启动必须同意“只录已同意的人”，否则完全不录。菜单与 “Recording” 通知里的 **Copy consent message** 会把下面这段话放进剪贴板，粘到会议聊天：

> "Before we start: I'd like to record this call so I can take notes. The recording stays on my Mac. Is everyone OK with that?"

可用 `consent_message` 换成自己的措辞。有人拒绝时用 **Stop and skip this call**（音频进 `audio/skipped/`，自行删除），或用 **Pause auto-record** 暂停自动录制。预期：没有同意就不录；拒绝时有明确的跳过或暂停动作。

### 6. 接 Claude Code 做会后两步

前提：已安装并登录 Claude Code。在 `~/.maccap/config.json` 写入以下配置，把路径改成你 clone 的位置：

```json
{
  "final_notes_command": ["/usr/bin/python3", "/path/to/maccap/integrations/claude-code/maccap_claude.py", "final-notes"],
  "followup_command": ["/usr/bin/python3", "/path/to/maccap/integrations/claude-code/maccap_claude.py", "follow-up"]
}
```

它用 `claude -p` 且不给工具，所以模型只能写文本，不能发送、发布或改动任何东西；`MACCAP_CLAUDE_MODEL` 可换掉默认的 Sonnet。预期：会后会调用 final notes 和 follow-up，窗口显示拆分后的步骤和状态。

### 7. 按需调整关键配置

前提：先用默认值跑通，再改。以下配置同样在 `~/.maccap/config.json`，全部可选；只列常用项，按需加入上一步的配置：

```json
{
  "audio_dir": "~/Recordings/calls",
  "live_notes": true,
  "live_notes_locale": "en_GB",
  "notes_interval_seconds": 60,
  "notes_model_url": "http://localhost:1234/v1",
  "notes_model": "qwen/qwen3.6-27b",
  "notes_model_api_key_env": "MY_NOTES_API_KEY",
  "coach_talk_share": 0.65,
  "coach_monologue_seconds": 90,
  "assist_command": ["/usr/local/bin/my-call-assist", "--verbose"],
  "consent_message": "Mind if I record this call for my notes? It stays on my Mac."
}
```

要点：`notes_model_url` 指向任意 OpenAI 兼容端点（LM Studio / Ollama）；报告称可提升笔记质量，但没有量化数据。报告称端上模型默认只看最近约 1,500 词；本地推理模型（Qwen 3）会被关掉 thinking，以保证更新是秒级而非分钟级。`coach_talk_share` 与 `coach_monologue_seconds` 控制发言占比和独白超时提醒。`narrow_tap_to_call_apps`（macOS 26+）只录通话 app 的系统音频，作者自述未在真实通话上验证，默认关闭。

### 8. 会后回调：要么用官方脚本，要么按契约替换

前提：你要自定义会后处理。`final_notes_command` 从 stdin 收到 `type: final_notes` 的会议 JSON（含完整 `transcript`），必须打印一个 JSON：

```json
{
  "ai_steps": ["Draft the follow-up email to Priya with the pricing bands."],
  "your_steps": ["Confirm the two training slots."],
  "waiting_on": ["Priya will send the printer model."],
  "key_points": ["Volumes are up to 1,200 orders a month."],
  "open_questions": ["Does the lower rate apply to every user?"],
  "model": "Claude Code (sonnet)"
}
```

`ai_steps` 显示在 **Claude will do**，`your_steps` 显示在 **For you**，`waiting_on` 单列且永不被 hand off；只回 `next_steps` 会被当成你自己的步骤；程序失败或无输出时回退到实时笔记的步骤。`followup_command` 收到 `type: meeting_finished`（字段含 `title`/`started_at`/`duration_seconds`/`apps`/`recording`/`notes_file`/`key_points`/`open_questions`/`next_steps`/`talk`），最后一行可打印 `{"status": "...", "url": "..."}` 供窗口显示状态和 Open 链接。

### 9. 可选：接自己的通话助手

前提：你愿意写一个按 JSON lines 通信的程序。把 `assist_command` 指向一个程序（绝对路径 + 参数），MacCap 从 stdin 逐行喂 JSON：

- 收：`start`（`v`/`started_at`/`session_dir`/`apps`）、`line`（`stem`=mic|system、`speaker`、`text`、`start`、`end`）、`ask`（`id`/`question`/`at`/`transcript`/`topics`，追问时带 `follows`+`thread`，选中行时带 `focus`+`part`）、`help`、`moment`（`transcript`=最近一分钟，`auto` 表示由短语自动触发）、`action`、`end`（stdin 关闭后 5 秒收尾）。
- 回：`card`（`id`/`kind`/`title`/`chips`/`quote`/`body`/`detail`/`link`/`source`/`at`/`state`=looking|ready|failed/`pinned`/`action`）、`remove`、`status`、`context`、`speaker`。

用 `ask`/`help` 请求的 `id` 发 `card` 即视为回答；`body`/`detail` 支持 Markdown。程序挂了通话照常录制。官方示例 `integrations/orbital-taxi` 是单文件 Python、无依赖、无 LLM，用 TaxiQL 模板查人和公司，同样输入永远给同样卡片。预期：你能在不改录制链路的情况下给通话中推送卡片。

### 10. 用回放调试，不必真开会

前提：已有一段 `.m4a`。

```bash
MacCap notes FILE.m4a                                  # 重放录音走同一条笔记管道
MacCap notes FILE.m4a --help-me --ask "…"              # 走 assist 管道
MacCap notes FILE.m4a --help-me --ask "…" --follow-up "…"
open -W -n -a MacCap.app --args record --seconds N --notes   # 测试录音同时开实时笔记
```

预期：同一段录音能走笔记管道或 assist 管道，方便调提示词和回调，而不暴露真实会议。`N` 是秒数占位，按你的测试长度替换。

### 11. 通话中标记 moment 和行动项

前提：通话正在录。按 **Moment** 按钮或 `Control-Option-M`，把最近约一分钟压成一行“谁做什么、何时前”；说 “action point” / “I'll follow up” / “I'll send you” 这类短语会自动标记（`moment_phrases`，`[]` 关闭）；`Control-Option-A` 口述行动项。预期：会后清单里能看到这些被标出的时刻，不用靠回忆补。

## 怎么判断变好了

用可观察的行为判断，不要用“感觉 AI 更聪明”判断：

- demo：90 秒假通话能走完 live window 到 meeting finished，且不需要麦克风、不写真实录音。
- 真实通话：两项权限只授一次；生成 `.m4a` 为立体声（左声道=你，右声道=对方）；实时笔记按 `notes_interval_seconds`（默认 60 秒）更新“要点 / 问题 / 行动项”；发言占比超过 `coach_talk_share`（默认 0.65）或独白超过 `coach_monologue_seconds`（默认 90 秒）时能看到提醒。
- 会后：`final_notes_command` 能输出 `ai_steps` / `your_steps` / `waiting_on`；窗口分别显示在 Claude will do、For you 和单独区域；Hand off 只写 Markdown，不发送；`waiting_on` 不会被 hand off；失败时回退到实时笔记而不是丢会议。
- 跟进：`followup_command` 最后一行能给出状态和链接，窗口能显示。

最小试用：先跑一次 90 秒 demo；再用一次征得同意的真实通话验证。要调自己的脚本，用 `MacCap notes FILE.m4a` 回放同一段录音，不必反复开真会。报告没有给出转写准确率、笔记质量或节省时间的量化数据，所以“变好了”只能先看链路是否通、拆分是否可用、你是否还需要从零听录音补笔记。

## 常见坑

- **从终端启动主程序**：macOS 会把麦克风和系统音频权限记到终端，而不是 `MacCap.app`。用 `open -W -n -a MacCap.app ...` 或从 app bundle 启动。
- **重建后不固定签名**：每次重建都要重新授权；把 `MACCAP_SIGN_IDENTITY` 固定下来。
- **系统版本不够**：Apple silicon Mac 是前提；实时笔记与 demo 需要 macOS 26+，不要拿 macOS 15 的机器硬跑实时笔记。
- **跳过同意流程**：首次启动不同意就完全不录；有人拒绝时用 Stop and skip this call 或 Pause auto-record，不要删掉流程硬录。
- **把 `next_steps` 当万能字段**：只回 `next_steps` 会被当成你自己的步骤；要区分 `ai_steps`、`your_steps`、`waiting_on`，其中 `waiting_on` 永不被 hand off。
- **以为 Hand off 会发送**：它只把草稿写进 Markdown，Claude Code 调用也不给工具；发送前仍要你自己确认。
- **依赖未验证的 narrow tap**：`narrow_tap_to_call_apps` 作者自述未在真实通话验证，默认关闭；不要把它当成稳定能力。
- **忽略端上模型的上下文限制**：报告称默认只看最近约 1,500 词；长会要接受这一点，或按报告用 `notes_model_url` 接本地 LLM，但报告没有量化提升。
- **assist 程序挂了就以为录音挂了**：报告说程序挂了通话照常录制，只是没有卡片。
- **照猜 `Control-Option-N`**：报告原文在“存当…”处截断，未给出完整行为，先用你安装版本的实际菜单确认。

## 证据与来源

本手册的做法来自调研报告《jhammant/maccap》。该报告依据仓库 README 与作者说明，给出了安装命令、`build.sh`、`demo-call.py`、权限要求、`~/.maccap/config.json` 示例、`final_notes_command` / `followup_command` / `assist_command` 的 stdin/stdout 契约，以及同意话术原文。上述命令、配置字段和回调字段属于文档/实现描述，可以直接照做；但报告明确说效果数据全无：没有转写准确率、笔记质量、节省时间或真实通话稳定性的量化结果。

以下属于报告或作者主张，尚无数据验证：`notes_model_url` 接本地 LLM 可提升笔记质量；本地 Qwen 3 关闭 thinking 可让更新达到秒级；`narrow_tap_to_call_apps` 的作者自述“未在真实通话上验证”；90 秒 demo、默认每 60 秒更新、端上模型只看最近约 1,500 词、发言占比 0.65、独白 90 秒等是 README/报告中的配置与行为描述，不等于效果结论。`claude -p` 不给工具、Hand off 只写 Markdown 不发送、assist 程序挂了仍继续录制，来自报告对实现的描述。

## 依据的调研

- [jhammant/maccap](../research/radar/2026-11-12/12726-jhammant-maccap.md)：值得一试，先在 Mac 上用自带 demo 跑通链路、再用一次征得同意的真实通话验证「端上实时笔记 + Claude Code 会后拆分与起草」，因为 README 给出了可直接照做的安装、权限、config.json 与 stdin/stdout 协议，但效果数据全无、且强依赖 Apple silicon 与 macOS 26。
