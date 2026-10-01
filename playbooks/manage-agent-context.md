# 让编码 agent 跨会话不忘事，也不被工具输出塞满上下文

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 在长任务里会把大量工具输出塞进上下文、跨会话失忆、丢掉执行计划，还会让团队重复解决已解决的问题。
> 先试这一步：先在一个真实长任务上按做法 A 给 Claude Code 加 Context Mode 的 MCP-only 模式，用 ctx stats 记录节省；同时把计划写进 task_plan.md 作为 /clear 后的恢复点。
> 最近修订：2026-10-02

## 解决什么问题

编码 agent 在真实任务里会调用大量工具：读文件、grep、跑 shell、抓网页、扫日志、翻工单。这些工具返回的原始数据直接进上下文窗口，很快就把上下文塞满；会话压缩时，之前的状态又可能丢失，agent 像失忆一样。还有一类更隐蔽的浪费：为了回答「哪些文件处理 auth」这种只需要一个小判断的问题，把 187 个文件全读进上下文。

本手册把对应这几类浪费的做法合在一起：把工具输出挡在上下文窗口之外（Context Mode、headroom）、把「读很多、只判断一点」的略读外包给小模型（Quicksilver）、用持久记忆保住跨会话状态（claude-mem、mem0、cognee）、把执行计划写到磁盘并靠 hook 重注入（planning-with-files）、把团队 trace 固化成可复用技能（hivemind）、用录屏口述补上下文和反馈（blurt）。核心要求是：不只看节省比例，要用任务侧指标验证结果有没有变好。

## 适用与不适用

适用：

- 你正在用编码代理（Claude Code、Codex、Cursor 等）做真实编码任务。
- 任务中本来就会产生大量工具输出（读多个文件、grep、shell、日志、web_fetch）。
- 你会经历会话压缩，或者需要跨会话继续同一个任务。
- 你有一类「读很多、只判断一点」的活：在 187 个文件里找处理 auth 的、在 3000 行日志里找真失败、在 200 张工单里找退款请求。
- 你有说不清、截图慢的界面问题，需要一个更自然的输入通道。
- 你要做长时编码任务，计划需要挺过 /clear、崩溃和 compaction。
- 你想让团队里多个 agent 复用已解决的问题，或想给 agent 加可编程的持久记忆。
- 你愿意装 MCP server / 插件 / hook / 本地代理 / skill，并接受一次小范围试用。

不适用：

- 你对商用许可敏感。Context Mode 是 ELv2 许可，对商用有限制；cognee 的单 Postgres 图存储和本地 GLiNER 抽取器是 demo，生产版是授权产品。
- 你不能把内容发给第三方。Quicksilver 会把待扫描内容发到 TypeSafe 的 API（api.typesafe.ai）；mem0 默认依赖 LLM 与 embedding 供应商；cognee 配 LLM 后会发起 provider 调用；hivemind 默认把全部会话 prompt 与工具输出写进团队共享 workspace。
- 你希望直接拿到第三方验证过的 98% 节省、100x 提升、~10x token 节省、mem0 托管高分、cognee BEAM 分数、planning-with-files 自测数据、hivemind 基准。这些数字都是各自 README 或项目自述，调研没有找到第三方验证或实验数据。
- 你的任务很小、工具输出很少，装 hook / 代理 / 持久记忆的开销可能不划算。headroom 原文也写了：短对话、散文、已经密集的载荷收益很小甚至为零，小于 min_input_words 的块原样返回。
- 你不想改配置、不想重启客户端，或者沙箱里跑不了本地进程（headroom 需要本机进程和端口）。
- 你的问题是纯后端、无界面、又拍不到。blurt 的前提是能看到问题或用手机拍到（终端、TUI、桌面应用可以）。
- 你只用单一 provider、也不需要跨 agent 记忆——headroom 的这部分收益对你不成立。
- 你不想引入 Postgres demo、Docker、Deeplake 账号或 600 MB 本地嵌入模型。

## 前置条件

- 如果走 Claude Code：Claude Code v1.0.33+（Context Mode 要求），用 claude --version 确认。claude-mem 要求 Claude Code 最新版且支持插件。
- Node.js/npm 可用。Quicksilver 要 Node 18+；claude-mem 要 Node 20.0.0+，Bun 和 uv 缺失时会自动安装，SQLite 3 已捆绑；headroom 要 Python 3.10+；hivemind 要 Node >= 22.0.0；planning-with-files 安装走 npx skills。
- 一个真实编码任务，最好本来就有大量工具调用，能对比前后差异。不要用玩具任务，否则看不出节省。
- 各自的凭据与许可：
  - Quicksilver：到 console.typesafe.ai 申请一个 Jev key。内容会被发送到 TypeSafe 的 API，所以不要拿它处理不能给第三方的数据。
  - claude-mem：标准安装会要求浏览器登录（邮箱 magic link，无需信用卡）；不想要账号交互就显式传 --provider、设 CLAUDE_MEM_ONLINE_OPTIN=false，或在 CI / 非交互 shell 里运行。
  - headroom：匿名 beacon 默认开启，上报压缩比例、计数、provider 与 model ID、OS 与架构，不上报 prompt、补全、代码或文件路径；合规需要时用 HEADROOM_BEACON=off。
  - mem0：默认依赖 OpenAI 的 gpt-5-mini 和 text-embedding-3-small；混合检索建议至少用 Qwen 600M 或同级别 embedding；自托管默认开启鉴权，旧版升级需设置 ADMIN_API_KEY、通过向导注册 admin，或仅在本地开发用 AUTH_DISABLED=true。
  - cognee：Python 3.10–3.14；无 LLM key 时可用本地 GLiNER 与本地 embedding 模型，首次使用会下载模型，CPU 可跑；要生成式回答需配置 LLM key。
  - planning-with-files：宿主需支持 hook/插件或 Agent Skills；状态标记必须保持英文字面量，例如 **Status:** complete。
  - hivemind：需要一个 Deeplake 账号以获得 token；安装器会探测机器上所有受支持 assistant，接好 hooks，弹同意提示后开浏览器登录；装完要重启 assistant。
- 知道 Context Mode 是 ELv2 许可，推广前确认商用合规。
- 如果走完整插件，能修改 ~/.claude/settings.json 并重启 Claude Code。

## 操作步骤

先选做法：

- 只想先省上下文、不想装 hook，且用 Claude Code → 做法 A（Context Mode MCP-only），推荐先做。
- 想让它自动拦截大输出、自动路由到沙箱 → 做法 B（Context Mode 完整插件）。
- 用 Cursor、插件未上架 → 做法 C。
- 主要痛点是「读很多、只判断一点」→ 做法 D（Quicksilver 做批量略读判断）。
- 主要痛点是「换会话就失忆、反复交代背景」→ 做法 E（claude-mem 持久记忆）、做法 H（mem0）、做法 I（cognee）三选一先试。
- 想在本地统一压缩所有经过 LLM 的流量，而且要求可逆 → 做法 F（headroom）。
- 痛点是不好描述、说不清复现步骤的界面问题 → 做法 G（blurt 录屏口述）。
- 长时编码任务、计划要挺过 /clear 或 compaction → 做法 J（planning-with-files）。
- 团队多 agent、想把重复模式固化成技能 → 做法 K（hivemind）。
- 需要可编程、按 user_id 隔离的持久记忆 → 做法 H（mem0）。
- 需要本地优先、知识图谱、无 LLM 也能检索 → 做法 I（cognee）。

这些做法可以叠加，但一次只加一个，否则分不清是哪个起了作用。

### 做法 A：MCP-only 轻量试用（推荐先做）

1. 确认 Claude Code 版本。
   ```bash
   claude --version
   ```
   预期：版本不低于 v1.0.33。低于这个版本先升级。

2. 添加 MCP server。
   ```bash
   claude mcp add context-mode -- npx -y context-mode
   ```
   预期：注册 11 个 ctx_* 工具。这个方式没有 hook、没有自动路由，只有工具。

