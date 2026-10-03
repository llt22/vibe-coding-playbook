# Jakeschincariol/replica-skill

- 结论：**值得一试**。先只取 recon→architect→diff 三步，在自己熟悉的一个小 App 上跑一遍并人工核对产物质量，再决定是否走完整 11 步链；真正值得进手册的不是“克隆 App”本身，而是它示范的“每个技能读上一环节写下的产物文件、用客观打分和部署门禁卡住最后一步”这套可迁移做法，但仓库只有作者自述示例、无第三方验证，所以先小范围试。
- 原文：https://github.com/Jakeschincariol/replica-skill
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-03T23:21:04.682Z

## 是什么

Replica skill 是一个 MIT 许可的开源仓库，包含 **11 个 Claude 技能**（每个一个 `SKILL.md`，部分带模板文件如 `features.csv`、`tokens.json`、`test-plan.md`）和 **6 个纯标准库 Python 小工具**。它按固定顺序把一个 App 的**功能与流程**逆向出来再重建成自己的产品：逆向 → 架构 → 设计系统 → 逐屏重建 → 后端 → 测试 → 与原版对比打分 → 读真实差评找改进点与定位 → 改名换品牌 → 落地页与商店文案 → 部署。

README 明确划界：只重建“做什么和怎么走通”（clean-room 方式），不复制目标方的源代码、专有素材、logo、商标、文案、内容或私有 API；只读你有权读的东西（公开页面 + 你自己的账号），不爬登录后内容、不违站方条款、不代登他人账号、不越付费墙；发布前必须完成改名换品牌（`/replica-deploy` 在 sweep 未清干净前不会发布）。免费、MIT、无需注册、无需 API key。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 0. 前提
- 环境：Claude（网页/客户端）或 Claude Code。完全没有 Claude Code 也可以退化使用——“把任意一个 `SKILL.md` 粘到对话顶部，它就以一个 mode 运行。你失去 Python 工具，但方法仍然有效。”
- 本地：Python 3.8 或更新版本；README 原文：“Nothing to pip install.”（不需要 pip 安装任何东西）。
- 材料与权限：目标 App 的公开页面、截图、商店列表、帮助中心、公开走查，以及**你自己账号**里的点击过程；后面 `replica-entrepreneur` 需要你提供带链接的真实评论数据。

### 1. 安装（三选一，原文命令）

方式 A，直接粘进 Claude 对话：

```
https://github.com/Jakeschincariol/replica-skill

install skill
```

方式 B，作为 Claude Code 插件（此时技能带命名空间前缀，如 `/replica-skill:replica-recon`）：

```
/plugin marketplace add Jakeschincariol/replica-skill
/plugin install replica-skill@replica-skill
```

方式 C，要保留不带前缀的 `/replica-recon` 这种裸命令，就复制文件夹：

```bash
git clone https://github.com/Jakeschincariol/replica-skill.git
cp -r replica-skill/replica-* ~/.claude/skills/
```

只想在单个项目里用（而不是全局）：把同样的文件夹复制进你仓库的 `.claude/skills/`。

### 2. 按固定顺序运行，产物落到项目内的 `replica/` 目录

README 的顺序（每个技能读上一个技能写下的文件）：

```
recon -> architect -> design -> build -> backend -> test -> diff -> entrepreneur -> brand -> launch -> deploy
```

各个技能做什么（README 原文表述）：

| 命令 | 做什么 |
| --- | --- |
| `/replica-recon` | 逆向任意 App：屏幕、流程、组件、数据模型。来源是公开页面、截图、商店列表和你自己的账号。 |
| `/replica-architect` | 规划技术栈、数据库 schema 和 API。 |
| `/replica-design` | 重建设计系统：颜色、字体、间距、组件；产出 token，配你自己的素材。 |
| `/replica-build` | 按 recon 得到的地图逐屏重建。 |
| `/replica-backend` | 认证、数据库、支付与集成。 |
| `/replica-test` | 逐条流程点过去测 bug。 |
| `/replica-diff` | 把你的克隆版和原版对比：给一致性分数和缺失清单。 |
| `/replica-entrepreneur` | 读该 App 用户的真实差评，转成修复项和定位角度。 |
| `/replica-brand` | 给你的版本命名、换品牌，让它成为你自己的。 |
| `/replica-launch` | 落地页、定价、App Store 文案。 |
| `/replica-deploy` | 部署到你自己的域名上。 |

