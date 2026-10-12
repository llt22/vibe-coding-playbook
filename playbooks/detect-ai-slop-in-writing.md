# AI 起草后，做一道“AI 味”清单检查再交付

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 起草的稿子读着假但说不出哪里假，缺少可逐条检查、按对照改写的清单流程。
> 先试这一步：挑一篇最近由 AI 起草、你觉得“读着有点假但说不出哪里假”的稿子，贴进对话并附上 FeedHive/ai-slop-detector 的清单，要求逐条列出命中的模式并给出行号。
> 最近修订：2026-10-13

## 解决什么问题
AI 起草的稿子常有“读着有点假但说不出哪里假”的问题。FeedHive/ai-slop-detector 提供一份“AI 味写作”模式清单：120 条模式，分 9 类，每条带 Bad 例子和大白话改写方向。本文把它整理成一套可照做的流程：写前约束、写后逐条检查、按对照改写，并说明哪些场景不适用、怎么小范围验证。

## 适用与不适用
适用：
- 你或同事用 AI 起草了稿子，想抓措辞与形式上的“AI 味”。
- 你有 Claude Code（或 Codex 之类能读仓库、写文件的 agent），希望把清单装成 skill 随时调用。
- 你在聊天应用里工作，可以贴清单 + 草稿做检查。
- 你有自己的产品/工具链，想用 patterns.json 结构化数据维护清单。
- 你能接受先小范围试、自己量命中数，再决定是否长期用。

不适用：
- 不要用它判断文本是人写还是 AI 写。作者明确划了边界：它不判断作者归属，人也这么写，模型也可以被要求避开。
- 不要单条命中就判死刑。作者的口径是：一条模式在人类写作里很正常，一段里出现好几条才是 AI 味。
- 英文清单直接套中文会大批误报。清单是英文写作导向，词表、句式、LinkedIn 套路都基于英文语料；中文场景需要自己建中英映射表。
- 社媒/LinkedIn 那一类（15 条）适用面窄，写邮件、写文档的人大部分用不上。
- “内容实质”类（C-01 到 C-12）本质上要求写作者给出事实和数字，工具只能指出缺失，填不了内容。
- 原文没有任何效果数据、A/B 或前后对比；不能把它当成已验证的效果工具。
- 原文没有定时、事件或状态触发内容，也没有持续运行、后台检查或与编辑器/CI 集成机制；从材料看只能按需手动调用。

## 前置条件
- 装 skill：本机已装 Claude Code（或 Codex 之类能读仓库、写文件的 agent），且能访问 GitHub。
- 手动装：确认 `~/.claude/skills/` 是你 Claude Code 的 skills 目录，否则换成实际路径。
- 接工具链：本机有 Node。
- 浏览器版快速体检：文本不涉密、可以贴到外部网页。
- 中文写作：先准备一张中英映射表，否则先不要按英文清单直接计数。

## 操作步骤

### 做法 A：装成 agent 技能（首选）
1. 把仓库地址交给 agent，让它自己装。前提：agent 能访问 GitHub。提示词原样：
```text
Install the AI Slop Detector skill from https://github.com/FeedHive/ai-slop-detector
```
预期结果：agent 把 skill 装到你的 skills 目录，之后可以在对话里调用。

2. 或者手动装。前提：`~/.claude/skills/` 是你的实际 skills 目录。命令：
```sh
git clone https://github.com/FeedHive/ai-slop-detector.git
cp -r ai-slop-detector/skills/ai-slop-detector ~/.claude/skills/
```
预期结果：skill 出现在 Claude Code 的 skills 目录中。

### 做法 B：不装 skill，在聊天里贴清单
3. 把 README（或 skill）和草稿一起贴进对话。前提：你能拿到清单文本；草稿可以贴进对话。适用：聊天应用形态，或只想先试一次。

### 写前约束
4. 在让 AI 起草前，把清单交给它，要求“写的时候避开里面每一条模式”。前提：你已经拿到清单。预期结果：生成时少产生 AI 味，而不是事后返工。

### 写后检查（最实用的一步）
5. 把 README（或 skill）和草稿一起贴进对话，要求它逐条列出命中的模式，并给出命中所在的那一行。原文对这一步的说明是 ask for every pattern it finds, with the line it found it in——要求带行号是关键，否则模型只会给一堆泛泛评价。前提：草稿全文已提供。预期结果：得到一份带行号的命中清单。

6. 按 Bad→Better 的对照改写。清单每条都给了替换方向，规律大致三类：
- 把抽象名词换成具体数字/对象：V-04 `plays a pivotal role in growth` → `drives 40% of signups`；
- 把装饰动词换成事实陈述：V-05 `The results underscore the importance of testing` → `Testing caught three bugs before launch`；
- 把元话语（告诉读者这段多重要）整段删掉：C-08 `Surprisingly, the simple version won` → `The simple version got twice the clicks`。
前提：你已经拿到命中清单。预期结果：得到改写后的 v2。

### 只做快速体检
7. 用浏览器版：把草稿粘贴到 README 里给出的免费工具页面。前提：文本不涉密、可以贴到外部网页。预期结果：快速看命中情况，不装任何东西。

### 接进自己的工具链
8. 前提：本机有 Node。命令：
```sh
# 编辑 patterns.json（增删/改写模式）
node scripts/build.mjs   # 重新生成 README 和 skill
```
许可为 MIT，可以改、可以塞进自己的产品。预期结果：你改过的模式会重新生成到 README 和 skill。

### 中文写作的前置动作
9. 自己建一张中英映射表，例如把「深入探讨/赋能/抓手/闭环/值得注意/在当今快速变化的时代」对应到 V-01、V-07、V-15、V-20 一类。映射表也放进 `patterns.json`，用同一套 build 流程维护。前提：你做中文写作，且愿意维护映射。预期结果：中文命中数不会被英文清单的误报淹没。

