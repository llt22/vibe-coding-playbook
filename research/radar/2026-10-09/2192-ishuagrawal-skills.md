# ishuagrawal/skills

- 结论：**值得一试**。建议小范围试：把它的「写 SKILL.md → check_skills.py / claude plugin validate --strict → release.sh 打包发布 → 插件市场或 npx skills 分发」这套技能生产与分发流程照抄用来做自己的技能；自带的 video-by-reference 因 SKILL.md 正文未抓到、仓库仅 33 stars 且只有一个技能，只当线索看。理由是安装、校验、发布命令都是可直接复制的具体步骤，而技能本身的内容与效果在材料里没有依据。
- 原文：https://github.com/ishuagrawal/skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-09T05:46:56.747Z

## 是什么

`ishuagrawal/skills` 是一个开源的 Agent Skills 集合（MIT，33 stars），作者 Ishu Agrawal。仓库同时把自己做成 Claude Code 的一个插件市场（marketplace 名 `ishuagrawal`，插件名 `skills`，版本号在 `.claude-plugin/plugin.json`）。

- 每个技能 = 一个文件夹，含 `SKILL.md` 加它需要的 `scripts/`、`references/`、`assets/`。
- 声称兼容 Claude Code 以及任何支持开放 Agent Skills 格式的 agent（指向 agentskills.io）。
- 目前仓库里只有 1 个技能：`video-by-reference`——把一段你喜欢的视频转成同风格的原创动画短片，并自带配乐。
- 仓库还带了一条维护工具链：`scripts/check_skills.py`（校验每个 `SKILL.md` 是否符合 Agent Skills 规范）、`scripts/package_skills.sh`（打 `dist/<skill>.zip` 供 claude.ai / API 上传）、`scripts/release.sh`（bump 版本、校验、commit、tag、push）、`.github/workflows/`（每次 push 校验，打 tag 时给 release 附 zip）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### A. 安装现成技能

1. Claude Code（推荐路径）。前提：已安装 Claude Code。在会话内执行：

```
/plugin marketplace add ishuagrawal/skills
/plugin install skills@ishuagrawal
/reload-plugins
```

或从 shell：

```bash
claude plugin marketplace add ishuagrawal/skills
```

```bash
claude plugin install skills@ishuagrawal --scope user
```

装好后 Claude 会在你的请求匹配到技能时自动选用；也可以直接调用，例如 `/skills:video-by-reference`。

2. 其他 agent（Cursor、Codex、OpenCode、Gemini CLI 等）。前提：能用 `npx`，走第三方 vercel-labs 的 skills CLI：

```bash
npx skills add ishuagrawal/skills
```

加 `--skill video-by-reference` 只装单个技能；加 `-a claude-code`（或其它 agent 名）指定目标；加 `-g` 装到用户级而不是当前项目。

