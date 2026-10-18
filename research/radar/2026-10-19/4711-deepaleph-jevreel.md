# DeepAleph/jevreel

- 结论：**值得一试**。照 README 的 Quickstart 在一段本地短视频上跑通 index→ask→zoom，并以 MCP/插件形式接到 Claude Code 或 Codex 试做视频检索；它给的是完整可复制的安装、配置与 lens 用法，值得小范围试，但底层 Jev 图像能力仍是实验性、验证只基于单个测试视频，不建议直接全量采用。
- 原文：https://github.com/DeepAleph/jevreel
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-18T16:09:45.117Z

## 是什么

jevreel 是一个「零嵌入（zero-embedding）」的视频理解工具，通过 MCP server + skill + CLI + Python API 提供能力：

- 把视频按 1 fps 抽帧，60 帧拼成一张带标签（`T01`、`T02`…）的 1568px contact sheet，一分钟一张。
- 对每张 sheet 并行调用 TypeSafe 的决策模型 Jev，让模型做**类型化回答**：`noul`（是/否 + 发生在第几秒）、`choice`（在你给的选项中选一个）、`score`（在你给的等级上打分）。
- 排名靠前的窗口再用全分辨率帧逐 0.5 秒复核（verify），返回「时间、概率、帧、附近台词」。
- 返回结果给 agent（Claude Code、Codex、Cursor、Claude Desktop 等任何支持 MCP 的客户端），由 agent 自己 `zoom` / `locate` / 进一步阅读并报时间点。

全程不计算、不存储任何向量。附带 lens 机制：把你自己的类型化问题加到每一分钟上，形成一条可反复过滤、过滤不再产生请求的时间线。

## 具体做法（编号步骤）

前提：Python 3.11+、FFmpeg 在 PATH 上、一个 TypeSafe API key（<https://console.typesafe.ai>）。

**1. 安装 CLI 并配置 key**（`[all]` 额外带来 URL 支持 yt-dlp 与本地语音转写 faster-whisper）

```bash
uv tool install "jevreel[all]"
export TYPESAFE_API_KEY=...
```

**2. 索引视频、提问、放大看**

```bash
jevreel index talk.mp4                       # prints the video id
jevreel ask talk "a slide with a bar chart"  # id, id prefix, path or title all work
jevreel zoom talk 12:00 12:10                # full-resolution frames to look at
```

**3. 用 lens 把自己的问题挂到每一分钟上**（写一个 TOML，问题类型可为 `noul` / `choice` / `score`）

```toml
# examples/lenses/driving.toml
name = "driving"

[[questions]]
name = "on_bridge"
type = "noul"
ask = "Is the car driving on a bridge?"

[[questions]]
name = "weather"
type = "choice"
ask = "What is the weather mostly like?"
options = ["clear", "cloudy", "rain", "snow", "fog"]

[[questions]]
name = "traffic"
type = "score"
ask = "How much other traffic is on the road?"
levels = ["None", "Light", "Moderate", "Heavy"]
```

```bash
jevreel index drive.mp4 --lens driving.toml     # rides in the indexing requests: almost free
jevreel lens drive driving.toml                 # or run it later: one request per minute of video
jevreel query drive "on_bridge > 0.7"           # filter as often as you like: no requests
jevreel query drive "weather == snow and traffic >= 2"
```

**4. 接到 agent（三种方式二选一）**

作为插件（需要 uv 与 FFmpeg 在 PATH；本地语音转写默认不含，需要的话按「By hand」用 `jevreel[all]` 手动添加）：

```bash
claude plugin marketplace add DeepAleph/jevreel
claude plugin install jevreel@jevreel
```

```bash
uvx --from "jevreel[url]==0.2.0" jevreel login
codex plugin marketplace add DeepAleph/jevreel
codex plugin add jevreel@jevreel
```

手动添加 MCP server：

```bash
claude mcp add jevreel -e TYPESAFE_API_KEY=your-key -- uvx --from "jevreel[all]" jevreel mcp
```

```bash
codex mcp add jevreel --env TYPESAFE_API_KEY=your-key -- uvx --from "jevreel[all]" jevreel mcp
```

