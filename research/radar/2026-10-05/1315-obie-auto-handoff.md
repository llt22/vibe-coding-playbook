# obie/auto-handoff

- 结论：**值得一试**。可以在 Claude Code 长会话里小范围试装 auto-handoff，用默认 50 分钟空闲触发 `/auto-handoff:handoff` 把工作状态落成 `docs/handoffs/` 下的交接文件，让新会话能续接；它装法、配置、行为边界都写得很具体，但依赖早期访问的 hooks API、只有作者主张的成本收益，且无法识别会话用的是哪种缓存，所以先试不直接采用。
- 原文：https://github.com/obie/auto-handoff
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-05T04:46:15.759Z

## 是什么

auto-handoff 是一个 Claude Code 插件：当你在会话中离开后，它在提示缓存（prompt cache）失效前自动跑一次交接命令，把当前工作状态写成一个文件，供新会话恢复。

它针对的问题是：Claude Code 把会话上下文放在提示缓存里，最后一次请求后一小时过期。一小时内发起的 turn 以很低的输入价格读回整段对话；超过一小时后，下一个 turn 要按全价重读全部内容，长会话下又慢又贵。插件盯住这个空闲窗口，在缓存还热的时候把状态落盘。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：已安装并运行 Claude Code（原文在 Claude Code 2.1.289 上开发测试）。该插件基于早期访问（early access）的 function hooks 插件 API，可能在版本间变化。

1. 在 Claude Code 内添加 marketplace 并安装插件：

```
/plugin marketplace add obie/auto-handoff
/plugin install auto-handoff@auto-handoff
```

插件在下次会话启动时加载。

2. （可选）调整触发条件。默认 `minutes` 为 50，默认 `command` 为 `auto-handoff:handoff`（写命令时不含前导斜杠）。在 Claude Code 内配置：

```
/plugin configure auto-handoff
```

或在 shell 中直接写入配置值：

```
echo '{"command": "my-plugin:my-handoff"}' | claude plugin configure auto-handoff@auto-handoff --values-stdin
```

3. 若换成自己的交接命令，必须让它能在无人值守下跑通：给它 `allowed-tools` 预批准它会调用的工具，或把会话放在允许写入的权限模式下。否则模型一旦调用未预批准的工具，这个 turn 会卡在权限提示上直到你回来。

4. 了解默认交接行为：默认命令 `/auto-handoff:handoff` 是插件自带的 skill，也可以手动运行。它会写 `docs/handoffs/<timestamp>-<slug>.md`，内容覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions；为此它会运行 `date` 和 `git status`，然后只写这一个文件，不做任何提交。由于运行时没人能回答权限提示，它通过 `allowed-tools` 为自己预批准这些工具，在默认权限模式下即可完成。

5. 了解触发与取消规则：空闲计时从主对话的一个 turn 结束开始，任何新 turn 都会重置计时（无论谁发起）；subagent 结束不影响计时。空闲达到 `minutes` 后，插件像你亲手输入一样执行 `command`，并弹出一条提示。每次离开只交接一次，之后直到你主动发提示或跑命令前都保持安静；后台任务回报或定时触发不会打断这份安静。`/clear` 会取消待执行的交接。笔记本休眠错过等待时间后，插件会发现计时器晚触发，从而跳过交接（因为那时执行要付它本要避免的全价）。

6. （可选，本地开发/试用改动）把仓库链到 skills 目录：

```
git clone https://github.com/obie/auto-handoff ~/projects/auto-handoff
ln -s ~/projects/auto-handoff ~/.claude/skills/auto-handoff
```

Claude Code 下次会话启动时会把该文件夹加载为 `auto-handoff@skills-dir`，保存文件时重载 hooks 模块。校验与测试命令：

```
claude plugin validate .
claude plugin test .
```

