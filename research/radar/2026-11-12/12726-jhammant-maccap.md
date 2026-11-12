# jhammant/maccap

- 结论：**值得一试**。先在 Mac 上用自带 demo 跑通链路、再用一次征得同意的真实通话验证「端上实时笔记 + Claude Code 会后拆分与起草」，因为 README 给出了可直接照做的安装、权限、config.json 与 stdin/stdout 协议，但效果数据全无、且强依赖 Apple silicon 与 macOS 26。
- 原文：https://github.com/jhammant/maccap
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T03:18:28.007Z

## 是什么

MacCap 是一个 macOS 菜单栏应用，把「会议记录 + 会后跟进」整条链路放到本机：调用 app（Zoom/Meet/Teams/Slack/FaceTime/WhatsApp/Webex/Discord，以及 Mac 上接听的 iPhone 通话）开始用麦克风时自动录音，录成立体声 `.m4a`（左声道=你，右声道=对方），用 Apple 端上语音模型实时转写，每分钟用端上模型（或你指定的本地 LLM）生成「要点 / 问题 / 行动项」三部分笔记，并在窗口里给发言占比、提问数和独白超时提醒。会后可由 Claude Code 读取整段转录，把下一步拆成「Claude 可以起草的」和「只有你能做的」，点 Hand off 后把草稿写进一个 Markdown 文件（不发送）。另有 `assist_command` 协议，允许任意程序以 JSON lines 跟随通话并回推卡片（如从 CRM 查人/查公司）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：Apple silicon Mac，macOS 15+；实时笔记与 demo 需要 macOS 26+。

1. 安装（二选一）。
   - 下载 release 的 `MacCap-<version>.dmg`（Developer ID 签名 + 公证），拖进 Applications，然后 `brew install ffmpeg`。
   - 或 Homebrew：
     ```bash
     brew trust jhammant/tap && brew install --cask jhammant/tap/maccap
     ```
2. 从源码构建（想改代码或跑 demo 必须走这条）。需要 Xcode 命令行工具和 ffmpeg：
   ```bash
   xcode-select --install
   brew install ffmpeg
   git clone https://github.com/jhammant/maccap.git && cd maccap
   ./build.sh test       # build, then run the self-tests (no microphone needed)
   ./build.sh install    # copy to /Applications/MacCap.app
   open /Applications/MacCap.app
   ```
3. 固定签名，避免每次重建都要重新授权麦克风：把 `MACCAP_SIGN_IDENTITY` 设为你的签名身份（写进环境变量或未提交的 `build.local.env`）；`MACCAP_BUNDLE_ID` 可改 bundle ID（默认 `io.maccap.MacCap`）。
4. **不录音先验证链路**。demo 用 Mac 内置语音合成一段假通话，不录任何真实声音、不写入录音目录：
   ```bash
   python3 scripts/demo-call.py                              # writes demo-call.m4a (90 s)
   build/MacCap.app/Contents/MacOS/MacCap demo demo-call.m4a # live window, then meeting finished
   ```
   加 `--speed 2` 可双速播放。
5. 授予权限：首次录音会请求 **Microphone** 与 **System Audio Recording**，两项都要授给 MacCap.app 本身。**必须通过 app bundle 启动**，从终端启动时 macOS 会把权限记到终端头上：
   ```bash
   open -W -n -a MacCap.app --args record --seconds 20   # test recording
   MacCap.app/Contents/MacOS/MacCap callers               # who is using audio now
   MacCap.app/Contents/MacOS/MacCap finalize-pending      # save unfinished sessions
   ```
6. 走同意流程（原文强调这是产品设计的一部分，不是可选项）：首次启动必须同意「只录已同意的人」，否则完全不录；菜单与「Recording」通知里的 **Copy consent message** 会把这段话放进剪贴板粘到会议聊天：
   > "Before we start: I'd like to record this call so I can take notes. The recording stays on my Mac. Is everyone OK with that?"

   可用 `consent_message` 换成自己的措辞。有人拒绝时用 **Stop and skip this call**（音频进 `audio/skipped/`，自行删除），或用 **Pause auto-record** 暂停自动录制。
