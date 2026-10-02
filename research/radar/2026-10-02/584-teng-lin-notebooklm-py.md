# teng-lin/notebooklm-py

- 结论：**值得一试**。建议小范围试：把 notebooklm-py 作为「零 token 综合层/记忆层」接进 Claude Code 等 agent 的研究与写作工作流，先用 create → source add → ask → download 跑通一条端到端流水线再决定是否固化进 SKILL.md 或定时任务。README 给出了可复制的安装、认证、CLI/Python API 与 agent 集成步骤，但它依赖未公开的 Google API，稳定性和限额必须自行验证。
- 原文：https://github.com/teng-lin/notebooklm-py
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T08:27:34.931Z

## 是什么

notebooklm-py 是 NotebookLM（2026 年 7 月被 Google 更名为 Gemini Notebook，底层服务与链接不变）的非官方 Python API + CLI，同时提供 MCP Server、REST Server 和 agent skill 安装方式，让 Claude Code、Codex、OpenClaw 等智能体以编程方式驱动 NotebookLM。

它的定位是「程序化访问 NotebookLM 全部能力」：建 notebook、批量导入来源（URL/YouTube/PDF/Word/EPUB/音视频/图片/Google Drive/粘贴文本）、带引用的问答、把回答存成 note、生成音频/视频/幻灯片/信息图/测验/闪卡/报告/数据表/思维导图，并把产物批量下载到本地（MP3/MP4/PDF/PPTX/PNG/CSV/JSON/Markdown）。README 强调了两类 Web UI 不提供的能力：批量下载、测验/闪卡的 JSON/Markdown/HTML 导出、思维导图 JSON 提取。

README 自述的使用范式是：NotebookLM 做「有据可依（grounded）的昂贵阅读与综合」，agent 只负责编排和最后一公里。仓库指标显示 stars 19591（来自本次线索的 metrics 字段）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**1. 前提确认**
- 有一个可用于 NotebookLM / Gemini Notebook 的 Google 账号（每个 notebook 的来源数量上限取决于账号等级）。
- Python 3.10–3.14（README 徽章标注的支持范围）。
- 首次交互式登录需要本地浏览器（会下载 Chromium，约 170 MB）。

**2. 安装 CLI（推荐隔离环境，避免 PEP 668 的 `externally-managed-environment` 报错）**

```bash
uv tool install "notebooklm-py[browser]"   # or: pipx install "notebooklm-py[browser]"
notebooklm login                           # first run auto-downloads Chromium (~170 MB), then Google sign-in
notebooklm auth check --test --json        # verify: expect "status": "ok"
```

没有 uv 时用 `curl -LsSf https://astral.sh/uv/install.sh | sh`（或 `brew install uv` / `winget install astral-sh.uv`）。也可以直接在虚拟环境里用 pip：

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install "notebooklm-py[browser]"
```

只当库用（不装 Playwright/Chromium）：

```bash
uv add notebooklm-py                    # or, inside a virtualenv: pip install notebooklm-py
```

**3. 登录的三种方式（按场景选）**

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

**4. 建 notebook → 加来源 → 提问 → 生成 → 下载（CLI 主流程）**

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

注意 `--prompt-file` 只用于 `ask`、prompt 型 `generate` 和 `source add-research`；上传文件作为来源仍用 `source add ./file.pdf`。

**5. 让 agent 自动做网络调研并把结果一次导入**

```bash
notebooklm source add-research "AI" --import-all  # web research + import found sources
```

README 另给的 deep 模式写法：

```bash
notebooklm source add-research "your topic" --mode deep
```

**6. 把库装成 agent skill（前提：已安装 CLI）**

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

**7. 无头/服务器场景：master token + 定时保活（前提：可接受用专用账号）**

README 的定位是：master token 可按需签发新 cookie，让过期会话无人值守自愈，是服务器、CI 和远程 MCP connector 的认证模型。

```bash
notebooklm auth refresh --quiet      # One-shot cookie keepalive (for cron / launchd / systemd)
notebooklm auth refresh --browser-cookies chrome  # Re-extract and repair account routing
```

**8. 可选 Android（gRPC）后端（前提：显式安装 android 运行时，它不在 `all` extra 中）**

```bash
pip install "notebooklm-py[android,browser]"
notebooklm login --master-token --account you@example.com
notebooklm --backend android list --json
```

README 说明：Android 后端从所选 profile 读取 `master_token.json`，按需签发短期移动 bearer token，十一个公开命名空间都可用，不依赖浏览器 cookie 会话、Web build 标签或 Web RPC ID；因为 master token 是全账号级凭证，应使用专用账号并妥善保护。默认后端仍是 Web（`batchexecute`），也可用环境变量 `NOTEBOOKLM_BACKEND=android` 或 Python API 的 `NotebookLMClient.from_storage(backend="android")` / `NotebookLMClient(..., backend="android")` 选择。

**9. Python API 嵌入自有管道**

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

        # Generate a mind map via the unified client.mind_maps API (issue #1256) —
        # two kinds: the newer MindMapKind.INTERACTIVE studio map (shown; polled to
        # completion by default) or MindMapKind.NOTE_BACKED JSON. Both export via:
        mm = await client.mind_maps.generate(nb.id, kind=MindMapKind.INTERACTIVE)
        await client.artifacts.download_mind_map(nb.id, "mindmap.json", mm.id)


asyncio.run(main())
```

