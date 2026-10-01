# 给编码 agent 装技能包前，先做一次有/无对照

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决“装了技能包但说不清有没有减少返工”的问题：给出一套小范围试装、有/无对照、按可观察指标验收的流程。
> 先试这一步：挑一个非关键项目里反复出现的任务，只装一个技能包，用同一输入在没有技能和有技能的条件下各跑 3 次，记录返工轮数。
> 最近修订：2026-10-02

## 解决什么问题

你已经在用编码 agent，但每次都要重复描述同一套工程规范，或者不确定装一个技能包是否真的减少了返工。这篇手册给出一个可照做的流程：先小范围试装一个现成技能包，用同一任务做有/无技能的对照，确认有效后再考虑把自己的重复工作写成 `SKILL.md`。同一套对照方法也适用于中文技术文档的写作与审稿、单篇论文的精读。如果你还需要给 agent 补模型端点、权限或搜索能力，再用配置模板单独补，而不是整包采用。

## 适用与不适用

适用：

- 你已经在用 Claude Code、Codex CLI 或类似编码 agent；
- 有一类反复出现、有明确规范的任务（需求澄清、写计划、TDD、代码审查、完成前验证、文档生成、会话交接等）；
- 反复写或审中文技术文档（README、设计文档、接口说明、教程），希望它读起来像工程师写的、没有 AI 腔；
- 需要把单篇生物医学论文读成结构化精读报告；
- 愿意在一个非关键项目上做一周对照；
- 需要给 agent 补模型端点、工具权限或网页搜索能力，且愿意手动填自己的网关信息。

不适用：

- 没有明确重复任务，只想“装个工具看看”；
- 不愿做对照验证，只凭安装成功就认为改善；
- 直接在生产关键项目上全量安装；
- 不知道自己网关提供哪些模型名，却原样照抄配置模板；
- 写英文文档（`zh-tech-writing` 只针对中文技术文档）；
- 非生物医学领域的论文精读（`biomedical-paper-reader` 的检查点要自己判断是否适用）。

## 前置条件

- Node.js ≥ 18，npm/npx 可用；Claude Code 2.1+ 或 Codex CLI 已安装。
- Git 可用。
- 一个可回滚的非关键项目，不要在主仓库或用户主目录（`~`）下做项目级安装。
- 对目标技能目录有写权限（如 `~/.claude/skills/`、`~/.cursor/skills/`）。
- 走 MCP 时，配置文件里写绝对路径。
- 安装第三方技能前，先通读它的 `SKILL.md`，并跑运行时的 doctor/audit 工具。
- 走配置模板路线时额外准备：你的提供商端点地址（`ANTHROPIC_BASE_URL`）和 key，以及你网关实际提供的模型名。
- 走中文技术文档路线（做法 E）时额外准备：可用的 `npx`（用 skills 命令行安装）或 `git`（手动拷贝）；可选装 autocorrect，不装则空格与标点修正要人工做。
- 走论文精读路线（做法 F）时额外准备：宿主助手支持文件读取，并能读取 PDF/图像；联网能力为可选项；准备好 PDF、DOI、链接或原文之一，以及本地已有的补充材料。

## 操作步骤

怎么选：先做做法 A；A 里某个技能确实有效、且你有一件每周重复且规范明确的工作，再做做法 B；需要把外部文档变成智能体知识资产时用做法 C；需要给 Claude Code 补模型端点、权限、网页搜索时用做法 D；要写或审中文技术文档用做法 E；要精读单篇论文用做法 F。E 和 F 都必须套用 A 的对照方法，不要跳过验证直接纳入常规流程。

### 做法 A：先用现成技能包做小范围试装（推荐先做）

1. 选定一个非关键项目和一类重复任务。前提：你已经在用 Claude Code 或 Codex CLI；项目不是生产关键。预期：明确一个可对照的任务，例如“从 PDF 抽表单字段”或“给用户模块加批量导出功能”。

2. 只选一个技能包，只装一个，不要全装。以下六选一：

   - 官方示例技能（Claude Code）：

     ```text
     /plugin marketplace add anthropics/skills
     /plugin install example-skills@anthropic-agent-skills
     ```

   - 中文编码工作流（Claude Code）：

     ```text
     claude plugin marketplace add jnMetaCode/superpowers-zh
     claude plugin install superpowers-zh@superpowers-zh
     ```

   - 自我纠正记忆与知识平面（Claude Code）：

     ```text
     /plugin marketplace add rohitg00/pro-workflow
     /plugin install pro-workflow@pro-workflow
     ```

   - 配置集合：技能 + 子代理 + settings 模板（Claude Code）：

     ```text
     /plugin marketplace add feiskyer/claude-code-settings
     /plugin install claude-code-settings
     ```

     等价的命令行方式：

     ```sh
     claude plugin marketplace add feiskyer/claude-code-settings
     claude plugin install claude-code-settings@claude-code-settings
     ```

     注意：通过 Plugin 安装的技能需要重启会话才能加载。这个仓库包含 12 个技能、6 个子代理和 11 套 settings 模板，它的 README FAQ 明确建议精选技能；所以建议改用 npx skills 只挑你要的 1–2 个：

     ```sh
     # 列出可用技能
     npx -y skills add -l feiskyer/claude-code-settings

     # 手动选择要安装的技能
     npx -y skills add feiskyer/claude-code-settings
     ```

     该方式的版本可能滞后于仓库最新。

   - 中文技术文档写作（Claude Code 或其他支持 Agent Skills 的工具）：

     ```bash
     npx skills add leter/zh-tech-writing -g
     ```

     手动安装：

     ```bash
     git clone https://github.com/leter/zh-tech-writing.git
     cp -r zh-tech-writing/skills/zh-tech-writing ~/.claude/skills/
     ```

   - 生物医学论文精读：

     ```bash
     git clone https://github.com/Gaoyuan-0423/biomedical-paper-reader.git
     ```

     装成本地技能（可选，让客户端能发现）：

     ```bash
     mkdir -p ~/.codex/skills
     git clone https://github.com/Gaoyuan-0423/biomedical-paper-reader.git ~/.codex/skills/biomedical-paper-reader
     ```

   预期：插件安装成功，或只装上了你点名的技能。注意同一项目里不要同时用项目级安装和插件市场安装同一个技能包，否则 skills 会出现两份。

