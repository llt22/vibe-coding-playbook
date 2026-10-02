# virgiliojr94/book-to-skill

- 结论：**值得一试**。把反复查阅的技术书/内部文档用 book-to-skill 转成 Agent Skill，让代理按需读取章节而不是整本塞上下文——安装与运行命令齐备、产物结构明确，但完整流程和 24×–51× 的省 token 数据都在未提供的 docs 里，属于作者主张，建议先拿一本自己的文档小范围试并自测正确率与幻觉率再决定是否推广。
- 原文：https://github.com/virgiliojr94/book-to-skill
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T07:27:50.773Z

## 是什么

book-to-skill 是一个 MIT 许可的开源工具（转换器 + Agent Skill 定义），把技术书 PDF/EPUB/DOCX/HTML/RTF/MOBI、文档文件夹或一组来源，转换成一个符合 [Agent Skills](https://github.com/agentskills/agentskills) 开放标准的 skill，落到用户级跨代理技能目录 `~/.agents/skills/<slug>/`，供 GitHub Copilot CLI、Amp、Claude Code、Hermes Agent、OpenCode、OpenClaw 等宿主按需加载。

生成物固定为五类文件（README 给出 token 预算）：

| 文件 | 用途 | 体量 |
|------|------|------|
| `SKILL.md` | 核心心智模型 + 章节索引 | ~4,000 tokens |
| `chapters/ch01-*.md` … | 每章一个文件，按需加载 | 每个 ~1,000 tokens |
| `glossary.md` | 全部关键术语，按字母序附章节引用 | ~1,500 tokens |
| `patterns.md` | 所有技术、算法、设计模式 | ~2,000 tokens |
| `cheatsheet.md` | 决策表与速查规则 | ~1,000 tokens |

关键设计：章节文件按需加载，未被问到的章节不计入 skill 预算。官方声明在真实书籍上测得的 token 消耗比把整本书塞进上下文少 24×–51×。仓库自带 `tools/discovery_tax.py`（测量 token 成本）和 `tools/validate_skill.py`（按宿主规则校验生成的 SKILL.md，`--lens claude|copilot|amp|hermes|opencode`）。

## 具体做法

以下步骤与命令均来自 README 原文；README 中提到的 Steps 0–10 完整流程在未提供的 `docs/how-it-works.md` 里。

1. **安装（前提：能执行 npx 或 git，且宿主支持 Agent Skills 标准）**

```bash
# 一条命令，任意宿主
npx skills add virgiliojr94/book-to-skill

# 或手动 clone（注册 /book-to-skill）
git clone https://github.com/virgiliojr94/book-to-skill.git ~/.claude/skills/book-to-skill
```

各宿主技能目录：Copilot CLI `~/.copilot/skills/`；Amp/跨代理 `~/.agents/skills/`；Hermes Agent `${HERMES_HOME:-$HOME/.hermes}/skills/<category>/`；OpenClaw `${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/skills/`（`~/.agents/skills/` 仅在使用默认 state 时）；OpenCode `~/.agents/skills/`（也读 `~/.config/opencode/skills/`）。

2. **检查抽取依赖（不需要文件）**

```bash
python3 scripts/extract.py --check
```

它会打印每种格式已安装的抽取器，以及缺失项对应的确切安装命令。

3. **按书型安装 PDF 抽取器**（抽取器按格式逐个尝试，用第一个可用的）

| 书型 | 工具 | 安装 | 速度 |
|------|------|------|------|
| 文本为主（散文、少表格） | `pdftotext` (poppler) | `sudo apt install poppler-utils` | ⚡ 极快 |
| 文本为主（回退） | `pypdf` | `pip3 install pypdf` | ⚡ 极快 |
| 文本为主（回退） | `pdfminer.six` | `pip3 install pdfminer.six` | ⚡ 极快 |
| **技术类（代码、表格、公式）** | **`docling`** | `pip3 install docling` | ~1.5 秒/页 |

其它格式：EPUB 用 `pip3 install ebooklib beautifulsoup4`（最佳）或内置 `zipfile`；DOCX 用 `pip3 install python-docx`（回退 stdlib ZIP/XML）；HTML 用 `pip3 install beautifulsoup4`；RTF 用 `pip3 install striprtf`；MOBI/AZW/AZW3 用 Calibre `ebook-convert`（外部应用，非 pip）；TXT/Markdown/reStructuredText/AsciiDoc 内置，无需额外依赖。

4. **扫描版 PDF 必须先 OCR**（无文字层的图片页这些工具抽不出东西；抽取器会检查前几页并立即停下说明原因）

```bash
ocrmypdf input.pdf output.pdf
```

然后对 OCR 后的输出做转换。

5. **运行转换**

```
/book-to-skill <path|folder|glob> [skill-name]
```

例：`/book-to-skill ./my-book.pdf`。转换开始前会问这本书是 **technical** 还是 **text-heavy**，据此自动选抽取器（docling 保留 markdown 表格和代码块，pdftotext 对纯散文更快）。还支持 analyze-only、generate-from-analysis、update/fold-in 模式（README 未展开）。

6. **使用生成的 skill**

```
/your-book-slug replication
```

代理只读对应章节，从真实内容回答，而不是通读整本 PDF。

7. **可选：发布与分发**——转换后可将 skill 发布到 GitHub（默认私有），任何宿主用 `npx skills add` 安装。

8. **合规前提**——工具不自带任何书籍内容，抽取与分析在本机完成、不上传文件；产出被定位为“你自己的结构化笔记”，官方要求不得再分发第三方版权作品的生成 skill。

## 对应的研究问题

**1. 能力发现**——把“重读/查书”从人工翻 PDF 变成代理按需加载上下文。README 明确列出可迁移的非书场景：内部文档（架构决策记录、runbook、入职指南）、品牌与设计系统（语气指南、组件原则）、研究聚类（论文堆 + 自己的笔记合并成一个 skill）、规范与标准（RFC、API 契约、合规文档）。判据：一份文档你反复打开到希望自己背下来，它就是候选。

**2. 任务匹配**——适合“有结构化文本 + 需要反复查询 + 来源明确”的工作。工具侧给出了明确的匹配规则：技术类（代码/表格/公式）用 docling，纯散文用 pdftotext；宿主侧覆盖多个支持 Agent Skills 标准的客户端；协作方式上是“按需加载章节文件”，以控制上下文预算。

**3. 条件供给**——需要提供：你自己拥有合法访问权的文档（本机处理）；对应格式的抽取依赖（可用 `--check` 自查）；扫描件需先 OCR；转换时要回答 technical / text-heavy；产物要落到跨代理技能目录才能被宿主自动发现（Hermes 走 `skills/<category>/`，Claude Code 走已验证的符号链接）。

**4. 主动推进**——原文没有给出时间/事件/状态触发的机制，只有人工发起的 update/fold-in 模式（新资料落地后合并更新）。这一条依据不足。

**5. 效果验证**——给出了可量化的口径：token 消耗对比“整本塞上下文/发现循环”，声称 24×–51×；配套 `tools/discovery_tax.py` 做测量、`docs/performance.md` 给方法学、`tools/validate_skill.py --lens <宿主>` 校验生成的 SKILL.md 是否符合宿主规则。

## 与已有做法的关系

- **Agent skills（concept，adopt）**：直接对应。book-to-skill 生成的就是 Agent Skills 标准的 `SKILL.md`，可作为该概念的落地样例与批量生产工具。
- **Claude Code（tool，adopt）**：安装路径 `~/.claude/skills/book-to-skill`；在 Claude Code 下运行时转换器还会尝试在 `~/.claude/skills/<slug>/` 建符号链接，只有读回验证通过才算成功，否则运行报告会说明。
- **Hermes（tool，watch）**：Hermes Agent 按类别分区个人 skill、不扫描跨代理根目录，所以安装落到 `/skills/<category>/<slug>/`。
- **OpenClaw（tool，watch）**：默认 state 目录下可被发现；使用非默认 `OPENCLAW_STATE_DIR` 时改用当前 state 的 `skills/` 根。
- **OpenCode（tool，watch）**：读 `~/.agents/skills/`，也读 `~/.config/opencode/skills/`。
- **GitHub Copilot（tool，drop）**：README 提到 GitHub Copilot CLI（`~/.copilot/skills/`）。与清单中 GitHub Copilot 的 drop 状态存在表面冲突，但清单条目可能指 IDE 助手而非 Copilot CLI，材料不足以判定二者等同，需在手册中区分。
- **Trendshift（source，watch）**：README 挂有 Trendshift 徽章（repositories/27038，含 daily/Python），说明其热度有一个可追踪来源，与已有来源条目对应。

## 证据与局限

**原文给出的**：MIT 许可；支持的格式与逐个的抽取器/安装命令表；PDF 按书型选工具的规则与 ~1.5 秒/页的速度；生成的五类文件及各自 token 预算；安装、检查依赖、OCR、转换、使用、发布的可复制命令；各宿主的技能目录差异；合规说明（不含书内容、本机处理、不得再分发）。

**只是作者主张、材料内无法核验的**：24×–51× 的 token 节省（方法学与逐书表格在未提供的 `docs/performance.md`）；Steps 0–10 的完整生成流程（在未提供的 `docs/how-it-works.md`）；analyze-only / generate-from-analysis / update / fold-in 各模式的具体用法（在未提供的 `docs/usage.md`）；FAQ、安装细节、架构文档均未提供；用例仓库提到的“一本 DevEx 书变成 300+ 工程师调研”和“扫描 PDF 卡住后成为 issue #130”只有一句概述，无细节。stars=33277 是给定的列表指标，材料内无从核实。**输出质量（抽取准确度、章节切分是否合理、是否幻觉）没有任何第三方验证数据。**

**适用条件**：你拥有合法访问权的文档；本地有 Python 环境并能装对应抽取器；宿主支持 Agent Skills 标准；技术书需要 docling，速度约 1.5 秒/页；扫描件必须先 OCR；第三方版权书的生成 skill 应保持私有、不得再分发。

**抓取说明**：本次输入是仓库 README（source_note 标注“依据仓库 README”），链接的 docs 全部未包含在材料中，因此上述“步骤”只覆盖到 README 能支撑的粒度。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 选一本你反复查阅、且你已知道答案的技术书，或一份内部 `docs/` 目录（避开扫描件；若必须用扫描件，先 `ocrmypdf`）。
2. 安装并自查环境：`npx skills add virgiliojr94/book-to-skill`，然后 `python3 scripts/extract.py --check`，补齐缺失抽取器。
3. 转换：`/book-to-skill <路径>`，按提示选择 technical / text-heavy。检查 `~/.agents/skills/<slug>/` 下是否确实生成了 `SKILL.md`、`chapters/`、`glossary.md`、`patterns.md`、`cheatsheet.md`。
4. 用 `tools/validate_skill.py --lens <你的宿主>` 校验生成物是否符合宿主规则。
5. 准备 10 个问题：8 个你已知答案、1 个书中明确没有的（考幻觉）、1 个跨章节综合的。逐个用 `/your-book-slug <主题>` 提问。

**判断有没有改善的指标**

- **正确率**：8 个已知答案题命中数 / 8；引用章节是否对得上。
- **幻觉率**：书中没有的那题，代理是否明确说“书里没有”而不是编造。这一项应要求为 0，否则不要推广。
- **token 与耗时**：用 `tools/discovery_tax.py`，或自行对比“整本塞上下文”与“按需加载章节”回答同一问题时的 token 数，验证是否真接近 README 声称的量级；记录单次问答的 token 与墙钟时间。
- **可用性**：相比手动翻 PDF 找答案，耗时是否明显下降；一周后是否还会主动调用这个 skill（对照 README 的“三个月后忘了第 7 章”场景）。
- **回归**：用 update/fold-in 追加新资料后，旧章节的索引与回答是否仍然正确。

任一项明显不达标（尤其幻觉率不为 0、或章节切分混乱导致答非所问），先退回人工查文档，并把失败样本记下来再决定是否继续投入。
