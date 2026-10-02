# 让 agent 把自有文档变成带引用的问答与定时产出

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：如何把散落的自有文档变成带来源引用的问答入口，并让 agent 按固定节奏复用这些结果。
> 先试这一步：先选 20–50 份同主题文档，跑通一条「导入→提问→带引用回答→导出」的最小流水线，记录引用命中率；已在用 Claude Code 等 agent 的，可先用 notebooklm-py 跑通 create → source add → ask → download。
> 最近修订：2026-10-02

## 解决什么问题

把散落的自有文档（PDF/TXT/DOCX）变成能带来源引用回答的入口，并把每周重复的固定动作交给定时任务；进一步，让 agent 能程序化驱动一个「有据可依的昂贵阅读与综合层」，自己只负责编排和最后一公里。同时避免被一份很长的功能清单牵着走——README 给的是能力入口，不是可照做的参数，先小范围试、再决定用不用。

## 适用与不适用

**适用**

- 需要本地优先（runs locally by default）部署，把文档上下文、多模型、agent 与定时调度放在同一个应用里。
- 想把一批自有文档变成可问答、回答带来源引用的知识入口。
- 想用 cron 定时跑重复任务或提示词，且任务具备完整 agent 能力。
- 已经在用 Claude Code、Codex、OpenClaw 等 agent，希望把 NotebookLM / Gemini Notebook 当「零 token 综合层/记忆层」，由它做有据可依的昂贵阅读与综合，agent 只做编排和最后一公里。
- 需要用 CLI / Python API / MCP Server / REST Server / agent skill 程序化建 notebook、批量导入来源、带引用问答、生成并下载音频/视频/幻灯片/信息图/测验/闪卡/报告/数据表/思维导图。
- 需要 Web UI 不提供的批量下载、测验/闪卡的 JSON/Markdown/HTML 导出、思维导图 JSON 提取。
- 有本地模型（Ollama / LM Studio / LocalAI / llama.cpp 兼容模型）或已在用的云端 provider（AnythingLLM README 列出 30+ LLM provider、10+ embedder、9 个向量库）。
- 需要多用户与权限、或需要把问答挂件嵌到网站——这两项**仅 AnythingLLM 的 Docker 版本提供**。

**不适用**

- 只是偶尔问一次问题，不需要文档库和调度。
- 敏感数据场景且需要安全/合规结论——两份调研都未提供安全或合规说明。
- 出网严格受限的环境——AnythingLLM 即使关掉遥测，使用外部模型/向量库仍有对应厂商外连，应用本身还会连 `cdn.anythingllm.com` 与 github/githubusercontent；notebooklm-py 依赖 Google 服务。
- 不能接受非官方 API、未公开 Google API 的稳定性和限额风险。
- 没有本地浏览器做首次交互式登录，且未准备 master token / 专用账号。
- 想直接照抄 AnythingLLM 的定时任务、动态模型路由、Agent Flows 的具体参数——README 对这些只给文档链接和一句话描述，没有配置样例。

## 前置条件

- AnythingLLM：一台能跑 Docker 的机器（或走 README 指向的 `./BARE_METAL.md` 无 Docker 部署；也可直接下载桌面版，支持 Mac/Windows/Linux）。
- AnythingLLM：一个已经能用的模型 provider：本地推理需先把模型服务跑起来；云端 provider 需要相应 API Key。
- AnythingLLM：一个向量库：默认 LanceDB，零配置；也可从 PGVector、Astra DB、Pinecone、Chroma、Weaviate、Qdrant、Milvus、Zilliz 中选。
- AnythingLLM：20–50 份同主题、答案位置明确的文档，用于验证。
- AnythingLLM：走源码开发模式时，`server/.env.development` 必须填好。
- notebooklm-py：一个可用于 NotebookLM / Gemini Notebook 的 Google 账号（每个 notebook 的来源数量上限取决于账号等级）。
- notebooklm-py：Python 3.10–3.14。
- notebooklm-py：首次交互式登录需要本地浏览器（会下载 Chromium，约 170 MB）。
- notebooklm-py：推荐用 uv、pipx 或虚拟环境隔离，避免 PEP 668 的 `externally-managed-environment` 报错。
- notebooklm-py：无头/服务器场景需要可接受使用专用账号和 master token。