3. 验证安装。前提：新开一个 Claude Code 会话。

   ```text
   /plugin list
   ```

   应看到对应插件为 enabled。也可以直接问 Claude：

   ```text
   What skills do you have access to?
   ```

   用来确认技能是否真的加载。如果用的是 genspark-claw，则先体检再看清单：

   ```bash
   npx genspark-claw doctor
   npx genspark-claw list
   ```

   预期：环境体检通过，能看到内置技能列表。

4. 跑通一个最小动作。不要一次试用全部功能，只选一个你当前最痛的任务。

   - 官方示例技能：`Use the PDF skill to extract the form fields from path/to/some-file.pdf`
   - superpowers-zh：让它先问清需求再写计划，例如“给用户模块加个批量导出功能”，观察它是否先问“导出格式是 CSV 还是 Excel？数据量多大？需要异步吗？有权限要求吗？”并给出 2-3 个方案。
   - pro-workflow：先跑 `/doctor` 和 `/wrap-up`，确认 SQLite 存储、hooks、skills 能加载。
   - feiskyer/claude-code-settings：挑一个技能，比如 `/handoff [下一次会话的重点方向]`，把当前对话压成交接文档；或者让 codex-skill 做一次「对抗式审查」（触发词含 `codex`、`use gpt`、`full-auto`、`adversarial review`、`用codex`、`第二意见`），注意它只呈现审查结果、不自动改码。
   - leter/zh-tech-writing：先只审不改，`/zh-tech-writing 检查 docs/api.md，只列问题，不要改`，看它按「原句 → 改后 → 原因」列出的问题是否成立。
   - biomedical-paper-reader：拿一篇自己已经读过、心里有底的论文试跑，逐项对照自己的理解。

   预期：技能被触发，或在需要时以斜杠命令出现。

5. 做对照。同一任务、同一输入，分别在没有技能和有技能的条件下各跑 3 次，记录差异。试一周，或至少 5 个同类任务。预期：你能说清技能是否减少了返工，而不是只说“装上了”。

6. （可选）只照抄一个工作流形态，别整套搬：

   - deep-research：把调研目标拆成可并行子目标 → 通过 `claude -p` 子进程执行 → 聚合 → 逐章精修与来源验证。工具选择策略为「已安装技能 → MCP 工具 → WebFetch/WebSearch」。产出目录固定为：

     ```text
     .research/<name>/
     ├── prompts/           # 子任务 prompt
     ├── child_outputs/     # 子进程输出
     ├── logs/              # 执行日志
     ├── raw/               # 原始数据缓存
     └── final_report.md    # 最终报告
     ```

   - handoff：`/handoff [下一次会话的重点方向]`，把当前对话压成交接文档，输出到 `$TMPDIR/handoff-YYYY-MM-DD-HHMM.md`，内容含背景与目标、已完成工作、当前状态、待办事项、推荐技能、关键上下文；引用已有产物用路径/URL 避免重复；自动对 API key、密码、PII 脱敏；对话过短时提示无需生成。

   - codex-skill：把编码、代码审查、计划审查交给 OpenAI Codex 非交互执行；审查结果只呈现不自动改码；Codex 调用失败时如实报告而非代答；支持 JSON 结构化输出与 `resume --last` 增量恢复。依赖 Codex CLI（`npm i -g @openai/codex` 或 `brew install codex`）。

   - github-review-pr：并行子代理多角度分析（含安全维度）+ 对抗式验证——质疑者需在 head SHA 处复读代码，findings 必须附 `file:line` 与原文引用；支持置信度评分、误报过滤、去重与一致性计数、增量复审、批量行内评论、干净 PR 自动 LGTM。

   预期：你能说清这个形态里哪一步减少了你自己的返工；说不清就不要保留。

### 做法 B：把自己的重复工作写成 SKILL.md（验证有效后再做）

1. 选一件你每周都在重复、且有明文规范的工作。例如“按公司模板出文档”“按团队规范写单测”“代码审查”。前提：你已经确认现成技能包对你有帮助，或者你有一个特别明确的返工点。

2. 建一个自包含文件夹，放 `SKILL.md`。照官方模板：

   ```markdown
   ---
   name: my-skill-name
   description: A clear description of what this skill does and when to use it
   ---

   # My Skill Name

   [Add your instructions here that Claude will follow when this skill is active]

   ## Examples
   - Example usage 1
   - Example usage 2

   ## Guidelines
   - Guideline 1
   - Guideline 2
   ```

   关键：`description` 必须同时写清“做什么”和“什么时候用”；正文写步骤、示例、准则。

