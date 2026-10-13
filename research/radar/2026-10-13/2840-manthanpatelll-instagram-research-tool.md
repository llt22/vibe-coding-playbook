# manthanpatelll/instagram-research-tool

- 结论：**值得一试**。可以小范围试：它给出了可照做的完整流程（clone、`/research-setup` 向导、日常斜杠命令、`config.json`/`niche.json`、cron/launchd 定时），把「Claude Code + 外部数据源 + skill + inbox + 每日雷达」这套可迁移模式落到具体配置；但依赖付费数据源、效果数据缺失、截图是合成样本，先小范围验证再决定是否写进手册。
- 原文：https://github.com/manthanpatelll/instagram-research-tool
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T02:12:08.529Z

## 是什么

一个基于 Claude Code 的 Instagram 内容调研工具包（MIT，npm 零依赖，Node 18+）。核心是把任意 reel 交给 Claude Code，自动产出：完整带时间戳的 transcript、hook 及其为何有效、格式（含每秒剪辑数等节奏信息）、角度、真实数据（播放/点赞/评论/互动率/outlier score）、逐帧视觉拆解、最可能停住拇指的 2–5 个「scroll stoppers」，以及用你自己声音写的「My version」。另有一个每日 outlier 雷达：按 `niche.json` 跑约 70 次搜索，筛出过去 24 小时内表现超常的 reel 并排名，附 top 10 讲解和一个选题角度。

关键设计是职责分离：数据源只负责取原始事实（数字、caption、视频），**所有分析由 Claude Code 自己做**，因此换数据源不影响拆解质量。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：需要 Claude Code；Node.js 18+（无需 `npm install`）；至少一个数据源（Sandcastles MCP / Apify / yt-dlp / 任意自带源）。ffmpeg（逐帧拆解）、Whisper（无字幕时转写）、iPhone（分享按钮）均为可选。

1. **克隆并启动**

```bash
git clone https://github.com/manthanpatelll/instagram-research-tool.git
cd instagram-research-tool
claude
```

2. **在 Claude Code 内跑首次设置向导**（约 10 分钟，逐个提问）

```
/research-setup
```

向导会依次：选择并连接数据源 → 询问你的 niche 并生成每日搜索查询（写入 `niche.json`）→ 让你提供三条自己的 caption 以学习你的语气（写入 `voice.md`）→ 引导 iPhone 分享按钮 → 跑自检。

3. **先不配置、看合成样本**（可选，验证环境）

```bash
npm run library          # opens the reel library with a sample breakdown
npm run sample-report    # opens a sample outlier report
npm run selftest         # checks everything works, exit 0 = pass
```

4. **日常使用流程**

| 时机 | 做什么 | 得到什么 |
|---|---|---|
| 刷内容时 | 在 reel 上 Share > **Save to Research** | 链接存入 inbox |
| 早上 | `/outliers` | 打开当日 outlier 报告，并在对话里解释 top 10 |
| 早上 | `/reel-research inbox` | 拆解所有已保存 reel 并加入库 |
| 任意时间 | `/reel-research <reel link>` | 当场拆解单条 reel |
| 拍摄前 | 打开 `out/library.html`，选一个选题，从 "My version" 开始 | 一份用你语气写的草稿 |

5. **可选：让早上的部分自动运行**（详见 `docs/iphone-shortcut.md`，含 cron 与 launchd 示例）：

```
claude -p "/reel-research inbox"
claude -p "/outliers"
```

6. **按需改配置**（`config.json`）：

| 字段 | 默认 | 作用 |
|---|---|---|
| `provider` | `sandcastles` | 单 reel 数据源：`sandcastles`/`apify`/`ytdlp`/`any` |
| `searchProvider` | `sandcastles` | 每日搜索数据源：`sandcastles` 或 `apify` |
| `inboxPath` | `~/Library/Mobile Documents/com~apple~CloudDocs/Reel Research/inbox.txt` | iPhone 快捷指令文件在 Mac 上的同步位置 |
| `windowHours` | `24` | outlier 时间窗 |
| `maxWindowHours` | `48` | 上限；仅当合格 reel 少于 15 条时才放宽，且不超过此值 |
| `minViews` | `2000` | 低于此播放量的 reel 不进报告 |
| `transcription` | `auto` | 有源字幕用源字幕，否则用本地 Whisper |
| `myHandle` | `""` | 你的 Instagram handle（可选） |

`niche.json` 按簇保存搜索查询（示例是 AI / Claude Code niche），`/research-setup` 会按你的 niche 重写，也可手改——**按创作者实际写 caption 的方式写查询**。

