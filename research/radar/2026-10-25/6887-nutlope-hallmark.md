# Nutlope/hallmark

- 结论：**值得一试**。先挑一两个前端页面装上 Hallmark 跑完整流程，重点抄它的结构——三层门禁 + 可判定的自动 lint + 冷上下文终审 + 改动前后快照比对——而不只是用它换主题。它把“验收标准”写成了智能体能执行的文件与脚本，命令、流程、层级都是照做得了的；但原文只有 README，门禁的具体条目和任何效果数据都没给出，且只覆盖网页设计，所以先小范围试。
- 原文：https://github.com/Nutlope/hallmark
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-25T08:12:06.662Z

## 是什么

Hallmark 是 Together AI 做的一个**设计技能（skill）**，装在 Claude Code、Codex CLI、Cursor、OpenCode 里，让编码智能体做网页时避开“AI 味”。它的核心不是主题包，而是**把设计验收拆成可执行的分层门禁**：

- **Floor（底线）**：永不放行——对比度、焦点、减少动效、编造事实、手机布局崩坏。
- **Reflex（反射）**：模型默认会掉进的套路（每个标题上方的 eyebrow、字距拉开的大写标签、标题里一个彩色词、整页空框或全是照片、hero 撑不满一屏、每页结尾都塞订阅框、表单点“谢谢”却没真提交）。**有理由可以破例，但要记录在案。**
- **Finish（工艺）**：细节，从不阻断发布。

流程上先由 `scripts/theme.mjs` 从 48 个“材质”主题里发三个，再由 `draw` 按页面**要做的事**给出结构；产出自包含 HTML/CSS，并在第一条 CSS 注释里盖戳记录做过的决策；最后由 `scripts/sloplint.mjs` 在真实浏览器里按八种宽度渲染检查，再加一个**全新上下文的复审者**说最后一句话。附 755 张 Wikimedia Commons 开放授权照片（按主题挑选、页面上逐张署名），以及 `redesign` / `audit` 两个子命令。

## 具体做法

**前提**：Node 18+；要跑浏览器检查（`--render`、截图）还需 `npm i -g puppeteer-core` 和已安装 Chrome，缺了只剩静态检查。

1. 安装（全局，所有项目可用；去掉 `-g` 只装当前项目）：
```
npx skills add nutlope/hallmark -g
```
   只装一个 harness：
```
npx skills add nutlope/hallmark -g --agent claude-code
```
   （`--agent` 可取 `codex` / `opencode` / `cursor` / `github-copilot`）。作为 Claude Code 插件：
```
/plugin marketplace add nutlope/hallmark
/plugin install hallmark@hallmark
```
   从 clone 安装：`node skills/hallmark/scripts/install.mjs`（会先校验每个主题和引用再复制）。

2. 触发：`/hallmark <prompt>`，或直接描述要建的页面；没自动触发就点名——*use hallmark to build ...*。Codex CLI 用 `$hallmark <prompt>`。

3. Pre-flight（必须先做）：读项目已有字体、配色、框架、锁定的 `design.md`；**一次性索要素材**：照片、截图、真实数字。原文明确“Nothing is invented”。

4. 选题材：`scripts/theme.mjs deal` 给出三个匹配 prompt 且通过日志的主题；`draw` 按页面的“任务”给出结构。注意**主题只是材质，不是方案**——它不规定页面放什么、什么顺序，所以同一主题两次 prompt 出两个不同页面。一次构建只读一个主题文件（每个 ≤8KB）。

5. 先只建 hero，单独渲染、冷读评审，**再建页面其余部分**。（强制隔离，避免错误结构被复制到全页。）

6. 全页检查（任何页面都能单独跑）：
```
node skills/hallmark/scripts/sloplint.mjs <file-or-dir> --render
```
   八种宽度渲染 + 静态检查，然后起一个 fresh-context 子代理复审终审。

7. 改已有页面——**不点名就不动手**：
```
/hallmark redesign ./src/app
/hallmark audit ./index.html
```
   全量重设计保留内容与接线，只换系统与布局；说 *keep the layout* 是换皮，说 *polish* 是只去 AI 味。`audit` 只报告不改。

8. 用快照防回归：重设计前先 `sloplint --before` 记录每一条链接、字段、handler、标题；改完 `sloplint --kept`，**丢一件就判定失败**；交付物是前后并排对比。

9. 加编辑时门禁（Claude Code）：`install-hook.mjs` 挂上编辑阶段的 Floor 检查。

## 对应的研究问题