## 操作步骤

先决定走哪条路：

- **做法 A：AnythingLLM，本地优先文档问答 + 定时任务**。要开多用户、要把问答挂件嵌进网站，只能走 Docker；本地看效果、要改代码，走源码开发模式。
- **做法 B：notebooklm-py，让 agent 程序化驱动 NotebookLM / Gemini Notebook**。适合已经在用 agent、想把昂贵阅读与综合外包给 NotebookLM 的团队；但它是非官方 API，依赖未公开的 Google API，稳定性和限额必须自行验证。
- **可组合**：NotebookLM 做 grounded 阅读与综合，agent 只负责编排和最后一公里；AnythingLLM 做本地文档库与 cron 定时任务。先各自跑通一条端到端流水线，再决定是否固化进 SKILL.md 或定时任务。

### 做法 A：AnythingLLM 本地优先

A1. 选部署方式：
   - **Docker 部署**：要开多用户、要把问答挂件嵌进网站，只能走这条（两项均仅 Docker 版本提供）。
   - **源码开发模式**：本地看效果、要改代码时用；README 里可直接复制的命令只有这一组，但它只是「跑起来」的步骤，不是「用好」的步骤。

A2. Docker：打开仓库里的 `./docker/HOW_TO_USE_DOCKER.md`，按其中给出的命令起服务。
   - 前提：本机已装 Docker。
   - 注意：README 只提供了指向该文件的入口链接，没有给出可直接复制的 `docker run` 命令，命令需点进该文件获取。
   - 预期结果：本机或内网可访问 AnythingLLM；顺手记录一次「冷启动到可用」的耗时，作为后面比较的基线。

A3. 关闭遥测（默认开启）。在 server 或 docker 的 `.env` 中写入：

```env
DISABLE_TELEMETRY=true
```

   也可以不改配置，在应用内 sidebar > `Privacy` 里关闭。
   - README 说明遥测只发送事件类型（安装类型、文档增删事件、向量库类型、LLM provider 与模型 tag、聊天发送事件），不含聊天内容、IP 或可识别信息，收集方为 PostHog；源码中所有 `Telemetry.sendTelemetry` 调用点可查。
   - 前提与预期：即使关闭遥测，使用外部模型/向量库仍会有对相应厂商的外连；应用仍会连 `cdn.anythingllm.com`（拉取模型镜像）和 github/githubusercontent（下载上下文窗口缓存文件）。在有出网限制的环境里要提前评估。

A4. 源码开发模式：在仓库根目录依次执行（README 原文命令）：

```bash
yarn setup        # 生成各模块所需的 .env 文件
yarn dev:server   # 本地启动服务端
yarn dev:frontend # 本地启动前端
yarn dev:collector # 运行文档收集器
```

   - 前提：仓库根目录；`yarn setup` 之后手工填写生成出来的 `.env`，尤其是 `server/.env.development`。
   - README 原文提示：Ensure `server/.env.development` is filled or else things won't work right。
   - 预期结果：server 与 collector 同时在线；collector 不在线时文档解析会失败。

A5. 接入模型与向量库，**先只接一个** provider，作为基线。
   - 本地推理选 Ollama / LM Studio / LocalAI / llama.cpp 兼容模型，云端选 OpenAI / Anthropic / DeepSeek 等。
   - 前提：云端 provider 需要 API Key；本地 provider 需要模型服务已跑起来。

A6. 建一个 workspace，拖拽上传那 20–50 份 PDF/TXT/DOCX 文档，由 `collector` 解析入库。
   - 前提：`collector` 服务在运行。
   - 预期结果：在对话中得到带来源引用的回答。

A7. 配 1 个 cron 定时任务：选一件你本来每周手动做一次的固定动作，让它按计划产出。
   - README 指向 `docs.anythingllm.com/scheduled-jobs/overview`，**未给出 cron 表达式或任务配置样例**，需读官方文档；agent 类任务需要相应的工具权限。
   - 预期结果：连续观察 2–3 次触发，看是否按时、产出是否可用。