Claude Desktop / Cursor / 其他 `mcpServers` 客户端（VS Code 用同样的条目，放在 `"servers"` 下并加 `"type": "stdio"`）：

```json
{
  "mcpServers": {
    "jevreel": {
      "command": "uvx",
      "args": ["--from", "jevreel[all]", "jevreel", "mcp"],
      "env": { "TYPESAFE_API_KEY": "your-key" }
    }
  }
}
```

装 skill（Claude Code、Codex 等读 Agent Skills 的 agent；没有 MCP 的 agent 也可以只用 skill + CLI，每个命令都输出 JSON）：

```bash
npx skills add DeepAleph/jevreel
```

**5. 或用 Python API**

```python
import asyncio

from jevreel import Reel


async def main() -> None:
    async with Reel() as reel:
        video = await reel.index("talk.mp4")
        result = await reel.ask(video.id, "a slide with a bar chart")
        for hit in result.hits:
            print(hit.time, hit.probability, hit.frame)
        print(reel.query(video.id, "text_on_screen > 0.8").rows)


asyncio.run(main())
```

**6. 按需调配置**（环境变量）

| 变量 | 默认 | 含义 |
| - | - | - |
| `TYPESAFE_API_KEY` | Jev 必需 | 无它时，不带时间线的索引、zoom、字幕和 query 仍可用 |
| `JEVREEL_HOME` | 用户缓存目录 | 索引、sheet、帧和答案缓存的存放位置，`jevreel home` 打印 |
| `JEVREEL_MODEL` | `jev-1.14.0` | 故意锁定：Box 和图像 tile 需要 1.14，别名会漂移 |
| `JEVREEL_FPS` | `1` | 抽帧频率（最高 5） |
| `JEVREEL_TILES_PER_SHEET` | `60` | 每张 sheet 的帧数；更少＝更大的 tile 和更多请求 |
| `JEVREEL_VERIFY_TOP` | `6` | 每次 ask 在全帧上复核的窗口数；`0` 关闭验证 |
| `JEVREEL_CACHE` | `1` | 设为 `0` 则每次都重新问 Jev |
| `JEVREEL_CONCURRENCY` | `16` | 并行 Jev 请求数，速率限制按 TypeSafe 账号计 |
| `JEVREEL_ASR_MODEL` | `small` | 无字幕视频用的 faster-whisper 模型 |
| `JEVREEL_CAPTION_LANGUAGES` | `en,en-orig,en.*` | URL 抓字幕的语言顺序 |

**7. 成本自测**：`jevreel measure <video>` 报告某个网格尺寸下一张 contact sheet 在你账号上的成本。

**8. 内置工作流**（README 的四步流程，可按此顺序用工具）：Index（1 fps 抽帧 + 固定问题集 + lens，得到类型化时间线）→ Screen（每张 sheet 一次请求：noul 判「在这一分钟内吗」+ choice 选「第几秒」）→ Verify（按排名而非阈值取 top 窗口，在全帧上每半秒做一次 yes/no）→ Look closer（`zoom` 看全分辨率帧、`locate` 框选并裁剪、`whole` 对整个视频问一个问题）。

MCP 工具与 CLI 对照：`index_video`/`index`、`ask_video`/`ask`（`mode`: visual、speech、both）、`find_in_video`/`find`、`locate_in_frame`/`locate`、`zoom_video`/`zoom`、`video_transcript`/`transcript`、`ask_whole_video`/`whole`、`run_lens`/`lens`、`query_timeline`/`query`、`list_videos`/`list`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：原文给出的、通常不会想到交给 AI 的视频类工作包括——在一段 12 分钟的片子里找一个 3 秒的瞬间（有人喝果汁盒）；按台词定位「Thom 何时向 Celia 道歉、说了什么」；读出画面里的报纸标题；用一张参考照片找出该角色出现的**每一个**场景；把整部片按自己定义的 4 个问题「绘制地图」。这些能力此前通常要靠人工逐帧回看。

