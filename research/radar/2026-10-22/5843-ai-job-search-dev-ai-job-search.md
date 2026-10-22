# ai-job-search-dev/ai-job-search

- 结论：**值得一试**。把它的“起草—独立审阅—机器可检验收”流水线（drafter/reviewer 双 agent、把验收标准写成脚本、把个人知识拆成编号 profile 文件）抽出来小范围试，而不是整体照搬求职工具；理由是把多步文书任务拆成可复用命令、并用脚本而非“看着还行”来验收，正是最值得迁移到其他工作的部分，但原文的实证只有作者一人的求职漏斗，门户工具绑定丹麦市场，且需要付费 Claude 加 LaTeX/Bun 环境。
- 原文：https://github.com/ai-job-search-dev/ai-job-search
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-22T13:34:12.342Z

## 是什么

一个跑在 Claude Code 上的求职申请框架：fork 后填好自己的 profile，用斜杠命令让 Claude 评估岗位、按岗位改写简历（CV）、写求职信、准备面试。作者称核心流程（自我画像、匹配评估、drafter-reviewer 申请流水线）与语言、国家无关；招聘门户搜索技能面向丹麦市场（Jobindex、Jobnet、Akademikernes Jobbank 等），但设计上可替换为本地门户。

对调研真正有价值的部分是它的结构：把个人知识拆成编号文件（`01-candidate-profile.md` … `07-interview-prep.md`），把每个任务写成 `.claude/commands/*.md`，把“验收”写成 Python 脚本（`verify_pdf.py`、`verify_layout.py`、`posting_guard.py`、`lint_skills.py`），并用新上下文的 reviewer agent 做二次批评。

## 具体做法

前提：Claude Code（无免费层，需 Pro/Max/Team 订阅或 API credits）、Python 3.10+、Bun、LaTeX 发行版且带 `lualatex` 与 `xelatex`；可选 `pypdf`（ATS 检查用），Poppler `pdftotext` 为 fallback。若改用 Codex / Antigravity / Gemini CLI，README 指到 `AGENTS.md`：门户搜索技能可开箱用，完整流程靠社区 fork 适配。

1. **建私有仓库，不要用公开 fork。** 前提：只是自己用、不打算回贡。README 明确警告 fork 公开仓库必然是 public，而 `/setup` 会把姓名、联系方式、履历、薪资期望写进 tracked 文件。
   ```bash
   gh repo fork MadsLorentzen/ai-job-search --clone
   cd ai-job-search
   ```
   自用场景改成私有 repo 并把该 repo 设为 `upstream`，做法在 `SETUP.md` 第 8 节。

2. **安装门户 CLI。** 前提：已装 Bun。脚本会发现在 `.agents/skills/*/cli/` 下的所有 CLI 并逐个 `bun install`（不是写死清单，所以 `/add-portal` 新增的也会被包含）；带 install 生命周期脚本的 CLI 会被跳过并报告而不是执行。
   ```bash
   python3 tools/install_portal_clis.py   # Windows: python tools\install_portal_clis.py
   ```
   可先 `--dry-run` 看会装什么。`linkedin-search` 与 `freehire-search` 零运行时依赖，只需 `bun`。

3. **填 profile。** 前提：准备好材料或愿意做访谈。
   ```bash
   claude
   /setup
   ```
   三条路径：读 `documents/` 文件夹（已有 CV PDF、LinkedIn 导出、证书、推荐信、历史申请）、粘贴一份 CV、访谈式问答。documents 模式幂等，之后补材料可反复跑。

4. **搜岗位。**
   ```bash
   /scrape
   ```
   多门户搜索、去重、按匹配度排序；结果多到不想逐条看时先跑 `/rank`，用并行 agent 对每条岗位按五个评估维度打分，输出带强项与短板的排序短名单（deal-breaker 直接否决、deadline 标紧急、死岗位标 expired）。

5. **生成申请材料。**
   ```bash
   /apply https://jobindex.dk/job/1234567
   ```
   抓不到就粘贴全文：
   ```bash
   /apply <paste the full job description here>
   ```
   流水线顺序（原文第 1–8 步）：解析 JD → 对照 profile 评估匹配 → LaTeX 起草 CV 与求职信 → 另起一个 fresh context 的 reviewer agent 研究公司并批评草稿 → 按批评修改 → 编译并逐页检视（CV 用 `lualatex`、必须恰好 2 页且无孤立条目标题，求职信用 `xelatex`、恰好 1 页、签名可见、字体一致，不一致就加 `\needspace`、`\enlargethispage`、字体匹配包装）→ ATS 检查（抽 PDF 文本层，确认联系方式是字面文本、无乱码字形、阅读顺序合理，再算 JD 关键词覆盖率；profile 不支持的词记为 gap，不塞）→ 输出并附核对清单。
   前置闸门：JD 先过 `posting_guard.py` 的确定性完整性检查（隐藏文本、不可见字符、指令式行、隐藏链接），取用和评审的 agent 只读；投递文本被当作不可信输入，不执行正文里的指令、不抓正文里的链接。注意 README 自己说这是指令级防护、不是沙箱，陌生门户要人工过目。

