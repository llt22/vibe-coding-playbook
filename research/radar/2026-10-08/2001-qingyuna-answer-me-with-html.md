# QingYunA/answer-me-with-html

- 结论：**值得一试**。先在一个能执行 shell 的 agent（如 Claude Code）上装这个 skill 并开启 always-on，用两三个复杂问题对比“直接让模型写 HTML”与“模型写 Markdown 草稿 + CLI 渲染”的输出 token、耗时和页面可读性，再决定是否写进手册。理由是它把“模型只写内容、CLI 负责布局”这条分工约定固化成了可复制的安装命令、配置命令和一条可直接粘贴的规则提示词，并附了可复现的 token 基准，但证据主要来自作者自测的 9 个页面样本。
- 原文：https://github.com/QingYunA/answer-me-with-html
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-08T06:51:30.708Z

## 是什么

Answer me with HTML 是一个 agent skill：安装后按平常方式提问，agent 只写一份简短的 Markdown 草稿，交给 skill 自带的 CLI（`am`）渲染成一页单文件、可离线打开的 HTML。README 称约 50 ms 后得到页面。

核心分工是：**模型写内容（Markdown），CLI 负责布局、配色、绘图**。README 给出的比例是，手写 HTML 时模型写的 token 里约 47% 是 SVG 坐标与路径、15% 是 CSS、17% 是 HTML 标签、21% 才是文本；用这个 skill 后模型只写那 21% 对应的 Markdown 草稿。

支持通过安装器接入 70+ 种 agent，README 明确列出 Claude Code、Codex、Cursor、OpenCode、Pi。页面保存在 `~/.answer-me-with-html/pages/`，每页内嵌生成它的 Markdown，右上角按钮可切换主题/明暗、填写回复、复制源 Markdown。

## 具体做法（编号步骤）

1. **前提**：装 Node.js 20 或更新版本。不需要 `npm install`，CLI 已捆绑在 skill 里。agent 需要能执行 shell 命令。

2. **让 agent 自己装（README 推荐）**：把下面这段原样贴进 Claude Code / Codex / Cursor / OpenCode 或其他 agent。

   ```
   Install Answer me with HTML: read https://raw.githubusercontent.com/QingYunA/answer-me-with-html/main/INSTALL.md and follow it.
   ```

   按 README 描述，`INSTALL.md` 是写给 agent 看的：在 Claude Code 里装插件、在其他 agent 里装 skill，保留已有安装，不向你提问，最后用 TCP 三次握手页面自检并只给一份报告。如果你的 agent 打不开链接，用：

   ```bash
   npx -y skills add QingYunA/answer-me-with-html -g -y -a <your agent name>
   ```

   （Claude Code 用 `-a claude-code`。）

3. **或走 Claude Code 插件**：在 Claude Code 内运行。

   ```
   /plugin marketplace add QingYunA/answer-me-with-html
   /plugin install answer-me-with-html@answer-me-with-html
   ```

4. **或一条命令装**：

   ```bash
   npx skills add QingYunA/answer-me-with-html
   ```

   它会问装进哪些 agent（安装器 vercel-labs/skills 支持 70+ agent）。

5. **或手动装**：把 `skills/answer-me-with-html` 目录拷进你的 agent skill 目录。Claude Code 的写法：

   ```bash
   git clone --depth 1 https://github.com/QingYunA/answer-me-with-html.git /tmp/answer-me-with-html
   cp -R /tmp/answer-me-with-html/skills/answer-me-with-html ~/.claude/skills/answer-me-with-html
   ```

   其他 agent 的 skill 目录：Codex `~/.codex/skills/`、Cursor `~/.cursor/skills/`、OpenCode `~/.config/opencode/skill/`。

6. **验证安装**：用 TCP 三次握手的问题问一次，README 说 `INSTALL.md` 本身就以这个页面作为自检结果。

7. **使用**：装完不用额外设置，照常提问即可。README 给的示例：

   ```
   > Explain the TCP three-way handshake
   > Map out how the modules in this repo fit together
   > Redis or Memcached for our cache?
   ```

   agent 自己判断值不值得出页面：相关概念、多步流程、多方案对比才出；也可以用一句话触发：“explain it in HTML”。一句话问题（例如“怎么用 `ls` 显示隐藏文件”）不会出页面。

