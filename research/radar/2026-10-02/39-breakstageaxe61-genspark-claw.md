# breakstageaxe61/genspark-claw

- 结论：**值得一试**。先小范围试它这套打包方式——SKILL.md 约定 + 一行安装 + MCP 暴露 + validate 安全校验，是把技能批量供给智能体的现成骨架，可直接照做；但五个内置技能的 SKILL.md 正文原文一条都没贴出来，其质量无法核验，因此不建议整体 adopt，只建议试装并用真实任务对比后再取舍。
- 原文：https://github.com/breakstageaxe61/genspark-claw
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T16:26:43.318Z

## 是什么

`genspark-claw` 是一个社区维护的智能体技能包 + CLI 工具，目标是给 Genspark Claw、OpenClaw、Hermes、Claude Code、Cursor 这几类运行时批量装上可复用的技能。它包含三样东西：

1. **5 个 `SKILL.md` 技能**（每个技能是一个目录 + 一份 Markdown）：`super-research`（多智能体式深度调研、交叉核验引用）、`spark-report`（把原始材料变成带执行摘要、对比表、行内引用的报告页）、`spark-slides`（研究转叙事型幻灯片大纲）、`claw-browser-anchor`（用稳定 DOM 选择器和 ARIA role 替代屏幕坐标做浏览器自动化，带 act 后校验与漂移恢复）、`call-prep`（AI 电话呼叫的端到端准备：调研、目标与兜底、分支话术、通话后摘要）。
2. **一个零运行时依赖的 CLI**（Node ≥ 18 标准库，list / info / install / validate / doctor / runtimes / mcp / version）。
3. **一个零依赖的 MCP stdio 服务器**，把技能包暴露为 `list_skills`、`get_skill`、`validate_skill` 三个工具，供 Claude Desktop、Cursor、Windsurf 调用。

技能格式是公开的 `SKILL.md` 约定：YAML frontmatter（`name`、`description`、`version`、`triggers`、`compatibility`、单行 `metadata` JSON）+ 正文（编号步骤、错误处理、硬规则、输出契约）。README 强调包里没有隐藏代码、没有网络调用。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前置条件**：Node.js ≥ 18（原文称 CI 在 Node 18/20/22 × Ubuntu/macOS/Windows 上跑过）。macOS 还需要 Apple 命令行工具。

1. （仅 macOS）安装命令行工具：

```bash
xcode-select --install
```

2. 装 Node.js（macOS 走 nvm 官方指南 https://nodejs.org/en/download ，然后开新终端）。Linux/Windows 跳过第 1 步，直接从 nodejs.org 装 Node ≥ 18。

3. 一行安装技能包（Linux/Windows 用同一条命令）：

```bash
mkdir -p 'gensparkclaw' && cd 'gensparkclaw' && npm install github:breakstageaxe61/genspark-claw
```

4. 先体检、再看清单，确认环境没问题、技能确实在包里：

```bash
npx genspark-claw doctor     # health-check your setup
npx genspark-claw list       # see the bundled skills
```

5. 按你实际使用的运行时安装技能（可先用 `--dry-run` 看会写哪些文件）：

```bash
npx genspark-claw install all --target openclaw   # → ~/.openclaw/skills/
npx genspark-claw install all --target hermes     # → ~/.hermes/skills/
npx genspark-claw install all --target claude     # → ~/.claude/skills/
npx genspark-claw install all --target cursor     # → ~/.cursor/skills/
```

项目内局部安装（不污染全局目录）：

```bash
npx genspark-claw install super-research          # → ./skills/super-research
npx genspark-claw install all --dir ~/my-agent/skills
```

干跑预览：

```bash
npx genspark-claw install all --target openclaw --dry-run
```

6. 让技能生效：自托管 OpenClaw 网关上重启网关或开新会话，技能会以斜杠命令形式出现（`/super-research`、`/call-prep` 等）。在 Genspark Claw 上则通过技能面板导入 `SKILL.md`，或从 `node_modules/genspark-claw/skills/` 拷贝。

