# lgwrightlab/schematic-figure

- 结论：**值得一试**。按 README 给出的安装命令和提示词模板，在自己论文里挑一张真实示意图小范围试用该技能（含 look/size/depth 参数与三 agent 并行出多版设计），因为它提供了可直接复制的安装步骤、提示模板和输出目录约定；但证据只有作者自制的对比演示、无量化评测，且原文明确仍需人工把关科学性与细节，故先试不直接采用。
- 原文：https://github.com/lgwrightlab/schematic-figure
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-16T22:15:59.004Z

## 是什么
`lgwrightlab/schematic-figure` 是一个给 AI agent 用的「技能」包（skill）：把科研论文示意图以矢量图形（SVG、PDF）产出，并同时给出绘制这些图的代码，因此图中任意部分都可编辑。仓库含两个 skill 文件夹，其中 `patent-drawing` 画专利附图、复用 `schematic-figure` 的引擎。许可证 MIT（内置 Latin Modern 字体为 GUST 字体许可）。

README 明确声明：**该技能不替代设计图的人**，它只提供快速初稿和大量设计想法，科学内容与细节仍需人工检查和微调。

## 具体做法（编号步骤）
前提：Node.js 22 或更高版本 + Chromium 浏览器；Blender 与 RDKit 为可选项（分别用于 3D 渲染与分子图）。

1. 安装技能到 agent 的 skills 目录（原文命令）：
```bash
git clone https://github.com/lgwrightlab/schematic-figure.git
mkdir -p ~/.claude/skills
cp -r schematic-figure/.claude/skills/* ~/.claude/skills/
```
也可以直接让 agent 自己安装；在 Codex 中需要在提示里写出 `SKILL.md` 的路径。

2. 在一个项目文件夹里启动 agent。agent 在它被启动的目录工作，图会写到 `figure/out/`，格式为 SVG、PDF、PNG，有时会放在以图名命名的子文件夹里。

3. 用提示词模板下需求。原文给出的四个可用模板：
```text
Use the schematic-figure skill to design Fig. 1 for our paper [attach technical description].
```
```text
Use the schematic-figure skill. Follow the colours and line weights of the attached figure from our last paper [attach example figure]. Draw our new device in the same style [attach technical description].
```
```text
Use the schematic-figure skill. Make three different designs of this figure with three parallel agents for our paper [attach technical description] and combine them in a single sheet to show me.
```
```text
Use the schematic-figure skill. Draw a lithium-ion cell while charging, in 3D. Width 89 mm, depth draft.
```
作者经验：新概念必须给详细技术描述，短请求只对众所周知的概念有效；给一张喜欢的样式图可指定配色、线宽和细节程度；常并行跑三个 agent 拿三种设计，再挑最好的部分合成一张。

4. 用小词控制三个旋钮（技能会自己选并说明选了哪个，也可自行指定）：
   - **Look（风格）**：`flat` 干净的 2D 图；`in 3D` 技能自带的矢量 3D；`render it in Blender` 渲染 3D 物体（需装 Blender）；`photoreal` 用玻璃、金属等摄影材质做 Blender 渲染。
   - **Size（尺寸）**：`Width 89 mm` 为期刊单栏，`Width 183 mm` 为双栏。
   - **Depth（检查深度）**：`draft` 只跑一遍加自动检查，出稿更快更省；`standard` 会把你描述中的每个计数、方向和连接都核对一遍，并冷读结果；默认 `full` 还会画两个版本、留更好的那个并查错。

5. 改图：在同一个文件夹里让 agent 修改即可（技能同时输出绘制代码，可逐处编辑）。

6. 需要其他格式时显式让 agent 导出。这一步的前提是 Python 3 加 Pillow、python-pptx、lxml，并且装了 `pdftops` 或 Ghostscript 用于 EPS。

