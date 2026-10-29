# bassnova42/arch-diagram-skill

- 结论：**值得一试**。建议小范围试用：按 README 将 arch-diagram 安装到 Claude Code/Codex，选一个公开仓库或技术文章生成架构图，并用 check 自检加人工语义对照验证。理由是它给出了安装、提示词、spec 编辑和 build/check/export 的完整可照做流程，但现有材料只有 README，缺少准确率、效率提升等独立证据。
- 原文：https://github.com/bassnova42/arch-diagram-skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T06:47:29.286Z

## 是什么

这是一个面向 Claude Code 和 Codex 的架构图 Skill：输入 GitHub 仓库、技术文章、PDF 或本地项目，由模型读懂结构后生成深色“终端蓝图”风格架构图，并支持导出交互式 HTML、PNG、MP4、GIF 和 Mermaid。

README 描述的工作流是：读源 → 选结构 → 布局 → 自检 → 导出。它按内容选择分层系统、流水线、带循环流程、中心辐射、泳道、层级树等结构；元素按种类上色，连线按请求、写入、回传、异步等流向类型区分颜色和虚实；底部 trace log 在模块间交换数据时追加 `时间 · 类型 · A → B · 说明`。

## 具体做法

1. **确认前提**：需要 Node ≥ 18，以及 Chrome、Chromium 或 Edge；输出视频和 GIF 还需要 `ffmpeg`。README 给出 macOS 安装示例：

```bash
brew install ffmpeg
```

2. **用 npm 安装 Skill**（最简单方式）：

```bash
npx @rokoai/arch-diagram install
```

默认装到 `~/.claude/skills/arch-diagram`。加 `--project` 装到当前项目的 `.claude/skills/`。如果存在 `~/.codex`，会同时装到 `~/.codex/skills/arch-diagram`；也可用 `--claude` 或 `--codex` 只装其中一个。更新时再跑一次安装命令，卸载用：

```bash
npx @rokoai/arch-diagram uninstall
```

3. **或用插件安装**：Claude Code 中执行：

```
/plugin marketplace add bassnova42/arch-diagram-skill
/plugin install arch-diagram@arch-diagram
```

Codex CLI 中执行：

```bash
codex plugin marketplace add bassnova42/arch-diagram-skill
codex plugin add arch-diagram@arch-diagram
```

4. **或手动拷贝**：

```bash
git clone https://github.com/bassnova42/arch-diagram-skill
cp -R arch-diagram-skill/skills/arch-diagram ~/.claude/skills/
cp -R arch-diagram-skill/skills/arch-diagram ~/.codex/skills/   # Codex
```

装好后重启 Claude Code 或 Codex。

5. **用自然语言触发**：在 Claude Code 或 Codex 中直接说，例如：

```text
把 https://github.com/plausible/analytics 画成架构图
```

```text
这篇文章画成流程图：<URL>，输出成视频，30 秒
```

```text
把刚才的图输出成图片
```

```text
输出成 mermaid
```

也可显式指定 Skill：Claude Code 输入 `/arch-diagram <仓库或文章地址>`，Codex 输入 `$arch-diagram <仓库或文章地址>`。

6. **修改图的源文件**：图的源文件是 `<slug>.spec.json`。需要调整时让 Claude Code 或 Codex 修改 spec，再重新生成。

7. **用 CLI 直接构建、检查和导出**：

```bash
npx @rokoai/arch-diagram build  my.spec.json my.html
npx @rokoai/arch-diagram check  my.html
npx @rokoai/arch-diagram export my.html my.png my.mp4 --seconds 30
```

其中 `build` 生成 HTML，`check` 做自检，`export` 可按参数导出 PNG/MP4 等。

8. **利用自检结果修正**：README 说会用无头 Chrome 检查元素重叠、文字溢出、连线穿过方框、标签被遮挡，有问题就改到干净为止。实际使用时把 `check` 报出的问题反馈给模型或直接改 spec，再重新 build/check。

9. **控制输出语言**：用什么语言写提示词，图里的标题、说明、标签和 log 就用什么语言；代码标识符、路径、命令保持原样。图例、状态标签等界面文字内置中文、英语、日语、韩语、西班牙语、泰语，其他语言由 Claude 按提示词语言写出。