7. 接 Claude Code（会后两步）。确保已安装并登录 Claude Code，然后在 `~/.maccap/config.json` 写入（路径改成你 clone 的位置）：
   ```json
   {
     "final_notes_command": ["/usr/bin/python3", "/path/to/maccap/integrations/claude-code/maccap_claude.py", "final-notes"],
     "followup_command": ["/usr/bin/python3", "/path/to/maccap/integrations/claude-code/maccap_claude.py", "follow-up"]
   }
   ```
   它用 `claude -p` 且不给工具，所以模型只能写文本、不能发送/发布/改动任何东西；`MACCAP_CLAUDE_MODEL` 可换掉默认的 Sonnet。
8. 关键配置项（`~/.maccap/config.json`，全部可选）：
   ```json
   {
     "audio_dir": "~/Recordings/calls",
     "extra_allowlist": ["com.example.MyCallApp"],
     "start_after_seconds": 4,
     "stop_after_quiet_seconds": 45,
     "narrow_tap_to_call_apps": false,
     "ffmpeg_path": "/opt/homebrew/bin/ffmpeg",
     "live_notes": true,
     "live_notes_locale": "en_GB",
     "notes_interval_seconds": 60,
     "notes_model_url": "http://localhost:1234/v1",
     "notes_model": "qwen/qwen3.6-27b",
     "notes_model_api_key_env": "MY_NOTES_API_KEY",
     "coach_talk_share": 0.65,
     "coach_monologue_seconds": 90,
     "assist_command": ["/usr/local/bin/my-call-assist", "--verbose"],
     "followup_command": ["/usr/local/bin/my-follow-ups"],
     "final_notes_command": ["/usr/local/bin/my-final-notes"],
     "consent_message": "Mind if I record this call for my notes? It stays on my Mac."
   }
   ```
   要点：`notes_model_url` 指向任意 OpenAI 兼容端点（LM Studio / Ollama）可提升笔记质量，端上模型默认只看最近约 1,500 词；本地推理模型（Qwen 3）会被关掉 thinking 以保证更新是秒级而非分钟级；`narrow_tap_to_call_apps`（macOS 26+）只录通话 app 的系统音频，作者自述未在真实通话上验证，默认关闭。
9. 会后回调契约（自写替代脚本时照这个来）。`final_notes_command` 从 stdin 收到 `type: final_notes` 的会议 JSON（含完整 `transcript`），必须打印一个 JSON：
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
   `ai_steps` 显示在 **Claude will do**，`your_steps` 显示在 **For you**，`waiting_on` 单列且永不被 hand off；只回 `next_steps` 会被当成你自己的步骤；程序失败或无输出时回退到实时笔记的步骤。`followup_command` 收到 `type: meeting_finished`（`title`/`started_at`/`duration_seconds`/`apps`/`recording`/`notes_file`/`key_points`/`open_questions`/`next_steps`/`talk`），最后一行可打印 `{"status": "...", "url": "..."}` 供窗口显示状态和 Open 链接。
10. 接自己的通话助手（可选）。把 `assist_command` 指向一个程序（绝对路径 + 参数），MacCap 从 stdin 逐行喂 JSON：
    - 收：`start`（`v`/`started_at`/`session_dir`/`apps`）、`line`（`stem`=mic|system、`speaker`、`text`、`start`、`end`）、`ask`（`id`/`question`/`at`/`transcript`/`topics`，追问时带 `follows`+`thread`，选中行时带 `focus`+`part`）、`help`、`moment`（`transcript`=最近一分钟，`auto` 表示由短语自动触发）、`action`、`end`（stdin 关闭后 5 秒收尾）。
    - 回：`card`（`id`/`kind`/`title`/`chips`/`quote`/`body`/`detail`/`link`/`source`/`at`/`state`=looking|ready|failed/`pinned`/`action`）、`remove`、`status`、`context`、`speaker`。
    - 用 `ask`/`help` 请求的 `id` 发 `card` 即视为回答；`body`/`detail` 支持 Markdown。程序挂了通话照常录制。
    官方示例 `integrations/orbital-taxi` 是单文件 Python、无依赖、无 LLM，用 TaxiQL 模板查人和公司，同样输入永远给同样卡片。