3. 重启 Claude Code，让 MCP server 生效。预期：在会话里能调用 ctx_* 工具。

4. 准备一个真实编码任务，任务里本来就会产生大量工具输出，例如读多个文件、grep、跑 shell。

5. 在任务开始前和结束后，输入 ctx stats 查看状态。预期：能看到按工具的节省明细、消耗 token、节省比例。

6. 手动提示模型使用 ctx_* 工具。因为 MCP-only 没有自动路由，模型不一定会自己用。可以在提示词里明确要求：批量读取、统计、聚合类工作先用 ctx_execute 写脚本完成，只输出结果。

7. 记录任务结果：正确率、人工纠正次数、交付时间。最好能和不用 Context Mode 的基线对比；没有基线就至少记录这次任务里上下文占用和工具输出的关系。

8. 根据结果决定是否上做法 B，或者是否推广到团队。

### 做法 B：完整插件（自动路由 + hook）

1. 前置：Claude Code v1.0.33+。

2. 添加 marketplace。
   ```
   /plugin marketplace add mksglu/context-mode
   ```

3. 安装插件。
   ```
   /plugin install context-mode@context-mode
   ```

4. 重启 Claude Code，或执行 /reload-plugins。然后用 /context-mode:ctx-doctor 验证。预期：所有检查为 [x]。