## 对应的研究问题（对照五个问题）
1. **能力发现**：可交给 AI 的工作被扩展到「论文示意图的首稿与多套设计方案」——以前默认由人从零画的矢量图；另外「三个 agent 并行出三种设计再合并」也是一种可用法。
2. **任务匹配**：这是一个需要 Node 22+/Chromium 的 agent skill 形态；协作方式可通过 look（2D/矢量 3D/Blender 渲染/写实）、size（单双栏毫米宽度）、depth（draft/standard/full 三档检查强度）来匹配任务重要性；draft 适合快速看初稿，full 适合定稿前。
3. **条件供给**：新概念必须提供详细技术描述；提供一张样式样例图用于对齐配色/线宽/细节度；给出目标宽度；环境上需要 Node 22+、Chromium，可选 Blender 与 RDKit，导出其他格式还需 Python 库与 Ghostscript/pdftops；需要一个项目文件夹作为工作区。
4. **主动推进**：原文未给出由时间、事件或状态触发并持续执行的机制；只有「在同一文件夹里继续让 agent 改图」这种人工接续的迭代方式。
5. **效果验证**：提供了五篇论文的对比演示（发表版图 / Opus 5.5 无技能 / Opus 5.5 有技能），作为定性证据；未给出任何量化评分、盲评或通过率，也未定义判断「更好」的标准。原文反而明确要求人工复核科学内容。

## 与已有做法的关系
清单中相关条目只有 `Mole`（工具，状态 try）。原文完全没有提到 Mole，因此无法从本材料判断二者的具体关系；只能作类比提示：两者都属于「把可复用能力封装后交给 agent」的形态，但 Mole 的具体内容超出本材料，不做判断。
仓库内部的复用关系是明确写在原文里的：`patent-drawing` 复用 `schematic-figure` 的引擎——这是同一作者给出的「一个引擎、多个技能」的复用样板。

## 证据与局限
原文给出的证据：
- README 顶部的幻灯片，含五篇论文的发表版图、无技能的 Opus 5.5 结果、有技能的结果各一张；其中前四篇发表于模型训练截止之后，第五篇来自作者自己的实验室（Wang et al., 2022）；五篇均为 CC BY 授权。
- 作者博客文章《Automating schematic figure making》（zhao2026automating）描述构建与测试过程；README 建议使用后引用该文。
- 仓库 31 stars（抓取时的指标）。

属于作者主张、而非数据："publication-quality" 的定性；「提供快速初稿和大量设计想法」；「并行三个 agent 再合并取优」的用法效果。原文没有量化评测、没有盲评、没有失败率或返工率。

原文自述的局限：不替代设计图的人，仍需检查科学与细调细节。

适用条件：面向科研论文示意图（以及同引擎的专利附图）；需要 Node.js 22+ 与 Chromium；3D 渲染与分子图分别需要 Blender 与 RDKit；导出 TIFF/EPS/PowerPoint 需要额外 Python 依赖及 pdftops 或 Ghostscript；内置字体的许可是 GUST 字体许可（不同于代码的 MIT），商用发布前应确认字体授权随附情况。

## 怎么试、怎么验证
最小试用方式：挑一篇自己正在写的论文或报告，选其中 1 张示意图。装好技能（Node.js 22+、Chromium），新建一个项目文件夹并在其中启动 agent；用标准模板给出详细技术描述并附一张同风格样例图，指定 `Width 89 mm` 与 `depth standard`；再用提示模板开三个并行 agent 出三版设计，人工挑取合并；最后检查输出的 SVG/PDF 是否可编辑，并让 agent 导出自己实际投稿需要的格式。

判断有没有改善的指标：
- **耗时**：从提出需求到拿到可用初稿的时间，与上次手工画同类图对比。
- **返工量**：需要人工调整的轮次或元素数量。
- **可编辑性**：能否在 SVG/PDF 中直接改动任意元素（这是原文声称的输出特性，可直接验证）。
- **正确性**：借用技能自身的 `standard` 口径人工复核一遍——按描述核对每个计数、方向与连接是否一致，看漏检比例。
- **合规**：字体与素材授权（Latin Modern 的 GUST 许可）是否满足投稿要求。

判据：若初稿耗时明显下降且人工复核未发现科学错误，则保留为常用做法；若复核频繁出错、或最终仍需从头重画，则降级为仅研读其「给 agent 封装可复用能力 + 用 depth 控制检查强度 + 并行多设计」的思路。