## 对应的研究问题

1. **能力发现**：README 明确给出可交给 AI 的整段工作：读取 GitHub 仓库、文章、PDF 或本地项目，选择结构并生成架构图，再做自检和多格式导出。这不是泛泛的“AI 能画图”，而是有输入类型、输出格式和自检环节的具体能力。
2. **任务匹配**：适合用 Claude Code/Codex 处理“把仓库或文章转成架构图”这类可视化任务；模型负责读源、选结构和布局，Skill 自带渲染引擎、样式、模板以及 build/check/export 脚本。任务边界也比较清楚：生成架构图/流程图，而不是通用绘图或任意设计。
3. **条件供给**：需要提供源材料（仓库 URL、文章 URL、PDF 或本地项目）、Node ≥ 18、Chrome/Chromium/Edge，视频/GIF 还需要 ffmpeg；需要安装权限并重启 Claude Code/Codex；提示词语言决定输出语言；需要可编辑的 `<slug>.spec.json` 作为中间产物和修正入口。
4. **主动推进**：README 提供 CLI 的 `build`、`check`、`export`，因此可以在脚本或流水线中调用；但材料没有描述按时间、事件或状态自动触发并持续完成的机制。目前能确认的是用户提示词触发和命令行调用，不能据此认为它能自主定时推进。
5. **效果验证**：README 给出了一层可验证机制：`check` 用无头 Chrome 检查布局问题，包括元素重叠、文字溢出、连线穿过方框、标签被遮挡；导出后还可以人工检查 HTML/PNG/MP4/GIF/Mermaid 是否符合源材料。材料没有给出语义正确率、生成耗时或人工返工率等指标。

## 与已有做法的关系

清单中有相关条目：**Claude Code**（工具，状态 adopt）。这个 Skill 明确面向 Claude Code 和 Codex，安装后会扩展 Claude Code 的架构图生成能力；它不是替代 Claude Code，而是在 Claude Code/Codex 之上增加一套读源、布局、自检和导出的技能流程。清单中没有其他直接相关条目。

## 证据与局限

README 给出的可验证信息包括：安装命令、插件命令、手动拷贝路径、CLI 的 build/check/export 用法、spec 文件概念、目录结构、支持的输出格式，以及三个示例来源（开源项目 rea、plausible，文章 elephant-goldfish，另有私有项目 ballet）。这些足以支撑“可以照做一次试用”。

但材料本质上是项目 README，不是独立评测：没有给出生成架构图的语义准确率、不同仓库/文章上的成功率、平均耗时、人工修改次数或与传统手绘方式的对比数据。自检只覆盖布局层面的重叠、溢出、连线穿框、标签遮挡，不证明图的内容结构一定正确。使用还受环境限制：需要 Node、浏览器，视频/GIF 还需要 ffmpeg；私有项目示例无法公开复现。因此不宜直接 adopt，先小范围 try。

## 怎么试、怎么验证

**最小试用方式**：选一个公开 GitHub 仓库和一篇公开技术文章，分别执行一次完整流程：安装 Skill → 用自然语言或 `/arch-diagram`/`$arch-diagram` 生成 → 查看 `<slug>.spec.json` → 运行 `check` → 导出 HTML/PNG 和一次 Mermaid。再用同一个源材料手工画一版简图或让模型不用该 Skill 生成一版，做对照。

**验证指标**：

- `check` 是否能通过，或报出的布局问题是否能在少量修改 spec 后消除；
- 图中模块、连线方向、分组关系是否与源材料一致，是否出现漏模块、错连线、错层级；
- 提示词语言与图内语言是否一致，代码标识符、路径、命令是否保持原样；
- 从安装到产出第一版图的时间，以及人工修正 spec 的次数；
- HTML 交互、PNG 清晰度、MP4/GIF 循环和 Mermaid 导出是否满足实际交付要求；
- 与手工绘图或不用该 Skill 的基线相比，是否明显减少返工。若布局自检稳定、语义错误少、返工次数下降，再考虑扩大使用范围；否则只保留为特定场景的可选工具。