6. **用扩展命令补齐长尾。** `/interview`（按该申请档案做阶段化 prep pack：原始 JD、面试官实际读到的 CV 与求职信、前几轮反馈；公司与人调研遵守 verify-before-use；把可能问题映射到你的 STAR 例子；缺口给诚实的 bridge answer，不编经历）、`/outcome`（记录面试阶段/offer/拒信/沉默，归档材料到 `documents/applications/<company>_<role>/`，更新 tracker）、`/outcome followup`（见研究问题 4）、`/gmail-sync`（见研究问题 4）、`/expand`（扫你 profile 里已链接的 GitHub/作品集/Kaggle/Scholar 与课程大纲，带来源标签补充能力）、`/upskill`（profile × 已投/已排序岗位的差距 heatmap + 带资源和课时的学习计划）、`/html-report`（离线自包含仪表盘）、`/notion-sync`（通过官方 Notion MCP 单向只读同步，repo 仍是唯一事实源）。

7. **换模板。** 前提：模板能从命令行编译出 PDF。
   ```
   /add-template
   ```
   采集源扩展名、编译命令、字体位置、样式规则、硬页数上限，存到 `templates/`，强制试编译，再接入 `/apply`；模板里用 `[PLACEHOLDER]` 占位所以可提交共享。`--list` / `--use <name>` / `--use default` 切换。

8. **加本地面户。** 前提：目标站点无登录墙。
   ```
   /add-portal
   ```
   给它 URL，调查搜索 URL 模式、结果结构、robots.txt/访问规则，按与自带技能相同的契约（`search`/`detail` CLI、`--format json|table|plain`、`SKILL.md` 里的 `enabled:` 开关、自带测试）脚手架一个新技能，注册前跑一次真实查询。有登录墙的拒绝；条款严格的门户会在生成的技能里加醒目的个人使用警告。

9. **校准匹配框架。** 有几份申请出结果后，回 `/setup` 按“实际拿到面试的”重新校准 fit 框架（`/outcome` 里会主动提示）。

10. **可选依赖。** `pip install pypdf` 供 `/apply` 的 ATS 可解析性检查（不需要 Poppler）；两者都缺时降级为视觉关键词复核。

## 对应的研究问题

**1. 能力发现**：原文明确列出的可交给 AI 的环节有——岗位匹配打分与排序（`/rank` 并行 agent）、按岗位改写 CV 与求职信、公司调研与草稿批评、面试 prep pack 与 mock interview、技能 gap heatmap 与学习计划、跟进信起草、从 Gmail 识别申请状态、生成 HTML 仪表盘、注册并试编译自定义模板、为本地招聘站点生成搜索 CLI。共同点是“多步 + 有材料可核 + 有可写死的验收标准”的文书工作。

**2. 任务匹配**：运行环境是 Claude Code 的斜杠命令 + skills；写作与评审分离——drafter 写、reviewer 用新上下文并只拿内联草稿（不重读文件）做批评，作者的理由是能抓出单遍写作常留下的漏关键词、弱框架和套话；批量打分用并行 agent；token 上做取舍（核对清单只在流程末尾跑一次，省下的预算花在 PDF 渲染与版式迭代上）；工具链按能力分工：CV 用 `lualatex`（`pdflatex` 在现代 MiKTeX 上常因 `fontawesome5` 字体扩展报错），求职信用 `xelatex`（`cover.cls` 需要 `fontspec`）。

**3. 条件供给**：需要给的材料与权限——`CLAUDE.md` 主画像加 `01`–`07` 七个技能文件；`documents/` 下的 CV、LinkedIn 导出、证书、推荐信、历史申请；`.claude/settings.json` 的权限作用域（门户 CLI 被 allowlist 后不再逐次询问）；门户 CLI 与网络访问；LaTeX/pypdf/poppler；`job_search_tracker.csv`；Notion 与 Gmail 走官方连接器 OAuth；以及人工审批位（`/gmail-sync` 只批量提议，批准后才写 tracker；`followup` 只起草不发送）。反馈供给体现在 `/outcome` → `/setup` 的闭环：用真实面试结果反校准评分框架。