8. **开启 always-on（README 推荐，默认关闭）**：把下面这段贴给 agent，让它把规则写进 rules 文件（如 `~/.claude/CLAUDE.md` 或 `AGENTS.md`）。

   ```
   Turn on always-on mode for Answer me with HTML: add a global rule — "[answer-me-with-html always-on] Whenever a reply gives a conclusion, summary, plan, comparison, review or explanation, even a short one, also make a page with the answer-me-with-html skill (2 to 4 panels for routine answers), render it with --no-open before you write the reply, and end the reply with a file:// link to the page. Skip casual chat, one- or two-sentence replies with no conclusion, pure command output, and requests for plain text."
   ```

   规则生效后每次给出结论/总结/计划/对比/评审/解释都会附一页（常规回答 2–4 个面板），页面不自动弹开、不打断；闲聊、无结论的一两句话、纯命令输出、明确要纯文本的仍照旧。README 另注：Claude Code 在 plan mode 下不生成页面。

9. **改配置**：不用手改配置文件，用 slash command 或 `am`。

   | 位置 | 方式 |
   | :--- | :--- |
   | Claude Code（插件安装） | `/answer-me-with-html:config` 交互改；`/answer-me-with-html:config open off` 直接改 |
   | 任意 agent | `/answer-me-with-html config open off`，或直接说“stop opening the browser” |
   | 终端 | `am config` 查看，`am config set open off` 修改，`am config reset` 还原 |

   可配置项：`open`、`theme`、`mode`（light/dark）、`style`（写作检查）、`update_check`、`voice`（视频旁白）。

10. **写草稿（了解格式即可，通常由 agent 自动写）**：模型写的就是这种结构，frontmatter + fenced 图形块，坐标由 CLI 用 dagre 计算、按标签宽度排布。

    ````markdown
    ---
    title: TCP three-way handshake
    ---
    ## A Three-way handshake {span=2}
    ```sequence num
    Client -> Server: SYN, seq=x
    Server -> Client: SYN+ACK, seq=y, ack=x+1
    Client -> Server: ACK, ack=y+1
    note Client, Server: ESTABLISHED
    ```

    ## C State changes {span=2}
    ```flow LR
    (CLOSED) -> LISTEN: passive open
    LISTEN -> SYN_RCVD: get SYN / send SYN+ACK
    SYN_RCVD -> *ESTABLISHED: get ACK
    ```
    ````

    组件用法可查 `am help <component>`。完整语法（frontmatter、`span`、`rows`、raw `html`/`svg` 块、不走 agent 直接调 CLI）在 `docs/reference.md`。

11. **按信息形状选组件**（README 给的选择表）：`flow` 架构/调用链/判断分支；`sequence` 多方随时间往返的消息；`tree` 目录/模块/分类；`timeline` 历史/版本/阶段；`limits` 某值对上限；`annot` 逐句批注；`kv` 元数据、图签栏；`callout` 结论/提示/警告；`ask` 在页面上做的决定（agent 的建议预选中）；代码块可 `src=` `lines=` 引用你文件里的真实代码；表格中写 `ok` / `no` / `warn` 会渲染成 ✓ ✗ !。

12. **打开严格写作检查（可选）**：默认只警告。改为拒收不合格草稿：`/answer-me-with-html:config style strict`，或在单个草稿里写 `style:`。检查项为机器可判的部分：句长、用词、被动语态、常见中文错别字与含糊词（规则改编自 ASD-STE100）。

13. **更新与清理**：更新是手动的，agent 每周查一次 GitHub 版本号并告知；更新时说“update answer-me-with-html”。页面会堆在 `~/.answer-me-with-html/`，说“clean up the pages”，agent 删前会先问；也可用 `am clean`。

14. **要解释视频（可选）**：说“make a 3b1b-style video on the TCP handshake”。草稿与页面同款，外加每拍一行旁白：

    ````markdown
    ## Both sides wait
    ```sequence
    Client -> Server: SYN
    Server -> Client: SYN-ACK
    ```
    > The client sends a SYN to ask for a connection.
    > The [Server] answers with a SYN-ACK.
    ````

    `am video` 生成播放页：图随旁白逐步构建，镜头跟随方括号里的节点，语音内嵌、可离线播放；加 `--mp4` 导出视频文件。README 明确：agent 只在你要求时才做视频。