A8. 可选，按需要再加：
   - 动态模型路由，按自定义规则把对话自动路由到合适的 provider / 模型（README 指向 `docs.anythingllm.com/model-router/overview`，未给出规则字段与写法）。
   - no-code Agent 构建器（Agent Flows）搭自定义 agent。
   - 对外集成用 Full Developer API；给站点加问答入口用 embed 挂件（仅 Docker 版）。

### 做法 B：notebooklm-py 程序化驱动 NotebookLM / Gemini Notebook

B1. 前提确认：有可用于 NotebookLM / Gemini Notebook 的 Google 账号；Python 3.10–3.14；首次交互式登录需要本地浏览器（会下载 Chromium，约 170 MB）。

B2. 安装 CLI（推荐隔离环境，避免 PEP 668 的 `externally-managed-environment` 报错）：

```bash
uv tool install "notebooklm-py[browser]"   # or: pipx install "notebooklm-py[browser]"
notebooklm login                           # first run auto-downloads Chromium (~170 MB), then Google sign-in
notebooklm auth check --test --json        # verify: expect "status": "ok"
```

   没有 uv 时用：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

   或 `brew install uv` / `winget install astral-sh.uv`。也可以直接在虚拟环境里用 pip：

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install "notebooklm-py[browser]"
```

   只当库用（不装 Playwright/Chromium）：

```bash
uv add notebooklm-py                    # or, inside a virtualenv: pip install notebooklm-py
```

   - 预期结果：`notebooklm auth check --test --json` 返回 `"status": "ok"`。

B3. 登录的三种方式（按场景选）：

```bash
# 1. Authenticate (opens browser)
notebooklm login
# Or use Microsoft Edge (for orgs that require Edge for SSO)
# notebooklm login --browser msedge
# Or reuse cookies from an already-logged-in browser session
# notebooklm login --browser-cookies chrome
# notebooklm login --browser-cookies 'chrome::Profile 1'  # one Chromium profile
```

   多账号用 profile：

```bash
notebooklm profile list                     # List all Google account profiles
notebooklm profile switch work              # Switch active account profile
```

B4. 建 notebook → 加来源 → 提问 → 生成 → 下载（CLI 主流程）：

```bash
# 2. Create a notebook and add sources
notebooklm create "My Research"
notebooklm use <notebook_id>
notebooklm source add "https://en.wikipedia.org/wiki/Artificial_intelligence"
notebooklm source add "./paper.pdf"

# 3. Chat with your sources
notebooklm ask "What are the key themes?"
notebooklm ask --prompt-file ./long_question.txt  # Read question from file

# 4. Generate content (use --prompt-file for long prompts)
notebooklm generate audio "make it engaging" --wait
notebooklm generate quiz --difficulty hard
notebooklm generate flashcards --quantity more
notebooklm generate mind-map                       # interactive studio map (default); --kind note-backed for the JSON tree
notebooklm generate data-table "compare key concepts"

