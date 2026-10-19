# 让编码智能体按批注改幻灯片并逐条回帖

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：让幻灯片修改从一次性生成变成有批注、有回帖、有自检、有人工复核的可追溯回路。
> 先试这一步：先拿一份真实的三五页 deck，按 README 装好，完整跑一轮“批注→智能体改→在幻灯片上回帖→自检→人工复核”。
> 最近修订：2026-10-19

## 解决什么问题

把“让智能体改幻灯片”从一次性的生成，变成可复核的协作回路：人在具体幻灯片上批注，编码智能体读取批注和手改，直接改本地 HTML deck，并且必须在同一页回帖说明“做了 / 需要你回答 / 选择不改及原因”，再截图、审计、导出 PDF、记录回合和提交，最后由人用 Looks good 或 Reopen 复核。它解决的是批注被静默吞掉、修改没有留痕、智能体宣布完成但没人验证的问题，而不是“AI 一键生成 PPT”。

## 适用与不适用

适用：
- 你要和编码智能体反复修改一份有叙事结构的幻灯片，且希望每页保留批注、回帖和修改历史。
- 你在 macOS 或 Linux 上工作；使用 Claude Code 或 Codex；需要本地 HTML deck、可全屏演示、可打印 PDF。
- 你愿意把领域规则写进智能体的 skill 和界面 Checks，让智能体按规则改，而不是只凭感觉改。

不适用：
- Windows：报告明确说只支持 macOS/Linux。
- 需要先看到量化效果再决定：报告只有作者自述，没有效果数据。
- 没有 Node.js 和 headless Chrome：服务器本身只要 Python，但截图、审计、PDF 导出、看板缩略图需要 Node.js 与 headless Chrome。
- 想把模型能力外推到所有模型：作者只说明用 Opus 5.5 或 Sol 6.1，并说“还没试过别的”，这是能力边界声明。

## 前置条件

- 操作系统：macOS 或 Linux。
- Python ≥ 3.9；Node.js ≥ 18；git 可选，但 deck 靠它拿版本历史。
- 能访问本地端口；默认端口 8790，默认监听 127.0.0.1，decks 默认在 ~/slide-decks。
- 使用 Claude Code 时可选安装用户级 skill；Codex 及其他智能体读项目文件夹下的 AGENTS.md，它指向同一份 .claude/skills/decks/SKILL.md。
- 截图、审计、PDF 导出需要 headless Chrome；setup.sh 会把 playwright-core 装进 tools/，找不到可用 Chrome 时装 Playwright 的 Chromium（约 150 MB）。

## 操作步骤

1. 安装并启动本地服务。前提：满足上面的 Python、Node、git 条件。预期结果：服务在 http://localhost:8790/ 起来，首次启动在 ~/slide-decks/ 建 deck 注册表 decks.json 和一个练习用 demo deck。

```bash
git clone <this repository> decks
cd decks
./setup.sh
python3 server.py
```

如果 Linux 上截图/PDF 失败，通常是缺系统库，补装：

```bash
(cd tools && sudo npx playwright-core install-deps chromium)
```

2. 可选：把智能体 skill 装到用户级，这样在任意目录都能用。前提：使用 Claude Code。预期结果：~/.claude/skills/decks 存在，智能体可读取回合流程、sb 命令、deck 文件组织方式和幻灯片风格规则。

```bash
mkdir -p ~/.claude/skills && cp -r .claude/skills/decks ~/.claude/skills/
```

Codex 及其他智能体读本文件夹下的 AGENTS.md。顶栏的 Ask Claude 提示词不依赖 skill 也能用，因为提示词自己列了 sb 步骤；但报告没有给出这段提示词原文，不能在这里照抄。装了 decks skill 后，可以只说一句 process changes。

3. 建一份 deck。前提：服务器在跑。做法 A：在 dashboard 点 New deck，填名称、类型、受众、他们已知什么、要带走的那一个点，以及可选长度/结构/密度/颜色/标题字体/logo/备注。预期结果：它建文件夹与 git 历史，把 brief 写进 BRIEF.md，复制一段提示词给你粘给智能体，由智能体产出初稿。做法 B：命令行建。预期结果：按模板生成 deck。

```bash
./sb templates
./sb new "Q3 pricing review" --template consulting --audience "The leadership team" \
  --point "Raise prices on the middle tier first." --style Navy
```

模板有 consulting（八页 storyline：封面、exec summary、storyline、假设树、ghost chart、2x2、计划、下一步）、talk、workshop、proposal、blank。配色有 Navy / Dark / Minimal / Forest / Teal / Plum，主题写进单个 <style id="deck-theme"> 块，可一处改全篇。

4. 跑一个完整回合。前提：服务器在跑，deck 在智能体所在的应用内置浏览器里打开（作者的做法是让智能体和你看同一页）。按下面顺序做，预期结果是每条批注都有回帖、有自检记录、有人复核。