11. 用回放调试自己的脚本，不必真的开会：
    ```bash
    MacCap notes FILE.m4a                                  # 重放录音走同一条笔记管道
    MacCap notes FILE.m4a --help-me --ask "…"              # 走 assist 管道
    MacCap notes FILE.m4a --help-me --ask "…" --follow-up "…"
    open -W -n -a MacCap.app --args record --seconds N --notes   # 测试录音同时开实时笔记
    ```
12. 通话中的操作：Moment（按钮或 `Control-Option-M`）把最近约一分钟压成一行「谁做什么、何时前」；说 "action point" / "I'll follow up" / "I'll send you" 这类短语会自动标记（`moment_phrases`，`[]` 关闭）；`Control-Option-A` 口述行动项；`Control-Option-N` 存当前通话并立刻开录下一场；`Control-Option-H` 在任意 app 里唤起 assist。
13. 产物位置：一切在 `~/.maccap`（`MACCAP_HOME` 可改），仅本人可读：`audio/时间戳-id.m4a`、同名 `.maccap.json`（apps/声道/偏移/健康状态/路由）、同名 `.notes.md`（实时笔记 + 转录）、`sessions/`（ADTS 分段与 `session.json`）、`config.json`、`maccap.log`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：原文隐含几个不常想到可以外包给机器的动作——录音的启停判断交给「谁在用麦克风」这个信号（通话 app 开始用麦后 4 秒开录、结束后 45 秒停录）；把会中每分钟的「要点/问题/行动项」持续产出交给端上小模型；把会后的「拆分谁做什么 + 起草邮件/消息/大纲」交给 Claude Code；把「这人是谁」的查库交给一个确定性脚本并渲染成卡片。注意这只是该仓库实现的功能清单，不是对能力边界的论证。
- **任务匹配**：原文明确给了分工依据——实时性要求高的（每分钟更新、要秒级）用端上模型或本地 LLM，并关掉 thinking；质量要求高的整段改写用 Claude Code（Sonnet，可换）；需要可复现、无幻觉的实体查询用无 LLM 的纯 Python（「same call always gives the same cards」）。此外 `claude -p` 默认不给工具，把「只能写文本」当作安全边界。
- **条件供给**：需要的输入包括麦克风与系统音频两项系统权限（且绑定签名，`MACCAP_SIGN_IDENTITY` 决定是否反复授权）、ffmpeg、可选的语言包（首次下载）、可选的 OpenAI 兼容端点与 API key 环境变量、已登录的 Claude Code；需要的上下文以结构化 JSON 交付（会议对象、transcript、topics、focus 行）；反馈通道是「卡片」——assist 程序随时推卡、MacCap 用同一 `id` 回送答案，以及会后的 tick/untick 编辑。
- **主动推进**：有明确的时间/事件/状态触发——麦克风占用触发开录、静音 45 秒触发停录、`notes_interval_seconds`（默认 60 秒）触发笔记、短语命中触发 moment 标记、独白 90 秒/近 5 分钟占比 65%/8 分钟没提问触发教练提醒（每条最多 5 分钟一次、两条至少间隔 2 分钟）、`Control-Option-N` 连续接管背靠背会议、崩溃或断电后下次启动自动 `finalize-pending` 收尾。
- **效果验证**：原文没有给任何量化改善数据；可验证的客观产物有 `<name>.notes.md`、`~/.maccap/follow-ups/` 下的 Markdown、coach 保存的 talk time、以及 demo/`MacCap notes FILE.m4a` 可重复回放同一管道。安全性上可验证的是「录音不上传、文件 owner-only、Claude 无工具不能发送」。

## 与已有做法的关系

