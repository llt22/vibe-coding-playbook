# ethanplusai/astro-conversion-kit

- 结论：**值得一试**。挑一个低流量站点或 20–50 页的子站，按 README 用一条提示词跑到「PR + noindex staging」为止、不要动 DNS，同时把它「环境预检 → 冻结基线 → 逐提交门禁 → 只出 PR → 留 verify 命令」的技能包骨架参考为自建 Agent Skill 的模板。理由是安装命令、发起提示词、八阶段流程与验收门禁都写得具体、可照做；但 45 站 / 83 分钟 / 45-45 像素一致这类成效全部来自作者自述且未经独立验证，具体门禁实现与其余文档也不在抓取到的材料里，所以先小范围试而不是直接采用。
- 原文：https://github.com/ethanplusai/astro-conversion-kit
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-23T23:58:37.201Z

## 是什么

`astro-conversion-kit` 是一组 **Agent Skills**（智能体读取 `SKILL.md` 即可运行），把「把线上站点迁移成静态 Astro 站」整件事交给编码智能体。README 的定位是迁完之后仍是同一个站：同样的 URL、内容、title/description/canonical/结构化数据、同样路径的媒体文件、旧站每一条重定向，以及 390 / 768 / 1440 三个宽度上逐像素校验过的设计。成品里没有 PHP、插件、数据库。

分工写得明确：**必须精确的部分由普通 Node 脚本做，每个阶段用「门禁（gate）」证明做完了才往下走**；智能体负责抽象、修补、生成与提案。一次运行以「一个 PR + 一个 noindex 的 staging 部署 + 一份上线 runbook」收尾。

WordPress 是一等公民（不登录后台、不装插件、不导数据库，只读站点对外提供的内容）；任何 HTTP 可访问的站点都能做，因为抓取读的是渲染后的 HTML。许可 MIT。

对调研项目而言有两层价值：① 一个可直接试的整包「站点迁移」；② 它的技能包骨架（预检 → 冻结基线 → 门禁 → 拒绝清单 → 只出 PR → 留 verify 命令）是编写自己 Agent Skill 的现成范例。

## 具体做法

**前提（跑之前先确认）**
- Node 22.23.4+（22 线）或 24.22.1+；Node 20 已 EOL，工具会拒绝运行。
- git；若想让它自动建 repo 与 PR，需要 GitHub 账号且 `gh` 已登录。
- Vercel 或 Cloudflare 账号（staging/生产用；只做转换可以不备）。
- Playwright 的 Chromium（截图与视觉复核用）。
- macOS 或 Linux；本版本不支持 Windows。
- 一个能执行 shell 命令的编码智能体；若它有自带浏览器或能跑子智能体，技能会用上，没有也能跑完。

**1. 装技能包（三选一）**

任意支持 Agent Skills 的智能体（Claude Code、Codex 等）：
```
npx skills add ethanplusai/astro-conversion-kit
```

Claude Code 插件市场：
```
/plugin marketplace add ethanplusai/astro-conversion-kit
/plugin install astro-conversion@astro-conversion-kit
```

或克隆下来（这样也能手动跑任意脚本）：
```
git clone https://github.com/ethanplusai/astro-conversion-kit
cd astro-conversion-kit
npm install
npx playwright install chromium
node skills/convert-site/scripts/preflight.mjs
```
`preflight.mjs` 会列出本次运行需要的工具（Node、git、gh、托管 CLI、Playwright 浏览器）以及是否已安装、已登录。所有脚本都支持 `--help`。

**2. 用一句话发起整件事**（把 example.com 换成你的站）
```
Convert https://example.com to Astro with https://github.com/ethanplusai/astro-conversion-kit
```
这一步就是全部：智能体自己装技能、只问你**一条消息**的问题（repo 放哪、用哪个托管、表单怎么处理），每个问题都带默认值；回一句 `defaults` 就全用默认，然后一路跑到 PR 不再停。

