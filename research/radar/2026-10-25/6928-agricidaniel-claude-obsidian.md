# AgriciDaniel/claude-obsidian

- 结论：**值得一试**。建议先在单个 Obsidian/Markdown 知识库副本上按 README 的最小流程试装：inbox 捕获、wiki-ingest 建链、wiki-query 带引用问答、wiki-lint 体检；理由是安装与操作命令具体且带来源溯源和事务回滚，但全文抓取与效果数据依赖外部工具和自测，暂不宜全量采用。
- 原文：https://github.com/AgriciDaniel/claude-obsidian
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-25T10:13:08.167Z

## 是什么

claude-obsidian 是 MIT 许可的开源 Claude Code 插件，也是一组兼容 Agent Skills 的技能包，目标是把 Obsidian/Markdown 知识库变成可被 AI 读取、链接、检索和体检的“第二大脑”。它提供 15 个 skills 和 3 个只读 agents：把来源放进 `inbox/`，Claude 读取后写带来源链接的笔记、索引和 MOC，形成知识图谱；可用 `wiki-query` 只读问答，用 `save` 保存答案，用 `wiki-lint` 查死链、孤儿页、缺元数据和空段落。文件保持纯 Markdown，Obsidian 只负责 Graph/Canvas/Bases 等可视化。设计参照 Karpathy 的 LLM Wiki pattern。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **准备环境**：需要 Claude Code、Python 3.11+、Bash；可视化需要 Obsidian；Windows 上任何写入 vault 的操作要用 WSL，原生 Windows 只能检查和预览。先备份或使用 vault 副本。安装插件：

```bash
claude plugin marketplace add AgriciDaniel/claude-obsidian
claude plugin install claude-obsidian@agricidaniel-claude-obsidian
```

2. **选定 vault 并启动 Claude Code**：打开想作为 vault 的文件夹，在其中运行：

```bash
claude                                   # start Claude Code in your vault folder
```

前提：插件不会把自己的文件夹或缓存当作 vault；vault 需通过 `CLAUDE_OBSIDIAN_VAULT`、最近的 `.claude-obsidian.json` 或一个明确初始化的父文件夹选定，不确定时它会退出而不写入。

3. **初始化或采纳现有 vault**：运行：

```bash
/claude-obsidian:wiki
```

前提：该命令先给出预览，批准后才创建；已有 Obsidian vault 可用同一命令 adopt，不移动原笔记。

4. **捕获来源**：把论文、文章、转录或自己的笔记放进 `inbox/`。插件会先保留按内容命名的未改动副本，再摘要。前提：本地文件可捕获；图片只取元数据、hash、尺寸；PDF/EPUB 目前只有元数据、hash、大小，没有内置文本抽取；网页和 YouTube 只是待批准的计划，抓取需单独 runner；OCR 需外部工具。

5. **生成链接笔记**：运行：

```bash
/claude-obsidian:wiki-ingest
```

前提：每个重要论断要链接到支持它的来源；弱证据或冲突证据应保留可见，不要被平滑掉。

6. **从笔记问答**：运行：

```bash
/claude-obsidian:wiki-query
```

前提：该命令只读，回答来自 vault 已有内容并带引用，不改文件。

7. **按需保存答案**：运行：

```bash
/claude-obsidian:save
```

前提：只在你明确要求时保存一个答案或洞察为笔记，避免批量写入。

8. **定期体检**：运行：

```bash
/claude-obsidian:wiki-lint
```

它会查死链、孤儿页、缺元数据和空 section，并复核异常发现后返回健康报告。

9. **选择归档模式**：运行：

```bash
/claude-obsidian:wiki-mode
```

可选 Generic（默认，按 sources/concepts/entities/sessions）、LYT（MOC 与原子笔记）、PARA（Projects/Areas/Resources/Archives）、Zettelkasten（稳定 ID、原子笔记、密集链接）。切换只改变新笔记归档位置，不移动旧笔记。

10. **可选：在其他 AI 宿主使用**：从仓库副本预览再应用：

```bash
git clone https://github.com/AgriciDaniel/claude-obsidian.git
cd claude-obsidian
bash scripts/setup-multi-agent.sh --host codex            # preview, writes nothing
bash scripts/setup-multi-agent.sh --host codex --apply    # link the skills
```

其他宿主把 `codex` 换成 `opencode`、`gemini` 或 `zcode`。Cursor 和 Windsurf 需要 workspace，在脚本后追加 `--host cursor --host windsurf --workspace <folder> --apply`。注意：清单把 ZCode 标为 avoid，README 虽声称支持，但不要仅凭 README 改变该判断。

11. **可选：命令行核心**：从仓库副本运行 `python3 scripts/claude-obsidian.py`。常用命令：

```bash
python3 scripts/claude-obsidian.py doctor --vault PATH
python3 scripts/claude-obsidian.py lint --vault PATH
python3 scripts/claude-obsidian.py transaction recover --vault PATH
python3 scripts/claude-obsidian.py bench --queries FILE --vault PATH
```

前提：改文件的命令先显示 plan，只有按 plan 的 hash 才 apply；`bench` 用你自己的问题文件测搜索质量，原文未给 queries 文件格式，需先看 `--help`。

12. **按安全契约操作**：每次写入前 Claude 读取将触碰的每个笔记并记录 SHA-256；helper 只交草稿；合并成一个 plan 后单事务应用；journal 在写入期间保留备份，断电后用 `transaction recover` 回滚；你在 Obsidian 里改了笔记导致 fingerprint 不匹配时写入会以冲突停止。外部设备和外部编辑器不共享该锁，同步 Canvas/Base 时尤其要备份。

## 对应的研究问题