3. claude.ai 与 Claude API。前提：claude.ai 需要 Pro/Max/Team/Enterprise 计划并开启 code execution。从 [latest release](https://github.com/ishuagrawal/skills/releases/latest) 下载技能的 zip（例如 `video-by-reference.zip`），claude.ai 里打开 **Settings**，找到 **Skills** 区域上传；API 侧用同一个 zip 通过 Skills API（`/v1/skills`）上传，配合 code-execution 工具使用。更新＝下载新 zip 重新上传。

4. 手动安装。把 `skills/<name>/` 拷到 `~/.claude/skills/`（所有项目生效）或 `.claude/skills/`（单个项目）。

5. 更新。Claude Code 里运行 `/plugin marketplace update ishuagrawal`，然后 `/reload-plugins`；也可以开自动更新：打开 `/plugin` → **Marketplaces** → 选 **ishuagrawal** → **Enable auto-update**（第三方 marketplace 默认关闭）。用 `npx skills` 装的则跑：

```bash
npx skills update
```

6. `video-by-reference` 的运行前提（README 单列）：需要一台能跑代码的机器——Node.js 22+、`ffmpeg` 和 `ffprobe` 在 `PATH` 上、Python 3 带 `numpy`（用于分析）、一个 headless Chromium（首选 Playwright 的 `chrome-headless-shell`，Google Chrome 也可以）。它最适合在 Claude Code 或其他本地 agent 里跑；claude.ai 和 API 沙箱没有网络访问、也可能缺 Chrome 或 ffmpeg，所以能读这个技能但可能渲染不出来。

### B. 用这套流程分发你自己的技能（材料里更可迁移的部分）

1. 新建 `skills/<name>/SKILL.md`。前提：frontmatter 的 `name` 必须和文件夹名一致（只允许小写字母、数字、连字符）；`description` 最多 1024 字符；frontmatter 只保留 `name`、`description`、`license`、`compatibility`、`metadata`、`allowed-tools`——这样同一份文件也能上传到 claude.ai 和 API。
2. 在 README 的技能表格里加一行。
3. 校验：

```bash
python3 scripts/check_skills.py
```

```bash
claude plugin validate . --strict
```

4. 发布：

```bash
./scripts/release.sh 1.1.0
```

该脚本会 bump `.claude-plugin/plugin.json` 里的 `version`、校验、commit、打 tag `v1.1.0` 并 push；tag 会触发 GitHub release，给每个技能附上新的 zip。版本用 semver：修 bug 用 patch，新增技能或功能用 minor，破坏性变更用 major。注意：Claude Code 只在 `version` 字符串变化时才把一次 push 当成新版本，所以务必通过脚本发布。

## 对应的研究问题

1. **能力发现**：给出一个具体的「没想到交给 AI」的样例方向——把喜欢的视频转成同风格原创动画短片（含配乐）。但 `SKILL.md` 正文没有抓到，看不到它具体怎么实现，只能当线索。另外示范了「技能可用插件市场 / CLI 分发」这种组织形态本身。
2. **任务匹配**：README 明确按运行环境区分适配任务——需要跑代码、渲染视频文件的（video-by-reference）适合本地 Claude Code 或其他本地 agent；claude.ai 和 API 沙箱无网络、可能缺 Chrome/ffmpeg，只能读技能、不适合渲染。这是一条可照用的「按环境能力匹配任务」判据。
3. **条件供给**：video-by-reference 的前置条件列得很清楚——Node 22+、`ffmpeg`/`ffprobe` 在 `PATH`、Python 3 + numpy、headless Chromium；claude.ai 侧需要付费计划并开启 code execution。即「要让技能跑起来需要提供什么」。
4. **主动推进**：只有「自动更新」和「请求匹配时自动选用技能」两点有依据——可开启 marketplace 自动更新，Claude 在请求匹配时自动挑技能。材料里没有基于时间/事件/状态持续执行的机制描述。
5. **效果验证**：只有工程侧的校验——`check_skills.py` 检查 `SKILL.md` 是否符合规范、`claude plugin validate . --strict`、CI 在每次 push 时校验。没有关于「用这个技能产出的结果是否更好」的评估指标。

## 与已有做法的关系

- **Claude Code（adopt）**：本仓库是 Claude Code 插件市场的一个具体实例，安装/更新/校验命令全部围绕它（`claude plugin marketplace add/install/validate`、`/plugin`、`/reload-plugins`）。
- **Agent skills（adopt）**：给出了该格式的一份具体实现和维护工具链——`SKILL.md` + `scripts/`/`references/`/`assets/` 目录约定、frontmatter 字段白名单、规范校验脚本。
- **skills.sh / vercel-labs skills（source，try）**：README 指向 agentskills.io 和第三方 `npx skills` CLI（github.com/vercel-labs/skills），其他 agent 通过它安装/更新。
- **Cursor、OpenCode（watch）**：README 把它们列为「其他 agent」，可以用 `-a` 指定目标，但没有说明具体适配程度。

## 证据与局限

- **拿到的证据**：可直接执行的安装/更新/校验/发布命令；明确的依赖清单；仓库目录结构说明；MIT 许可；semver 与版本触发更新的规则。
- **只是作者主张**：README 里「Claude 会在请求匹配时自动选用技能」、以及其他 agent「任何支持开放 Agent Skills 格式的 agent 都能用」，均无测试数据或案例支撑。claude.ai/API 沙箱无法渲染，是作者自述的限制。
- **主要局限**：本次只抓到 README，唯一技能 `video-by-reference` 的 `SKILL.md` 正文没有抓到，因此无法提炼它的具体流程或提示词，也无法验证它是否真能产出可用成片。仓库 33 stars、1 个技能、单一作者，成熟度低。README 里也没有任何效果数据或使用案例。
- **适用条件**：用现成技能需要 Claude Code 或支持 Agent Skills 的 agent；渲染视频需要本地环境满足上述依赖；把它当模板自建技能，则只需 Claude Code + Python 3。

## 怎么试、怎么验证

**最小试用（两条路，任选或都做）**

- 路径 A（用现成技能）：在本地 Claude Code 里执行

```bash
npx skills add ishuagrawal/skills --skill video-by-reference
```

或走上面的插件市场命令，然后拿一段短视频跑一次，看成片是否可用。

- 路径 B（更推荐，因为更可迁移）：照「具体做法 B」，在本地建一个你自己的 `skills/<name>/SKILL.md`，跑 `python3 scripts/check_skills.py` 和 `claude plugin validate . --strict`，通过后 `./scripts/release.sh 0.1.0`，再到另一台机器上 `npx skills add <你的仓库>` 装上，验证「写一次、多端可用」。

**判断有没有改善的指标**

- 安装成功率：分别在 Claude Code、另一个 agent、claude.ai 上各试一次。
- 校验结果：`check_skills.py` 与 `claude plugin validate . --strict` 是否 0 错误通过。
- 分发效率：同一技能在第二个环境能否不手动拷贝就装好，比手动拷 `~/.claude/skills/` 省多少步骤。
- 任务收益：用你的技能完成一次真实任务，对比手动完成的时间与返工次数。
- 更新链路：改一版后用 `/plugin marketplace update ishuagrawal` + `/reload-plugins` 是否能拿到新版本，用来验证「只有 `version` 变化才算新版本」这条说法。
