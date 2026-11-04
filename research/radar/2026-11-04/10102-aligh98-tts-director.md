# aligh98/tts-director

- 结论：**值得一试**。建议小范围试：在一条准备送入 TTS 的脚本上按 README 安装 skill，先跑免费 lint 和 dry-run A/B，再决定是否用于完整配音；它有可执行脚本和明确标签预算，但证据主要来自作者自测且绑定 ElevenLabs。
- 原文：https://github.com/aligh98/tts-director
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-04T01:21:47.930Z

## 是什么

tts-director 是给能读取 `SKILL.md` 的 AI agent 用的「TTS 导演」技能/仓库，重点是在文稿送进 TTS 前做重写和标注，而不是替代 TTS 引擎。它先为视频/口播画节拍图，再把文稿改写成适合听的短句，给 ElevenLabs v3/v4 音频标签设预算，并提供免费 lint、语音速率校准、固定 seed 的 A/B 生成与转写核验脚本。支持 Claude Code，Python 3.9+，无依赖，ffmpeg 可选；波斯语优先、支持英语，其他 TTS 服务只有指南。原文主要是波斯语 README。

## 具体做法

1. 前提：准备 Python 3.9+、Claude Code 或其他能读取 `SKILL.md` 的 agent；真实 A/B 还需要 `ELEVENLABS_API_KEY`、voice ID 和可用额度，`ffmpeg` 可选。
2. 安装为 Claude Code 个人技能：

```bash
git clone https://github.com/aligh98/tts-director ~/.claude/skills/tts-director
```

也可以克隆到项目的 `.claude/skills/` 下。README 说当文本要进 TTS，或要求声音更有人味、更有能量时，技能会自动激活。
3. 先画节拍图：在重写前逐行标出每句话的角色，例如 hook、引入、列表项、金句、笑话、行动号召。这一步是 README 的流程要求；原文没有给出可直接复制的提示词模板。
4. 按「给耳朵写」重写：改成口语化、短句，把关键词放到句尾，加入真实口语填充词（如「وای」「ببین」「دیگه」），但不改变原文事实。同时控制标签预算：约每 3–4 句一个标签；每条 reel 0–2 次笑，只在真人会笑的地方；每 8–12 秒做一次语气变化，例如耳语、叹气或停顿。标签即使正文是波斯语也用英文写。不要写文本「هاها」，改用 `[laughs]` 或 `[chuckles]`。v3/v4 不识别 `<break>`，改用 `...`。
5. 先跑免费 linter，不消耗 TTS 额度：

```bash
python scripts/tag_lint.py examples/reel-fa.txt --model eleven_v4 --tempo 1.15
```

它检查过度打标签、笑声过多或过近、文本「هاها」、视频开头说「سلام」，以及模型特有问题，例如 v4 上的 SSML，或在不支持标签的模型上使用标签。
6. 用一条已完成录音校准自己声音的真实语速：

```bash
python scripts/tag_lint.py script.txt --calibrate voice.mp3
```

7. 处理模型差异：`eleven_v4` 会忽略速度与 style 设置，只对 stability 有反应；速度可在生成后用 ffmpeg 调整：

```bash
ffmpeg -af atempo=1.1
```

README 称该方式不改变音高。`multilingual_v2`、flash、turbo 会把标签大声读出来。
8. 对敏感句子先做 A/B。先 dry-run 看成本，不发送请求：

```bash
python scripts/ab.py "[excited] وای! فقط تا جمعه وقت داری!" "وای... فقط تا جمعه وقت داری!" --stability 0.35 --stability 0.5 --out probe --dry-run
```

确认成本后再真实生成并转写每个版本（会消耗 ElevenLabs 额度）：

```bash
export ELEVENLABS_API_KEY=...
python scripts/ab.py "[excited] وای! فقط تا جمعه وقت داری!" --voice YOUR_VOICE_ID --lang fa --en-check --out probe
```