15. **自己复现基准（可选）**：仓库带基准脚本。

    ```bash
    git clone https://github.com/QingYunA/answer-me-with-html.git && cd answer-me-with-html
    npm install
    node bench/corpus.mjs   # README 称每次给出同样的数字
    npm test                # 跑测试
    AM_E2E=1 npm test       # 额外跑端到端视频测试（系统 TTS、Chrome、ffmpeg）
    npm run smoke:install   # 真实安装并校验插件清单（需要网络）
    npm run build           # 改 src/ 后重建 skills/answer-me-with-html/scripts/am.mjs
    npm run snapshot        # 与 origin/main 比对渲染出的 HTML
    ```

## 对应的研究问题

**1. 能力发现**：README 直接给出了一批“本来只当成长文本读”的产出形式，现在可以交给 agent 一页出图：解释概念（时序图 + 状态图 + 标志位表）、梳理仓库模块（目录树 + 调用图）、技术选型（带 ✓/✗ 的对比表 + 结论）、逐句批注一段文字、梳理一段历史的时间线、把改动计划里的开放决策做成页面上可勾选的选项、以及 3Blue1Brown 风格的解释视频。这些都是从“没想到交给它的工作形态”角度可直接抄的清单。

**2. 任务匹配**：README 给出了选择规则——涉及相关概念、多步流程、多方案比较才出页面；一句话问答保持一句话回答；纯命令输出和明确要纯文本的请求不出页面。工具侧：任何能执行 shell 命令的 agent 都行，README 列了 Claude Code、Codex、Cursor、OpenCode、Pi，并指出 Claude Code 插件安装与 plan mode 下的差异。协作方式上，明确“模型写 Markdown 内容、CLI 负责模板/面板位置/主题/用 dagre 排流程图/按标签宽度排时序图”这一分工，是比“让模型直接吐 HTML”更省的分工。

**3. 条件供给**：需要 Node.js 20+；agent 需要 shell 执行权限和写 skill 目录、写 `~/.answer-me-with-html/` 的权限；always-on 需要在 rules 文件里加一条全局规则；要引用真实代码需要草稿里写 `src=` `lines=`，且 README 说明会拒绝目录外的文件和存密钥的文件；写作检查默认只是警告，要拦住不合格草稿得显式设 `style strict`。

**4. 主动推进**：always-on 就是事件触发式推进——每当你拿到结论/总结/计划/对比/评审/解释，就自动附一页，并显式用 `--no-open` 以免打断，回复末尾给 `file://` 链接；README 用“2–4 个面板”约束常规回答的规模。另外 agent 每周自动查一次新版本号并告知；页面堆积靠 `am clean` 或“clean up the pages”收尾。局限是它不会自动把页面送回会话——你得在页面上填回复/选项，再用 Reply 按钮合成一条消息粘回 agent。

**5. 效果验证**：README 给了可复现的量化对比，并说明脚本与语料在仓库里（`bench/corpus.mjs`、`bench/corpus/tokens.json`），页面本身也提供下载 zip。这是这套材料里最适合直接搬进手册的“怎么量”的部分。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：README 提供了 Claude Code 专属路径——`/plugin marketplace add` + `/plugin install`；配置命令 `/answer-me-with-html:config`、`/answer-me-with-html:config open off`；规则写进 `~/.claude/CLAUDE.md`；手动安装到 `~/.claude/skills/`；并注明 plan mode 下不生成页面。
- **Cursor（清单状态 watch）**：README 只在支持列表的 badge 和手动安装目录 `~/.cursor/skills/` 里出现，没有 Cursor 专属的安装/验证步骤。
- **OpenCode（清单状态 watch）**：同上，只出现在支持列表和 `~/.config/opencode/skill/` 安装路径。
- 清单中没有其他相关条目。

## 证据与局限

**原文给出的数据与案例**：

