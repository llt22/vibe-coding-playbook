# Battle Drones - a vibe coded RTS with audio-based multiplayer

- 结论：**值得一试**。建议小范围试：把文中“编码智能体 + 可自动模拟的评估回路 + 短主观质量指令”用于低风险交互原型，先建基线再让代理跑大批模拟并重平衡；理由是作者用 12 轮迭代、321 次代理提交和 1200 场 AI 对战给出了可操作提示词与量化前后对比，但仍是单一游戏案例、缺乏独立验证。
- 原文：https://simonwillison.net/2026/Oct/20/battledrones/
- 来源：rss:src-simon-willison-blog，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-20T23:54:55.530Z

## 是什么
Simon Willison 记录用编码智能体（主要是 Claude Code，模型从 Claude Fable 5 到 Opus 5.5）从零做出浏览器 RTS 游戏 Battle Drones：12 个大版本、321 次由编码智能体提交，覆盖 2D/3D、地图生成、AI vs AI、LLM 代理对战、音频多人和在线多人。原文不是教程，但给出了多段原始提示词、迭代顺序、自动模拟评估结果和若干工程注意点，可提炼为“用编码智能体做低风险交互原型并迭代”的实践素材。

## 具体做法
1. 先定一个可试玩的最小目标，让代理反问需求。前提：选定低风险、可快速运行的原型；明确平台约束（如移动端友好）。原文 v1 提示词：
```text
We are going to build a mobile friendly RTS game - command and conquer style - called Battle Drones, in which two armies of drones (both flying and ground-based) battle for territory and resources 

Let's start with a MVP design, ask me some questions
```
2. 给代理资产生成能力。前提：在 Claude Code for Web 的运行环境中配置存放 OpenAI API key 的环境变量（原文未给变量名），并明确要求使用 OpenAI Image Generation API 生成素材；代理能查看生成图并迭代提示词。原文用此得到基础 sprites。
3. 第一版只求“像”，不要过早追求好玩。原文 v1 已具备建造、选中/指挥单位、基础 AI，但作者判断 barely a proof of concept，不好玩。把可运行骨架作为后续评估载体。
4. 增加“不用人操作也能跑”的模式，作为自动评估入口。v2 加入所有载具 sprites 和 AI vs AI 模式，让作者不直接操作也能观察游戏运行；这为后面大批模拟对战打基础。
5. 用一条较具体的改进提示词同时改画面、单位、建筑、地形和平衡。前提：已有可运行版本；允许代理调用图像 API。原文 v3 提示词：
```text
Massively improve this game. Make the graphics and gameplay better (keep it mobile friendly). Render new graphics using the latest OpenAI GPT image API (lookup details) with the API key in the environment variable. Add new unit types and balance the gameplay better. Also add new buildings and better, more varied terrain.
```
6. 在关键节点使用短的主观质量指令，但配合能自动跑大量模拟的代理模式。原文 v4 在 Ultracode 模式（动态工作流，一次编排许多子代理）下只给了一句：
```text
This game isn't fun enough yet. Make it a LOT more fun.
```
前提：可接受长时间运行和大量 token 消耗；有版本控制与可回退的产物；代理能运行游戏模拟并读取结果。原文称这次跑了很多小时、超过一千次模拟试玩，代理据此重平衡旧单位、加新单位和功能。不要把这句短提示当成唯一方法；原文的关键配套是前面的可运行版本和自动模拟。
7. 复杂新设计先让代理“研究并批评设计”，达成修改后再实现。原文 v8 要求新地图机制鼓励用 Condor 运载步兵占岛，提示词明确：
```text
Design a new map. Goal is to make different strategic incentives that encourage use of Infantry and Condors and aerial vehicles. 

To do this the map will have limited harvester resources but several more uplinks - but uplinks will be on islands that are inaccessible by land vehicles or infantry. These uplinks can also not be claimed using air vehicles. The ONLY way to get them is to fly infantry there in a Condor. 

Armies always start with a Condor and a single squad. If an army has no Condor a new one will be provided for free, flying in from the edge closest to their HQ and landing there. That free condor will come with a single free squad on board. 

The two HQs should be entirely separated by water, but still accessible by vehicles thanks to two bridges across the map in different places 

I want to encourage a battle over uplinks. 

The map should be the times the size of other maps - still square 

First research and then critique this design. Only build after we have agreed on any modifications 

You get to design a new biome for this
```
8. 让代理把已有可运行样例迁移到新项目，而不是从零解释。原文音频多人来自 Chirp Pong 原型，提示词：
```text
Clone Simonw/tools from GitHub and look at recent branches for the example pong game that uses web microphone to implement multiplayer between two phones via audio signals 

Build a version of that for battledrones
```
前提：代理能访问代码仓库和分支；先让代理做测量工具（原文先做 Radio Probe 测两台设备间带宽），确认可行再实现完整音频调制解调器。
9. 对回放和多人，要求确定性模拟。原文指出 Claude 一度必须把 Math.sin()、Math.cos() 等替换为自定义版本，因为 Chrome 与 Safari 返回的数值有细微差异，会导致回放不同步。前提：把“确定性”写成验收条件，并在目标浏览器上跑回放对比。
10. 给代理建它自己用的工具，并让代理提出功能方案。原文的 Radio Probe、模型浏览器、Agent vs Agent 调试工具都是提示出来的；Agent battles 的做法是：让不同 LLM 通过一个工具插件读取只含战争迷雾内信息的非视觉状态并控制单位，先产出 AGENT-BATTLES.md 提案，再实现和测试，并录制/回放对战；调试工具还能显示底层提示词响应。原文没有给出该提示词的完整原文，只给了设计思路。
11. 在线多人优先选简单无状态方案。原文 WebRTC 在两台自有设备、同 WiFi 下也连不上，于是改为无状态 WebSockets 转发；提示词：
```text
If I wanted to support multiplayer between two devices at a very low cost without storing any state on the server could I do that with a tiny asyncio web server running on the cheapest Fly instance? 

Build the server and the fly.toml for deploying it, use Fly application name battledrones-relay - put that in a folder in the repo, include deploy instructions in the README in that folder
```
前提：可接受一个极小的中继服务；原文部署在 Fly.io 单 shared-cpu-1x、可缩到零，作者估算不超过 2.19 美元/月。
12. 让代理写发布说明并保留 transcript。原文每个版本保留共享 transcript，v4 让 Claude 自己写 release notes；这让后续复盘“哪条提示词产生了什么变化”成为可能。前提：保存会话记录、版本号和每次改动的验收结果。