也可以只单独跑其中一个。README 明确建议：“拿 `/replica-entrepreneur` 跑一个你只是在考虑要不要克隆的 App，是判断该不该做的很好的方式。”

### 3. 六个工具命令（纯标准库 Python，均不联网，原样可跑）

```bash
python3 replica-diff/imgdiff.py original.png clone.png --out diff.png   # layout diff, ignores colour
python3 replica-diff/parity.py replica/features.csv                     # parity score + missing list
python3 replica-entrepreneur/reviews.py replica/reviews.csv             # what users hate, ranked, linked
python3 replica-design/contrast.py replica/design/tokens.json           # WCAG contrast on your tokens
python3 replica-brand/sweep.py . --avoid "Original App"                 # anything of the original left?
python3 replica-launch/listing.py replica/launch/listing.json           # store limits + copycat checks
```

各自的行为（README 描述，可用于判断该在什么任务上用哪个）：
- `imgdiff.py`：不用任何库读 PNG，把两张截图转成边缘图后比较“东西在哪”，因此新配色不会算作差异；输出差异区域，坐标用原图的像素。**前提：两张图尺寸/视角大致可比。**
- `parity.py`：对 must / should / could 加权，partial 记半分，且**故意不做的项和你自己新增的项都不计分**；缺 must-have 就判为不可发布，并会明说。**前提：`features.csv` 按仓库模板填写。**
- `reviews.py`：丢掉任何没有链接的评论；打印的每句引用都来自你给的那一行，并带该行 URL；主题少于 3 条评论或只有 1 个来源会被标为“thin”。**前提：`replica/reviews.csv` 里每行带 URL。**
- `sweep.py`：在代码里搜原版的名字、域名、颜色，连 `OriginalAppEmbed` 这种标识符内部也搜，**不清干净就挡住部署**。
- `listing.py`：检查 App Store 与 Google Play 的字数限制、标题里的排名声明、浪费的关键词字符，以及你 listing 里有没有出现原版名字。

### 4. 自检工具本身

```bash
python3 -m unittest discover -s tests -v
```

### 5. README 给的一个端到端示例（照它的走法可以复现流程结构）

以克隆一个“分享链接让人来预约时间”的日程 App 为例，README 描述各步产出：recon 产出 `replica/recon.md`，含 18 个屏幕、7 条流程（访客约、房主设可用时段、访客改约…）、组件、推断出的数据模型（users、event types、availability、bookings）和 `features.csv`；architect 选 Next.js + Postgres + Stripe + Resend，写 schema（带约束保证两个访客不能订同一时段）并排定构建顺序（先把预约流程端到端跑通）；design 把截图量成 token（颜色角色、字阶、8px 间距、日期选择器和时段按钮规格），图标用开源、字体用开源、文案用自己的；build 按 `features.csv` 逐条勾掉；backend 加注册、走 Google 自家 API 用你自己的 key 接 Google Calendar、Stripe 收付费预约、提醒邮件；test 从 7 条流程写测试计划，写 Playwright 规格覆盖 happy path 和边界（时区、预约中途时段被占、重复提交），按严重度记 bug，直到没有未关闭的 S1/S2；diff 打分（功能 86，must-have 全做完，预约页布局 91），缺失项是团队轮询分配和网站嵌入；entrepreneur 读 140 条来自 App Store、G2、Capterra、Reddit 的真实评论，主要抱怨是每席位涨价、没有短信提醒、访客被时区搞晕，每条带计数和引用链接，修复计划是统一价、短信提醒、加一步时区确认，定位角度是“讨厌按席位收费的小团队的预约链接”；brand 命名（含要跑的商标和域名检查）、给新配色、logo brief 和语气，然后扫代码直到不剩原版痕迹；launch 围绕定位写落地页、对标原版公开页定价、lint 商店文案；deploy 跑预检（测试、一致性、清扫、文案），配生产环境，给你域名的 DNS 记录，等你说 go 才发。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：README 列出的这 11 件事，是把通常被视为“产品经理 + 架构师 + 设计师 + 前端 + 后端 + 测试 + 竞品分析 + 品牌 + 文案 + 运维”的一长串角色任务交给 agent 串起来做。可迁移的启示是：**长流程可以被切成一段段单独可调用、单独有价值的技能**（README 明说每个都能单跑，并举例“只跑 entrepreneur 来判断该不该做”），这类“先评估后动手”的用法平时很少想到交给 AI。