7. 接入 MCP 客户端（Claude Desktop / Cursor / Windsurf），把绝对路径换成你机器上的真实路径：

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "genspark-claw": {
      "command": "node",
      "args": ["/absolute/path/to/gensparkclaw/node_modules/genspark-claw/mcp/mcp-server.js"]
    }
  }
}
```

8. MCP 自检：

```bash
node node_modules/genspark-claw/mcp/mcp-server.js --test
# → MCP self-test passed: initialize, tools/list, tools/call all OK.
```

9. （可选）把仓库拉下来改造 / 加自己的技能：

```bash
git clone https://github.com/breakstageaxe61/genspark-claw.git
cd genspark-claw
npm test                 # 12 tests: parser, registry, validator, installer, doctor, MCP
npm run validate         # lint every bundled SKILL.md
node examples/quickstart.js
node mcp/mcp-server.js --test
```

注意原文写明这里**不需要 `npm install`**，设计上就是零依赖。

10. 新增一个技能的五步（这是原文给出的、最可复用的一条流程）：

1) `mkdir skills/my-skill && $EDITOR skills/my-skill/SKILL.md`
2) 按 `docs/CONTRIBUTING.md` 的结构写：frontmatter（`name`、`description`、`version`、`triggers`、`compatibility`、单行 `metadata` JSON）+ 编号指令 + Rules + Output Format
3) `npm run validate` —— 必须同时通过 schema 校验和安全审计
4) `npm test` —— registry 测试会自动收录新技能
5) 提 PR；之后用 `clawhub publish` 发布，同一份文件在 Hermes 的 `~/.hermes/skills` 和任何 agentskills.io 兼容工具里都能用

11. 程序化调用（把技能包嵌进自己的工具链时用）：

```js
const gclaw = require('genspark-claw');