清单中只有 **Claude Code**（tool，adopt）相关：MacCap 把它当作会后处理的一环，通过 `final_notes_command` / `followup_command` 以 `claude -p`（无工具）方式喂入整段 transcript、取出结构化 JSON，并落到本地 Markdown。其余清单条目没有对应关系。另外它借鉴了 [Minutes](https://github.com/silverstein/minutes)（MIT）的 process tap、共享时间轴与远端静音检测，若已在用 Minutes 需注意二者重合。

## 证据与局限

原文给出的「证据」基本是机制说明与可运行入口，而非效果数据：

- 可核验的工程细节：Core Audio process tap（macOS 14.2+）挂在私有的 tap-only aggregate device 上，能听到 ScreenCaptureKit 听不到的 FaceTime（`avconferenced`）与 iPhone 通话（`callservicesd`）；录音期间写成 AAC ADTS 分段以抗崩溃；AirPods 每 10 秒用实时采样率对照真实帧率，捕捉蓝牙耳机中途掉到 16 kHz；系统音频权限被拒时录到的是静音而非报错，所以用「对方约一分钟无声而你在说话」作为唯一提示——这些都是作者主张 + 代码可查，原文未附测试数据。
- 双声道分离的收益（「转录不用猜谁在说话」）是设计主张，没有准确率对比。
- 明确自认未验证的：`narrow_tap_to_call_apps`「It is off until it has been proven on real calls」。
- 明确自限的：直播笔记与 demo 需 macOS 26+；笔记模型默认只看到最近约 1,500 词，长会早期内容只能靠「已关闭的 part 不再重算」的增量合并保住，不是全量重读。
- 合规完全交给使用者：应用不加入通话，别人收不到提示，必须自己征得同意；各地法律不同，跨境通话可能适用每人所在地。屏幕共享排除请求「Not every app honours that」。
- 项目体量小（32 stars，单人维护），无第三方评测；assist 协议虽文档详尽，但没有版本兼容承诺（`v` 目前为 1）。

因此它适合作为「隐私受限场景下把模型接进个人工作流」的样板来小范围试，不宜整队铺开。

## 怎么试、怎么验证

**最小试用（约半天，先零风险）**

1. 源码构建后跑 `./build.sh test` 与 demo（`scripts/demo-call.py` + `MacCap demo demo-call.m4a`），确认实时窗口、每分钟笔记、会后「Meeting finished」三个界面都能出现。此时一个真实声音都没录。
2. 用 `MacCap notes 你自己的一个旧 m4a` 重放，看笔记质量与分段标题是否可用——这一步能验证「端上模型够不够用」，不行再配 `notes_model_url` 指到 LM Studio/Ollama。
3. 挑一次低风险、双方已同意的一对一通话做真实闭环：开录 → 通话中按一次 Moment → 结束后看 `final_notes_command` 是否把步骤拆成 Claude 可做/只能你做。
4. 勾选步骤 → Hand off → 打开 `~/.maccap/follow-ups/` 下的 Markdown，确认草稿可用且**没有**被发送。
5. 再决定是否接 `assist_command`（可从 orbital-taxi 那个单文件 Python 抄结构，先只做「说人名就出一张卡」）。

**判断有没有改善的指标（自建基线：先用手记笔记的同类会议比一轮）**

- 会后备忘从散落记录到成稿的耗时（分钟），目标是从「重听录音」降到「改草稿」。
- `ai_steps` 里你实际原样采用或小改即用的比例；`your_steps` 的漏项数（对着录音抽查 1 次）。
- 行动项召回：会后 24 小时内回看，是否出现「当时说了但笔记里没有」的承诺。
- Coach 的 talk share 与你自己的主观估计差多少（原文说「measured from the transcribed lines, so it is a guide, not a stopwatch」，别当秒表用）。
- 运行稳定性：一场 1 小时通话是否零中断；是否出现「对方约一分钟无声」的误报（权限被拒的哨兵）；AirPods 场景下转录是否断档。
- 若接 assist：同一段录音用 `MacCap notes FILE.m4a --help-me --ask` 重放，输出是否可复现（纯模板方案应完全一致，含 LLM 的方案会波动，这本身就是选型依据）。

**止损条件**：如果第 2 步端上笔记质量不足以支撑会后回看、又不想在本机跑 LLM；或团队/客户场景无法保证逐次取得录制同意——就退回到只用「录音 + Claude Code 会后处理」，或干脆不用这个工具。