### 检查用的分类总表（可直接当核对表）
10. 数字来自原文：
```text
Vocabulary                       20
Stock phrases                    15
Sentence patterns                22
Structure and rhythm             12
Imagery and metaphor              6
Substance                        12
Formatting and punctuation       10
Chatbot residue                   8
Social media and LinkedIn        15
```

### 怎么选做法
- 你有 Claude Code/Codex：优先做法 A，装成 skill。
- 你只在聊天应用里用：做法 B，贴清单 + 草稿。
- 你有自己的产品/工具链：走 patterns.json + build.mjs。
- 只想快速看一次：浏览器版。

## 怎么判断变好了
最小试用方式（半天内可完成）：
1. 挑一篇最近由 AI 起草、你觉得“读着有点假但说不出哪里假”的稿子，留一份原文做 baseline。
2. 把清单 + 原文贴进对话，要求逐条列出命中的模式并给行号，记下：命中模式总数、集中在哪几类、有没有同一段里命中多条。
3. 只改被指出来的地方（按 Better 那列的方向：换具体数字/名字/动作，或直接删掉整句），得到 v2。
4. 再跑一次同样的检查，对比命中数；同时把 baseline 和 v2 去掉标题后盲评（自己隔一天再看，或让同事二选一）：哪一版更像人写的。
5. 如果装了 Claude Code skill，可以再做一个对照：装 skill 前后各让模型写同一段内容（同一提示词），数命中模式数。

判断有没有改善的指标：
- 主指标：单位文本（如每 300 字/每段）命中的模式数，以及“同一段内命中 ≥2 条”的段数——这是原文自己给的口径，最好用。
- 次指标：改写后文本中出现具体数字、专有名词、可核实动作的句子占比。
- 主观校验：盲评“更像人写的”版本胜率；注意不要由做改写的人来当评审。
- 中文场景必须先建映射表再计数，否则命中数会被误报淹没，指标失去意义。

试多久：
- 先跑两三篇。原文没有给效果数据，只能自己量。

什么时候该停：
- 如果跑了两三篇之后发现主要命中的都是“内容实质”类（即问题其实是没写事实，不是写得像 AI），那说明这个清单对你的场景帮助有限——它擅长抓措辞与形式，补不了信息量。

## 常见坑
- 把它当“是不是 AI 写的”检测器。作者明确说它不判断作者归属。
- 单条命中就判死刑。作者说一条模式在人类写作里很正常，一段里出现好几条才是 AI 味。
- 把英文清单直接套中文。清单是英文写作导向，迁到中文需要自己重建映射，否则误报率会很高。
- 只改措辞不补事实。“内容实质”类只能指出缺失，填不了内容。
- 把作者主张当成效果证据。原文没有效果数据、A/B 或案例。
- 在写邮件、写文档时套用社媒/LinkedIn 类 15 条，大部分用不上。
- 以为它会自动持续跑。原文没有定时、事件或状态触发，也没有持续运行、后台检查或编辑器/CI 集成机制；只能按需手动调用。
- 手动安装时没确认 `~/.claude/skills/` 是实际 skills 目录。

## 证据与来源
- 做法 1-8 均来自 FeedHive/ai-slop-detector 调研报告（标题：FeedHive/ai-slop-detector）。
- 原文给出的数据与结构：120 条模式、9 个类别、各类条数（Vocabulary 20、Stock phrases 15、Sentence patterns 22、Structure and rhythm 12、Imagery and metaphor 6、Substance 12、Formatting and punctuation 10、Chatbot residue 8、Social media and LinkedIn 15）；每条模式都带一个 Bad/Better 对照例子；仓库许可 MIT；线索给出的仓库指标 34 stars。
- 安装命令来自原文：`Install the AI Slop Detector skill from https://github.com/FeedHive/ai-slop-detector`；`git clone https://github.com/FeedHive/ai-slop-detector.git`；`cp -r ai-slop-detector/skills/ai-slop-detector ~/.claude/skills/`。
- 维护命令来自原文：`node scripts/build.mjs` 重新生成 README 和 skill。
- 作者主张（无对照实验、无效果数据）：模型可以被要求避开这些模式；这些模式读起来像 AI 味；用清单能改善写作结果。
- 适用边界来自原文：这是启发式清单，不是作者归属检测器；单条命中不算问题；清单是英文写作导向；社媒/LinkedIn 类适用面窄；内容实质类工具只能指出缺失。
- 原文没有关于定时、事件、状态触发、持续运行、后台检查或与编辑器/CI 集成的内容；只能按需手动调用。
- 效果验证口径来自作者自己给出的判据：单条模式在人类写作里正常，一段里出现好几条才读起来像 slop。这提供了一个可计数指标，但作者并未据此做过测量。
- 与已有做法的关系：清单中相关条目为 Claude Code（tool，状态 adopt）；本仓库以 Claude Code skill 形式分发，安装到 `~/.claude/skills/`，不需要引入新的运行环境或新的模型供应商。除 Claude Code 外，清单中没有相关条目。

## 依据的调研

- [FeedHive/ai-slop-detector](../research/radar/2026-10-13/2779-feedhive-ai-slop-detector.md)：值得一试，把 FeedHive 的 ai-slop-detector 作为 Claude Code 技能装上，在 AI 起草后做一道「AI 味」清单检查，再按它每条 Bad→Better 的对照改写成具体事实；安装命令和清单都是现成可照做的，但原文只有作者主张、没有任何效果数据，且清单是英文写作导向，所以先小范围试、自己量命中数再决定是否长期用。