gclaw.listBundledSkills();                          // → SkillRecord[]
gclaw.findSkill('super-research');                  // → SkillRecord
gclaw.installSkills({ skill: 'all', target: 'hermes' });
gclaw.validateTarget('./my-skills/');               // → [{ file, valid, errors, warnings }]
gclaw.runDoctor();                                  // → { ok, checks[] }
```

12. 安全习惯：原文明确建议**安装任何第三方技能前先通读它的 `SKILL.md`**，并同时跑自己运行时的 doctor/audit 工具。`genspark-claw validate` 会标记 `curl | bash`、base64 载荷和破坏性命令。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：这个包本身就是一份“别人已经在让智能体干这些活”的清单——深度调研、报告成稿、幻灯片大纲、浏览器自动化、AI 电话准备。可以直接当成自查表：这五类工作里，哪几类你目前还在手动做？`install [skill]` 支持单个安装，便于逐项试用。

**2. 任务匹配**：给出了明确的模型/工具配对信息。`SKILL.md` 是跨运行时标准，同一个文件可在 Genspark Claw / OpenClaw / Hermes / Claude Code / Cursor 加载；但 `call-prep` 只列了 Genspark Claw / OpenClaw / Hermes，另外四个技能才覆盖 Claude Code 和 Cursor。协作方式上，`claw-browser-anchor` 明确用 DOM 选择器 + ARIA role 取代坐标，并带“执行后校验”和“漂移恢复”，这是对浏览器类任务的具体方法主张。MCP 路径则对应“把它当工具暴露给 Claude Desktop / Cursor / Windsurf”。

**3. 条件供给**：需要提供的东西是具体的——Node ≥ 18；对目标运行时技能目录的写权限（`~/.openclaw/skills/`、`~/.hermes/skills/`、`~/.claude/skills/`、`~/.cursor/skills/`）；MCP 配置里必须写**绝对路径**；自托管 OpenClaw 需要重启网关或开新会话才生效；Genspark Claw 需要走技能面板导入或从 `node_modules` 拷贝。各技能自身还需要什么输入，原文未给出（SKILL.md 正文没贴出来）。

**4. 主动推进**：依据薄弱。原文只提到技能以斜杠命令被调用、frontmatter 里有 `triggers` 字段，但没有给出任何时间/事件/状态触发的具体机制或例子。Roadmap 里列了 `morning-brief`、`inbox-triage`、`pr-review`、`meeting-notes` 这几个偏“定时/事件驱动”的技能，但都是未完成勾选项，不能当作已有能力。此处只能记一句“技能标准里预留了 triggers 字段”，具体做法原文没交代。

**5. 效果验证**：原文给的是**工程层**验证手段，不是**效果层**验证手段。可用的有：`npx genspark-claw doctor` 环境体检；`genspark-claw validate [path]` 过 schema + 安全审计（返回 `{ file, valid, errors, warnings }`）；`npm test` 的 12 项测试（解析器、注册表、校验器、安装器、doctor、MCP）；MCP `--test` 自检（initialize / tools/list / tools/call 全过）；CI 矩阵 Node 18/20/22 × Ubuntu/macOS/Windows。这些能证明“技能装得上、格式合法、不带危险命令”，**不能**证明“装了技能后产出更好”。后者原文没有任何数据支持，需要自己设计对照。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Agent skills（concept，adopt）**：本仓库是该概念的一套可直接落地的实现——统一的 `SKILL.md` 约定 + 跨运行时安装器 + schema/安全检查校验器 + MCP 分发 + ClawHub 发布路径。手册里“技能怎么写、怎么装、怎么发”这一节可以把它当样板，尤其是第 10 步那套五步新增流程。
- **Claude Code（tool，adopt）**：`npx genspark-claw install all --target claude` 直接写入 `~/.claude/skills/`，对接路径明确，可与你已在用的 Claude Code 工作流合并试用。
- **Cursor（tool，watch）**：有 `--target cursor` 写入 `~/.cursor/skills/` 的路径，但清单里 Cursor 本身仍是 watch，原文也没给出 Cursor 侧的任何验证结果，因此这一路只能算待观察。
- **Hermes（tool，watch）**：`--target hermes` → `~/.hermes/skills/`，另有 `clawhub publish` 后同文件可用的说法，但同样只有 README 声称。
- **OpenClaw（tool，watch）**：`--target openclaw` → `~/.openclaw/skills/`，需要重启网关；`claw-browser-anchor`、`call-prep` 的“Works with”列都包含它。仍属待观察。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文确实给出了的（可照做）**：完整安装命令与 `--target` 取值表；`--dry-run`、`--dir` 选项；每个运行时对应的落盘目录；MCP 配置 JSON 和 `--test` 命令；仓库目录结构；`SKILL.md` 的 frontmatter 字段清单和正文四段式（编号指令 / 错误处理 / 硬规则 / 输出契约）；新增技能的五步流程；程序化 API 的五个函数签名；CLI 全量命令参考。这些是硬内容，可以直接抄。

**只是作者主张、没有可核验证据的**：五个技能“production-ready”“battle-tested”“security-audited”；“12 automated tests”具体测了什么；“以 0 运行时依赖换取无供应链面、瞬时冷启动”；“无遥测、无网络代码”；安全校验能识别 `curl | bash`、base64 载荷、破坏性命令的实际效果；CI 通过情况；123 stars、MIT 许可。

**最大的局限**：**五个技能的 `SKILL.md` 正文一条都没有出现在原文里**。也就是说，本材料能支撑的是“这套技能打包与分发机制值得试”，完全不能支撑“这五个技能好用”。如果手册要写“深度调研该给智能体什么提示词”，这份材料提供不了答案，得去看仓库里的 `skills/*/SKILL.md` 本身。

**适用条件**：Node ≥ 18；macOS 需 xcode-select；自托管 OpenClaw 必须重启网关或开新会话；Genspark Claw 需手动导入或拷贝；MCP 配置必须用绝对路径；第三方技能安装前应先读 `SKILL.md`。另外原文明说这不是 Genspark 官方产品，是社区独立项目，商标仅作兼容性说明使用。

**材料边界**：本次输入是仓库 README，不是仓库代码或 issue 记录，所以以上判断只能基于 README 的自述。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用路径**（约 20 分钟）：

1. 装包，跑 `npx genspark-claw doctor` 和 `npx genspark-claw list`，确认环境 OK、能看到 5 个技能。
2. `npx genspark-claw install all --target <你实际用的运行时> --dry-run` 看清楚会写什么，去掉 `--dry-run` 真装。
3. 装完先**通读一两份 `SKILL.md`**（`npx genspark-claw info <skill>` 或在 `~/.<runtime>/skills/` 里直接打开），确认没有外发网络调用和危险命令——这是原文自己建议的做法。
4. 挑**一个真实的小任务**跑 `super-research`（例如本项目五个研究问题里的某一个子问题），**同一任务再用你现在的做法做一遍**作为对照。
5. 浏览器类任务另做一次：用 `claw-browser-anchor` 跑同一个网站操作流程 3 遍，看是否比坐标式脚本更少需要人工接管。

**判断有没有改善的指标**：

- **工程指标（验证“能装上”）**：`doctor` 返回 ok；`validate` 输出 0 error；MCP `--test` 输出 `MCP self-test passed`；技能在你的运行时里被正确识别为斜杠命令或触发器命中。
- **效果指标（验证“确实更好”，需要自己做对照）**：同一任务的产出**人工改写量**（字数或编辑次数）与不用技能时的差值；产出的**引用可核验比例**（随机抽 5–10 条引用去点开查证）；**可直接采用比例**（能否不改就交给下游）；完成同一任务的时间。
- **浏览器技能专项**：同一流程跑 3 次，统计选择器失效率、需要人工接管的次数、单次耗时。
- **安全指标**：`validate` 0 error 且人工通读后确认无 `curl | bash`、base64 载荷、破坏性命令、外发网络调用。

**取舍规则（建议写进手册）**：如果在你的关键任务上，跑技能并不比手写提示词更好，就**只保留它这套“SKILL.md 打包 + 一行安装 + MCP 暴露 + validate 校验”的骨架**，丢掉内置的具体技能内容——骨架本身已经足够独立有价值；反之如果 `super-research` 或 `claw-browser-anchor` 在对照中明显领先，再考虑提升为 adopt。