3. 拆分结构：主 `SKILL.md` 只放流程与核心规则，细粒度规范拆到 `references/` 里按需加载，确定性修正交给外部 CLI 工具而不是让模型做。`leter/zh-tech-writing` 就是这个形态的样例：主文件放写作流程、核心规则与 AI 腔清单，`references/typography.md` 只在文档出现数字范围时才读，`references/manual-structure.md` 只在写产品手册、要定目录结构和文件命名时才读；中英文空格与全角半角标点的修正交给 autocorrect 这个非模型工具。预期：主文件保持在能一眼看完的规模，细节不占默认上下文。

4. 校验技能。可以用 genspark-claw 的校验器：

   ```bash
   npx genspark-claw validate ./my-skills/
   ```

   预期：通过 schema 校验和安全审计，标记 `curl | bash`、base64 载荷和破坏性命令。如果没有通过，先改 `SKILL.md`，不要继续安装。

5. 安装到目标 host。以 Claude Code 为例：

   ```bash
   npx genspark-claw install all --target claude
   ```

   或者直接放到 `~/.claude/skills/`。注意：如果已经用插件市场装了同一个技能，不要再手动拷贝。

6. 验证技能可复现。换一个新会话，或让一位不了解背景的同事只凭 `description` 触发该技能，看能否得到同类结果。预期：不需要重新粘贴同样的规范与上下文，就能得到稳定输出。

7. 技能没有自动触发时，照这些条目逐项排查：

   - 路径必须是 `~/.claude/skills/<name>/SKILL.md`（注意大小写，必须是 `SKILL.md`）；
   - Plugin 安装的技能需重启会话；
   - 检查是否双层嵌套（`skills/name/name/SKILL.md`），需上移一层；
   - 直接问 Claude：`What skills do you have access to?` 验证加载状态；
   - `disable-model-invocation: true` 的技能（如 grill-me、handoff）不自动触发，须用 `/skill-name` 手动调用。

### 做法 C：多来源知识打包（可选，适合需要领域知识时）

如果你需要把文档站点、GitHub 仓库、本地代码库、PDF 等转成智能体可用的知识资产，可以用 Skill Seekers：

```bash
pip install skill-seekers
skill-seekers create https://docs.djangoproject.com/
skill-seekers package output/django --target claude
skill-seekers install-agent output/react/ --agent cursor
```

预期：生成 `SKILL.md` 和参考文件，可安装到 Claude Code、Cursor 等。注意：README 给出质量门禁 `skill-seekers quality output/react/ --threshold 7`，但它没有与人工基线的对照实验，多数效果数字是作者主张，需要你自己验证。

### 做法 D：用配置模板补齐模型端点、工具权限与搜索能力（可选）

只有在你有自建网关、或想用已有订阅走非官方 API 时才做这一步。

1. 前提：已装好 Claude Code，并能访问 Anthropic 官方 API 或自建网关。注意 `settings.json` 不通过 Plugin 配置，必须手动设置；仓库根目录的 `settings.json` 是作者模板。

2. 把模板里的两个变量指向你的提供商端点：`ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY`。作者模板默认指向 copilot-gateway 代理（`http://localhost:4141`）；换 LiteLLM Proxy 等网关就把 `ANTHROPIC_BASE_URL` 改为对应地址（如 `http://localhost:4000`）。

3. 替换模型名。作者模板里的模型名是作者网关的模型，需按你网关实际提供的模型替换：

   ```text
   ANTHROPIC_DEFAULT_SONNET_MODEL: claude-sonnet-5
   ANTHROPIC_DEFAULT_OPUS_MODEL: claude-opus-5
   ANTHROPIC_DEFAULT_HAIKU_MODEL: claude-haiku-4-5
   ```

   预期：新开会话能正常起来，并且你选的模型确实是你网关提供的模型。

4. 权限确认。模板中 `defaultMode` 为 `acceptEdits`（自动接受文件编辑但保留命令确认）。想进一步减少确认，在 `settings.json` 的 `permissions.allow` 里配允许列表；完全跳过确认可改为 `bypassPermissions`，但 README 明确提示「请了解其安全风险后再启用」。

5. VSCode 扩展（Claude Code 2.0+，不走 Claude.ai 订阅）时，在 VSCode `settings.json` 中配置环境变量：

   ```json
   {
     "claude-code.environmentVariables": [
       { "name": "ANTHROPIC_BASE_URL", "value": "http://localhost:4000" },
       { "name": "ANTHROPIC_AUTH_TOKEN", "value": "sk-dummy" },
       { "name": "ANTHROPIC_MODEL", "value": "opusplan" },
       { "name": "ANTHROPIC_DEFAULT_SONNET_MODEL", "value": "claude-sonnet-5" },
       { "name": "ANTHROPIC_DEFAULT_OPUS_MODEL", "value": "claude-opus-5" },
       { "name": "ANTHROPIC_DEFAULT_HAIKU_MODEL", "value": "gpt-5-mini" },
       { "name": "DISABLE_TELEMETRY", "value": "1" }
     ]
   }
   ```

   同时需要 `~/.claude/config.json` 的内容来跳过 claude.ai 登录。

6. 解决「API Key 缺失或无效」：在 `~/.claude.json` 中把 key 加入已批准列表：

   ```json
   {
     "customApiKeyResponses": {
       "approved": ["sk-dummy"],
       "rejected": []
     }
   }
   ```