7. **数据源选择与成本**（在 `config.json` 切换）：Sandcastles（MCP，付费计划起 $49/月，搜索免费、每条新 reel 分析 1 credit，覆盖 IG/TikTok/YouTube Shorts）；Apify（按结果付费，每月 $5 免费额度，每条 reel 不到 1 美分，一次完整每日搜索约 $1.70，覆盖 IG，每日搜索按 hashtag、按每小时播放量排名、无 outlier score）；yt-dlp（免费开源，仅单条公开链接，需本地 Whisper 转写，IG 通常无播放量且可能被拦截，无每日搜索）；任意源（自带视频文件、导出或粘贴的数字）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：把「刷到的 reel」这种非结构化视频交给 AI，产出 transcript、hook 拆解、逐帧视觉分析和「为什么停住滚动」，是很多人没想到交给 AI 的工作。逐帧拆解靠 `frames.mjs` 用 ffmpeg 切联系表（contact sheets）后让 Claude 逐帧看。
- **任务匹配**：明确的分工范式——数据源只取原始事实，**分析全部由 Claude Code 完成**，所以换数据源不改变拆解结果。工具以 Claude Code skill 形式组织（`.claude/skills/reel-research`、`outliers`、`research-setup`），用斜杠命令触发。
- **条件供给**：需要供给 `config.json`（数据源与运行参数）、`niche.json`（搜索查询簇）、`voice.md`（语气，用于每次重写）、`inbox.txt`（分享进来的链接）、数据源凭证（Apify token 放在 `.env`，不提交）；可选供给 ffmpeg、Whisper、iPhone 快捷指令。文档强调「数字缺失就留空，工具从不编造数字」。
- **主动推进**：`/outliers` 是典型的每日状态触发任务；README 给出 cron 和 launchd 示例，用 `claude -p "/reel-research inbox"` 和 `claude -p "/outliers"` 无人值守运行。outlier 逻辑本身也是事件/状态驱动：24 小时窗口（合格 reel 少于 15 条时才放宽到 48 小时）、`minViews` 阈值、去重合并、按主题打标、可疑触达标记、按 outlier score 排名。
- **效果验证**：`npm run selftest` 做离线检查（exit 0 = pass）；每条 reel 产出互动率、outlier score 等指标；但 README 没有给出「使用后工作效果改善」的实测数据（见「证据与局限」）。

## 与已有做法的关系

清单中已有 **Claude Code（adopt）**。本工具是建立在它之上的一个具体 skill 套装：把「外部数据源接入 + 拆解流水线 + 每日雷达 + inbox + 语音供给」组装成可运行项目，可作为把 Claude Code 用于内容/媒体分析场景的参考实现。除此之外清单中没有其他相关条目。

## 证据与局限

- **给出的具体事实**：约 70 次每日搜索；outlier 窗口默认 24 小时、上限 48 小时、合格数少于 15 条才放宽；最低播放量阈值 2000；成本数据（Sandcastles 起 $49/月、Apify 每条 <1 美分、完整每日搜索约 $1.70、每月 $5 免费额度、yt-dlp 免费）；完整的目录结构、脚本清单、`config.json` 字段表、数据源能力对照表。
- **作者主张而非实测**：所有功能描述、"the breakdown is the same whichever one you pick"、"about 10 minutes" 的设置时长等，均为 README 陈述，未附独立验证。
- **缺少效果数据**：README 的截图明确标注 "Screenshots use synthetic sample data"（合成样本）；没有真实使用前后的对比、省时数据或产出质量评估。仓库仅 31 stars，且 README 大量引导加入作者的付费社区（AI Inner Circle）。
- **只依据 README**：未看到代码实现，无法确认脚本、skill 提示词与文档一致。
- **适用条件**：面向有 reel 的内容创作/媒体分析场景；需要付费数据源才有完整体验（免费路线 yt-dlp 只有单条、IG 常无播放量且可能被拦截）；Apify actor 在本工具中仅支持 Instagram（TikTok/Shorts 靠 Sandcastles 或 yt-dlp 单条）；macOS/Linux 可用，iPhone/Mac 只对分享按钮必需。
- **合规与原创**：工具声明从不登录 Instagram、不用 cookies/session、不用你的账号抓取；下载视频仅本地分析、不得重发；"My version" 不复用原作者句子（保存前会检查抄袭短语）。

## 怎么试、怎么验证

**最小试用方式**

1. 先不花钱：跑 `npm run selftest` 确认环境（期望 exit 0），再看 `npm run library`、`npm run sample-report` 里的合成样本，判断产出结构是否合用。
2. 用免费路线验证单条流水线：装 yt-dlp（+ `ffmpeg`、可选 `pipx install openai-whisper`），对一个公开 reel 跑 `/reel-research <link>`，检查是否产出 README 列出的八个板块（Numbers/Transcript/Hook/Format/Angle/Visual breakdown/Scroll stoppers/My version），并确认缺失的数字留空而非编造。
3. 想要每日雷达再上 Apify：用每月 $5 免费额度，把 `provider`/`searchProvider` 设为 `apify`，跑一次 `/outliers`，核对报告筛选是否遵循 24h/2000 播放/去重/排名规则。
4. 迁移验证：把同一套「数据源只取数 + Claude Code 分析 + 定时命令」结构换到你的领域（例如把 niche 换成你的关键词），看骨架是否仍成立。

**判断有没有改善的指标**

- 工程层面：`selftest` 是否 exit 0；单条 reel 拆解字段完整率（哪些字段因数据源缺失而为空）；`/outliers` 报告能否稳定生成、筛选规则是否可复现。
- 效率层面（需自测，原文未给）：对照 baseline——手工拆解一条 reel 需要多久、产出哪些字段，用工具后耗时和字段覆盖的变化。
- 结果层面（需自测）：拆解产出的「My version」是否真被用于实际创作、从选题到出稿的周期是否缩短、产出内容的互动数据是否变化。
- 成本层面：一次每日搜索的实际花费与每月额度消耗，是否落在可接受范围。