**10. README 给出的六种可照搬工作流（每条都只给了命令/模式，agent 侧的胶水需自己写）**

- **零 token 调研外包**：把 30 份文档丢进 notebook，让 Gemini 做重分析，agent 只做最终润色；agent 只做编排 `create` → `source add` → `ask`，推理发生在服务端。
- **知识蒸馏成永久 skill**：用 `source add-research "your topic" --mode deep` 或载入文档语料，让 NotebookLM 浓缩后把结果固化进 agent 启动时加载的 `SKILL.md`——README 称「构建一次，运行时零 token、零网络调用」，可 git 版本化。README 的关键提醒：直接把原始文档倒进 skill 会把层级压平，先经 NotebookLM 浓缩才成立。
- **自验证 skill**：让 NotebookLM 从你的来源生成 quiz 作为 eval set，用它对 agent skill 打分，再迭代到通过。
- **跨会话持久记忆（Master Brain）**：维护一个 Master Brain notebook；在收尾步骤把每次会话的决定和修复以 note 形式追加（`note create` / `ask --save-as-note`），并在 `CLAUDE.md` 里加一行在下次会话开始时 `ask` 查询它。（README 只描述这个做法，未给出该行的原文。）
- **给编码 agent 的 grounded 记忆**：通过 MCP server（或普通 `ask`）暴露内部文档/RFC/架构 notebook，让 agent 基于你的代码带引用作答，作为自建向量库+embedding 管道的零基础设施替代。
- **把来源变成答案与产物 / 事故 runbook / 课程集 / 定时简报**：

```bash
notebooklm generate report --format briefing-doc --wait
notebooklm download report
```

README 描述的其余三种：抓取 syllabus 或 roadmap，每个主题建一个 notebook（刻意放慢节奏以避开限流），批量生成播客、测验、闪卡；把 `auth refresh --quiet`（cron/launchd/systemd）与 `generate audio` 配对，定时发布个性化简报播客；把远程 MCP connector 自托管在 Cloudflare/Tailscale 隧道后面，在 claude.ai 或 ChatGPT 的网页端添加为自定义 connector，从而在手机上驱动整套工具。

**11. 几个实用开关**

- URL 抓取失败恢复：`source add --fallback-fetch`，并安装 `impersonate` 和 `markdown` extras。
- 多 profile 后端：REST 和 MCP server 支持 `--profiles`（见 MCP guide）。
- 用量查询：`notebooklm usage` / `notebooklm usage --json`；元数据：`notebooklm metadata --json`。
- NotebookLM 是 grounded 引擎：Gemini 只从**你给的来源**里带引用作答，因此来源质量决定输出质量。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现——AI 已经能做哪些还没想到交给它的工作**
README 明确列出了几种「没想到可以外包」的活：把 30 份文档的重分析整个丢给服务端、agent 只花 token 做润色；把文档语料蒸馏成可长期复用的 `SKILL.md`；让 NotebookLM 生成 eval 题集来给自己的 agent skill 打分；从多年日记/会议记录里做带引用的跨时间模式检索（README 引用的案例是「从 282 条日记综合出周报，每条论断都链回原条目」）；把 524 页文档抓取、去重、审计成干净来源集；把一份来源扇出成播客/视频/幻灯/报告/测验/闪卡/信息图/数据表/思维导图；把会话决策写成 note 充当跨会话记忆。