7. 一键更新已装插件：

   ```sh
   bash ~/.claude/scripts/update-cc-plugins.sh
   ```

8. 非官方 API 环境补网页搜索：WebSearch 是 Anthropic 专有工具、仅限官方 API 环境。在其它环境要通过 MCP 服务器补齐，README 列了 Tavily MCP、Brave MCP、Firecrawl MCP、DuckDuckGo Search MCP 四个（只给链接，未给安装步骤），需要你自己按 MCP 的接入方式配置。

9. 可选的零额外成本路径（已有 GitHub Copilot 订阅、且接受手动安装方式）：

   ```sh
   # 备份原有配置
   mv ~/.claude ~/.claude.bak

   # 克隆本仓库
   git clone https://github.com/feiskyer/claude-code-settings.git ~/.claude

   # 启动 Copilot Gateway 代理（监听 http://localhost:4141）
   npx copilot-gateway@latest start --proxy-env

   # 也可以用 tmux 在后台运行
   # tmux new-session -d -s copilot 'npx copilot-gateway@latest start --proxy-env'
   ```

   首次启动会提示设备认证：`Please visit https://github.com/login/device and enter code XXXX-XXXX to authenticate.`

   认证过期/401 时，重跑 `npx copilot-gateway@latest start --proxy-env` 重新完成设备认证。

预期：配置改完后能正常开新会话；因为已经备份 `~/.claude`，每一步都能回滚。

### 做法 E：中文技术文档写作与审稿（按 A 的对照法验证）

1. 前提：使用 Claude Code 或支持 Agent Skills 的工具。装 skill（二选一，命令同做法 A）：

   ```bash
   npx skills add leter/zh-tech-writing -g
   ```

   或手动拷贝：

   ```bash
   git clone https://github.com/leter/zh-tech-writing.git
   cp -r zh-tech-writing/skills/zh-tech-writing ~/.claude/skills/
   ```

   预期：`~/.claude/skills/zh-tech-writing/SKILL.md` 存在，`references/` 一起装上。

2. （推荐，非必需）装 autocorrect。它是独立命令行工具，负责在中英文之间补空格、把中文句子里的半角标点改成全角。三条安装路径：

   ```bash
   # macOS
   brew install autocorrect

   # Linux：从 Releases 页面下载二进制文件，放到 PATH 里的任意目录
   # https://github.com/huacnlee/autocorrect/releases

   # 已经装了 Rust 工具链
   cargo install autocorrect
   ```

   验证安装：

   ```bash
   autocorrect -V
   ```

   预期：能看到版本号即成功。没装的话，第 5 步的自动修正会跳过，空格与标点要人工处理。

3. 第一次只审不改，先看它列的问题是否成立：

   ```text
   /zh-tech-writing 检查 docs/api.md，只列问题，不要改
   ```

   预期：按「原句 → 改后 → 原因」的格式列问题，不动文件。不明确说“只列问题”，它会直接改文件。

4. 再让它改一版。写 / 改中文技术文档时 skill 通常自动加载，也可手动调用：

   ```text
   帮我给这个项目写一份 README
   把 docs/deploy.md 改得更易读一些
   ```

   ```text
   /zh-tech-writing 改一下 docs/api.md
   ```

   预期：逐条 diff 审阅，重点看有没有「删了空话却没补事实」导致信息丢失。按 README 说法，skill 找不到事实时会删掉空话或直接问你，检查它是否真的问了。

5. 按它内置的五步写作流程验收（也可自己按这套流程做人工检查）：

   1. 先确定读者是谁，读完要能做成什么事。
   2. 按规则写：句子、语气、段落与结构、排版。
   3. 用「AI 腔清单」逐条检查全文，命中的地方全部改掉。
   4. 运行 `autocorrect --fix`，修正空格和标点。
   5. 手动检查 autocorrect 不管的引号、省略号和破折号。

6. 写 / 审稿时对照核心规则：

   - 句子：逗号隔开的每一截尽量在 20 字以内；多用肯定句和主动语态；直接用动词，不套「进行」「做出」。
   - 语气：像给同事讲清楚一件事；用数字、命令和报错原文代替形容词。
   - 结构：每段第一句说重点；标题不跳级；少用四级标题；加粗和列表都不滥用。
   - AI 腔清单（14 条）：包括开场和结尾套话、「不是 A，而是 B」句式、硬凑三个排比、宣传腔形容词、黑话、破折号和翻译腔。
   - 关键约束：事实必须来自你的项目。skill 找不到事实时，会删掉空话，或者直接问你。这意味着要让它读到代码、配置和真实报错。

   预期：改完的文档里，形容词被数字、命令和报错原文替换；开场结尾套话、破折号、「不仅……更……」这类句式被清掉。

7. 按需读 references：涉及数字与标点细则时读 `references/typography.md`；写产品手册、要定目录结构和文件命名时读 `references/manual-structure.md`。注意：本次材料只给了 README，`SKILL.md` 与两个 references 的完整内容未提供，14 条 AI 腔清单只给了类别、没有逐条文本，具体执行细则要打开仓库文件确认。

### 做法 F：单篇论文精读（按 A 的对照法验证）

1. 前提：宿主助手支持文件读取，并能读取 PDF/图像；联网能力为可选项。获取技能文件：

   ```bash
   git clone https://github.com/Gaoyuan-0423/biomedical-paper-reader.git
   ```