5. 可选：加状态栏。一次性编辑 ~/.claude/settings.json：
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "context-mode statusline"
     }
   }
   ```
   重启后状态栏显示 $ saved this session · $ saved across sessions · % efficient。

6. 用斜杠命令查看状态：ctx-stats、ctx-doctor、ctx-index、ctx-search、ctx-upgrade、ctx-purge、ctx-insight。其他平台在聊天里输入 ctx stats 等，由模型自动调 MCP 工具。

7. 跑真实任务，对比结果。完整插件会通过 hook 自动拦截会产生大输出的工具，并自动路由到沙箱。

### 做法 C：其他平台（按 README 配置，先小范围试）

- Cursor 插件仍在审核中。可本地安装：macOS/Linux 用 ln -s "$PWD/context-mode" ~/.cursor/plugins/local/context-mode；Windows 用 robocopy。也可手动建 .cursor/mcp.json 和 .cursor/hooks.json，并拷 .cursor/rules/context-mode.mdc。注意项目 .cursor/hooks.json 会覆盖 ~/.cursor/hooks.json，旧残留会重复触发。
- Gemini CLI：npm install -g context-mode，在 ~/.gemini/settings.json 注册 mcpServers 与 BeforeTool、AfterTool、PreCompress、SessionStart 四个 hook；重启后 /mcp list 应显示 Connected。
- VS Code Copilot、JetBrains Copilot、GitHub Copilot CLI、OpenCode / KiloCode、OpenClaw / Pi Agent：按 README 注册 MCP 与 hook。注意 GitHub Copilot CLI 的 hook 调用全局 context-mode，旧版本 fail open；OpenCode 同时存在 plugin 与 mcp.context-mode 会注册 0 个 ctx_* 工具，需 context-mode upgrade；OpenClaw / Pi Agent 原文在安装步骤处被截断，照做前核对完整文档。

### 做法 D：把「略读型批量判断」外包给 Jev（Quicksilver）

适用形态：一个窄的、带类型的判断，作用在大量条目上。Jev 返回带类型的判定，Claude 只拿回一个 shortlist。

1. 前提：Claude Code 已安装；Node 18+；到 console.typesafe.ai 申请 Jev key。内容会被发送到 TypeSafe 的 API。

2. 交互式安装：
   ```bash
   npx github:UditAkhourii/quicksilver
   ```
   装完重启 Claude Code。之后 Claude 在任务看起来像「读很多来判断一点」时会自行调用这个 skill。

3. 非交互安装：
   ```bash
   npx github:UditAkhourii/quicksilver install --key YOUR_JEV_KEY
   ```

4. 作为 Claude Code 插件安装：
   ```
   /plugin marketplace add UditAkhourii/quicksilver
   /plugin install quicksilver@quicksilver
   ```

5. 常用命令：
   ```bash
   qs filter   "Does this file handle user sessions?" src
   qs filter   "Does this line report a failure?" app.log --lines
   qs classify --labels "bug,feature,question" --items issues.jsonl
   qs rank     "where do we issue refunds?" src --top 5
   qs find     "the retry backoff logic" huge_module.py
   qs ask      "Does this contract allow termination without notice?" --state @contract.txt
   qs status
   ```

6. 大扫描时加 --fast。README 原文：Add --fast to pack items and go about 10× faster on obvious needles。

7. 按 skill 的要求改写提问方式：一次只问一个窄的、带类型的判断——一个 yes/no 条件、一组封闭标签，或一个评分标准；写清确切的边界情况；给一个兜底标签；不做算术、不涉及日期。

8. 读回执判断这次调用值不值。每次运行结束都会打印回执，例如扫描数、命中数、borderline 数、耗时、Jev token 与成本、约多少 Claude token 没被读。

9. 安全边界：不会发送 .env*、私钥、证书、凭据文件；遵守 .gitignore；跳过二进制文件和大于 2 MB 的文件。key 保存在 ~/.quicksilver/config.json。删除 key：
   ```bash
   npx github:UditAkhourii/quicksilver setup --remove
   ```

10. 不要用它做写作、编辑、多步推理，以及任何 grep 能精确回答的问题。

### 做法 E：跨会话持久记忆（claude-mem）

1. 前提：Node.js 20.0.0+；Claude Code 最新版且支持插件；Bun 和 uv 缺失时会自动安装；SQLite 3 已捆绑。

2. 标准安装：
   ```bash
   npx claude-mem install
   ```
   安装器先完成部署，再要求浏览器登录 claude-mem（邮箱 magic link，无需信用卡）。

3. 想跳过登录/账号交互：显式传 --provider，或设置 CLAUDE_MEM_ONLINE_OPTIN=false，或在 CI / 非交互 shell 中运行。

4. 改用插件市场安装：
   ```
   /plugin marketplace add thedotmack/claude-mem
   /plugin install claude-mem
   ```

5. 安装到其他 harness：
   ```bash
   npx claude-mem install --ide opencode
   npx claude-mem install --ide antigravity
   npx claude-mem install --ide omp
   npx claude-mem install --ide grok-bot
   ```
   注意：Grok Bot 没有 host hook，改为监听 chat log 文件；默认用托管记忆 CMEM Pro，本地 observer 需显式 --provider host；装该插件不会顺带安装 Cursor。

6. OpenClaw 网关上安装：
   ```bash
   curl -fsSL https://install.cmem.ai/openclaw.sh | bash
   ```

7. 重启 Claude Code。此后新会话会自动出现此前会话的上下文。

8. 配置写在 ~/.claude-mem/settings.json。可配 AI 模型、worker 端口、数据目录、日志级别、上下文注入设置。设置工作流模式与语言：
   ```json
   {
     "CLAUDE_MEM_MODE": "code--zh"
   }
   ```
   改完需重启 Claude Code 生效。查看本地可用模式：
   ```bash
   ls ~/.claude/plugins/marketplaces/thedotmack/plugin/modes/
   ```

9. 让 SessionStart 上下文包含所有 harness 的观察：在 ~/.claude-mem/settings.json 中设 "CLAUDE_MEM_SESSION_START_INCLUDE_ALL_SOURCES": "true"，或在 viewer 设置里打开 Include all sources at session start。

10. 隐私控制：用 <private> 标签把敏感内容排除在存储之外。

11. 检索三层工作流（MCP 工具，先便宜后昂贵）：
    - search：全文检索索引，可按 type/date/project 过滤，约 50–100 tokens/结果。
    - timeline：某条 observation 或查询前后的时间线上下文。
    - get_observations：按 ID 批量取完整详情，约 500–1,000 tokens/结果，务必批量。

12. 注意：npm install -g claude-mem 只安装 SDK/库，不注册插件 hook、不搭建 worker 服务。装插件一律走 npx claude-mem install 或 /plugin 命令。

13. 出问题时：直接把问题描述给 Claude，troubleshoot skill 会自动诊断并给修复；也可生成完整 bug 报告：
    ```bash
    cd ~/.claude/plugins/marketplaces/thedotmack
    npm run bug-report
    ```

### 做法 F：本地代理压缩所有 LLM 流量（headroom）

1. 安装（三种方式任选）。前提：Python 3.10+，能起本地进程。
   ```bash
   uv tool install --python 3.13 "headroom-ai[all]"
   pip install "headroom-ai[all]"
   npm install headroom-ai
   ```
   注意：headroom CLI 只在 PyPI 包里；npm 包是库，不提供命令行。macOS 上如果默认 python3 比当前 wheel 支持的新，加 --python 3.13。

2. 选接入模式：
   ```bash
   headroom deploy
   headroom wrap claude
   headroom proxy --port 8787
   ```
   headroom wrap 每次都要用它来启动会话才会生效。撤销用 headroom unwrap <tool>。

3. 自检与看省量：
   ```bash
   headroom doctor
   headroom perf
   headroom dashboard
   ```

4. 打开输出 token 削减（默认关闭）：
   ```bash
   export HEADROOM_OUTPUT_SHAPER=1
   headroom proxy --port 8787
   ```
   两个机制：verbosity steering 在 system prompt 末尾追加简洁说明；effort routing 在模型只是接着工具结果往下走的轮次下调思考强度。

5. 让工具自己学简洁度：
   ```bash
   headroom learn --verbosity
   headroom learn --verbosity --apply
   ```

6. 量测输出节省：
   ```bash
   headroom output-savings
   ```
   想看实测而不是估计，留出 10% 会话作为未处理对照组：
   ```bash
   export HEADROOM_OUTPUT_HOLDOUT=0.1
   ```

7. 关闭遥测：
   ```bash
   export HEADROOM_BEACON=off
   ```
   或用 DO_NOT_TRACK=1，或 --offline。

8. 失败挖掘与回滚：
   ```bash
   headroom learn
   headroom learn --target CLAUDE.md
   headroom unwrap <tool>
   ```

### 做法 G：录屏 + 口述，把上下文和复现步骤一次性录进去（blurt）

1. 安装 skill：
   ```bash
   npx skills add AGIHunt/blurt
   ```
   Claude Code 也可以用：
   ```
   /plugin marketplace add AGIHunt/blurt
   ```

2. 在任意项目中让 agent 启动。触发语：
   ```
   "start blurt" / 「开始口喷」
   ```
   首次运行会自动为你的机器挑选语音模型，并安装 Blurt 菜单栏应用。

3. 划定录制区域：拖选一个区域、点选某个窗口，或全屏。

4. 倒计时 3-2-1 后开始口述。悬浮小条显示时间与麦克风电平，带暂停、重录、Finish。快捷键：⌥⇧P 暂停、⌥⇧S 完成。

5. 点 Finish 后回到工作，agent 在本地转写、写出条目、打开评审页。

6. 像刷信息流一样逐条分诊，全部为键盘操作：A 保留、X 丢弃、J/K 上一条/下一条、Z 撤销、G 列表、V 总览。然后导出，或对 agent 说 fix them。

7. 常驻用法：⌥⇧R 在任意位置开始录制，再按一次结束；⌥⇧B 打开菜单。录制默认写到工作区 ~/Blurt，也可以绑定到某个项目目录。

8. 后台自动处理：打开 After recording → Claude Code / Codex，此后每次录完都在后台被处理。

9. 团队协作：队友从 releases 页下载 Blurt for macOS，解压后第一次右键 → Open，按 ⌥⇧R 录制；然后用 Recent recordings → Copy video 把视频贴到 Slack/飞书里；或者绑定一个共享项目文件夹。

10. 语音模型与语言：默认本地 SenseVoice，约 240 MB；Apple Silicon 或 NVIDIA 上可用 Whisper；也可以自带 Groq、OpenAI 或 DashScope 的 key；默认情况下没有数据离开本机。录制对象不限于网页应用：终端、TUI、桌面应用同样可以；手机用自带录屏并把麦克风打开；硬件类用手机拍下来，然后交给 agent 说 process this video。

### 做法 H：mem0 可编程持久记忆

适用形态：你希望把「记住用户偏好与历史」从每次人工复述变成 agent 的默认动作，并且需要按 user_id 隔离、可自托管或走云平台。

前提：Mem0 依赖一个 LLM，默认 OpenAI 的 gpt-5-mini；默认 embedding 是 text-embedding-3-small；要用混合检索，README 建议至少用 Qwen 600M 或同级别 embedding 模型。

路线 A：CLI 最小验证（最快，先确认通路）。README 称 agent 可在 5 秒内自助拿到可用 API key，无需邮箱、控制台或 OTP：
```bash
npm install -g @mem0/cli      # or: pip install mem0-cli
mem0 init --agent --agent-caller claude-code
mem0 add "I am using mem0"
mem0 search "am I using mem0"
```
人类 owner 之后可用 mem0 init --email <their-email> 认领该账号。带用户隔离的常规用法：
```bash
mem0 init
mem0 add "Prefers dark mode and vim keybindings" --user-id alice
mem0 search "What does Alice prefer?" --user-id alice
```

路线 B：库方式接进自己的程序：
```bash
pip install mem0ai
```
需要 BM25 关键词匹配与实体抽取的增强混合检索时：
```bash
pip install mem0ai[nlp]
python -m spacy download en_core_web_sm
```
JS 版本：npm install mem0ai。README 给出的核心调用模式是「取记忆 → 拼进 system prompt → 生成回答 → 把整轮对话写回记忆」：用 memory.search(query=message, filters={"user_id": user_id}, top_k=3) 取回相关记忆；把记忆拼进 system prompt；生成回答后 memory.add(messages, user_id=user_id) 写回。

路线 C：自托管服务器：
```bash
cd server && make bootstrap
cd server && docker compose up -d    # http://localhost:3000
```
自托管默认开启鉴权。旧版本升级需设置 ADMIN_API_KEY、通过向导注册 admin，或仅在本地开发用 AUTH_DISABLED=true。

路线 D：给编码助手装 Agent Skills：
```bash
npx skills add https://github.com/mem0ai/mem0 --skill mem0
npx skills add https://github.com/mem0ai/mem0 --skill mem0-cli
npx skills add https://github.com/mem0ai/mem0 --skill mem0-vercel-ai-sdk
npx skills add https://github.com/mem0ai/mem0 --skill mem0-integrate
npx skills add https://github.com/mem0ai/mem0 --skill mem0-test-integration
npx skills add https://github.com/mem0ai/mem0 --skill mem0-oss-to-platform
```
在已有仓库里用 /mem0-integrate 以 test-first 流程接入 Mem0，再用 /mem0-test-integration 验证；要从 OSS 迁到托管平台用 /mem0-oss-to-platform。

路线选择：测试/原型用库（pip install mem0ai）；团队自建基础设施用自托管（docker compose up）；想要零运维生产直接用云平台（app.mem0.ai 注册）。旧版本升级见 https://docs.mem0.ai/migration/oss-v2-to-v3。

注意：README 的分数反映 Mem0 托管平台，包含开源 SDK 不具备的专有优化；开源用户应期待方向相似的增益，而不是相同数字。新增的 ADD-only 抽取意味着记忆只累积不覆盖，原文未说明如何清理错误记忆，需要自行设计删除路径。

### 做法 I：cognee 本地知识图谱记忆

适用形态：你要跨会话持久长期记忆，想把文档、代码、会话转成自托管知识图谱，并且希望无 LLM key 也能先跑通写入与检索。核心操作：remember、recall、improve、forget。

前提：Python 3.10–3.14。以下 1–2 步不需要任何 API key。

1. 安装：
```bash
uv pip install "cognee[gliner]"
```
gliner extra 提供未配置 LLM key 时使用的本地抽取模型。

2. 无 LLM 本地跑通「写入 + 检索」。保存为 quickstart.py 后运行：
```python
import asyncio
import cognee