1) 你批注：在幻灯片下方写要改什么，或直接点文字自己改。改动边打边存到 deck 旁的 .slidebuilder/state.json。
2) 交给智能体：点顶栏 Ask Claude 复制提示词，粘进 Claude Code / Codex；装了 decks skill 就可以只说一句 process changes。
3) 智能体改并回帖：读批注与手改，改 deck 文件，然后逐条回帖。
4) 智能体自检：截图动过的页、跑审计、导出下一个编号的 PDF、记录 round、提交 deck 文件夹。
5) 你复核：停止打字后页面自动刷新；回帖在各自幻灯片下方，改过的页带角标；Looks good 清批注，Reopen 打回。

5. 让智能体用 sb 命令执行和留痕。前提：智能体在 deck 所在环境里能调用 sb。预期结果：状态、回帖、截图、审计、导出、回合记录、提交都有命令可查。可直接把下面这段放进 skill：

```bash
sb decks                                   # 所有 deck，含未结批注与问题
sb comments <deck> [--all]                 # 要处理的批注，按 deck 编号；--all 含草稿
sb edits <deck> [--version v]              # 审阅者在幻灯片上改的文字，以及页面移动
sb working <deck> <slide>                  # 在该页显示 "Claude working"
sb reply <deck> <slide> done|question|skipped "<text>"   # 在该页回帖
sb status <deck> "<text>" [--done N --total M]           # 顶栏实时状态行
sb idle <deck>                             # 清掉状态行
sb shot <deck> [--version v] [--out DIR] <slide> ...     # 截图
sb audit <deck> [--version v]              # 溢出、标签重叠、Guides
sb export <deck> [--version v] [--with-edits]            # 下一个编号的 PDF，旧的移入 _archive/
sb round <deck> --summary S [--changed slide="what changed" ...] [--export vN]  # 记录一回合
sb commit <deck> "<message>"               # 提交 deck 文件夹
sb thumb <deck> / sb url <deck> / sb hide <deck> / sb show <deck> / sb delete <deck> --yes
```

最关键的一条：sb reply 只允许三种结局 done / question / skipped。回帖不是礼貌性汇报，而是强制智能体对每条批注给出“做了 / 我需要你回答 / 我选择不改及原因”，避免静默吞掉批注。

6. 用 Checks 和 sb audit 做界面侧自检。前提：deck 已打开。预期结果：能发现五秒/十秒测试、Horizontal flow、Vertical flow、Guides 的问题；Guides 只提示不阻断，点 Ask Claude to fix 会把违规项写进批注，Comment on all 处理所有被标记的页，下一回合由智能体修；sb audit 跑同一套检查外加溢出与标签重叠。

界面侧检查包括：五秒测试、十秒测试（不过关会留一条批注给下一回合）、Horizontal flow（按顺序列出全部标题，可就地编辑）、Vertical flow（先只看标题、说这页要证明什么，再按空格看正文是否做到）、Guides（四条：保护边距留 logo/来源/页码；标题最多两行，标题页/章节页/收尾页/陈述页豁免；1000px 画布上文字不小于 12px；一页不超过四种字号）。

7. 把领域规则写进两处：skill 和检查项。前提：你有一套要反复遵守的叙事/排版规则。预期结果：智能体每次写/改幻灯片都按同一套规则执行，界面检查也能把违规项变成批注。可把下面这份作者清单当作写自己 skill 的模板：

- Answer first：先给结论再给证据；只有在受众怀疑时才逐步铺垫。
- Ghost deck first：先把所有标题按顺序写完，再动手做任何一页。
- Action titles：每个标题是完整句子说明观点（“Q3 revenue grew 22%, driven by enterprise expansion”，而不是“Q3 Revenue”）。
- Vertical flow：正文证明标题，底部不放 takeaway 框。
- Horizontal flow：只读标题，能讲完整个故事。
- 五秒测试（讲的页）/ 十秒测试（读者自己看的页）：一个观点、层级清楚、图表不用研究就能读。
- “So what?”：好看但没观点的页不算过。
- 一页一个观点：需要“and also”就拆成两页。
- 图表证明标题：柱状/折线，关键数字突出，绝不用饼图。
- 画出关系：不要一堆同形方框的网格，画流程、光谱或图表。

8. 交付与留痕。前提：deck 已到可交付状态。预期结果：顶栏 ⋯ 菜单里的 Client copy 是当前屏幕上的版本，只含幻灯片、图片内嵌、不含备注/批注/引导页/其他版本，源码里也没有；可滚动、可一页一 PDF 打印、可全屏。Editable copy 含备注与批注，给你自己。sb export 把 deck 打成下一号 PDF；如果浏览器里还有未落盘的编辑，它会提示，--with-edits 则打印浏览器当前所示内容。

9. 可选：改端口/目录/版本检查。前提：默认端口或目录不合适。预期结果：服务按 config.json 或环境变量启动，环境变量优先。默认端口 8790、监听 127.0.0.1、decks 在 ~/slide-decks。

| 设置 | config.json | 环境变量 |
|---|---|---|
| 端口 | port | SB_PORT |
| 监听地址 | host | SB_HOST |
| decks 目录（也放 decks.json、settings.json） | decks_dir | SB_DECKS_DIR |
| 每日向 GitHub 查一次新版本（true） | check_updates | SB_CHECK_UPDATES |
| 另一个配置文件 |  | SB_CONFIG |
| sb 找服务器的地址 |  | SB_URL |
| headless 任务用的 Chrome |  | SB_CHROME |

