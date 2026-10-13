# diip3sh/exploded

- 结论：**值得一试**。先用 npx skills add diip3sh/exploded 在本地、CSS 同源的前端项目上对一两个组件跑一次规格表生成与审计，验证它能否替代手工标注；理由是仓库给了完整可照做的安装、调用、运行时和审计步骤，但只有 README 与 35 stars，效果未经独立验证，且对跨源 CSS、Shadow DOM/canvas 有明确不覆盖。
- 原文：https://github.com/diip3sh/exploded
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T20:48:29.710Z

## 是什么

Exploded 是一个 Claude Code 技能，外加它依赖的运行时。作用是把真实 UI 组件拆开：说出一个组件名，Claude 先渲染它，再按等距视角把它拆成绘制层——elevation、surface、stroke、内部表面（chips、thumbs、avatars）、content 和 focus ring；可以切换状态，并直接在层上读到每个测量值和 design token。

它的核心规则是「不重绘，不手打数字」：

- 每个层都是实时组件，用浏览器自身的 computed styles 克隆出来的；属于其它层的涂色被置为透明。
- 每个数字都来自 `getComputedStyle`、布局盒和文本范围。
- 每个 token 名都来自作者真正写下的那条 CSS 规则。

因此规格表不会与实际上线的东西漂移。

产出包括：自动找到的层、全部状态（hover、focus、pressed、disabled、invalid、on/off 或自定义）、标注线（padding、radius、gap、type、shadow 印在悬停的那一层上）、token 显示、实时组件并排展示，以及一个审计。

## 具体做法

前提：装有能读 skills 的代理（README 点名 Claude Code、Cursor、Codex 等）；组件在本地可运行且 CSS 与页面同源（跨源 CSS 读不到）；有 Chrome（审计脚本用无头 Chrome，非标准路径需设置 `CHROME_PATH`）。

1. 安装技能

```bash
npx skills add diip3sh/exploded
```

或手动 clone：

```bash
git clone https://github.com/diip3sh/exploded ~/.claude/skills/exploded
```

2. 重启代理后调用。命令不是必须的，README 说 Claude 在做组件文档、规格表、标注和 anatomy 图时会自行使用该技能；完整工作流写在 `SKILL.md`。

```
/exploded document our Button, all states, for the Next.js docs
/exploded spec sheet for the email field and the switch, dark theme
```

3. 直接用运行时（HTML）。注意在 `document.fonts.ready` 之后挂载；`states` 可用 `pressable`、`field` 或自定义；`parts` 用来给内部子部件命名。

```html
<link rel="stylesheet" href="runtime/exploded.css">
<script src="runtime/exploded.js"></script>
<script>
  document.fonts.ready.then(() =>
    Exploded.mount(document.querySelector("#fig"), {
      target: document.querySelector(".btn"),
      title: "Button · primary",
      states: "pressable",               // or "field", or your own
      parts: { ".btn-kbd": "Shortcut chip" },
      theme: "dark",
    }));
</script>
```

4. React / Next.js：

```tsx
import { Exploded } from "@/components/exploded/react/Exploded";

<Exploded fig={1} title="Button · primary" states="pressable">
  <Button>Deploy</Button>
</Exploded>
```

5. 交互键位：`1`–`9` 切状态 · `E` 拆开 · `↑` `↓` 换层 · `←` `→` 旋转 · `T` 显示 token · `Esc` 复位；悬停打开、拖动旋转。

6. 跑审计。无依赖、跑无头 Chrome，打印每个状态的层、执行审计，并保存每张图拆开与合起的 PNG：

```bash
node scripts/audit.mjs examples/gallery/index.html --out shots
```

7. 本地预览：

```bash
python3 -m http.server 8731
open http://127.0.0.1:8731/
```

## 对应的研究问题