2. 指定入口。路径相对于你的工作目录，必要时改用 `SKILL.md` 的绝对路径：

   ```text
   请使用 ./biomedical-paper-reader/SKILL.md 阅读这份 PDF，生成中文精读报告。
   ```

   装成本地技能后可以直接按名字调用：

   ```text
   使用 $biomedical-paper-reader 解析这篇论文：<DOI、链接或附件>。
   ```

   预期：生成一份结构化精读报告 `report.md`（必要时附 `assets/` 图像），默认中文输出。输入只需 PDF、DOI、论文链接或原文之一，不要求事先写研究问题。

3. 准备输入与附加材料。补充材料默认只用本地已有文件——检查上传内容、论文同目录与用户指定的相关文件夹，确认属于该论文后按需分析；没有补充文件就只用正文完成报告，并说明哪些判断未核查附件；只有你明确要求补取时才联网下载。不要因附件缺失就断言作者未做验证。

4. 处理文本：直接复用可读的 PDF 提取结果（检查阅读顺序、保留页序），不再优先使用 MarkItDown，也不要求先生成 Markdown 底稿；原 PDF 留作数字与图像核查；只有具体页面的提取质量影响解读时才更换处理方式。

5. 看图：每张主图先概览，必要面板再放大；完整阅读图注，关注核心结论、必要对照、阴性结果及图文冲突；已看清的内容直接复用，同一图组的待查面板成组准备。报告要区分「概览」和「具体核查范围」。

6. 按默认七段顺序读报告：①开篇导读（核心发现、看点、阅读建议、适用场景）②文章信息（身份、来源、已读与未获取材料）③研究概述（已有认识、缺口、切入点、总体设计）④全文逻辑路线图（跟随原文证据推进，标注图表）⑤逐图 / 逐结果精读（动机、方法、结果、逻辑、边界、原图定位）⑥研究总结与课题借鉴（贡献、局限、可迁移环节、待验证设计）⑦数据与复现入口（资源用途、实际获取状态、关键缺口）。

7. 检查判定纪律：是否先建立原文章节、图表和主张索引，再核对正文、Methods、图注及实际图像；是否把独立个体数与细胞 / 切片数、观察与因果、作者解释与新增假设分别处理；是否把未实际执行的代码和数据误标为已经复现。无图论文是否按主表、结果小节或方法单元展开。

8. 交付与调整：有文件工具时在独立论文目录下交付 `report.md`，必要图像放 `assets/`，报告内链接保持相对路径；没有文件工具时直接输出文本。补充研究方向可获得更贴合的迁移建议；要求速读时压缩篇幅，要求专题方法解析时加深对应部分。

   预期：报告里每张主图都被讲到、图注被引用、没有遗漏面板；说不清某类论文是否适用时，就限定使用范围并把不适用处记下来。

## 怎么判断变好了

最小试用方式：

- 同一任务、同一输入，有技能和无技能各跑 3 次；
- 至少覆盖 5 个同类任务，或持续一周；
- 换一个新会话，让不了解背景的人只凭 `description` 触发，检查可复现性；
- 文档类任务：挑一篇已有的中文文档，先建分支或备份，先只审不改，再改一版逐条 diff；
- 论文类任务：用一篇自己已读过、心里有底、含多张主图（或主表）的论文生成精读报告，逐项对照自己的理解；再对一篇只有摘要或片段可得的论文试一次，看它是否正确声明覆盖范围与暂定判断。

可观察的指标：

- 人工修改次数 / 返工轮数：有技能时是否下降。
- 首稿可用率：第一次输出即达到可交付标准的比例。
- 背景重述次数：每次任务是否还需要重新粘贴同样的规范与上下文。
- 输出一致性：多次运行结果在格式与关键字段上是否稳定。
- 单次任务耗时：从提出到可交付的总时长。
- 规则类返工次数：代码评审里关于风格、规范、命名的意见条数是否下降。
- 文档审稿：它列出的问题里你认可并采纳的比例；修改后的事实密度（「强大」「无缝」这类形容词是否换成数字、命令或报错原文）；AI 腔清单类别是否还有残留；让没参与写作的同事只读成稿，能否说出「读完能做成什么事」。
- 论文精读：每张主图是否都被讲到、图注是否被引用、有无遗漏面板；是否区分独立个体数与细胞 / 切片数、观察与因果、作者解释与新增假设；是否列出「已读与未获取材料」、未核查附件处是否说明；第⑥节是否给出可迁移环节与待验证设计；人工精读耗时 vs 生成加核对的耗时。
- 工作流形态的产物是否稳定出现：例如 deep-research 是否每次都在 `.research/<name>/` 下留出 `prompts/`、`child_outputs/`、`logs/`、`raw/`、`final_report.md`。
- 交接是否可用：一次 `/handoff` 之后，新会话不靠你再口述背景就能继续推进。

反向指标：

- 如果加了技能后仍然每次都要口头纠正同一件事，说明 `description` 或正文指令没写到位，应先改 `SKILL.md`，而不是继续加提示。
- 如果文档改完只是删了空话、却没有补上事实，信息量反而下降，说明它没有拿到项目事实，先把代码、配置和真实报错给它读。
- 如果论文报告把未实际执行的代码和数据标成已复现，或漏掉主图面板，停止用在这类论文上。
- 如果一周内没有任何一项指标变化，或安装的插件与仓库实际规范冲突导致返工增加，就回到“只借鉴组织方式、不装具体内容”的用法。