**2. 任务匹配**：README 明确给出的匹配逻辑是——便宜且快的决策模型做粗筛（每张 sheet 一次请求、并行），昂贵的模型只看通过了筛选的少数窗口（全分辨率帧）；答案带概率，代码可以**阈值、排序、门控**（`query "on_bridge > 0.7"`）；embedding 适合对一个大库反复查询（向量建好后每次搜索零成本），jevreel 适合「定位、验证、描述某一刻」，二者组合方式是 embeddings 先缩范围、jevreel 去找到并描述。lens 因为随索引请求一起走，几乎免费。

**3. 条件供给**：需要 TypeSafe API key、FFmpeg、Python 3.11+（插件方式还需要 uv）；需要视频本身为本地文件或 URL（`[all]` 装 yt-dlp），或视频旁放好 `.srt`/`.vtt` 字幕，否则用本地 faster-whisper 转写；需要把想问的问题写成 lens 的 TOML（noul/choice/score 三类）；需要给 agent 的反馈入口是 MCP 工具返回的「时间、概率、帧、附近台词」，agent 再自己 `zoom`/`locate` 复核。

**4. 主动推进**：`index_video` 作为 MCP 后台任务运行；重复调用会返回已有索引，只补跑新增的 lens；答案有缓存（同样的图片和问题问同一个模型不会重复付费，重复的 ask 为 0 请求 0 成本）；lens 可以在索引时随车跑，也可以事后单独跑（每分钟一次请求）；`query_timeline` 过滤不产生任何请求，可以反复过滤。这些是「索引一次、后续零成本复用」的部分，但原文没有给出定时器/事件触发的具体机制。

**5. 效果验证**：提供了 `jevreel measure <video>` 量成本；提供了成本表（10 分钟 1080p 视频，单张 sheet 约 $0.00025、索引 $0.0033、一次 ask $0.004–0.005、重复 ask $0、locate $0.0002、whole $0.0003，一小时视频一个问题约 $0.02–0.03）；提供了「对照帧人工核对」的评估方式——在 10 分钟 1080p 无语音游戏录像上逐条对照帧检查命中；并给出一个可量化的验证价值证据：三个不到一秒的暂停菜单出现，仅 screening 得分 0.36/0.50/0.95，「验证前三个里有两个被漏掉」，验证后被全部捞回。

## 与已有做法的关系

清单条目：

- **Claude Code（adopt）**：jevreel 直接提供 Claude Code 的插件安装（`claude plugin marketplace add` / `claude plugin install`）和 `claude mcp add` 手动接入，并在启用插件时向 Claude Code 索取 TypeSafe API key 存入系统凭据库。
- **Cursor（watch）**：README 把 Cursor 列为 `mcpServers` 客户端之一，给出同样的 JSON 配置条目（未给出 Cursor 专属设置说明）。
- **Agent skills（adopt）**：README 把「skill」作为一等交付物，教 agent 工作流——先问、任何结论前先看、报时间点；并给出 `npx skills add DeepAleph/jevreel`。

即：它不是在替代这些已有条目，而是挂在它们之上给 agent 补一层视频检索/验证能力。

## 证据与局限

**原文给出的数据与案例**（均为作者自述与自测）：

- 演示：Blender 开放电影《Tears of Steel》（12:14）上 5 个未剪辑的 Claude Code 会话。例 1：13 张 sheet 筛出、6 个窗口全帧复核、保留 2 个（2:28.5 p 0.95；12:06.5 p 0.86），19 次请求 $0.0054。例 4：按照片搜索，8 个时刻有 6 个在 0.86–0.97 被验证，另外 2 个由 agent 用 `zoom` 确认，19 次请求 $0.0064。例 2 用 speech 模式只花 10 次请求 $0.0003。
- 10 分钟 1080p 成本表（2026-10-15 测，`jev-1.14.0`，$0.042/百万输入 token；TypeSafe 尚未文档化图像 token 计数，这些数字是 API 实际报告的）。
- 一个 10 分钟 1080p、无语音的游戏录像上逐帧人工核对的查询结果：三个不到一秒的暂停菜单全部命中（0:08.5、2:19.5、10:12.5，p 0.99–1.00）；全屏城市地图 0:10 与 2:21 无假阳性；钢桁架桥 2:07 与 5:05.5；lens `driving` 的 `on_bridge > 0.7` 精确命中桥梁那两分钟；`locate` 在 5:02 框出的字幕裁切后读作 "Fathers Bridge"；`whole` 回答「这视频主要是什么」得到 "a driving sequence in a video game"，0.98。
- 实测限制：Jev 真实图像最小边是 280 px（文档说 256，API 拒绝小于 280），jevreel 自己给每张图做 padding。