1. 能力发现：把「给组件写规格表、标注图、anatomy 图」这类通常靠人工或设计工具完成的工作交给代理自动做——自动找出绘制层、枚举状态、提取测量值与 token。属于「还没想到交给 AI」的典型候选。
2. 任务匹配：适合能读技能文件的编码代理（Claude Code / Cursor / Codex），任务是前端组件文档与设计系统维护，需要能跑浏览器渲染的本地环境。不匹配的情形（原文明确）：跨源 CSS、Shadow DOM、canvas、WebGL；过渡只冻结在末态，展示的是状态而不是动效；JS 驱动的弹簧动画状态目前需要补一个 `apply` 状态。
3. 条件供给：需要提供——技能安装（`npx skills add` 或 clone 到 skills 目录）、代理重启、组件可运行页面、同源 CSS、字体加载完成（`document.fonts.ready`）、状态集合（`pressable` / `field` / 自定义）、内部子部件选择器映射（`parts`）、可选的主题（`theme: "dark"`）以及 `CHROME_PATH`。`SKILL.md` 载有完整工作流。
4. 主动推进：原文没有给出由时间、事件或状态触发并持续运行的机制，也没有 CI 集成说明。唯一可脚本化的是审计命令（`node scripts/audit.mjs … --out shots`），但原文未说明把它接进流水线，此条只能算线索，不能算依据。
5. 效果验证：原文给了明确验收标准——审计检查「每一处涂色恰好落在唯一一个层上」，以及「每一层的副本在每一种状态下与实时组件的布局误差在 0.5 px 以内」。token 模式下硬编码值保持原样显示，因此漂移一眼可见。

## 与已有做法的关系

清单中已有：Claude Code（adopt）——本技能就是装在 Claude Code 这类代理上的技能，是它的一个具体用例；Cursor（watch）——README 明说兼容 Cursor、Codex 及任何读 skills 的代理。

清单中没有关于「组件规格表自动生成 / 设计 token 提取 / 绘制层拆分」的条目。

## 证据与局限

事实性内容：仓库 35 stars（来源指标）；安装与调用命令、运行时 API、键位、审计命令全部来自 README；0.5 px 与「每处涂色恰好一个层」是原文给出的验收规则。

作者主张（未独立验证）：层是「自动找到的」；浅色涂色会自动垫上其所在表面的底色；token 名来自作者写下的 CSS 规则；「规格表不可能漂移」。本次只拿到 README，没有实测数据、没有第三方评测或 CI 使用案例。

原文自述的局限：跨源 CSS 无法读取，其 hover/focus 规则无法强制、token 无法溯源，必须同源提供 CSS；Shadow DOM、canvas、WebGL 组件不被捕获（canvas 克隆出来没有像素）；过渡被冻结在末态；JS 驱动状态（弹簧动画）目前需要 `apply` 状态。另外运行时示例依赖 `document.fonts.ready` 之后再挂载。

适用条件：前端有真实组件与可运行本地环境、CSS 同源、组件是基于 DOM/CSS 的（非 canvas 或 Shadow DOM 封装）。

## 怎么试、怎么验证

最小试用（半天）：在一个本地前端项目里挑 1 个按钮 + 1 个输入类组件（CSS 同源），装技能后跑一次 `/exploded spec sheet for …`；再用上面的 HTML 片段把同一组件挂到页面里对照。

判断改善的指标：

- 审计是否通过：每处涂色落在唯一层、每次状态切换每层布局误差 ≤ 0.5 px（跑 `node scripts/audit.mjs` 看输出与 PNG）。
- token 溯源比例：`T` 模式下有多少值显示成作者写的 token 名、多少是硬编码原值，后者数量下降即为改善。
- 人工成本对比：同一份规格表手工做需要多久，生成 + 校对需要多久。
- 漂移检查：改一次组件的 radius/spacing 后重跑，规格表是否自动跟上（手工文档常见的失同步是否消失）。

若以上任一项在真实组件上无法通过（尤其跨源 CSS 或 Shadow DOM 组件），说明该场景不适用，退回人工流程。