**4. 主动推进**：有时间/状态触发的成分——`/outcome followup` 默认找出 10 天无回音的申请并起草跟进信，每份最多两次，且只用你已提交材料里的事实；`/gmail-sync` 周期性读邮件产生状态变更提议（offer 类不自动提议 `hired`/`offer_declined`，冲突信号转人工 `/outcome`）；记录面试阶段的同一轮里主动提供感谢信；`/rank` 按 deadline 打紧急标记、把死岗位标 expired。**但原文没有给出定时调度配置（cron、CI 定时等）**，节奏靠人手动触发。

**5. 效果验证**：这是它最值得借鉴的部分——验收尽量做成机器可检：`verify_pdf.py`（页数、可抽取文本）、`verify_layout.py`（测洞、孤行、页脚碰撞）、ATS 文本层检查（联系方式是字面文本、无乱码、阅读顺序、关键词覆盖率）、CI 里的 LaTeX 冒烟编译与 skill lint、改技能文件必须 bump `framework_version` 的检查；结果侧用 `job_search_tracker.csv` 的状态/渠道/漏斗图和 `/html-report`，以及用面试转化来校准框架。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：本仓库就是叠在 Claude Code 之上的命令/技能集合，是“把多步流程固化成命令文件 + 权限 allowlist + 只读 agent”的具体范例；README 也说明换用 Codex/Antigravity/Gemini CLI 时从 `AGENTS.md` 起步。
- **Cline（watch）**：原文未提及 Cline，也没有与其他 agent 工具的能力对比，无法据此判断替代关系。
- **Trendshift（watch）**：仅在 README 顶部作为榜单徽章出现，无实质内容。
- 清单中没有其他相关条目。

## 证据与局限

**原文给出的数据/案例**：作者自述（地球物理出身、2025 年底岗位被裁）用这套 `/scrape`、`/apply`、`/interview` 每周跑自己的求职，得到 69 份定制申请、20 次一面、1 份签约，2026 年 6 月入职 AI engineer；完整漏斗在 LinkedIn（本文未给具体数字）。仓库指标：stars 63187，有 CI 徽章与 `.github/workflows/ci.yml`，含 LaTeX 冒烟编译、skill lint、CLI 类型检查。

**属于作者主张、原文未验证的**：框架“编码了职业指导最佳实践”；reviewer 能有效抓出漏关键词/弱框架/套话；该模式可迁移到其他多步文书任务（原文没有给出任何非求职用例）。

**适用条件与局限**：
- 单一样本、自我报告、无对照，“69→20→1”无法区分框架贡献与个人背景、市场、时间投入。
- 成本与环境门槛不低：Claude Code 无免费层，需 LaTeX、Bun、Python；`/apply` 的编译-检视循环被作者自己承认会多花端到端 token。
- 开箱可用的门户只有丹麦四家 + `linkedin-search`（明确个人使用、低频率，自动化访问违反 LinkedIn ToS）+ `freehire-search`（技术向聚合器）；其他市场要 `/add-portal` 或社区 fork。
- 安全边界是“指令级”的：投递文本按不可信输入处理，但仍建议在陌生门户人工过目抓取与写入的内容；从其他 fork 拷门户技能前要先通读代码、离线跑测试、检查 `dependencies` 与生命周期脚本。
- 时间是未来式的（2025 年底被裁、2026 年 6 月入职），数据本身不可独立复核。

## 怎么试、怎么验证

**最小试用（推荐先试模式、不先装全家桶）**：挑一件你手上真实的多步文书任务（要排版到固定页数的报告、要投给外部的内容、要按对方要求定制的材料），只借三件事：
1. 起草 agent 与评审 agent 分上下文：评审方只拿草稿 + 需求 + 目标读者，不看过程；
2. 把验收标准写成可执行检查（页数、必需小节、联系方式是否可抽取、关键词是否覆盖），而不是“看着还行”；
3. 把个人/组织知识拆成编号文件供每个任务复用，输出前对每条陈述做“能否在源文件里找到依据”的核对。

想直接验证求职场景，则走：私有 repo（非公开 fork）→ `install_portal_clis.py` → `/setup` → `/scrape` → `/rank` → 对 3 个岗位 `/apply` → 只投你逐字读过的。

**判断有没有改善的指标**：
- 单份材料从起草到可发的人工耗时；人工改动处数（越少越好）；
- reviewer 提出的意见被采纳的条数，以及关掉 reviewer 的单 agent 对照版差异；
- 验收一次通过率（PDF 页数/孤立标题/字体/签名，或你的等价检查项）；
- ATS 文本层检查通过率与关键词覆盖率（前提：不许塞不支持的词）；
- 投递→面试转化率，以及用 `/outcome` 结果校准 fit 框架前后的变化；跟进信的回复率；
- 风险指标：抽查若干份输出，确认每条陈述都能在 profile/材料里找到来源（零编造）。