**3. 让它按八个阶段跑（中途不要插手）**
1. **Intake**：最多 4 个请求探测平台特征；一条消息问清 repo 位置、托管、表单处理，以及智能体探测不到的东西。
2. **Capture**：限速、只读的爬取（sitemap、WordPress REST API、页内链接），把每页 HTML、head 标签、重定向、媒体清单、字体、feed、截图存进 `capture/`。WordPress 走 `wp/v2/pages`、`posts`、`media`、`categories`、`tags`；草稿与私密内容抓不到（API 只返回公开内容）。
3. **Plan**：产出 `docs/plan.md`——模板、数量、媒体方案，以及每一个「异常点」各占一行。
4. **Scaffold + baseline**：在新 Astro repo 的 `astro-rebuild` 分支上搭骨架，把 capture 冻结成 `baseline/`，此后门禁不再依赖旧站。
5. **Build**：先布局后页面；页面从抓下来的 markup 生成，CSS 按覆盖率裁剪；媒体放在原路径（含 WordPress 生成的 `photo-300x200.jpg` 这类尺寸变体和 `srcset` 里列的所有副本，因为外站和旧邮件可能链到任意一个）；表单与第三方脚本按清单原样带过来。
6. **Gates**：路由、重定向、SEO 标签、可见文本、链接、媒体、sitemap、feed、表单、脚本共十类，**每次提交都对照 baseline 校验**。
7. **Visual review**：每个模板在三个宽度（390/768/1440）出「线上 vs 新版」截图并做像素 diff，加一道 computed-style 检查，直到每一对都过；然后把每一页在 390 和 1440 再扫一遍。
8. **Launch checks**：在 repo 上跑 `pre-launch`，部署 staging，对 staging 跑 `launch-audit`，出一份建议报告，开 PR。

**4. 验收与上线（人来做的部分）**
- 看 PR 里附的：门禁输出、各项计数、每一条例外与提案、以及各上线技能「Not covered」章节的全文引用。
- 看 contact sheet（每模板 × 每宽度的 线上/新版/diff 三联图）与 `docs/suggestions.md`（智能体**发现但没动**的问题：死链、缺 alt、重复 title、大图，每条带证据/工作量/风险）。
- 确认 staging 是 noindex；按 `docs/LAUNCH.md` 里按顺序、带你所用托管商具体命令的 runbook 上线。
- 合并 PR 由你点。上线后跑 `post-launch` 盯前 30 天。

**5. 它拒绝做的事（边界本身是设计的一部分，别去绕）**
在 EOL 的 Node 上跑；在线上站提交表单或登录；碰 DNS；往 `main` 提交除脚手架以外的任何东西（所有工作在 `astro-rebuild`，经你合并的 PR 进 `main`）；放宽任何一道门禁。一次只做一个站。

**6. 可迁移的技能包骨架（把它当模板参考）**
- 单一提示词入口 + 只问一轮、每个问题带默认值；
- 先把旧系统冻结成 baseline，门禁不依赖线上；
- 一切要求精确的环节写成确定性脚本，用脚本产出而非模型自觉作为放行条件；
- 开跑前用 preflight 探环境，缺什么当场说；
- Intake 阶段就把「静态站做不到的」（站内搜索、评论、购物车、登录、UGC）列出来并给三个选项：第三方嵌入 / 该部分留在原子域 / 另立项目；
- 交付物是「你合并的 PR」，不是直接推送；
- 上线后仍能用 `npm run verify` 复跑门禁。

## 对应的研究问题

**1. 能力发现**——可整包交出去的「迁移工程」：不止生成页面，还包括抓取建档、模板抽象、媒体与重定向保真、逐像素设计复核、上线审计与提案。README 明说默认构建是「连故障一起复现」（faults included），修复只作为待批准的提案——这是把「忠实复制」与「改进」分开的能力边界设定。

**2. 任务匹配**——分工是可照抄的范式：要求精确的（抓取、路径、重定向、校验）交给普通 Node 脚本；需要判断与修补的（模板抽象、CSS 裁剪、异常处理、提案）交给智能体；视觉验收交给截图 + 像素 diff + computed-style 双检。技能对智能体只提「能跑 shell」这一硬要求，有自带浏览器/子智能体则用上，没有也能降级跑完。

**3. 条件供给**——需要提供：确定的 Node 版本、git/gh 登录、托管账号、Playwright Chromium、macOS/Linux 环境（preflight 逐项检查）；对目标站只需只读访问，**不需要 admin 登录、插件或数据库导出**；一轮 Intake 答复（repo 位置、托管商、表单 endpoint）与一句 `defaults`；以及一份把「不做什么」写死的拒绝清单——边界越清楚，越不需要人盯。

**4. 主动推进**——触发是「粘一句提示词」，之后由阶段状态机推进：每阶段有产出物、有门禁证明完成才进下一阶段，中途不再向人提问，一路到 PR；门禁在**每次提交**上自动跑（事件触发）；上线后 `post-launch` 盯前 30 天（时间窗触发）。注意它明确不碰 DNS、不自行合并，主动推进止于「可审的 PR」。