部件说明：`hooks/register.ts` 是 hooks 模块（在 `turn.complete` 武装空闲计时器，在 `turn.start` 取消）；`types/index.d.ts` 声明模块保存在 `$.state` 里的两个值；`skills/handoff/SKILL.md` 是自带交接 skill；`tests/` 在模拟时钟下用 `claude plugin test` 运行。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- 能力发现：原文把“跨会话延续上下文、写交接文档”这件事从人的记忆负担变成了自动动作——插件会在你离开后自行生成 handoff。文档结构（goal/status/decisions/dead ends/files/verification commands/next steps/open questions）本身也可以直接借用，作为你让别人（或别的 AI）接手任务的模板。
- 任务匹配：适用对象是 Claude Code 会话；载体是 function hooks 插件 API + 一个 slash command/skill。默认用插件自带的 `/auto-handoff:handoff`，也可换成自己的命令（`command` 配置项）。适合长时间、上下文成本高、需要跨会话续接的工作。
- 条件供给：需要安装插件、配置 `minutes`/`command`；交接 skill 依赖 `date`、`git status`（因此需要在有 git 仓库的目录下工作）；若用自定义命令，需为其配置 `allowed-tools` 或放宽权限模式，否则无人值守时会卡在权限提示。
- 主动推进：这是该线索的核心——由时间/空闲状态触发（默认 50 分钟无 turn 后自动执行），每次离开只触发一次，`/clear` 可取消，子 agent 结束不重置计时，休眠迟到则跳过。
- 效果验证：原文没有给出任何量化指标或对照实验，只主张长会话下重读“又慢又贵”。验证方式需要自行设定（见最后一节）。

## 与已有做法的关系

清单中相关条目只有 `Claude Code`（tool，状态 adopt）。auto-handoff 是 Claude Code 的一个插件，扩展其跨会话连续性能力，不替代 Claude Code 本身；它补充的是“会话空闲后自动落盘交接文档”这一环，清单里没有其他相关条目。

## 证据与局限

原文给出的可核对信息：安装/配置/开发命令、默认值（`minutes`=50、`command`=auto-handoff:handoff）、交接文件路径与字段清单、触发与取消规则、开发测试于 Claude Code 2.1.289、MIT 许可、仓库 35 stars。

属于作者主张、未给数据支撑的部分：缓存过期后重读“又慢又贵”、50 分钟这一默认值的合理性、交接带来的实际收益。原文没有任何成本或时延量化对比。

明确的局限：

- 默认 50 分钟依赖一小时缓存。若会话已降级到五分钟缓存（原文提到发生在 usage overage 时），需要把 `minutes` 调得小得多；插件无法判断会话用的是哪种缓存。
- 交接本身也是一个 turn，其中每个模型请求都付出一次对整段对话的缓存读，并且这个 turn 会让缓存再热一小时。
- 计时器活在 Claude Code 进程里，退出 Claude Code 即停止。
- 若模型调用了命令未预批准的工具，该 turn 会停在权限提示上直到你回来。
- 基于 early access 的 function hooks API，可能在 Claude Code 版本间变化。

适用条件：Claude Code 环境、有 git 仓库的工作目录、接受为交接 turn 支付一次缓存读成本、且能保证交接命令的工具都被预批准。

## 怎么试、怎么验证

最小试用方式：

1. 在一个真实的、有 git 仓库的长任务会话里安装插件，先用默认配置（`minutes`=50）。若不想等 50 分钟，可临时把 `minutes` 调小（原文未给出安全的短值，需你自己权衡；注意默认值是为匹配一小时缓存设计的）。
2. 做一段有明确目标和未完事项的工作，然后离开/停止交互，等待触发。
3. 检查 `docs/handoffs/` 下是否生成了 `<timestamp>-<slug>.md`，以及是否覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions。
4. 开一个新会话，只读这份 handoff，看能否在不重新浏览整段对话的情况下接着干。

判断有没有改善的指标（原文未提供基准，需自行记录对照）：

- 是否按预期只触发一次、且未在你离开期间被额外 turn 打断或反复触发。
- 新会话恢复上下文所需的时间和你手动补充说明的次数（应下降）。
- 交接 turn 的成本与新会话从冷缓存重读全部对话的成本对比（前者应为一次缓存读）。
- 交接文档的可用性：next steps / open questions 是否足够具体到能照着做。
- 失败信号：出现权限提示卡住、计时器因退出 Claude Code 而未触发、休眠迟到被跳过导致你回来时没有交接文件。