**2. 任务匹配**：这里给出的匹配原则很具体——
- 拆成窄任务：11 个技能而不是一个“帮我克隆 App”的大提示，每个技能只产出一份中间产物。
- 用文件当接口：`replica/recon.md`、`replica/features.csv`、`replica/design/tokens.json`、`replica/reviews.csv`、`replica/launch/listing.json`——下一环节读上一环节的文件，人也能直接看和改。
- 接入方式按环境选：Claude 对话里粘 URL + “install skill”；Claude Code 里走 plugin marketplace；要短命令就 clone 后 `cp -r` 到 `~/.claude/skills/`；只在单个项目用就放 `.claude/skills/`；连 Claude Code 都没有，就退化成“把 `SKILL.md` 贴到对话顶部当 mode”，并明确说明代价（丢 Python 工具，方法仍在）。
- 工具层用“纯标准库 Python、不联网、无需安装”，能直接在本地反复跑。

**3. 条件供给**：需要供给的东西 README 点名了——目标 App 的公开页面/商店列表/帮助中心/公开走查、你自己账号的操作过程、你的截图、带链接的真实评论 CSV、你自己的 API key（Google Calendar 走 Google 自家 API、Stripe 收付款）、项目目录的写入权限（产物落在 `replica/` 子目录）。README 同时划出**不能供给/不该供给**的边界：不提供登录后抓取、不提供他人账号、不提供付费墙内内容，账号条款若禁止拿来造竞品就用公开来源并明说。反馈的供给方式是把评论连同链接一起喂进去，工具会拒绝无链接的评论。

**4. 主动推进**：这条链本身就是“上一环节产物作为下一环节触发条件”的流水线；`/replica-deploy` 的 preflight 是状态门禁——测试、一致性、品牌清扫、商店文案未过就不发，`sweep.py` 会把部署挡住直到清干净；`/replica-test` 以“没有未关闭的 S1/S2”为收敛条件；`reviews.py` 会给样本量太小的主题打上 thin 标记而不是硬凑结论。README 没有描述基于时间或事件的自动触发（如定时跑 diff），这部分属于本次材料的空白。

**5. 效果验证**：这是这份材料最有价值的部分，因为它给了可执行的“不靠感觉”的判据——`parity.py` 的 must/should/could 加权分 + 缺失清单（并明确缺 must-have 即不可发布）；`imgdiff.py` 的布局差异图（特意忽略颜色，避免新配色被误判为不一致）；`contrast.py` 对 token 做 WCAG 对比度检查；`reviews.py` 的每条结论必须带原始链接和计数、小样本标 thin；`listing.py` 的商店字数与关键词检查；`sweep.py` 的残留检查。README 还明确声明“Entrepreneur 从不编造：没有虚构的评论、引用或数字”，并把“无‘完美克隆’保证”写进 fine print，用 `/replica-recon` 先诚实地估算规模、用 `/replica-diff` 给“一个真实的数字，而不是感觉”。

## 与已有做法的关系（对照给出的清单条目）

清单中已有 **Claude Code**（tool，状态 adopt）。本仓库正是它的插件/技能包：可以作为 plugin marketplace 安装，也可以把 `replica-*` 文件夹复制到 `~/.claude/skills/`（全局）或仓库内 `.claude/skills/`（项目级），或在完全没有 Claude Code 时退化为粘贴 `SKILL.md`。