**2. 任务匹配——什么工作适合怎样的模型、工具和协作方式**
README 给了明确分工：NotebookLM（服务端 Gemini）负责昂贵的阅读与带引用综合；agent（Claude Code、Codex 等）负责编排与最后一公里。接口形态的匹配也写清了：Python API 适合应用集成、异步工作流、自定义管道；CLI 适合 shell 脚本、快速任务、CI/CD 自动化；MCP Server 适合 Claude Desktop/Code、Codex（本地 stdio，或自托管远程 connector）；REST Server 适合不每次起 CLI 进程的本地 HTTP 自动化。后端选择上，Web `batchexecute` 是默认，Android gRPC + bearer 认证是可选项，适合不想依赖浏览器 cookie 会话的场景。

**3. 条件供给——需要提供哪些信息、工具、权限和反馈**
需要：可用的 Google 账号与 NotebookLM 访问权（来源上限按账号等级）；认证材料（Playwright 交互登录、从已登录浏览器导入 cookie、或 master token）；无头场景要 master token 并配 `auth refresh --quiet`；远程 MCP 需要 Cloudflare/Tailscale 隧道；抓取失败要 `--fallback-fetch` 加 `impersonate`/`markdown` extras；长提示要落成文件用 `--prompt-file`；多账号要 profile；批量生成要主动 pacing 规避限流。README 也点名了信任边界：master token 是强力的全账号凭证，应配专用账号并小心保护（细节在 docs/security.md）。

**4. 主动推进——哪些工作可由时间、事件或状态触发并持续完成**
README 直接给了三类触发器：时间触发——`auth refresh --quiet` 配 cron/launchd/systemd 做会话保活，并把 `generate audio` 接成定时发布的个性化简报播客；事件触发——收到告警就建相关文档 notebook、问定向诊断问题、生成简报文档报告作为自动化 runbook；状态/批量触发——按 syllabus 或 roadmap 为每个主题批量建 notebook 并生成播客/测验/闪卡。另外跨会话记忆那条本质是「会话结束」事件触发的写入 + 「会话开始」触发的读取。

**5. 效果验证——怎样判断确实改善了结果**
README 没有给内置评测指标，但给了一条可操作的验证路径：让 NotebookLM 从你的来源生成 quiz 当作 eval set，用它给 agent skill 打分，迭代到通过——README 引用的外部案例称某 skill 首轮 4/10、一次迭代后 10/10，由 NotebookLM 生成的 quiz 评分。第二条是 grounded 引用本身：回答带来源引用，可回溯核验（如「282 条日记综合出的周报每条都链回原条目」）。其余效果（token 节省、产出质量）README 只作主张，未给度量方法，需要自建指标。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：直接相关。本库提供 `notebooklm skill install` 把 skill 装到 `~/.claude/skills/notebooklm`，并有 `notebooklm agent show claude` 打印内置的 Claude Code skill 模板；README 通篇把 Claude Code 当作首选编排器（零 token 外包、Master Brain 记忆读写在 `CLAUDE.md`、项目大脑等）。这是给已 adopt 的 Claude Code 增加「服务端有据综合 + 持久记忆」能力的补件。
- **OpenClaw（watch）**：README 把 OpenClaw 列为可调用的 agent 之一，并引用其驱动本库抓取 `docs.openclaw.ai` 全部 524 页、去重翻译副本、审计到 269 个干净来源（missing/extra/duplicate = 0）的案例。这条属于第三方转述，可作为 OpenClaw 能力的旁证，不构成对本库的独立验证。
- **Obsidian（drop）**：README 提到可从 vault 根目录运行 CLI，让下载产物（报告、思维导图 JSON、转写）作为文件落进知识图谱，并说社区 skill 能把 NotebookLM 的引用标记解析成 Obsidian `[[wikilinks]]`。但清单中 Obsidian 状态为 drop，这条不值得让 Obsidian 复活；若已有等价的知识库落地目录，命令照样可用。
- **Trendshift（watch）**：README 挂了 Trendshift 徽章（`trendshift.io/repositories/19116`），只是收录标识，无实质内容。

## 证据与局限

**原文给出的、偏事实性的内容**：完整安装与登录命令、CLI 命令清单、Python API 示例、各产物类型与其可下载格式、后端选项与 Android 后端的安装命令、agent skill 的安装路径、auth refresh 面向 cron/launchd/systemd 的用途、来源类型与产物格式的对照表。这些是可以照抄执行的部分。