注意：`doctor`、`validate`、`npm test` 这类检查只能证明“技能装得上、格式合法、不带危险命令”，不能证明“产出更好”。效果必须自己对照。

## 常见坑

- 整体 adopt：一次装多个技能包，导致上下文过载或规则冲突。AAS 提到 Antigravity 会因监控的 skill 目录过载上下文，需要选择性激活；feiskyer/claude-code-settings 的 FAQ 也建议精选技能，不要全装。
- 重复安装：在同一个项目里同时用项目级安装和 Claude Code 插件市场装同一个技能包，skills 会出现两份。
- 手拷 hooks：把仓库里的 `hooks/hooks.json` 直接拷进 `~/.claude/settings.json` 或 `~/.claude/hooks/hooks.json`，会导致重复执行和跨平台 hook 冲突；hooks 必须用安装器写。
- 在用户主目录安装：项目级安装应在具体项目目录执行；v1.2.1 起 superpowers-zh 会拒绝在主目录安装，老版本会把 skills 写进 home 目录，污染所有项目。
- 只信 README：很多技能包的 README 没有贴出 `SKILL.md` 正文，质量无法核验；只有安装命令和自述，没有效果数据。feiskyer/claude-code-settings 虽然技能、子代理、settings 模板都列得很全，但技能效果仍是作者描述，没有对照数据。`zh-tech-writing` 的 SKILL.md 与两个 references 未在材料中给出，14 条 AI 腔清单只有类别没有逐条文本；`biomedical-paper-reader` 的 SKILL.md、各 references 与 `evals/RESULTS.md` 的实际内容同样看不到。
- 忽略安全：安装任何第三方技能前先通读它的 `SKILL.md`，并跑自己运行时的 doctor/audit 工具。`genspark-claw validate` 会标记 `curl | bash`、base64 载荷和破坏性命令。
- 规则全量加载：rules 是始终加载的上下文，从 `rules/common` 加一个你实际使用的语言/框架包开始，不要全抄。
- 技能描述没写清：`description` 只写“做什么”没写“什么时候用”，技能就不会在合适时机触发。
- 配置模板照抄不动：作者模板默认指向 copilot-gateway（`http://localhost:4141`），模型名写的是 `claude-sonnet-5` 等；不按自己网关实际提供的模型替换，端点或模型对不上就用不起来。
- 以为 settings.json 靠 Plugin 装：`settings.json` 不通过 Plugin 配置，必须手动设置，仓库根目录的只是作者模板。
- 技能没有自动触发：先按五条排查——路径必须是 `~/.claude/skills/<name>/SKILL.md`（注意大小写）；Plugin 安装的技能需重启会话；检查双层嵌套 `skills/name/name/SKILL.md` 并上移一层；直接问 `What skills do you have access to?`；`disable-model-invocation: true` 的技能（如 grill-me、handoff）不自动触发，要用 `/skill-name` 手动调用。
- 依赖具体工具：Agent Skills 要在支持它的工具上才能自动加载，不支持的工具上用不了；装技能的目录也随客户端变化（例如论文精读给了 `~/.codex/skills/` 的路径）。
- 没装 autocorrect：第 5 步的格式修正会被跳过，空格与标点只能人工处理；另外材料里只提到 `autocorrect --fix` 这一个子命令，其他子命令是否存在要查该工具文档后再用。
- 没说清只审不改：想只要意见时必须明说「只列问题，不要改」，否则它会直接动文件。
- 删空话不补事实：审稿后逐条 diff，看它是否把形容词换成了数字、命令或报错原文。按 `zh-tech-writing` 的 README 说法，缺事实时它应该反问，检查它是否真的问了。
- 论文精读的取材误判：不要因附件缺失就断言作者未做验证；补充材料默认只用本地已有文件，不自动联网下载，缺附件时报告里要说明哪些判断未核查。
- 文本处理反复换工具：可读的 PDF 提取结果直接复用，不要求先生成 Markdown 底稿；原 PDF 留作数字与图像核查，只有提取质量确实影响解读时才换方式。
- 看图只看概览：每张主图先概览，必要面板要放大；报告不区分「概览」和「具体核查范围」，验收时无法判断核查到哪一层。
- 盲目开 `bypassPermissions`：它能让你完全跳过确认，但 README 明确提示要先了解安全风险；更稳的做法是先在 `permissions.allow` 里配允许列表。
- 在非官方 API 环境找不到网页搜索：WebSearch 只限官方 API 环境，其它环境要用 MCP 补；README 只给了四个 MCP 的链接，没有安装步骤。
- 用 `npx skills add` 装到的版本可能滞后于仓库最新，挑技能时注意这一点。
- 拿 star 数当质量证据：`zh-tech-writing` 的 312 stars 只说明关注度，`biomedical-paper-reader` 的 31 stars 同样，都不说明产出改善幅度。

## 证据与来源