async def main():
    await cognee.remember(
        "Marie Curie was born in Warsaw and worked at the University of Paris.",
        dataset_name="local_quickstart",
    )
    results = await cognee.recall(
        "Where was Marie Curie born?",
        datasets=["local_quickstart"],
    )
    for result in results:
        print(result)

if __name__ == "__main__":
    asyncio.run(main())
```
同一流程的 CLI 等价写法：
```bash
cognee-cli remember "Marie Curie was born in Warsaw." -d local_quickstart
cognee-cli recall "Where was Marie Curie born?" -d local_quickstart
```
注意：无 LLM 时 recall 返回的是匹配到的源文本片段，不生成答案。

3. 不下载模型，先看预置图谱 demo：
```bash
cognee-cli demo
```

4. 配置 LLM 以得到生成式回答：
```python
import os
os.environ["LLM_API_KEY"] = "YOUR OPENAI_API_KEY"
```
设了 key 之后，Cognee 默认用 OpenAI 做语言模型与 embedding。

5. 给已有 agent 接上记忆（Claude Code）：
```bash
claude plugin marketplace add topoteretes/cognee-integrations
claude plugin install cognee-memory@cognee
```
之后按插件配置指南选择本地或远程记忆。

6. 给已有 agent 接上记忆（Codex）：
```bash
codex features enable hooks
codex plugin marketplace add topoteretes/cognee-integrations --ref main
codex plugin add cognee@cognee
```
或改 ~/.codex/config.toml：
```toml
[features]
hooks = true
```

7. 本地 UI 查看安装：
```bash
cognee-cli -ui
```
前提：UI 启动器需要 Node.js/npm；其 MCP 服务需要 Docker。

8. Docker 跑 API demo：
```bash
docker run --rm -it -p 8000:8000 \
  -e LLM_API_KEY="sk-..." \
  -e ENABLE_BACKEND_ACCESS_CONTROL=false \
  -v cognee_storage:/cognee-storage \
  cognee/cognee:main
