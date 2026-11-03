# saksham10arora-dotcom/everything-claude-codex

- 结论：**值得一试**。建议小范围试：在独立笔记库和一个可回滚的代码仓库中按 README 安装，先启用共享记忆、doctor 与“测试通过才算完成”，再判断是否值得长期采用；理由是 README 给出了安装命令和关键配置入口，但证据主要是作者自述，未提供可核验的完整实现与效果数据。
- 原文：https://github.com/saksham10arora-dotcom/everything-claude-codex
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-03T06:52:37.490Z

## 是什么
ECX 是一套面向 Claude Code 与 Codex 的开发/个人知识工作配置包，README 称其包含 17 个 skills、21 个 hooks、3 种库检索方式、双代理共享记忆、手机端接力、启动健康检查和“测试通过才算完成”的约束。它的目标不是单个提示词，而是让每次会话自动加载共享记忆、检查工具状态，并在代理声称完成时先跑测试。

注意：以下判断只依据给出的 README，未查看仓库代码、安装脚本和测试日志。

## 具体做法
1. **前提准备**：需要 Claude Code；README 标注支持 Python 3.9+，并支持 macOS/Linux。若要双代理共享记忆，还需要 Codex；若要手机接力，需要一个私有 GitHub 仓库；若要关系图检索，README 称使用 Ollama，默认模型在 Ollama 云上，可通过 `ECX_LLM_MODEL` 改为本地模型。安装前先备份现有配置。

2. **基础安装**：README 给出的最短路径是克隆后运行安装脚本，脚本会询问笔记库位置和名字。
```bash
git clone https://github.com/saksham10arora-dotcom/everything-claude-codex ~/ecx
cd ~/ecx && ./install.sh
```
README 声称可重复运行、不覆盖已有文件，并先保存 `.ecx-bak` 备份；这一点需在实际安装时验证。

3. **完整栈安装**：需要搜索、定时任务和手机模式时，按 README 使用：
```bash
./install.sh --vault ~/vault --name Ada --with-search --with-cron --with-phone
```
前提是 `~/vault` 是你的笔记库路径，且手机模式使用你拥有的私有 GitHub 仓库。

4. **启动会话**：在笔记库中打开 Claude Code，输入：
```text
/boot
```
README 称 `/boot` 给出 30 秒简报。

5. **启用共享记忆**：核心是 `hot.md` 保存当前有效信息，hook 在第一条消息前加载它和最近会话；每次 `/compact` 后自动刷新。Codex 通过 `AGENTS.md` 读取相同文件。前提是安装时已接入模板并确认 hook 生效。

6. **启用双代理同步**：README 称每次消息前，hook 把另一个代理的最新聊天内容交给当前代理，包括 Codex 语音转录；也可用 `sync.py send` 直接互发，日志在 `agents/AGENT_CHAT.md`。前提是安装 Codex 并启用 agent-sync；只用 Claude Code 时此功能不适用。

7. **配置“测试通过才算完成”**：在仓库中设置 `.ecx/test-command`，写入该仓库实际测试命令；关闭则写：
```text
off
```
README 称 hook 会在 Claude Code 或 Codex 尝试结束时先跑测试，失败就把失败输出送回代理；只在实际有改动时运行，能自动发现 npm、pytest、unittest、cargo、go 和 make 测试，连续失败 3 次后放弃而不是死循环。具体测试命令需按仓库填写，原文没有给出示例命令。

8. **启用健康检查**：README 称 `doctor` 覆盖 hooks、索引、任务和同步等 16+ 项检查，并在每次 Claude Code/Codex 会话开始时运行；健康时静默，异常时给出警告和修复提示，以及索引最后更新时间。原文未给出单独运行 doctor 的命令，需以安装后的脚本为准。

9. **可选：三种库检索**：`--with-search` 后，按 README 包括按语义的 ChromaDB、按关系的 LightRAG 图、按图片的 CLIP 检索，并由 router 选择；每晚重新索引。前提是接受本地/云模型的相应数据边界。

10. **可选：手机接力**：每次回复后把笔记和记忆同步到私有 GitHub 仓库；手机端用 Claude app 或 ChatGPT app 在云上操作该仓库；语音捕获落到 `inbox/`，由 GitHub Action 合并，下次打开笔记本时再归档。前提是仓库必须设为私有。

## 对应的研究问题
1. **能力发现**：README 明确把“会话前加载记忆”“双代理互看最新消息”“按语义/关系/图片检索笔记”“手机语音捕获后自动合并”“用 `/catchup` 继续另一个窗口的对话”列为可交给 AI 的工作。这些是可发现的能力清单，但多由作者描述，未给出逐项演示数据。