**属于作者主张而非验证的部分**：为什么用决策模型而非 embedding 的五条对比（「你的问题而非固定的相似」「每一秒都便宜」「问题几乎免费所以多问」「贵模型只看到通过筛选的」「类型化答案而非排序」）；「lens 随索引请求走，几乎免费」的结论；阈值 0.5 报告 / 0.7 强信号是沿用 TypeSafe 的示例值。

**适用条件与局限**：

- 快速事件依赖 screening 先排到窗口：验证只在 top-ranked 窗口（默认 6 个）内每半秒看一次，screening 排在 6 名之外的事不会被检查；要靠调高 `JEVREEL_VERIFY_TOP` 或调低 `JEVREEL_TILES_PER_SHEET`（更大的 tile）缓解。
- 除语音外没有音频信息：音频只以转写文本的形式到达 Jev。
- Jev 的图像支持是实验性的：TypeSafe 自称图像和 Box 是 "dreamer-ready" 而非 production-ready，限度和准确率可能在版本间变化；`JEVREEL_MODEL` 因此被故意锁死在 `jev-1.14.0`。
- 阈值需要在你的素材上调：0.5 / 0.7 只在作者的一个测试视频上成立。
- 评估样本极小：量化核对只基于一个 10 分钟视频（加演示片），不能外推到任意题材与画质。
- 依赖第三方付费 API 与账号级速率限制（并发默认 16，速率限制按 TypeSafe 账号计）。

## 怎么试、怎么验证

**最小试用（半天内可完成）**：

1. 准备一段 10 分钟左右的本地视频（最好是你本来就要逐帧回看的素材）和一个**可人工核对的标准答案**问题，例如「某物体/某字幕在哪一秒出现」。
2. 装好 Python 3.11+、FFmpeg、`uv`，`uv tool install "jevreel[all]"`，设置 `TYPESAFE_API_KEY`。
3. `jevreel index <video>`，记下 video id；先 `jevreel measure <video>` 看自己账号下的单张 sheet 成本。
4. `jevreel ask <id> "<你的问题>"`，把返回的每个 `time / probability / frame` 与你自己快进核对的结果对比。
5. 再跑一次同样的 `ask`，确认是 0 请求 0 成本（缓存生效）；把这次的问题写成 lens `.toml`，用 `jevreel lens` + `jevreel query "字段 > 0.7"` 试「索引一次、无限过滤」的用法。
6. 接到 agent：`claude mcp add jevreel -e TYPESAFE_API_KEY=... -- uvx --from "jevreel[all]" jevreel mcp`，加 `npx skills add DeepAleph/jevreel`，让 agent 自己走「ask → 看 → 报时间点」。

**判断有没有改善的指标**：

- **命中率**：返回的 top hits 里，人工核对为真的比例（precision）。
- **漏检率/召回**：尤其针对**短于 1 秒**的事件——这类事件在原文里正是「验证前会漏、验证后能捞回」的关键场景，可专门造几个这类问题测 `JEVREEL_VERIFY_TOP=0` 与默认 6 的差别。
- **成本与延迟**：每次 ask 的请求数与金额，以及整段视频问题折算下来是否落在原文给出的约 $0.02–0.03/小时量级；索引 10 分钟视频是否在十几秒量级。
- **复用是否零成本**：重复 ask、`query` 过滤是否确实不产生请求。
- **与人工基线比**：定位同一时刻，人工逐帧回看所需的分钟数 vs 该工具到出结果的时间，以及时间点误差是否小到可以直接剪辑/引用（原文的演示精确到 0.5 秒）。
- **阈值是否可迁移**：把你自己的素材上 0.5 / 0.7 两档的 precision 记下来，决定是否需要重新定档；如果怎么调都不稳，就只把它当「候选窗口生成器」，后面接人工复核。