1. **能力发现**：原文明确 AI 可承担捕获后的读源、写带来源链接的笔记、建索引/MOC、只读问答、按需保存答案、死链/孤儿/缺元数据/空段检查、Canvas 板、受控网络研究、网页 Markdown 捕获计划、日志折叠、BM25 本地检索和 Obsidian CLI 搜索。这些不是“没想到”的全新能力，但把“读—链—问—存—检”串成了可执行链路。

2. **任务匹配**：Claude Code 获得完整插件；Codex、OpenCode、Gemini、ZCode、Cursor、Windsurf 通过 Agent Skills 复用同一组技能。重读和检查交给三个只读 agent，只有 transaction core 写 vault；检索用本地确定性 BM25，rerank 或远程模型是可选项且需明确同意。适合已有 Markdown 知识库的研究、写作、项目知识整理场景。

3. **条件供给**：需要 vault 文件夹、`inbox/` 来源、Python 3.11+、Claude Code、可选 Obsidian、Windows 写入用 WSL，以及 PDF/网页全文/OCR 所需的外部工具。权限上，网络研究和远程模型默认关闭，必须逐任务允许；反馈上提供 plan 预览、hash、lint 报告、verifier 和 bench。数据条件：vault 是本地普通文件，但在 Claude Code 中工作时 Claude 读取的笔记会发送给 Claude/Anthropic。

4. **主动推进**：原文给出的触发主要是“把来源放进 inbox，再运行 ingest”的事件式流程，以及可定期运行的 lint 健康检查；`autoresearch` 是有边界的网络研究且需同意，`wiki-fold` 可把操作日志滚成短摘要。原文没有给出 cron、后台自动运行或无人值守持续代理的配置，因此只能写成显式命令和事件触发，不宜写成全自动。

5. **效果验证**：可用 `wiki-lint` 看死链、孤儿页、缺元数据和空段；用 `wiki-query` 看回答是否带 vault 内引用；用 `verifier` 对拟定变更跑安全测试并排序发现；用 `bench --queries FILE --vault PATH` 在自有问题上测搜索质量；事务冲突和 `transaction recover` 可验证写入安全。原文没有给出量化改善数据或对照实验结果。

## 与已有做法的关系

- **Claude Code（adopt）**：本条目直接依赖 Claude Code，安装命令就是 Claude Code 插件市场命令。
- **Agent skills（adopt）**：项目本身就是 Agent Skills 兼容技能包，并给出其他宿主的链接脚本。
- **Cursor（watch）**：README 声称支持，通过 workspace 参数链接技能；仍建议按 watch 小范围验证。
- **OpenCode（watch）**：同上，README 声称支持。
- **ZCode（avoid）**：README 声称支持 ZCode，但清单状态为 avoid；本报告不据此改判，需另行验证。
- **Obsidian（drop）**：本方案以 Obsidian 为可视化外壳，但原文明确不需要 Obsidian，vault 是纯 Markdown；若清单中 Obsidian 的 drop 是因为它不是 AI 工作流核心，本条目可作为“纯 Markdown + Claude Code”的补充，不改变 Obsidian 条目的 drop。
- **GitHub Trending（try）**：本线索来自 github-active/README，可作为来源条目下的一个具体项目样本。

清单中没有与“Claude Code + Obsidian 知识图谱插件”完全相同的条目；最接近的是 Claude Code 与 Agent skills。

## 证据与局限

原文给出的可核验信息：MIT 许可、v3.0.1、15 skills 和 3 agents、两条安装命令、CLI 命令表、事务/溯源/冲突处理机制、四种归档模式、支持宿主列表、测试 badge；输入指标显示 15,797 stars。这些说明项目有具体实现和可操作入口，但 stars 和 README 自述不能证明工作效果。

原文没有给出量化效果数据、用户案例结果或对照实验；诸如“知识会复利”“Nothing gets lost”属于作者主张，需要用试用数据验证。明确限制包括：PDF/EPUB 无内置文本抽取；网页/YouTube 抓取需单独 runner；OCR 需外部工具；Windows 写入需 WSL；锁只协调本地合作写入者，其他设备和外部编辑器不共享锁，需备份；在 Claude Code 中笔记会发送给模型；它不是自动转录记录器、云同步服务或事实核查器，也不替代备份。适用条件：你已有或愿意建立 Markdown/Obsidian 知识库，使用 Claude Code 或其他 Agent Skills 宿主，能接受把相关笔记交给模型处理，并愿意按 plan/事务方式操作。

## 怎么试、怎么验证

最小试用：复制一个 vault 或新建空 vault，装插件后先跑 `/claude-obsidian:wiki` 看预览；在 `inbox/` 放 3—5 个 Markdown 来源（先避开 PDF 全文和网页抓取）；跑 `/claude-obsidian:wiki-ingest`，检查原文件是否保留、每条重要论断是否有来源链接；用 `/claude-obsidian:wiki-query` 问 5—10 个跨来源问题，检查回答引用是否指向 vault 内笔记；跑 `/claude-obsidian:wiki-lint` 记录死链、孤儿、缺元数据、空段数量；用 `/claude-obsidian:save` 保存一个答案；再试 `/claude-obsidian:wiki-mode` 切换归档模式，确认旧笔记不被移动。

验证指标：与试用前基线比较，统计重要 claim 的来源链接覆盖率、query 回答的引用可追溯率、lint 发现的死链/孤儿/缺元数据数量、人工抽检的事实错误数、同一问题从 vault 找答案的时间；用同一组问题文件跑 `bench` 对比搜索质量，先通过 `--help` 确认 queries 格式。判断改善的标准应是来源可追溯性和检索命中率提升、人工错误不增加、写入冲突能安全停止；原文未给量化阈值，阈值需团队自定。