```
ENABLE_BACKEND_ACCESS_CONTROL=false 是单用户/本地姿态；不设它时 API 默认多租户。--rm 会在退出时丢弃容器内数据，-v cognee_storage:/cognee-storage 用于跨运行保存记忆。

9. 从源码跑 API + UI + MCP：
```bash
docker compose --profile ui --profile mcp up
```
默认端口：API 8000、UI 3000、MCP 8001。

10. 单 Postgres 承载整个记忆层：自 cognee 1.0 起，关系型元数据、PGVector、图状态可跑在一个 Postgres 实例里。但原文明确警告：用 Postgres 作图存储目前是 demo 特性，生产版本是授权产品。仅建议在 demo 场景验证。

### 做法 J：planning-with-files 磁盘计划

适用形态：长时运行编码智能体，计划需要挺过上下文丢失、/clear、崩溃和 compaction。核心是把计划状态从上下文窗口搬到磁盘上。

1. 确认前提：宿主支持 hook/插件或 Agent Skills 标准；本机有 Node/npx。

2. 一条命令安装（全局）：
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files -g
```
中文版：
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files-zh -g
```
注意：状态标记必须保持英文字面量，例如 **Status:** complete，check-complete.sh 用 grep -F 匹配它，翻译后会直接导致完成门槛失效。

3. 在项目里建立三文件结构：
```
your-project/
├── task_plan.md   ← phases + checkboxes; the resume point after /clear
├── findings.md    ← research notes and decisions, appended as you go
└── progress.md    ← session log and test results
```
并行任务不要抢同一套文件，改用隔离目录 .planning/YYYY-MM-DD-slug/，通过 .active_plan 指针选择。这些文件默认被 gitignore。

4. 与 Claude Code plan mode 衔接：plan mode 里设计并批准方案；接受方案后，让智能体把方案写成 task_plan.md 的 phases，然后在普通模式执行。

5. 依赖 hook 获得持续注入：每回合开始时 UserPromptSubmit hook 重新注入选中的 active-plan 上下文；/clear 或新会话后 skill 从磁盘重读项目文件。原生插件宿主自带每回合计划注入、写入后提醒、完成门槛、/pwf 命令、模型可调用工具；其他平台按各 IDE 的 hooks/配置指南注册。

6. 启用完成门槛：在 gated 模式下，完成门槛会持有智能体的停止动作，直到计划报告完成。

7. 命名计划与选择器：同一项目存在两个命名计划时必须显式给 PLAN_ID；可用 PWF_PLAN_ROOT 固定计划根、PLANNING_DISABLED 关闭；PWF_FAST_PATH=0 可强制回到 shell 链。

8. 查看与选择计划：--list 列出已保存的计划与阶段数。

9. 任务结束后处理计划文件：它们是工作记忆，不是交付物——默认 gitignore、不自动归档，下一个任务会覆盖根计划。值得保留的内容应显式提升到代码、提交或文档里。

### 做法 K：hivemind 团队 trace 技能化

适用形态：你想让所有 agent 共用一个大脑，把编码类 agent 每次会话的 prompt、工具调用、工具响应、助手回复捕获成结构化 trace，后台 worker 挖重复模式写成 SKILL.md，再注入团队里每个已接入 agent 的上下文。核心链路：Capture → Codify → Propagate → Compound。

前提：Node >= 22.0.0；走 npm 路径时需要可写的 npm 全局前缀；需要一个 Deeplake 账号以获得 token。安装器会探测机器上所有受支持的 assistant，接好 hooks，弹一行同意提示后开浏览器登录；装完要重启 assistant。

1. 安装（macOS / Linux）：
```bash
curl -fsSL https://deeplake.ai/hivemind.sh | sh
```
Windows（PowerShell）：
```powershell
irm https://deeplake.ai/hivemind.ps1 | iex
```
任何平台走 npm：
```bash
npm i -g @deeplake/hivemind && hivemind install
```

2. 授权登录。交互式走浏览器流程；无头 / CI 用 token：
```bash
HIVEMIND_TOKEN=<your-token> hivemind install
hivemind install --token <your-token>
```

3. 只给指定 assistant 安装（先小范围试）：
```bash
hivemind install --only claude
hivemind claude install
hivemind codex install
hivemind claw install
hivemind cursor install
hivemind hermes install
hivemind pi install
hivemind claude_cowork install
```

4. 检查接线状态：
```bash
hivemind status
```

5. 重启对应 assistant。注意：Codex 首次启动会弹 Hooks need review，必须选 2. Trust all and continue；Cursor 1.7+ 会接六个生命周期事件，装完重启；Claude Cowork 会注册共享 MCP server，必须完全退出并重开 Claude Desktop。

6. 可选：开语义检索。默认关闭，因为本地嵌入守护进程约 600 MB；不开就静默降级成 ILIKE 词法检索：
```bash
hivemind embeddings install
hivemind install --with-embeddings
```

7. 配置捕获范围与身份。关键环境变量：HIVEMIND_CAPTURE 默认 true；HIVEMIND_WORKSPACE_ID 默认 default；HIVEMIND_CAPTURE_ONLY_CLI 设 true 只捕获交互式 CLI；HIVEMIND_SKILLIFY_EVERY_N_TURNS 默认 20；HIVEMIND_SUMMARY_EVERY_N_MSGS 默认 50；HIVEMIND_SUMMARY_EVERY_HOURS 默认 2；HIVEMIND_WIKI_WORKER 设 1 完全关闭后台摘要 worker；HIVEMIND_GRAPH_ON_STOP 设 0 关闭 Stop / SessionEnd 时的代码图重建；HIVEMIND_DEBUG 设 1 输出 hook 调试日志。

8. 用 .hivemind 文件做按目录路由或退出。约定的 JSON 字段有 orgId、workspaceId、collect；.hivemind 可提交，.hivemind.local 不提交且优先于同目录 .hivemind。collect:false 作为 fail-safe 始终生效。优先级是 env > file > login。每次会话开始的 banner 会打印当前生效的 org/workspace。

9. 使用技能提炼（skillify）：worker 在 Stop / SessionEnd 触发，挖掘范围内最近会话，问 Haiku 值不值得留，然后把 SKILL.md 写到 <project>/.claude/skills/<name>/。命令：
```bash
hivemind skillify
hivemind skillify scope <me|team>
hivemind skillify pull
hivemind skillify unpull
```

10. 用自然语言搜索 trace 与技能，例如：What was Emanuele working on?；Search traces for authentication bugs we've solved；What did we decide about the API design?；Show me skills my team has codified for handling migrations。

11. 代码库图与代码文档：
```bash
hivemind docs sync
hivemind docs list
hivemind docs auto on|off
hivemind docs agent [name]
```
文档生成 shell 出去调宿主 agent 自己的 CLI，不需要另配 API key，后台运行。

12. 跨 agent 团队规则，SessionStart 注入每个会话：
```bash
hivemind rules add "no DROP TABLE on prod creds"
hivemind rules list
hivemind rules edit <rule-id> "<new text>"
hivemind rules done <rule-id>
```

13. 卸载：
```bash
hivemind uninstall
hivemind codex uninstall
```

### 核心用法：用代码思考（Think in Code）

不管用哪种做法，关键动作是：让模型写脚本做分析，只 console.log() 结果，而不是把 50 个文件读进上下文再数函数。示例：
```js
// Before: 47 × Read() = 700 KB.  After: 1 × ctx_execute() = 3.6 KB.
ctx_execute("javascript", `
  const files = fs.readdirSync('src').filter(f => f.endsWith('.ts'));
  files.forEach(f => console.log(f + ': ' + fs.readFileSync('src/'+f,'utf8').split('\\n').length + ' lines'));
`);
```
注意：这里的 700 KB / 3.6 KB 和 47×Read() 是 README 里的说法，未经验证。

## 怎么判断变好了

要分两类指标看：工具侧（省了多少上下文/token）和任务侧（结果有没有变好）。调研报告特别提醒：这些项目的 README 普遍只给了上下文或成本指标，没有给任务结果质量指标，所以任务侧必须自己测。

工具侧指标：

- Context Mode：ctx_stats / ctx-stats（按工具的节省明细、消耗 token、节省比例）；状态栏 $ saved this session · $ saved across sessions · % efficient；ctx_doctor / ctx-doctor 检查运行时、hook、FTS5、注册、版本，所有检查应为 [x]。
- Quicksilver：每次运行末尾的回执（扫描数、命中数、borderline 数、耗时、Jev token 与成本、约多少 Claude token 没被读）；qs status 看 key 状态和累计节省 token。
- claude-mem：看新会话是否自动注入此前上下文，以及主动检索的命中率；README 只提出三层工作流可带来 ~10x token 节省，没有可复核的实验数据。
- headroom：headroom doctor、headroom perf、headroom dashboard；headroom output-savings 默认给估计值，想看实测就开 HEADROOM_OUTPUT_HOLDOUT=0.1，dashboard 的 Output Tokens Saved 卡片会显示 measured 并带区间。
- blurt：录制到评审页的端到端耗时；每次录制的 token 与实际花费（README 给的是 ~142k/19k、~$2 这一档）。
- mem0：CLI 四步先跑通；再用 search + add 嵌进一个固定 user_id 的重复性任务做 1–2 周小范围试。注意托管平台分数含专有优化，开源版无法复现同等数字。
- cognee：无 LLM 本地 remember / recall 先跑通；再通过 Claude Code 插件或 MCP 接进现有 agent 做 1–2 周对照试用，判断能否减少重复交代上下文。BEAM 分数是自报，不能直接当作「用了 Cognee 就更好」的证据。
- planning-with-files：在同一个长时编码任务上做 A/B，让智能体把 phases 写进 task_plan.md 并靠 hook 每轮重注入，观察 /clear 或 compaction 后的重新定位轮数是否下降。原文自测数据：基准 96.7% 断言通过（29/30）、3/3 盲测 A/B 获胜、磁盘计划把重新定位从 13.3 回合降到 5.0 回合、hook 单次触发优化后 289ms。这些需要自己复现。
- hivemind：先在一个仓库、一个 agent（如 Claude Code）上小范围试，用 .hivemind 限定捕获范围，再看 skillify 是否真的产出被复用的 SKILL.md。基准数据是作者自测。

任务侧指标：

- 正确率：任务结果是否正确。Quicksilver 的基准里就出现过省 85% token 但 F1 从 54% 掉到 23% 的情况，所以不能只看省量。
- 人工纠正次数：你需要介入纠正 agent 的次数。
- 交付时间：完成任务花了多久。
- 会话连续性：会话压缩后，agent 是否还能检索到之前的状态和决策；/clear 或 compaction 后重新定位需要多少轮。
- 条目保留率（blurt）：按 A 保留的条数 / 总条数；以及保留条目里「不需要再补上下文就能直接开工」的比例、代码定位命中率。
- 团队复用率（hivemind）：skillify 产出的 SKILL.md 是否被其他会话或其他人的 agent 实际拉取并复用。

最小试用方式：

1. 按做法 A，在 Claude Code 上用 MCP-only 跑一个真实编码任务；任务前后用 ctx stats 记录上下文节省；同时记录任务侧指标，和不用 Context Mode 的基线对比；如果任务会触发会话压缩，观察压缩后是否还能检索到之前的状态。
2. Quicksilver：用少量你已标注的样本核对后再扩大。先跑一条 qs filter，读回执，再抽查几个被标 ? 的边界项，确认 Claude 复查后结果对不对。README 的 12 项基准里有部分任务准确率明显下降（日志 triage F1 54%→23%、安全审查 shortlist F1 100%→89%），所以必须用自己的数据核对。
3. claude-mem：1 台机器、1 个已有项目、1–2 天。跑 3–5 次带工具调用的会话（含一次 bug 修复），开一个新会话看是否自动注入此前项目上下文；再让模型用 search → get_observations 主动回查历史；最后用 <private> 包一段假敏感信息，验证它没有进入存储。
4. headroom：先跑 headroom doctor 确认路由生效，看 dashboard 在你自己的流量上省了多少；开 HEADROOM_OUTPUT_HOLDOUT=0.1 拿实测输出节省；不满意用 headroom unwrap <tool> 回滚。
5. blurt：选一个有真实小 bug 的 Web 项目，录一段 5–10 分钟走查，一边点页面一边口述，故意在中途跳一次话题、改一次口径，看拆分是否混乱；等评审页弹出后全程只用键盘 A/X/J/K 过一遍，记录保留与丢弃各多少；对保留的条目说 fix them，看 agent 是否照着复现步骤改对；第二段换一个不写代码的同事录，验证跨人交接这一环。
6. mem0：按 CLI 四步先跑通通路，再把 search + add 嵌进一个固定 user_id 的重复性任务，做 1–2 周小范围试。
7. cognee：按 Python/CLI 快速上手路径先跑通「跨会话长期记忆」，再通过 Claude Code 插件或 MCP 接进现有 agent 做 1–2 周对照试用。
8. planning-with-files：选一个跨多会话的真实长任务，在支持 hook 的宿主上执行，做 A/B，观察重新定位轮数。
9. hivemind：先只在一个仓库、一个 agent 上安装，用 .hivemind 限定范围，看 skillify 产出的 SKILL.md 是否被复用。

试多久：

- 调研没有给出统一固定时长。建议先做小范围试用，跑一个真实任务，对照工具侧节省与实际任务结果，再决定是否推广到团队。
- 要验证会话连续性，至少覆盖一次会话压缩和一次跨会话继续；claude-mem 建议 1–2 天、3–5 次会话。
- blurt 只要「条目保留率高 + 端到端时间明显短于原方式」，就值得固定成一种输入惯例；如果条目需要大量返工或代码定位经常错，先退回参考。
- headroom 在长会话、重工具输出的场景下试；短对话、散文类负载不用试，收益接近零。
- mem0 / cognee 这类持久记忆，先用 1–2 周小范围试，重点看是否减少重复交代上下文，而不是只看向量库或图谱是否漂亮。
- planning-with-files 至少覆盖一次 /clear 或 compaction，再比较重新定位轮数。
- hivemind 先在一个仓库一个 agent 上试，确认捕获范围和 skillify 质量后再扩展团队。

## 常见坑

Context Mode：

- README 的 98% 节省、100x 说法、企业 logo 墙都是自述，缺少第三方验证。不要把营销数字当成已证事实。
- ELv2 许可对商用有限制，推广到团队前要确认合规。
- MCP-only 没有 hook、没有自动路由，模型可能不会主动用 ctx_* 工具。需要手动提示，或者上完整插件。
- 不传 --continue 时，上一次会话数据会立即删除。需要跨会话连续性时注意这个参数。
- Cursor 项目 .cursor/hooks.json 会覆盖 ~/.cursor/hooks.json；旧安装残留条目会重复触发，doctor 会告警。
- OpenCode / KiloCode 同时存在 plugin 与 mcp.context-mode 会导致注册 0 个 ctx_* 工具，需 context-mode upgrade 清掉遗留 MCP 条目。
- GitHub Copilot CLI 的 hook 调用全局 context-mode，旧版本 hook 不生效但不会阻塞工具（fail open），需 npm install -g context-mode@latest。
- 不要加激进的「简洁」提示词。Context Mode 不强制写作风格；作者引用 Moonshot AI 在 kimi-k2.5 上的 issue，认为激进的「简洁」提示词会损害编码/推理 benchmark。
- OpenClaw / Pi Agent 的原文在安装步骤处被截断，照做前先核对完整文档。

Quicksilver：

- 准确率不是无条件变好。基准里日志 triage 的 F1 从 54% 掉到 23%，安全审查 shortlist 的 F1 从 100% 掉到 89%；这类结果只能当 shortlist 用，由 Claude 复查被标 ? 的边界项。
- 主观或团队风格类标签不适合外包：commit 类型 perf vs refactor，Quicksilver 76% vs Claude 83%；编码了「没写下来的政策」的标签更差。
- 内容是发到第三方 API 的；--fast 只在「明显是针」的场景下有意义；超大扫描墙钟时间和 Claude 差不多——那里赢的是 token 和上下文，不是速度。
- 不要用它做写作、编辑、多步推理，以及任何 grep 能精确回答的问题。

claude-mem：

- ~10x token savings、「get up to 100% more usage from your plan」、「seamlessly preserves context」、自动运行的可靠性，都只是作者主张，README 没有给基准或对照实验。
- 存在商业引导：安装后要求浏览器登录、签发 memory key、托管记忆 CMEM Pro 免费 14 天，到期后若不订阅会「自动回落到你的 Anthropic plan」。
- README 末节推广 CMEM 代币并给出 BASE 合约地址，与记忆功能无技术关联，是需要警惕的噪音。
- Grok Bot 的 awareness 推送被明确标注为 pilot，且声明不写 profile.md / user-memory / project memory。
- 环境门槛：Node 20+、Bun、uv、Windows 上的 PATH 问题；npm install -g claude-mem 只装 SDK，是常见踩坑点。

headroom：

- 它是一个会接管你全部 LLM 流量的本地代理，别无条件全量铺开；收益随数据重复度剧烈变化，基准全部自报。
- headroom wrap 每次都要用它启动会话才生效；输出压缩默认关闭，需要显式开 HEADROOM_OUTPUT_SHAPER=1。
- headroom wrap 复用（而非新建）的代理，环境变量是启动时快照的，虽然 wrap 会热同步；共享代理上的覆盖是全局的，最后一个显式设置生效。
- 匿名 beacon 默认开启（可用 HEADROOM_BEACON=off / DO_NOT_TRACK=1 / --offline 关）；MCP 客户端不继承交互式 shell PATH，需要写绝对路径。
- 短对话、散文、已经密集的载荷收益很小甚至为零；沙箱里跑不了本地进程就用不了。

blurt：

- 仓库 40 stars、成熟度低，只有 README 自述，没有第三方评测、没有基准数据。
- 录制端以 macOS 为主，Windows 只有 Tk + ffmpeg，路线图里的 Windows 托盘应用尚未完成。
- 前提是能看到问题或用手机拍到；纯后端/无界面的问题需要另想办法。
- 质量依赖带视觉的强模型，弱模型产出会明显下降。
- 成本不完全看录制时长：除条目数外，还取决于当前对话已有多长（缓存读取 ~4–5M tokens）。
- 首次运行要下载约 240 MB 模型，或自备 Groq/OpenAI/DashScope key。
- 路线图里「浏览器捕获（把 console 报错和网络失败对齐到视频）」还没做，目前拿不到浏览器内部错误。
- 团队用法要求无仓库的同事手动下载、解压、首次右键打开。

mem0：

- 托管平台分数包含开源 SDK 不具备的专有优化；开源用户应期待方向相似的增益，而不是相同数字。
- 所有数字均为厂商自报，材料中没有第三方复现结果。
- 未涉及成本、数据隐私/合规、多租户隔离、记忆删除与纠错流程的具体做法。
- 新增的 ADD-only 抽取意味着记忆只累积不覆盖，原文未说明如何清理错误记忆，实际使用需要自行设计删除路径。
- 本文只拿到仓库 README，未包含 docs.mem0.ai 与论文正文，配置细节需以官方文档为准。

cognee：

- 单 Postgres 图存储目前是 demo 特性，生产版本是授权产品；仅建议在 demo 场景验证。
- 内置 GLiNER 抽取器是小模型流水线的 demo，更高精度、更广标签覆盖的生产版需要联系厂商。
- 无 LLM 时 recall 返回匹配到的源文本片段，不生成答案；要生成式回答需配置 LLM。
- Docker 用 --rm 会在退出时丢弃容器内数据，跨运行保存记忆需要命名卷，例如 cognee_storage:/cognee-storage。
- 不设 ENABLE_BACKEND_ACCESS_CONTROL=false 时 API 默认多租户，每个 /api/v1 调用都需要已认证用户；想保留鉴权则设 DEFAULT_USER_PASSWORD。
- BEAM 两个分数用了不同会话、不同摄取模型、不同检索选型流程，比较前必须先读方法论、模型、局限与复现说明。

planning-with-files：

- 效果数字全部来自项目自述，指向 docs/evals.md，但本次材料未给出该文件，无法核对测试方法、样本量与对照设置。
- 完成门槛依赖英文状态标记（grep -F 匹配 **Status:** complete），本地化或改写标记会静默失效。
- 自动恢复只读项目文件，不读 agent transcript；跨项目记录被隔离，会话重放需要显式 CLI 模式。
- 计划文件默认 gitignore、不自动归档，任务结束会被下一个任务覆盖——需要人工把有价值内容提升为交付物。
- 需要宿主支持 hook/插件，或至少支持 Agent Skills 标准的发现路径；没有 hook 的宿主拿不到「每回合注入」这个关键机制。
- 原文大量篇幅是版本发布日志，其中相当比例是路径、指针竞态、Windows/PowerShell 兼容等工程细节，说明该方案在跨平台与并发场景上有持续维护负担。

hivemind：

- 默认把全部会话 prompt 与工具输出写进团队共享 workspace；务必先用 .hivemind / .hivemind.local 限定捕获范围。
- Node >= 22.0.0；走 npm 路径时需要可写的 npm 全局前缀。
- Codex 首次启动必须选 2. Trust all and continue，否则 hooks 不运行；Claude Cowork 必须完全退出并重开 Claude Desktop。
- 语义检索默认关闭，因为本地嵌入守护进程约 600 MB；不开就静默降级成 ILIKE 词法检索。
- 原文在 rules 一节的命令块未结束，后续 goals 等命令只有目录提及、没有正文；照做前核对完整文档。
- 基准数据是作者自测，需自己复现。

## 证据与来源

本手册合并了九份材料：mksglu/context-mode、UditAkhourii/quicksilver、AGIHunt/blurt、thedotmack/claude-mem、headroomlabs-ai/headroom、mem0ai/mem0、topoteretes/cognee、OthmanAdi/planning-with-files、activeloopai/hivemind。以下逐条标注依据和性质。

Context Mode（来自 README 与调研报告）：

- 「把工具输出挡在上下文之外」和「会话连续性用 SQLite/FTS5 检索」来自 README 对 Context Mode 四块组成的说明。README 称 315 KB 变 5.4 KB，减少 98%。
- 「用代码思考」来自 README 的范式：让模型写脚本分析、只 console.log() 结果，而不是把 50 个文件读进上下文。示例里的「47 × Read() = 700 KB 变 1 × ctx_execute() = 3.6 KB」是 README 说法，未经验证。
- 安装命令、hook 配置、各平台差异来自 README 原文；ctx_stats、ctx_doctor、状态栏指标来自 README 对工具和状态栏的说明。
- 「先在 Claude Code（或 Cursor）上用 MCP-only 做小范围试用，对照 ctx_stats 的上下文节省与实际任务结果，再决定是否推广」来自调研报告的结论。
- 「README 的 98% 节省数字、100x 说法和企业 logo 墙均为自述，缺少第三方验证」「ELv2 许可对商用有限制」来自调研报告的结论。
- 仓库指标 24,371 stars（当日 +88）、Hacker News 排名 #1、570+ points 来自调研报告，属于当时的公开指标，不是效果证据。
- 调研报告指出：工具侧有上下文占用指标，但 README 没有给出任务结果质量（正确率、人工纠正次数、交付时间）的衡量方式，因此任务侧指标需要自己测。
- Moonshot AI 在 kimi-k2.5 上的 issue 是作者引用，用于支持「不要用激进简洁提示词」的主张，不是本手册的实测结论。

Quicksilver（来自 README 调研）：

- 有数据的部分：12 任务基准，其中 8 个用真实公开数据（一台超算的日志、Banking77、UCI SMS Spam、SST-2、Hono 代码库及其 git 历史、lodash）；每个任务由「按常规方式工作的 Claude Code subagent（Read/Grep/Glob）」和「Claude + Quicksilver」分别完成，都对照隐藏 ground truth 打分，指标是 F1 / accuracy / hit@k，基准可复现（bench/）。关键读数：日志 triage F1 54%→23%、Claude token −85%；噪声日志找针 100%→100%、−95%；工单路由 100%→99%、−82%；垃圾短信 97%→92%、−79%；情感 97%→96%、−85%；代码库发现（Hono 187 文件）100%→100%、−91%；安全审查 shortlist 100%→89%、−74%。
- 在线回执（扫描数、命中数、borderline、耗时、Jev 成本、Claude 未读 token）来自 README 的实际输出格式；README 称 Claude 侧 token 已扣除用对照任务测出的固定 subagent 开销，并把每次任务加载 SKILL.md、每条命令、Claude 读回的每个字节都计入成本。
- 中位省 82% token 这一说法来自调研报告的结论。
- 只是作者主张或未验证的：「Claude 会自动调用该 skill」的触发可靠性、--fast 快 10 倍、安全排除规则的实际覆盖面。

claude-mem（来自 README 调研）：

- 事实性内容：版本 13.28.0；Apache-2.0；Node >= 20；系统依赖 Bun/uv/SQLite 3；5 个生命周期 hook + 6 个 hook 脚本；4 个 MCP 工具；三层检索工作流；设置文件 ~/.claude-mem/settings.json；code--zh 已内置；各 IDE 安装参数；仓库指标 95,042 stars（来源 metrics）。
- 只是作者主张、没有实验支撑的：~10x token savings、「get up to 100% more usage from your plan」、「seamlessly preserves context」、自动运行的可靠性。README 没有基准测试、对照实验或用户案例数据。
- 托管记忆、14 天试用后回落 Anthropic plan、代币推广、Grok Bot pilot，均来自调研报告对 README 的描述。
- 本材料仅来自仓库 README，未包含代码、issue 或第三方评测。

headroom（来自 README 调研）：

- 事实性内容：安装三种方式、接入形态、wrap/unwrap 命令、内容类型分工（JSON → SmartCrusher、源码 → CodeCompressor/AST、散文 → Kompress-v2-base）、CCR 可逆检索、输出侧两个机制及生效路径、HEADROOM_OUTPUT_HOLDOUT 与 measured 的对应关系、遥测字段范围、MCP 绝对路径要求。
- headroom output-savings 的示例输出 Reduction: 31.7% (95% CI 27.7% … 35.7%) [estimated] 来自 README。
- 基准全部自报，README 提供了复现命令，但没有第三方验证。

blurt（来自 README 调研）：

- 给出数据的部分：两段真实会话的测量——7.0 分钟录制 / 2.8 分钟语音 / 9 条 / 本地转写 4 秒 / 录制到评审页 ~4 分钟 / ~142k 输入 19k 输出 token / 按 API 价格 ~$2；8.6 分钟录制 / 5.0 分钟语音 / 20 条 / 转写 5 秒 / ~5 分钟 / ~150k、~20k / ~$2。两段会话用 Claude Code + Opus 5.5 + 生产 Web 应用。
- 只是作者主张、没有对应数据的：「原来两天、现在 30 分钟」；「能挑对每一帧并框准位置」；「能把跳跃、自我纠正的口述拆干净」；「条目里包含可能是哪段代码负责」的准确率。
- 其他事实性内容：默认本地识别、视频不入模、模型约 240 MB、音视频同步误差一帧以内、SenseVoice 覆盖 5 种语言、Whisper 覆盖 99 种语言。
- 仓库 40 stars、macOS 为主、路线图项未完成，均来自调研报告的局限说明。

mem0（来自 README 调研）：

- 事实性内容：Apache 2.0，README 标注 66k+ stars；四种使用形态（Python/JS 库、自托管服务器、云托管平台、CLI）；Agent Skills 接入；2026 年 4 月版记忆算法五个变化；默认 OpenAI gpt-5-mini 与 text-embedding-3-small；混合检索建议 Qwen 600M 或同级别 embedding；CLI 四步安装与用户隔离命令；库方式代码模式；自托管 make bootstrap / docker compose；Agent Skills 安装命令；路线选择。
- 厂商自报数据：LoCoMo 71.4→92.5、LongMemEval 67.8→94.4、BEAM (1M) 64.1、BEAM (10M) 48.6，tokens 约 6.7K–7.0K，latency p50 约 0.88s–1.09s；LongMemEval assistant memory recall 98.2。
- 关键局限：上述分数反映托管平台，包含开源 SDK 不具备的专有优化；开源用户应期待方向相似增益，而不是相同数字。所有数字均为厂商自报，没有第三方复现。未涉及成本、隐私/合规、多租户隔离、记忆删除与纠错。ADD-only 只累积不覆盖，未说明清理错误记忆。本文只拿到 README，未包含 docs 与论文正文。

cognee（来自 README 调研）：

- 事实性内容：Python 3.10–3.14；可无 LLM key 本地运行，用本地 GLiNER 抽取与本地 embedding，CPU；四个核心操作 remember / recall / improve / forget；安装 uv pip install "cognee[gliner]"；quickstart.py 与 CLI 等价命令；cognee-cli demo；LLM_API_KEY；Claude Code 与 Codex 插件命令；UI 与 Docker 命令；默认端口 API 8000 / UI 3000 / MCP 8001；单 Postgres 图存储是 demo，生产版是授权产品。
- 自报基准：BEAM 100K tokens 报告分数 0.79；BEAM 10M tokens 0.67（探索性结果）。原文声明两个设置用了不同会话、不同摄取模型、不同检索选型流程，比较前必须先读方法论、模型、局限与复现说明；10M 分布式摄取尚有复现差距。
- 只是作者主张或未验证的：更高精度、更广标签覆盖的生产版需要联系厂商；原文未给出时间/事件/状态触发的具体规则或调度配置。

planning-with-files（来自 README 调研）：

- 事实性内容：三文件模式 task_plan.md / findings.md / progress.md；安装命令 npx skills add OthmanAdi/planning-with-files --skill planning-with-files -g；中文版 skill planning-with-files-zh；状态标记必须保持英文字面量；hook 生命周期 UserPromptSubmit 每回合注入、PostToolUse 写入提醒、Stop gate 完成门槛；原生插件宿主；PLAN_ID / PWF_PLAN_ROOT / PLANNING_DISABLED / PWF_FAST_PATH；--list；计划文件默认 gitignore、不自动归档。
- 自测数据：基准 96.7% 断言通过（29/30）、3/3 盲测 A/B 获胜、磁盘计划把重新定位从 13.3 回合降到 5.0 回合、hook 单次触发优化后 289ms（此前 2.0–2.4 秒）、优化后每提示与每工具调用约 0.3s；GitHub stars 27216；Trendshift 2026-01-06 全语言日榜第 1。
- 只是作者主张：以上效果数字全部来自项目自述，指向 docs/evals.md，但该文件未在本次材料中给出；宣传性表述如「The planning skill your agent cannot ignore」「3 out of 3 blind A/B wins」。
- 本次材料局限：提供的是仓库 README，且在 v3.11.0 发布日志处被截断，未能读到 benchmark 章节、命令参考与 docs/evals.md 的具体内容。

hivemind（来自 README 调研）：

- 事实性内容：Node >= 22.0.0；安装脚本、npm 安装、token 登录、按 assistant 安装命令、hivemind status；重启注意事项；语义检索默认关闭、本地嵌入约 600 MB；环境变量表；.hivemind / .hivemind.local 路由与优先级；skillify 命令与 SKILL.md 写入路径；自然语言搜索示例；docs 命令；rules 命令；卸载命令。
- 数据落在 Deeplake 的 SQL 表：sessions 存逐事件捕获，memory 存摘要与虚拟文件系统；支持 BYOC。
- 只是作者主张或未验证的：基准数据是作者自测；原文在 rules 一节的命令块未结束，后续 goals 等命令只有目录提及、没有正文。
- 关键局限：默认把全部会话 prompt 与工具输出写进团队共享 workspace；需要 Deeplake 账号 token；Codex 要 Trust all，Claude Cowork 要完全退出重开。

## 依据的调研

- [mksglu/context-mode](../research/radar/2026-10-01/68-mksglu-context-mode.md)：值得一试，建议先在 Claude Code（或 Cursor）上做小范围试用：用 MCP-only 方式跑一个真实编码任务，对照 ctx_stats 的上下文节省与实际任务结果，再决定是否推广到团队。理由是它直指“工具输出塞满上下文 + 会话压缩后失忆”这两个具体痛点，安装与回退成本低；但 README 的 98% 节省数字、100x 说法和企业 logo 墙均为自述，缺少第三方验证，且 ELv2 许可对商用有限制。
- [UditAkhourii/quicksilver](../research/radar/2026-10-01/15-uditakhourii-quicksilver.md)：值得一试，建议小范围试：按 README 给出的命令把 Quicksilver 装进 Claude Code，让它把「读很多、只判断一点」的批量筛选/分类交给 Jev，Claude 只处理被标 `?` 的边界项；理由是安装与使用步骤可直接照做、12 项可复现基准显示中位省 82% token，但部分任务准确率明显下降且依赖第三方 API，需自己用少量标注核对后才敢扩大使用。
- [AGIHunt/blurt](../research/radar/2026-10-01/26-agihunt-blurt.md)：值得一试，把「录屏+口述」当作给编码 agent 补上下文和反馈的固定通道来试：按 README 装好 skill，在一个真实项目里录一段 5–10 分钟走查，让 agent 拆条目、挑关键帧、写复现步骤，再用评审页逐条取舍。理由是这套流程有可照做的安装命令、快捷键、模型选择和实测成本，属于可落地的做法；但仓库仅 40 stars、以 macOS 为主、除 README 自述外没有可核实的评测，故先小范围验证而非直接采纳。
- [thedotmack/claude-mem](../research/radar/2026-10-01/522-thedotmack-claude-mem.md)：值得一试，可以在 Claude Code 上小范围试用：用 `npx claude-mem install` 装好后重启，让它在真实项目里自动捕获并注入跨会话记忆，再用检索命中率和重复交代背景的次数判断是否值得长期留下；理由是 README 给出了可直接照做的安装、配置和检索步骤，但效果数据（如 ~10x token 节省）只有作者主张，且夹带托管记忆与代币推广，需自行验证。
- [headroomlabs-ai/headroom](../research/radar/2026-10-01/528-headroomlabs-ai-headroom.md)：值得一试，建议在长会话、重工具输出的编码 agent 上小范围试用：装好后用 `headroom wrap <agent>` 包一层，先用 `headroom doctor` / `headroom savings` 读自己流量上的省量，并开 `HEADROOM_OUTPUT_HOLDOUT=0.1` 拿实测的输出节省，再决定是否长期保留。理由是原文给出了可直接照抄的安装、接入、量测、复现基准和回滚（`headroom unwrap`）步骤，但它是一个会接管你全部 LLM 流量的本地代理，收益随数据重复度剧烈变化、基准全部自报，不适合无条件全量铺开。
- [mem0ai/mem0](../research/radar/2026-10-01/547-mem0ai-mem0.md)：值得一试，按 README 的 CLI 四步（安装→agent 注册→add→search）先跑通通路，再把 search+add 嵌进一个固定 user_id 的重复性任务做 1–2 周小范围试；理由是原文给出了可直接复制的安装、CLI、SDK、自托管与 Agent Skills 接入步骤，但性能数字是托管平台自报、开源版明确无法复现同等数字，还不足以作为手册标准做法直接采用。
- [topoteretes/cognee](../research/radar/2026-10-01/570-topoteretes-cognee.md)：值得一试，可以小范围试：按 README 的 Python/CLI 快速上手路径先跑通「跨会话长期记忆」，再通过 Claude Code 插件或 MCP 接进现有 agent 做 1–2 周对照试用，判断能否减少重复交代上下文。理由：原文给出了可直接复制的安装、代码与插件命令，属于可照做的具体流程；但其效果数据为自报基准，且单 Postgres 图存储与本地 GLiNER 抽取器均明确标注为 demo，尚不足以直接写入手册作为推荐配置。
- [OthmanAdi/planning-with-files](../research/radar/2026-10-01/571-othmanadi-planning-with-files.md)：值得一试，先用一条安装命令把 planning-with-files 装进 Claude Code 或 Codex 这类支持 hook 的宿主，在同一个长时编码任务上做 A/B：让智能体把 phases 写进 task_plan.md 并靠 hook 每轮重注入，观察 /clear 或 compaction 后的重新定位轮数是否下降。理由是原文给出了可照做的安装命令、三文件模式与 hook 生命周期，但这些效果数字全部来自项目自测，需要自己复现验证。
- [activeloopai/hivemind](../research/radar/2026-10-01/604-activeloopai-hivemind.md)：值得一试，建议先在一个仓库、一个 agent（如 Claude Code）上小范围试：按 README 的安装命令接入、用 `.hivemind` 限定捕获范围、再看 skillify 是否真的产出被复用的 SKILL.md；它给出了可直接照做的安装/配置/触发步骤，但基准数据是作者自测，且默认把全部会话 prompt 与工具输出写进团队共享 workspace。