# 5. Download artifacts
notebooklm download audio ./podcast.m4a
notebooklm download quiz --format markdown ./quiz.md
notebooklm download flashcards --format json ./cards.json
notebooklm download mind-map ./mindmap.json
notebooklm download data-table ./data.csv
```

   - 注意 `--prompt-file` 只用于 `ask`、prompt 型 `generate` 和 `source add-research`；上传文件作为来源仍用 `source add ./file.pdf`。
   - 预期结果：拿到带引用回答，产物可下载到本地。

B5. 让 agent 自动做网络调研并把结果一次导入：

```bash
notebooklm source add-research "AI" --import-all  # web research + import found sources
```

   README 另给的 deep 模式写法：

```bash
notebooklm source add-research "your topic" --mode deep
```

B6. 把库装成 agent skill（前提：已安装 CLI）：

```bash
notebooklm skill install
```

   安装位置为 `~/.claude/skills/notebooklm` 和 `~/.agents/skills/notebooklm`。或用开放 skills 生态：

```bash
npx skills add teng-lin/notebooklm-py
```

   查看内置的 agent 模板：

```bash
notebooklm agent show codex          # Print bundled Codex instructions
notebooklm agent show claude         # Print bundled Claude Code skill template
notebooklm skill status              # Check local agent skill installation
```

B7. 无头/服务器场景：master token + 定时保活（前提：可接受用专用账号）。
   - README 的定位是：master token 可按需签发新 cookie，让过期会话无人值守自愈，是服务器、CI 和远程 MCP connector 的认证模型。

```bash
notebooklm auth refresh --quiet      # One-shot cookie keepalive (for cron / launchd / systemd)
notebooklm auth refresh --browser-cookies chrome  # Re-extract and repair account routing
```

B8. 可选 Android（gRPC）后端（前提：显式安装 android 运行时，它不在 `all` extra 中）：

```bash
pip install "notebooklm-py[android,browser]"
notebooklm login --master-token --account you@example.com
notebooklm --backend android list --json
```

   - README 说明：Android 后端从所选 profile 读取 `master_token.json`，按需签发短期移动 bearer token，十一个公开命名空间都可用，不依赖浏览器 cookie 会话、Web build 标签或 Web RPC ID；因为 master token 是全账号级凭证，应使用专用账号并妥善保护。
   - 默认后端仍是 Web（`batchexecute`），也可用环境变量 `NOTEBOOKLM_BACKEND=android` 或 Python API 的 `NotebookLMClient.from_storage(backend="android")` / `NotebookLMClient(..., backend="android")` 选择。

B9. Python API 嵌入自有管道：

```python
import asyncio
from notebooklm import NotebookLMClient, MindMapKind


async def main():
    async with NotebookLMClient.from_storage() as client:
        # Create notebook and add sources
        nb = await client.notebooks.create("Research")
        await client.sources.add_url(nb.id, "https://example.com", wait=True)

        # Chat with your sources
        result = await client.chat.ask(nb.id, "Summarize this")
        print(result.answer)

        # Generate content (podcast, video, quiz, etc.)
        status = await client.artifacts.generate_audio(nb.id, instructions="make it fun")
        await client.artifacts.wait_for_completion(nb.id, status.task_id)
        await client.artifacts.download_audio(nb.id, "podcast.m4a")

        # Generate quiz and download as JSON
        status = await client.artifacts.generate_quiz(nb.id)
        await client.artifacts.wait_for_completion(nb.id, status.task_id)
        await client.artifacts.download_quiz(nb.id, "quiz.json", output_format="json")