README 说所有版本用同一 seed，便于公平比较；`--prev`、`--next` 把前后文作为上下文，`--lexicon words.tsv` 用「书写<TAB>口语」文件修正专名和外语词发音，`--en-check` 额外用英文转写以发现被读出的英文标签。
9. 转写核验：每个片段转成文本，确认哪个标签被大声读出、哪个笑声真的执行。但转写只能证明笑声执行了；声音是否真的兴奋，只能靠人耳判断。
10. 跑离线测试：

```bash
python -m unittest discover tests
```

## 对应的研究问题

- 能力发现：AI 可在 TTS 前做节拍图、口语化重写、标签预算、免费 lint、模型特有问题检查、A/B 生成与转写核验。
- 任务匹配：适合 Claude Code 或读取 `SKILL.md` 的 agent；重点匹配 ElevenLabs v3/v4，其他 TTS 服务只有指南。v4 上不要依赖速度和 style，只有 stability 有效；对会把标签读出来的模型，不应直接套用标签方案。
- 条件供给：需要 Python 3.9+、安装好的 skill 和待处理脚本；真实 A/B 需要 API key、voice ID、额度；可用 `--prev/--next` 提供上下文，用 `--lexicon` 提供发音表；反馈来自 lint、转写结果和人耳听感。
- 主动推进：README 只说明技能会在文本要进 TTS 或要求更有人味/更有能量时自动激活；没有描述按时间、事件或状态持续触发的工作流。
- 效果验证：免费 lint 可查标签密度和模型错误；A/B 用固定 seed 比较版本，dry-run 先看成本，转写确认标签是否被读出、笑声是否执行；兴奋度仍需人耳判断；`--calibrate` 可用一条成品录音校准语速。

## 与已有做法的关系

清单中只有 Claude Code（tool，adopt）。tts-director 是可安装到 Claude Code 的 skill，也可被其他读取 `SKILL.md` 的 agent 使用，因此是对 Claude Code 的扩展；除 Claude Code 外，清单中没有相关条目。

## 证据与局限

README 给出了安装命令、脚本命令、参数和离线测试命令，属于可照做的材料。作者给出的试验证据包括：`eleven_v4` 在速度 0.8 和 1.2 下生成长度几乎一样（6.32 秒和 6.40 秒）；`multilingual_v2`、flash、turbo 会把标签读出来；v3/v4 不识别 `<break>`；文本「هاها」会被逐字读出；转写只能证明笑声执行，不能证明情绪。

但「像真人、更有能量」主要是作者主张，没有独立评测；仓库只有约 31 stars；README 以波斯语为主，英文版内容未给出；没有可直接复制的提示词模板；效果强依赖 ElevenLabs 模型、声音、语言和人工听感，模型行为也可能变化。A/B 会消耗额度，且需要 API key。适用条件是：使用 ElevenLabs v3/v4 或按指南适配的 TTS，有 Python 环境，并接受人工听感作为最终判断。

## 怎么试、怎么验证

最小试用：选一条准备用于 TTS 的短脚本，安装 skill 或直接运行脚本；先跑 `tag_lint.py`，修掉过度标签、过近笑声、文本「هاها」、开头「سلام」和模型特有问题；如有一条成品录音，用 `--calibrate` 校准语速；再选一句敏感句，用两个版本跑 `--dry-run`，成本可接受时用固定 seed 真实生成并转写，最后人耳听是否自然、是否有能量。

判断改善的指标：lint 报告的问题数和类型是否减少；标签密度是否接近每 3–4 句一个；每条 reel 笑声是否控制在 0–2 次；语气变化是否约每 8–12 秒一次；转写是否不再出现标签被读出、笑声是否按预期执行；人耳盲听或前后对比是否认为更自然、更少「念稿感」。原文没有给出量化的结果改善指标，建议自己用通过/不通过或简单评分记录前后差异。