- “技能 = 文件夹 + `SKILL.md`，frontmatter 只需 `name` 和 `description`”来自 anthropics/skills 的官方 README 与模板；该仓库是 Anthropic 对 Claude 技能的官方实现，安装命令和模板可直接照抄，但 README 明确说技能“仅供演示与教育用途”，效果需自测。
- “先澄清需求→写计划→TDD→系统化调试→完成前验证→代码审查”来自 jnMetaCode/superpowers-zh 的 README；它给出了 `npx superpowers-zh` 和 Claude Code 插件市场的可复制命令，但没有 skill 正文和效果数据，实际改善需自己对照。
- “自我纠正记忆、`SessionStart` 自动加载、知识平面”来自 rohitg00/pro-workflow 的 README；给出了 `/learn-rule`、`/wrap-up`、`/wiki init` 等命令，但全文没有效果数据，且技能/命令数量在文档内自相矛盾，所以只建议先跑通三个动作。
- “先小范围试装，不要整体 adopt”来自 genspark-claw、ECC、AAS、awesome-copilot 等材料的共同结论；其中 genspark-claw 的 `doctor`/`validate` 能验证装得上、格式合法，ECC 和 AAS 的组件规模极大但均为作者自述，AAS 的 `stack validate` 只检查 manifest，不证明语义适配或运行安全。
- “做对照、看返工轮数和首稿可用率”来自 anthropics/skills 的验证建议和 awesome-copilot 的最小试用方式；这些是方法主张，不是经过对照实验的数据。
- “第三方技能有供应链风险，先审查”来自 genspark-claw 和 awesome-copilot 的 README 警告；awesome-copilot 明确要求安装任何 agent 前先检查它和它的文档。
- “多来源知识打包”来自 yusufkaraaslan/Skill_Seekers 的 README；给出了 `pip install skill-seekers`、`create`、`package`、`install-agent` 等命令，质量门禁 `--threshold` 可用，但缺少与人工基线的对照，多数效率数字为作者主张。
- feiskyer/claude-code-settings（MIT，约 1.6k stars）的安装命令、npx skills 选装方式、settings.json 模板、Copilot Gateway、VSCode 环境变量、`customApiKeyResponses`、`update-cc-plugins.sh`、四个 WebSearch MCP 与五条技能触发排查，均来自该仓库 README，步骤具体可复制；但技能效果全凭作者描述，且模板中的模型名需按自己网关实际提供情况替换，所以只建议按需选装 1–2 个技能做小范围试用。
- deep-research 的产出目录、handoff 的交接文档字段与脱敏行为、codex-skill 的触发词与“只呈现不自动改码”、github-review-pr 的 `file:line` 与原文引用要求，均来自 feiskyer/claude-code-settings 的 README 描述，属作者主张，没有对照实验数据。
- 中文技术文档路线的安装命令（`npx skills add leter/zh-tech-writing -g`、git clone + cp）、autocorrect 的三种安装方式与 `autocorrect -V` 验证、三个调用提示词示例、五步写作流程、四类核心规则要点、14 条 AI 腔清单的类别说明，以及一组前后对比文本，均来自 leter/zh-tech-writing 的 README。规则来源为阮一峰《中文技术文档的写作规范》（public domain），另参考华为《产品手册中文写作规范》、LeanCloud《文档风格指南》、《中文文案排版指北》、Google Developer Documentation Style Guide、GB/T 15835-2011；autocorrect 为 MIT 许可，项目自身为 MIT。作者对原规范做了三处调整：破折号统一为 `——`、省略号统一为 `……`；数字与中文之间统一定为加空格以与 autocorrect 一致；把“不使用非正式语言”放宽为“可口语化但不用网络流行语”。其中“效果”一节是单个作者挑选的示例，属主张不是评测结果；“skill 找不到事实时会删空话或直接问你”是对行为的描述，材料中无法验证。
- 论文精读路线的 clone 命令、SKILL.md 入口提示词与 `$biomedical-paper-reader` 调用方式、`~/.codex/skills/` 安装路径、补充材料只用本地文件、复用 PDF 提取结果、逐图先概览后放大、七段报告骨架、判定纪律与交付形式，均来自 Gaoyuan-0423/biomedical-paper-reader 的 README（v0.1.2，MIT）。README 列出了 `SKILL.md`、`references/report-template.md`、`references/evidence-rules.md`、`references/study-checks.md`、`references/material-handling.md`、`agents/openai.yaml`、`evals/`、`examples/`、`CHANGELOG.md` 的文件组织，两篇真实试读论文入口（DOI `10.1186/s12943-026-02682-x`、`10.1038/s41588-026-02673-0`）和三份明确标注为虚构的短材料；仓库含 `evals/cases.md`、`evals/fixtures/` 与 `evals/RESULTS.md`，但验收结论的实际内容在本次材料中看不到。精读质量本身、判定规则是否稳定执行、“不依赖固定 MCP、第三方 skill、Python 库或付费服务”的依赖声明，均属作者主张。README 自述借鉴了 `nature-reader` 的原文定位/图文联读思想与 `paper-deep-note` 的来源覆盖声明思想，未复制其实现文件。
- “主 SKILL.md 放流程与规则、细则拆到 `references/` 按需加载、确定性格式修正交给外部 CLI”来自 leter/zh-tech-writing 的目录组织与写法，属可观察的仓库结构；“按需加载能减少上下文占用”是据此推断，材料没有对照数据。
- 文中提到的 star 数（如 anthropics/skills 179219、awesome-copilot 39,568、pro-workflow 2.9k、feiskyer/claude-code-settings 约 1.6k、zh-tech-writing 312、biomedical-paper-reader 31）来自 metrics，不构成有效性证据。

## 依据的调研