## 对应的研究问题
- 能力发现：编码智能体能从一条 MVP 提示词做到可运行游戏，并在 12 轮中持续加功能；还能生成 sprites、用代码构建 Three.js 3D 模型、用代码生成音乐、写 release notes、先做 Radio Probe 这类测量工具，再实现音频调制解调器和无状态 WebSocket 中继。原文还展示了让不同 LLM 通过工具插件互相对战的模式。
- 任务匹配：适合低风险、可快速试玩、有自动模拟或回放验证的浏览器交互原型；Claude Code/Opus 5.5 + Ultracode 适合需要大量子代理并行探索的大改；Phaser、Three.js 这类模型熟悉的框架适合快速出效果；回放和多人需要确定性模拟引擎；低成本在线多人可用无状态中继而非 WebRTC。
- 条件供给：需要 OpenAI API key 环境变量与图像生成 API、可运行/可试玩的浏览器环境、明确的平台和玩法约束、已有可运行样例的代码仓库与分支、记录设计与决策的 Markdown 文件、transcript/README、足够的 token 预算和长时间运行窗口；反馈来自作者试玩、AI vs AI 千次模拟、回放和调试工具。
- 主动推进：一个目标提示词可以触发整夜的多子代理自主迭代；代理能自动跑超过一千次模拟试玩并根据结果重平衡。原文也有由外部状态触发的例子：发现每周 token 额度只剩 75% 且 45 分钟后重置，就限时让代理做随机地图；音频多人导致试玩者头痛，就触发加警告并转做在线多人。原文未给出定时器或事件触发器的具体配置。
- 效果验证：v4 用 1200 场 Normal 难度 AI vs AI 对战对比，25 分钟后仍未决的对局从 14% 降到 0.9%，曾落后 800+ scrap 的一方获胜比例从 24% 升到 46%；同时保留回放、Agent vs Agent 回放和显示底层提示词响应的调试工具。作者也承认“好玩”仍靠主观判断，原文没有受控人类实验。

## 与已有做法的关系
清单中的 Claude Code（adopt）正是本文主工具，原文补充了 Claude Code for Web、Ultracode 动态工作流、长任务、多子代理、代理自建工具和模拟评估的用法。Laya（watch）未在原文出现，无法对照。

## 证据与局限
原文给出的数据与案例：12 个大版本、321 次由编码智能体提交；v4 超过一千次模拟试玩；1200 场 AI vs AI 对战的未决局比例和翻盘胜率；WebSocket 中继部署在 Fly.io 单 shared-cpu-1x、可缩到零、作者估算不超过 2.19 美元/月；音频多人已在 laptops、iPhones、iPads 上试过；高频调制解调器声音让试玩者头痛，作者加警告后改做在线多人；WebRTC 在两台自有设备同 WiFi 下也连不上。
作者主张而非独立验证的部分：游戏“actually fun”、效果“spectacular”、Opus 5.5 的 3D 建模很强、工具几乎免费、音频多人是 RTS 首例（as far as I can tell）。
局限：单一作者、单一游戏项目；没有对照实验和盲评；“好玩”是主观判断；作者几乎不审代码，且不熟悉 TypeScript，质量和安全风险未被评估；游戏是低风险场景；音频多人刚跑通、未充分测试；1200 场模拟的具体方法和统计细节未展开；Agent battles 的完整提示词未在原文给出。

## 怎么试、怎么验证
最小试用：选一个低风险、可试玩的内部交互原型，时间盒 1–2 天；先建 git 分支，限制 API key 权限并设预算上限，保留每次 transcript。用 v1 式提示词做出可运行骨架，再补一个不依赖人操作的自动评估入口（类似 AI vs AI 的模拟对战或合成任务回放）。先跑基线，再用一条简短主观质量提示词触发大改；原文游戏场景可直接用 Make it a LOT more fun，非游戏场景改成“明显更好用/更清楚/更少错误”，并要求代理跑 N 次模拟、报告前后对比。
判断改善的指标：主任务完成率、完成时间、错误/返工率、两名以上人工盲评偏好、回放一致性、token 与时长成本、关键回归是否出现。原文可对照的指标是 25 分钟未决局比例和落后 800+ scrap 的翻盘胜率。试用前先定最小效应和回退条件；若主指标没有明显改善或出现关键回归，就回退。不要用“看起来像”代替验证：原文 v1–v3 都能跑、像游戏，但作者仍判断不好玩。