2. **任务匹配**：给出了较明确的工具匹配：Claude Code 与 Codex 通过共享 `hot.md`/`AGENTS.md` 和 agent-sync 协作；检索由 router 在语义、图、图片三种方式间选择；测试约束按仓库通过 `.ecx/test-command` 配置。适合“个人知识库 + 代码代理 + 多会话连续性”的场景。

3. **条件供给**：需要提供笔记库路径、名字、可用的 Claude Code/Codex 环境、私有 GitHub 仓库（手机模式）、Ollama 或替代模型（关系图）、每个仓库的测试命令，以及允许 hooks 在会话开始、消息前、回复后和结束时执行。README 还提示关系图默认可能把笔记文本发到 Ollama 云，需用 `ECX_LLM_MODEL` 改为本地模型。

4. **主动推进**：有明确的触发点：会话开始跑 doctor；第一条消息前加载记忆；每次消息前同步另一代理；每次回复后同步 GitHub；每次尝试结束前跑测试；夜间重建索引；`/daily`、`/opps`、`/ship` 等 skill 按周/任务推进。属于事件触发和状态触发结合的流程。

5. **效果验证**：README 提供了过程性验证：27 个测试、16+ 项 doctor 检查、“测试失败会把代理打回并附失败输出”、`/ship` 提交推送并“证明”。但没有给出结果指标，如节省时间、减少返工、检索命中率或错误率，因此只能验证流程是否运转，不能直接证明工作结果改善。

## 与已有做法的关系
清单中 Claude Code 已是 adopt，ECX 是在 Claude Code 之上叠加的配置、hooks、skills 和记忆/同步层，不替代 Claude Code。清单中的 superpowers 为 study，README 仅把它列为“可搭配”，并称其覆盖 planning、TDD、debugging workflows，未说明具体集成方式。Graphify 为 watch，README 将其列为可搭配工具。LightRAG 为 watch，README 称 ECX 的“按关系”检索使用 LightRAG 图。除此之外，清单中没有与 ECX 完全对应的“Claude Code + Codex 全套配置”条目。

## 证据与局限
原文给出的可核验信息主要是：仓库 31 stars、MIT 许可证、README 声称 27 个测试覆盖 hooks/installer/doctor，测试于 macOS 和 Linux、Python 3.9 到 3.12；声称 21 个 hooks、17 个 skills、16+ 项 doctor 检查、3 种检索、2 个代理共享记忆；作者自称每天使用 6 个月、支撑 37 个已交付项目；双代理消息同步“低于 0.1 秒”；安装“30 秒”。这些均为 README 自述，未提供独立基准、测试日志、失败案例统计或代码审查结果。

局限：只依据 README，无法确认安装脚本是否真的不覆盖配置、hooks 是否在真实 Claude Code payload 下可靠、doctor 的“精确修复”具体是什么、测试 hook 对多语言项目的识别准确率如何。适用条件偏个人开发者/知识工作者，且默认 macOS/Linux；手机模式依赖私有 GitHub 仓库；关系图检索涉及外部模型数据边界。团队权限、安全审计、多人协作冲突处理在原文中没有展开。

## 怎么试、怎么验证
建议先做最小试用，不要一上来开完整栈：

1. 复制一份笔记库到独立目录，备份 `~/.claude` 等配置；先只跑基础安装，不加 `--with-phone` 和 `--with-search`。
2. 打开 Claude Code，执行 `/boot`，确认会话开始能加载 `hot.md`。可在 `hot.md` 写一个唯一标记，重开会话看首轮是否知道它。
3. 在一个测试当前可通过的仓库启用 `.ecx/test-command`，故意制造一个失败测试，确认代理结束时被拦住并收到失败输出；修复后确认能通过；观察连续失败 3 次是否停止。
4. 若使用 Codex，对 Codex 说一个唯一标记，再问 Claude 是否知道，检查 `agents/AGENT_CHAT.md` 和同步延迟；若不使用 Codex，跳过此项。
5. 观察每次会话开始的 doctor：健康时是否静默，异常时是否给出可执行修复提示和索引更新时间。
6. 两周后再决定是否加搜索和手机模式；手机模式只用私有仓库测试一条语音捕获到 `inbox/` 的链路。

判断指标建议：安装/重装是否成功且配置无丢失；doctor 是否稳定通过；新会话是否减少重复交代背景；测试失败是否被拦截而不是事后发现；工具故障是否在调用前暴露；语义/图片检索能否用改写描述找回目标笔记；误拦截和额外等待是否可接受。原文没有给出这些指标的基线数值，需自行记录试用前后对比。