- 手写 HTML 的构成比例：基于作者统计的 9 个模型手写页面，平均 4,893 tokens；其中 SVG 坐标与路径 47%、CSS 15%、HTML 标签 17%、文本 21%。
- 对比数据：3 个主题 × 3 次运行、取中位数、Claude Sonnet 5.5、普通 Claude Code 环境。模型写的 token 4,893 → 612（少 8 倍），耗时 31 s → 12 s（快 2.6 倍）。
- 成本：账单降幅小于写作量降幅，此处约 15%，README 解释为每一轮无论有没有 skill 都要读 system prompt、你的问题和对话，并指向 `bench/README.md#where-the-cost-goes`。
- 视频：README 称为“a small test”，约少 18 倍输出 token、快 12 倍。
- 可复现材料：`bench/corpus/tokens.json`、`node bench/corpus.mjs`、bench 语料页面 zip（v0.4.14）下载链接。
- 使用场景的问答对照表（7 行“你问什么/你得到什么”）、TCP 示例草稿与成品页、`examples/ste100.md`。

**只是作者主张、没有数据支撑的部分**：

- “The model writes about 1/8 of the tokens”之外的收益断言，如“少写就少等”（表格里只给了时间和 token 的中位数结果，未给方差、未给其他模型）。
- 渲染侧能力断言：“fixes its own mistakes… agent fixes it in one try”“Labels don't get cut off, and there are no gaps in the grid”，README 没有给失败率或案例计数。
- “布局由代码计算而非猜测”“一文件无依赖、离线可开”属于实现描述，未给独立验证。
- 与 Archify、dsh-genui 的对比是作者自述（Archify 从 JSON 规范生成一张交互图；GenUI 插件在同一个聊天应用内显示组件），指向 `docs/compare.md`。
- 背景部分引用 Karpathy 关于“跟上 LLM 输出变难了”和 STE100 让写作更易读的说法，属于转述观点。

**适用条件与局限**：

- 需要 Node.js 20+，agent 必须能跑 shell 命令；README 没有说明 Windows 或其他无 Node 环境的替代方案。
- 安装命令覆盖多种 agent，但除 Claude Code 外，其他 agent 的完整流程依赖 `INSTALL.md` 和安装器，README 只给了目录名。
- always-on 会持续产出页面，需要人工清理（`am clean`），README 明确它“从不自动弹开”，也就意味着默认不打断也不主动提醒，靠回复末尾的文件链接。
- 账单节省只有约 15%，收益主要在阅读端和等待时间，不在总成本。
- 版本为 v0.4.14，更新是手动的。
- 本次输入只有仓库 README，`docs/reference.md`、`docs/video.md`、`bench/README.md`、`INSTALL.md` 的具体内容未提供，因此命令细节只能按 README 转述，未逐条验证。

## 怎么试、怎么验证

**最小试用（一天内可完成）**：

1. 选一个 agent（优先 Claude Code，因为 README 给了它最完整的两条安装路径）。确认 `node -v` ≥ 20。
2. 用第 2 步的 INSTALL.md 提示词安装，然后按第 6 步用 TCP 三次握手问题自检一次；页面应出现在 `~/.answer-me-with-html/pages/`。
3. 准备 3 个你自己的真实复杂任务，覆盖不同信息形状，例如：一个概念解释（期望 sequence/flow）、一个代码库模块梳理（期望 tree + 调用图）、一个选型对比（期望表格 + 结论）。
4. 每个问题跑两次：一次直接说“answer in HTML”，一次用这个 skill；记录模型输出 token（若 agent 能显示）、从提问到页面可打开的时间、页面是否需返工。
5. 再开 always-on（第 8 步规则），照常工作一周，观察页面堆积量和实际复用次数。

**判断有没有改善的指标**：

- 模型输出 token 数：对照 README 的 8 倍差距，看自己场景是否成立。
- 出结果的时间：对照 31 s → 12 s，看是否接近 2.6 倍。
- 阅读端：同一份结论，你从打开到能做出决定的时间；页面是否需要人工修补（箭头指错、标签被截断）。
- 交互闭环：你在页面上填的 `ask` 选项/批注，粘回 agent 后是否真的减少了往返轮次。
- 一周后的 always-on 页面数 vs 真正被再打开过的数量；前者远大于后者就说明规则太激进，README 里有“less proactive”可调。
- 可复现校验：跑 `node bench/corpus.mjs` 看是否得到 README 里的同一组数字；`npm run snapshot` 用于确认渲染结果不被改动。