- **能力发现**：把“设计评审 / 去 AI 味 / 重设计且不丢功能”这类通常认为必须人来做的活交给智能体，并且给了可判定判据（而不是“看起来好不好”）。这是“还能交给 AI 的活”的一个具体样本。
- **任务匹配**：明确的三方分工——生成模型（编码智能体）产出；脚本（`sloplint`）做**可判定**的机械检查；**全新上下文的子代理**做主观终审。三者不混在一个上下文里，避免“自己检查自己”。
- **条件供给**：需要项目上下文（字体/配色/框架/`design.md`）、真实素材（照片、截图、真实数字）、以及 Chrome + puppeteer-core（没有就降级为静态检查）、被改页面可访问（`--before` / `--kept` 依赖于此）。素材是**开工前一次性索要**的，不是边做边猜。
- **主动推进**：pre-flight 自动读项目并索要缺口；`install-hook.mjs` 把 Floor 检查挂到“编辑时”这一状态触发点；构建流程本身强制“先 hero 后全页、先 lint 后复审”的顺序。原文未涉及时间触发或长时无人值守运行。
- **效果验证**：这是最完整的一条。① 可判定项交给脚本自动跑（八宽度渲染）；② 破坏性改动用 `--before` / `--kept` 快照比对，丢件即 fail；③ 主观项交给独立上下文复审者；④ 分层裁定——Floor 硬阻断、Reflex 可破例但需记录理由、Finish 不阻断，避免“所有检查都变成阻断”导致流程瘫痪。

## 与已有做法的关系

清单中有 **Claude Code（adopt）**、**Cursor（watch）**、**OpenCode（watch）**、**Burr（watch）**。

- 对 **Claude Code**：Hallmark 是“技能文件 + 门禁 + 外部 lint + 子代理复审”的一套现成范例，可以作为 adopt 条目的具体用法补充；它还给出插件市场安装和 edit-time hook 两种接入方式。
- 对 **Cursor / OpenCode**：README 只把它们列为安装目标（“finds the copies above”），没有给各自的差异说明或独有能力，不能据此下结论。
- **Burr**：与本文无直接关系。

## 证据与局限

**原文给出的**：48 个主题（每个一文件、≤8KB、旁附成品图）、755 张开放授权照片、八种宽度渲染检查、三层门禁的定义与各自裁定规则、`--before` / `--kept` 的回归语义、完整安装/调用/lint/redesign/audit 命令、Node 18+ 与 puppeteer-core+Chrome 的依赖条件、MIT 许可、照片逐张署名与不碰 Unsplash/Pexels/Pixabay（其条款禁止 AI 工具选图）。仓库约 3.2 万 stars（当日 +455）。

**只是作者主张**：“主题能避免 AI 味”“冷读评审更严”“Floor 拦得住”——README **没有任何前后对比数据、评测结果、误报/漏报率**。也没有列出 Floor / Reflex / Finish 的具体条目内容（只有分类名和例子），所以**不能直接把它的验收规范照搬**到别的领域。

**适用条件**：仅限网页/前端设计；浏览器检查依赖 Chrome 环境；照片使用需按每张的 CC0 / 公有领域 / CC BY / CC BY-SA 逐张署名；主题是一次构建读一个文件，不等于完整设计系统。

## 怎么试、怎么验证

**最小试用（半天）**：
1. 拿一个**已有**页面先跑 `/hallmark audit <path>`，只出报告，摸清它在你的代码库上的检出情况。
2. 再拿一个**新建**小页面走完 4 步 build（pre-flight → deal/draw → 单独建 hero 冷读 → `sloplint --render` + 子代理复审）。
3. 对已有页面做一次 `/hallmark redesign <path>`，前后各跑 `sloplint --before` / `--kept`。

**记录这些数**：改动前后 sloplint 条目数；`--kept` 缺件数（必须为 0）；八宽度渲染有无布局崩坏；冷读复审列出的问题数；以及从 prompt 到可发布的耗时与返工轮次。

**判断有没有改善**：
- Floor 类问题（对比度、焦点、动效、手机布局）在 lint 中归零；
- 重设计后链接/字段/handler/标题一个不少；
- 盲评：找人不告知来源，比较新旧页面；
- 流程指标：返工轮次下降、复审问题数下降。

**反面信号**：为了过 lint 把业务动作牺牲掉（比如删掉表单、去掉订阅入口），说明门禁被当成了目标而不是底线，需要回到“页面为谁而来做什么”的定义上修，而不是加更多规则。