```

   - 调研材料中的 Python 示例在此处截断，未给出完整 mind map 调用；不要照抄不存在的部分。

B10. 小范围试：先用 `create → source add → ask → download` 跑通一条端到端流水线，再决定是否固化进 SKILL.md 或定时任务。

## 怎么判断变好了

**最小试用方式（单机、单人、一周内可完成）**

1. 做法 A：按 A1–A7 起一个实例，先设 `DISABLE_TELEMETRY=true`，记录一次冷启动到可用的耗时。
2. 做法 A：只接一个你已经在用的模型，作为基线，不做切换对比。
3. 做法 A：建 workspace，上传 20–50 份你日常需要反复翻查的文档（同一主题，含明确的答案位置）。
4. 做法 A：准备 10 个你已知答案的问题，逐个提问，逐条记录：答案是否正确、引用是否指向真正含答案的那份文档、回答耗时。
5. 做法 A：配 1 个 cron 定时任务，选一件你本来每周手动做一次的固定动作，连续观察 2–3 次触发是否按时、产出是否可用。
6. 做法 B：先用 `create → source add → ask → download` 跑通一条端到端流水线，建议连续做多次真实任务；记录 ask 回答是否有引用、产物能否下载、agent 调用成功率、认证失效/限额触发次数。再决定是否固化进 SKILL.md 或定时任务。
7. 对照基线：同一批问题用你现在的做法（手工翻文档，或直接把文档贴进通用聊天窗口）走一遍，用同样的记录口径。

**可观察的指标**

- 10 个已知答案问题的答案正确数。
- 引用命中率：引用是否指向真正含答案的那份文档。
- 单次回答耗时，以及冷启动到可用的耗时。
- 定时任务 2–3 次触发的按时率与产出可用率。
- notebooklm-py：端到端流水线跑通次数、产物下载成功率、agent skill 调用成功率、认证保活是否无人值守、限额/失败次数。

**试多久**

一周。一周内如果引用命中率没有明显优势，或定时任务产出不可用，就不要继续投入。notebooklm-py 若认证频繁失效或限额触发，不要固化进 SKILL.md 或定时任务。

## 常见坑

- **AnythingLLM README 只有入口链接，没有可直接复制的命令**。Docker 部署要自己点进 `docker/HOW_TO_USE_DOCKER.md`；定时任务、模型路由、Agent Flows、MCP 兼容也各只有一个文档链接，没有参数、配置样例和步骤。
- **AnythingLLM 多用户支持与网站嵌入挂件仅 Docker 版本提供**。选错部署方式，后面这两项直接做不了。
- **AnythingLLM 遥测默认开启**，需要主动关闭；关闭后仍有固定外连（模型厂商、`cdn.anythingllm.com`、github/githubusercontent）。
- **AnythingLLM `server/.env.development` 不填好，开发模式跑不起来**。`yarn setup` 生成 `.env` 后必须手工填写。
- **把宣传性表述当成数据**。「Intelligent Skill Selection……token 使用最多降低 80%」、「比其它 chat UI 成本更低、响应更快」、「battle-tested」、「no extra configuration required」这些都没有测法、没有对照，只是作者主张。
- **AnythingLLM README 没有任何效果、性能、成本数据，也没有安全/合规说明**，无法据此判断敏感数据场景是否可用。
- **`yarn` 那组命令只是「跑起来」的步骤**，不是「用好」的步骤，后者要另找官方文档。
- **notebooklm-py 是非官方 API，依赖未公开的 Google API**。稳定性和限额必须自行验证，不能假设长期可用。
- **NotebookLM 在 2026 年 7 月被 Google 更名为 Gemini Notebook，底层服务与链接不变**；看到旧名称时不要以为换了服务。
- **首次交互式登录需要本地浏览器**，会下载 Chromium（约 170 MB）；无头服务器要提前准备 master token 和专用账号。
- **PEP 668 的 `externally-managed-environment` 报错**：优先用 `uv tool install`、`pipx` 或虚拟环境，不要直接往系统 Python 装。
- **master token 是全账号级凭证**，应使用专用账号并妥善保护；Android 后端从 profile 读取 `master_token.json`，按需签发短期移动 bearer token。
- **Android 后端不在 `all` extra 中**，需显式安装 `notebooklm-py[android,browser]`。
- **默认后端是 Web（`batchexecute`）**，可用 `NOTEBOOKLM_BACKEND=android` 或 Python API 的 `NotebookLMClient.from_storage(backend="android")` / `NotebookLMClient(..., backend="android")` 选择 Android。
- **`--prompt-file` 只用于 `ask`、prompt 型 `generate` 和 `source add-research`**；上传文件作为来源仍用 `source add ./file.pdf`。
- **每个 notebook 的来源数量上限取决于账号等级**；批量导入前先确认限额。
- **notebooklm-py 的 stars 19591 来自本次线索的 metrics 字段**，不是效果、性能或成本数据。
- **「零 token 综合层/记忆层」是调研建议**，不是 README 数据；先小范围试，再决定是否固化。

## 证据与来源

**AnythingLLM 部分**

- 全部操作项来自 Mintplex-Labs/anything-llm 仓库 README：MIT 许可、66,645 stars、monorepo 六模块（`frontend` / `server` / `collector` / `docker` / `embed` / `browser-extension`）、支持清单（30+ LLM provider、10+ embedder、9 个向量库、多 TTS/STT）、部署方式一览表，以及开发模式的三条 `yarn` 命令与 `server/.env.development` 前置要求。
- 遥测范围与关闭方式为 README 自述（PostHog 收集事件类型，不含聊天内容、IP 或可识别信息），并说明可在源码中按 `Telemetry.sendTelemetry` 检索核对。
- 以下仅为作者主张、无数据支撑，本手册只作提示、不作结论：token 使用最多降低 80% 的「Intelligent Skill Selection」；「比其它 chat UI 更低成本、更快响应」的优化说法；「battle-tested」「no frustrating setup」「no extra configuration required」「Production-ready for any cloud deployment」；多用户权限与嵌入挂件「更安全/更私密」的定性描述。
- 本份 AnythingLLM 调研只有 README，没有官方文档正文，也没有任何性能、成本、效果或安全合规数据。文中的最小试用方式、20–50 份文档、10 个已知答案问题、2–3 次触发观察，均为该调研给出的试用建议，不是厂商数据；「怎么算变好」需要自己按上述口径采集。

**notebooklm-py 部分**

- 来自 teng-lin/notebooklm-py 调研/README：非官方 Python API + CLI，同时提供 MCP Server、REST Server 和 agent skill 安装方式，让 Claude Code、Codex、OpenClaw 等智能体以编程方式驱动 NotebookLM。
- README 自述定位是「程序化访问 NotebookLM 全部能力」：建 notebook、批量导入来源（URL/YouTube/PDF/Word/EPUB/音视频/图片/Google Drive/粘贴文本）、带引用的问答、把回答存成 note、生成音频/视频/幻灯片/信息图/测验/闪卡/报告/数据表/思维导图，并把产物批量下载到本地（MP3/MP4/PDF/PPTX/PNG/CSV/JSON/Markdown）。
- README 强调了两类 Web UI 不提供的能力：批量下载、测验/闪卡的 JSON/Markdown/HTML 导出、思维导图 JSON 提取。
- README 自述的使用范式是：NotebookLM 做「有据可依（grounded）的昂贵阅读与综合」，agent 只负责编排和最后一公里。
- 仓库指标显示 stars 19591（来自本次线索的 metrics 字段）。
- NotebookLM 在 2026 年 7 月被 Google 更名为 Gemini Notebook，底层服务与链接不变。
- 安装、认证、CLI/Python API 与 agent 集成步骤来自该 README；但它依赖未公开的 Google API，稳定性和限额必须自行验证。
- 调研结论建议小范围试：把 notebooklm-py 作为「零 token 综合层/记忆层」接进 Claude Code 等 agent 的研究与写作工作流，先用 create → source add → ask → download 跑通一条端到端流水线再决定是否固化进 SKILL.md 或定时任务。这是调研建议，不是厂商数据。
- 本份 notebooklm-py 调研没有官方文档正文，也没有性能、成本、效果或安全合规数据。文中把 notebooklm-py 纳入同一周试用，是本次合并时的操作化安排，不是厂商数据；「怎么算变好」需要自己按上述口径采集。

## 依据的调研

- [Mintplex-Labs/anything-llm](../research/radar/2026-10-02/546-mintplex-labs-anything-llm.md)：值得一试，可以小范围试：按 README 给出的开发/自托管入口把 AnythingLLM 在本机或内网部署起来，接入已有模型，用「文档问答」和「cron 定时任务」各跑一个真实场景，理由是它把本地文档上下文、多模型、agent 与定时调度打包成一套可直接部署的应用；但 README 只给功能入口链接、缺少定时任务/模型路由等关键功能的可照做参数，也没有任何效果数据，因此先试不直接采用。
- [teng-lin/notebooklm-py](../research/radar/2026-10-02/584-teng-lin-notebooklm-py.md)：值得一试，建议小范围试：把 notebooklm-py 作为「零 token 综合层/记忆层」接进 Claude Code 等 agent 的研究与写作工作流，先用 create → source add → ask → download 跑通一条端到端流水线再决定是否固化进 SKILL.md 或定时任务。README 给出了可复制的安装、认证、CLI/Python API 与 agent 集成步骤，但它依赖未公开的 Google API，稳定性和限额必须自行验证。