**5. 效果验证**——双层：① 过程门禁（十类，逐次提交对照 baseline）；② 结果校验（三宽度像素 diff + computed-style，随后全站 390/1440 复查；staging 上的 `launch-audit`；上线后 `npm run verify` 仍可复跑）。再加一份 `docs/suggestions.md` 把「发现但未修」的问题带证据单列，避免悄悄改动。

## 与已有做法的关系

清单中相关条目：**Claude Code**（tool，adopt）、**Agent skills**（concept，adopt）。该仓库是 Agent Skills 的一个生产级实例：既通过 Claude Code 插件市场分发（`/plugin marketplace add` + `/plugin install`），也以 `SKILL.md` 形式供 Codex 等任意兼容智能体读取；它把「技能」从单点能力扩展到一条带门禁的流水线，可作为「Agent skills」这一概念的具体落地样本。除此之外清单中没有其他相关条目。

## 证据与局限

**原文给出的数据/案例**：45 个 WordPress 站点在套件上完成转换（intake 到 PR），平均耗时 83 分钟；45/45 通过三个宽度的像素一致性复核；Google PageSpeed 移动端 74→98、桌面端 87→99。三个公开 demo 各给了 Astro 构建的 Vercel 链接与前后对比图：sxsw.com（WordPress VIP、区块主题、71 页）、harvard.edu（WordPress 多站点、457 页）、angrybirds.com（WP Engine、388 页、媒体放 Vercel Blob）。

**仅是作者主张、未独立验证**：上述平均数与通过率、PageSpeed 提升幅度，均来自 README 的 `docs/examples/results.png` 与文字描述；demo 站是否确由该套件按其发布版本生成，材料里无法核实。抓取到的内容只有 README，门禁的具体实现、各脚本、`docs/process.md`/`docs/platforms.md`/`docs/faq.md` 都不在材料内，因此「步骤级可照做」只到命令与阶段这一层，页面级转换细节无法据此复现。

**适用条件**：站点是内容型、可通过 HTTP 只读拿到（WordPress 最佳）；静态化后不能有站内搜索、评论、购物车、登录、UGC——这些会在 Intake 被判为 out of scope 并给替代方案；需要 macOS/Linux（不支持 Windows）；需要 Node 22/24（拒绝 EOL 的 Node 20）；一次只跑一个站；Playwright 与托管账号自备；默认构建复现线上问题，修不修由你批。

**风险提示**：像素一致 ≠ 功能一致；第三方脚本、表单 endpoint、重定向规则（含 `www`、尾斜杠）依赖托管商配置，需在 staging 实测；媒体若迁到 Blob/R2，URL 保持但存储与缓存策略变了。

## 怎么试、怎么验证

**最小试用**：选一个**低流量站点或 20–50 页的子目录/子站**，先把 `preflight.mjs` 跑通；用第 2 步那句提示词发起，Intake 回 `defaults`（表单先指向测试 endpoint），**明确不许碰 DNS**；让它跑到 PR + noindex staging 就停，不上线。全程记录耗时与人工介入次数。

**判断有没有改善（指标与门槛）**
- **门禁通过率**：最终提交上十类门禁全部通过；例外必须逐条列出并由人签字，任何未解释的失败即未达标。
- **重定向覆盖**：抽样 30 条旧 URL（含 `?p=` 短链、`www`、尾斜杠变体），全部落到同内容页；覆盖率不到 100% 不上线。
- **SEO 保真**：抽 20 页比对 title / description / canonical / 结构化数据，差异数应为 0。
- **媒体保真**：抽样包含 WordPress 尺寸变体在内的图片 URL，内容（或字节/尺寸）与旧站一致。
- **视觉**：每模板 × 390/768/1440 出三联 contact sheet，未通过的配对必须为 0 才允许进入全站扫描；全站 390/1440 再复查一遍。
- **人工成本**：从「拿到 PR」到「可合并」的人工小时数，与自建迁移或上一次迁移对比（判断是否真的改善了工作方式，这是最直接的指标）。
- **上线后 30 天**：404 率、自然搜索点击/展现对比上线前、PageSpeed 移动/桌面前后对比；对照 `docs/suggestions.md` 确认没有未经批准的改动。
- **骨架验证**：把第 6 条骨架（预检/冻结基线/门禁/拒绝清单/只出 PR/留 verify）套到你自己一个更小的重复性任务（如月度报表、文档批量转换），看能否同样把「人盯」换成「门禁放行」——这是本项目更该带走的那一层。

**止损**：若门禁无法收敛到 0 例外、或重定向抽样不达标、或视觉卡在同一模板反复不过，就不要上线，结论降为「思路值得研读」，只取骨架不取成品。