除 Claude Code 之外，清单中没有其它相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的具体内容（可作为试用时的核对清单）**：
- 11 个技能的完整名称与职责表；完整的安装命令（三种方式）与顺序调用命令。
- 6 个工具的逐行可执行命令、各自算法行为描述（边缘图比对、加权与 partial 记半分、无链接即丢弃、标识符内部也搜、商店限制检查）。
- 一个日程预约 App 的端到端示例，带具体产出物名与数字：18 屏幕、7 条流程、数据模型表名、技术栈选型（Next.js/Postgres/Stripe/Resend）、功能分 86、预约页布局 91、缺失项（团队轮询、网站嵌入）、140 条评论来自 4 个来源、三类主要抱怨，以及每步的产出文件名。
- `tests/` 目录与自测命令。

**属于作者主张、本次材料无法核验的部分**：
- 上面那串数字（18/7/86/91/140 等）只是 README 里的叙述性示例，材料没有说明它们是真实运行结果还是示意，也没有第三方复现或基准数据。
- “克隆任何 App”“无需 pip 安装”“工具不联网”“技能之间能互相读到对方的文件”“Entrepreneur 从不编造”等，均为 README 自述，本次材料未提供验证途径（唯一可见的自检入口是 `python3 -m unittest discover -s tests -v`）。
- 仓库 92 stars（来自初筛指标），体量不大，社区验证程度有限。

**适用条件**：需要 Claude 或 Claude Code 环境（无 Claude Code 时能力退化，丢 Python 工具）；本地 Python 3.8+；被重建对象必须是**功能与流程**，不能是它拥有的内容、网络或许可（README 例子：音乐 App 的播放器、歌单、分享可以重建，曲库不行）；README 自认不保证“完美克隆”，复杂度决定可行性（“预约工具是几周的事，电子表格引擎不是”）；法律层面 README 自己声明不构成法律建议，要求跑 `/replica-brand` 列出的商标检查、读你用到的任何东西的条款、涉及钱就先找律师。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（建议 1—2 天）**：
1. 选一个自己天天在用的**小工具类** App（预约、清单、打卡这类），不要选复杂系统。
2. 按上面步骤 1 的方式 C 装到本地（`git clone` + 复制文件夹），保证能用裸命令和 Python 工具。
3. **只跑前三步**：`/replica-recon` → `/replica-architect` → `/replica-diff`（diff 需要先有 `replica/features.csv`，可以先手写几行凑够格式）。
4. 打开产出的 `replica/recon.md` 和 `replica/features.csv`，逐条和你自己对这个 App 的了解人工对一遍。
5. 跑一次自检确认工具链没坏：`python3 -m unittest discover -s tests -v`。
6. 想验验证机制本身：拿两个自己做的截图跑 `python3 replica-diff/imgdiff.py a.png b.png --out diff.png`；在自己代码里**故意留一个**原产品名字，跑 `python3 replica-brand/sweep.py . --avoid "原产品名"`，看它是否抓到（包括标识符内部）。

**判断有没有改善的指标**：
- recon 产出的屏幕/流程清单里，人工核对后认为“确实存在、我漏看了”的比例有多高——能捞出你原先没注意的流程才算真有用。
- `features.csv` 是否可直接作为构建 checklist 使用（字段是否够、must/should/could 分级是否合理）。
- `parity.py` 打分是否“可解释”：给的分和缺失清单能否和你的人工判断对上；补完 must-have 后分数是否随之上升。
- `imgdiff.py` 是否指出**真实的布局差异**而不是颜色差异（这是它宣称的设计目标，可直接证伪）。
- `sweep.py` 对故意埋的残留是否 100% 抓到、是否误报（误报太多就不适合当部署门禁）。
- 时间维度：同一件事（比如“列出一个 App 的完整流程清单”）你用 AI 链做 vs 手工做，耗时和遗漏项数量各是多少。

**更该搬走的东西**：这个仓库真正可迁移的不是“克隆 App”，而是它的工作流形态——**每个技能读上一环节写下的结构化文件；每一步都有可计算的验收标准；最后用门禁卡住不可逆动作**。把这套形态套到你自己的非克隆工作流（写文档、做调研、改代码库）里，比直接照搬这 11 个技能更有价值。