**只是作者主张或第三方转述的内容**：
- 「zero-token」「build once, reuse with zero runtime tokens or network calls」——是设计意图，README 未给 token 计量对照数据。
- 自验证 skill 的「4/10 → 10/10」来自一条 X 帖子；OpenClaw 的「524 页 → 269 干净来源」、282 条日记周报、以及多篇 Medium/YouTube/Substack 链接，都是 README 引用的第三方案例，不是本仓库的测试结果。
- 仓库 stars 19591 来自本次线索的 metrics 字段，README 本身未做任何性能或质量基准测试。
- 「Web UI 不提供」的清单（批量下载、多格式测验/闪卡导出、思维导图 JSON 提取）是 README 的自述对比，未给对照证据。

**明确的适用条件与风险（README 自己声明）**：
- 非官方库，使用未公开的 Google API，Google 可随时改动内部端点。
- 与 Google 无关联；重负载会触发限流；作者定位为「最适合原型、研究和个人项目」。
- 每个 notebook 的来源数量取决于 Google 账号等级，超限需拆 notebook；批量生成要刻意 pacing。
- master token 是全账号凭证，应使用专用账号并保护 profile；Android 后端因此不放进 `all` extra。
- 产品更名（NotebookLM → Gemini Notebook）后底层服务与链接不变，库名保留 `notebooklm-py`。
- Linux 上 `playwright install chromium` 可能报 `TypeError: onExit is not a function`，README 指向 troubleshooting 的 workaround；本次原文未贴出该 workaround 内容。

**本次材料的局限**：输入只有仓库 README，没有 docs/ 下的安装、CLI、MCP、security 等文档正文，也没有任何实测记录或 issue 统计。因此只能确认「命令与流程存在且被文档化」，无法确认「在你的账号与网络下能稳定跑通」。上述所有「in the wild」收益均未经验证。

## 怎么试、怎么验证

**最小试用（建议 1 天内完成，只碰一个真实任务）**
1. 用 `uv tool install "notebooklm-py[browser]"` + `notebooklm login` + `notebooklm auth check --test --json` 跑通认证，确认返回 `"status": "ok"`。
2. 挑一件你本来就要做的调研/写作任务（例如 20–30 份 PDF/网页的综述），跑一遍：

```bash
notebooklm create "<你的任务名>"
notebooklm use <notebook_id>
notebooklm source add "<url 或本地文件>"
notebooklm ask "<你的问题>" --prompt-file ./question.txt
```

3. 把这一步接进 Claude Code：`notebooklm skill install`，然后在一次真实会话里让 agent 只做编排（create → source add → ask），推理全交给服务端；对比这次会话的 token 消耗与你自己直接把文档塞进上下文的做法。
4. 如果任务涉及重复产出，再试 `notebooklm download <type> --all` 做批量落地。

**升级试用（可选，两周内）**
- 建一个 Master Brain notebook，在每次会话收尾追加决策 note，并在 `CLAUDE.md` 里加一条启动查询（原文未给该行原文，需自己写）。
- 用 `notebooklm auth refresh --quiet` 挂到 cron，观察无人值守下会话是否自愈。

**判断有没有改善的指标**
- **可核验性**：`ask` 的回答是否带来源引用、每条论断能否回溯到具体来源。这是 README 主张的核心价值，也最容易验证。
- **agent 端 token 消耗**：同样任务，外包给 notebook 前后，Claude Code 会话的 token 用量与上下文占用是否下降（对应「zero-token offload」主张）。
- **端到端时间**：从「拿到一批来源」到「拿到可用产物（综述/简报/问答）」的耗时，与手工流程对比。
- **稳定性**：两周内 `auth check --test --json` 成功率和任务失败率；出现失败的，记录是认证过期、限流还是 API 变更——这直接决定它能不能进生产流程。
- **skill 质量（如走自验证路线）**：用 NotebookLM 从你自己的来源生成 quiz 作为 eval set，给 skill 打分并记录迭代前后的通过率，而不是自己出题自评。

**放弃或降级使用的信号**：认证频繁失效且 `auth refresh --quiet` 修不回来；批量任务稳定触发限流；关键命令因 Google 端改动报错且无及时升级；单账号来源上限无法容纳你的资料量。