```bash
python3 server.py --port 8799
```

关掉版本检查："check_updates": false 或 SB_CHECK_UPDATES=0（该检查只读一个重定向，不上传 deck 内容）。

10. 可选：开机自启。前提：你希望本地服务常驻。预期结果：macOS 用 launchd，Linux 用 systemd user service。

macOS（launchd）：

```bash
sed -e "s|__APP__|$PWD|g" -e "s|__HOME__|$HOME|g" contrib/decks.plist > ~/Library/LaunchAgents/local.decks.plist
launchctl load ~/Library/LaunchAgents/local.decks.plist
```

重启：launchctl kickstart -k gui/$(id -u)/local.decks，日志在 ~/Library/Logs/decks.log。

Linux（systemd user service）：

```bash
mkdir -p ~/.config/systemd/user
sed "s|__APP__|$PWD|g" contrib/decks.service > ~/.config/systemd/user/decks.service
systemctl --user enable --now decks
```

## 怎么判断变好了（可观察的指标、最小试用方式、试多久）

报告没有给出量化效果数据，所以用过程指标判断，不要把它当成有数据背书的效果承诺。

可观察指标：
- 每条批注都有明确回帖：done / question / skipped，而不是静默消失。
- 每页侧栏保留完整的来回历史；人复核时能直接用 Looks good 清批注、Reopen 打回。
- 每轮有截图、审计结果、下一个编号的 PDF、round 记录和 commit，能追溯“改了什么、什么时候改的”。
- sb audit 能报出溢出、标签重叠和 Guides 违规；界面 Checks 能把五秒/十秒测试、Horizontal flow、Vertical flow 的问题转成批注。
- 智能体不再只宣布“已完成”，而是按 skill 和 Checks 自检后再交回人工复核。

最小试用方式：按报告建议，先拿一个真实的三五页 deck，照 README 的命令装起来，完整跑几轮“批注→智能体改→在幻灯片上回帖→自检→人工复核”的回路。试用多久：报告没有给具体时长或轮数；最小的试用边界就是这份真实 deck 完整跑完数轮回路，再决定是否扩大。不要编造天数或用未给出的效果指标。

## 常见坑

- 只支持 macOS/Linux，Windows 不要按这份步骤硬装。
- Linux 上截图/PDF 失败先补系统库：(cd tools && sudo npx playwright-core install-deps chromium)。
- 没装 skill 时，顶栏 Ask Claude 提示词可以用，但报告没有给出提示词原文，无法照抄；装了 decks skill 才能只说 process changes。Codex 读 AGENTS.md。
- 不要把 sb reply 当成礼貌汇报。它只允许 done / question / skipped，目的是不让批注被静默吞掉。
- Guides 只提示不阻断；不点 Ask Claude to fix / Comment on all，也不跑 sb audit，违规项不会自动变成下一回合的批注。
- sb export 遇到浏览器里未落盘的编辑会提示；要打印当前屏幕内容用 --with-edits。
- 版本检查默认每日向 GitHub 查一次新版本，只读一个重定向，不上传 deck 内容；不想查就设 "check_updates": false 或 SB_CHECK_UPDATES=0。
- tools/pptx2native.py 能把 PowerPoint 幻灯片转成可编辑的原生幻灯片，但报告只说明它存在、咨询起始模板这么做，未给步骤，不要把它当成已文档化的流程。
- 作者模型边界：Opus 5.5 或 Sol 6.1，并说“还没试过别的”，不要外推到其他模型。
- 报告只有作者自述、没有效果数据，先小范围试，不要全面铺开。

## 证据与来源

本篇只依据调研报告《paulmil11/decks》。报告中的安装命令、sb 命令清单、目录/端口/配置、Checks 与 Guides 条目、Client copy/Editable copy、sb export 行为，来自项目 README 与作者描述；报告没有提供效果数据。

属于作者主张或经验、而非量化证据的内容包括：作者说大概再也不会在 PowerPoint 里对齐方框；把咨询叙事规则（answer first、ghost deck、action titles、纵向/横向 flow、五秒/十秒测试）写进 skill 和 Checks；作者用 Opus 5.5 或 Sol 6.1 并说明还没试过别的；pptx2native.py 的存在与咨询模板做法。报告明确说这套做法“只有作者自述、没有效果数据”，且只支持 macOS/Linux，所以建议先小范围试而不是全面铺开。

## 依据的调研

- [paulmil11/decks](../research/radar/2026-10-19/4852-paulmil11-decks.md)：值得一试，建议先拿一个真实的三五页 deck，照 README 的命令装起来，完整跑几轮“批注→智能体改→在幻灯片上回帖→自检→人工复核”的回路，并把你自己的领域规则写进 skill 与 Checks；理由是这套做法把编码智能体接到一个有状态、有反馈渠道、能自检的工作界面上，安装步骤、命令和检查项都可以直接照做，但原文只有作者自述、没有效果数据，而且只支持 macOS/Linux，所以先小范围试而不是全面铺开。