- [breakstageaxe61/genspark-claw](../research/radar/2026-10-02/39-breakstageaxe61-genspark-claw.md)：值得一试，先小范围试它这套打包方式——SKILL.md 约定 + 一行安装 + MCP 暴露 + validate 安全校验，是把技能批量供给智能体的现成骨架，可直接照做；但五个内置技能的 SKILL.md 正文原文一条都没贴出来，其质量无法核验，因此不建议整体 adopt，只建议试装并用真实任务对比后再取舍。
- [affaan-m/ECC](../research/radar/2026-10-01/509-affaan-m-ecc.md)：值得一试，建议在单个非关键项目、单个 harness（优先 Claude Code）上按 README 的 guided setup 做小范围试装，只取 rules/common 加一个语言包和核心工作流，并保留一键回滚；理由是原文给出了可照抄的安装命令、settings.json 配置片段和安装校验命令，但组件规模极大、全部能力均为作者自述、没有任何效果数据，且 README 混有商业推广与供应链风险警告。
- [sickn33/agentic-awesome-skills](../research/radar/2026-10-01/553-sickn33-agentic-awesome-skills.md)：值得一试，可以把 AAS Core 当作「按任务找现成 SKILL.md 并受控安装」的试用入口：先按 README 给出的命令在单一 host（Codex 或 Claude）上配置本地 MCP，让 agent 选出少量 skill ID，validate + plan 预览后再 dry-run 安装；之所以只建议试，是因为 README 只给出安装/预览级步骤，apply 与 recovery 仍属实验性，且 2610+ 技能库本身没有质量与语义适配的证据。
- [anthropics/skills](../research/radar/2026-10-01/557-anthropics-skills.md)：建议采用，直接照官方 README 走：在 Claude Code 里加 marketplace 装 example-skills 摸清形态，再照 SKILL.md 模板把一件自己反复做的工作打包成技能，用返工轮数和首稿可用率验证。理由是这个仓库给出了可原样复制的安装命令和技能的最小结构（文件夹 + 带 name/description 的 SKILL.md），是把指令、脚本、资源打包供给智能体的官方一手参照。
- [github/awesome-copilot](../research/radar/2026-10-01/567-github-awesome-copilot.md)：值得一试，如果你在用 GitHub Copilot，可以按 README 给出的两条命令注册 marketplace 并安装现成插件，用社区打包好的 agent/instruction/skill 给助手补上下文和工具；但抓到的只有 README 索引，具体插件内容与效果无法核实，所以先小范围试一个插件并对照验证，不必整体照搬。
- [jnMetaCode/superpowers-zh](../research/radar/2026-10-01/581-jnmetacode-superpowers-zh.md)：值得一试，可按 README 给出的 `npx superpowers-zh`（或 Claude Code 插件市场）命令，在一个非关键项目里装 superpowers-zh 试用，它把编码智能体的工作流固定为“先澄清需求→写计划→TDD→系统化调试→完成前验证→代码审查”。理由是安装/卸载/路径配置具体可复制、覆盖 26 款工具；但原文只有 README、没有 skill 正文和效果数据，实际改善需自己对照验证。
- [yusufkaraaslan/Skill_Seekers](../research/radar/2026-10-01/585-yusufkaraaslan-skill-seekers.md)：值得一试，建议小范围试用：用 Skill Seekers 把一份项目文档或本地代码库自动转成 Claude Skill/IDE 上下文，先验证质量门禁和在真实任务中的效果，再决定是否纳入手册。理由：README 给出了完整的 CLI 步骤（安装、create、package、install-agent、MCP），但质量与效率数据多为作者自述，需自行验证。
- [rohitg00/pro-workflow](../research/radar/2026-10-01/596-rohitg00-pro-workflow.md)：值得一试，先在单个项目上装 Claude Code 原生插件，只跑通 /doctor、/learn-rule、/wrap-up 三个动作，确认纠正能被持久化并在新会话自动加载后再考虑启用 wiki 与自动研究循环；理由是 README 给出了可直接复制的安装与命令流程、可把重复纠正转成可检索的持久规则，但全文没有任何效果数据，且技能/命令数量在文档内自相矛盾，不足以直接采用。
- [feiskyer/claude-code-settings](../research/radar/2026-10-01/602-feiskyer-claude-code-settings.md)：值得一试，可以照抄它的安装命令和 settings 模板，但只按需选装 1–2 个技能做小范围试用，不要整包采用——理由：安装/配置步骤具体可复制，但技能效果全凭作者描述、且其中模型名需按自己网关实际提供情况替换。
- [leter/zh-tech-writing](../research/radar/2026-10-02/57-leter-zh-tech-writing.md)：建议采用，直接装上这个 Agent Skill，把中文技术文档的写作与审稿交给它执行，因为 README 给出了可复制的安装命令、调用提示词和一套五步写作流程；配套的 autocorrect 负责中英文空格与全角标点，属于无需模型的确定性修正。
- [Gaoyuan-0423/biomedical-paper-reader](../research/radar/2026-10-02/63-gaoyuan-0423-biomedical-paper-reader.md)：值得一试，按 README 提供的方式在本地 clone 这个 skill，先用一篇自己已熟悉的论文试跑一次精读报告，再决定是否纳入常规流程；它的价值在于给出了一套可照做的“逐图理解 + 证据边界判别 + 固定报告骨架”的精读流程，但核心规则在看不到的 SKILL.md 与 references 文件里，且仅面向生物医学论文。
