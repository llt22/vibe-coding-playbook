# Kemerd/claude-hardware-in-the-loop

- 结论：**值得一试**。建议先在硬件/PCB-CAD-固件这类“可由脚本生成、可用门禁验证”的小项目上试用：按 README 的 Quick start 安装 Claude Code skill、跑 example，再替换成自己的小板；理由是把 Claude Code 放进生成、门禁、CI、人工复核的固定流程里，有具体命令和模板，但输入只有 README，关键细节在未提供的 docs 中，不能直接 adopt。
- 原文：https://github.com/Kemerd/claude-hardware-in-the-loop
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-04T18:22:12.623Z

## 是什么
据仓库 README，这是一个面向硬件工程的 Claude Code skill、方法说明和可运行项目骨架：板子是 Python 脚本声明的数据，经统一 pipeline 生成 KiCad 原理图、布线板、fab set 和 STEP；外壳/装配体用 CadQuery builder 导出质量与重心；固件控制核心避开 vendor header，同一份代码既编译到目标板，也编译到 PC 上的数字孪生。

它强调“agent 在笼子里工作”：ERC/DRC、live distributor 检查、no-shortcut audit、CI 回归对比、host 测试、twin 场景 sweep 等门禁通过后，`main` 才移动。README 明确说这不是 all-in-one 产品，而是起点，需要替换成自己的板子、模型、场景和门禁。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
1. 前提：已安装 Claude Code，目标仓库可用 git。把 skill 安装到项目或用户 skills 目录。README 原文命令：
```bash
git clone https://github.com/Kemerd/claude-hardware-in-the-loop
# per project:
mkdir -p <your-repo>/.claude/skills && cp -r claude-hardware-in-the-loop/skills/hardware-in-the-loop <your-repo>/.claude/skills/
# or for every project: copy the same folder into the skills folder of your Claude Code user config
```

2. 前提：在项目里打开 Claude Code。用 README 给出的提示词触发 onboarding：
```text
set up a hardware project with the hardware-in-the-loop method
```
README 说该 skill 会先说明 token 成本、询问使用哪种模式，再跑 onboarding interview（目标、预算、数量、打印材料、紧固、外壳密封、fab vendor、MCU、仿真层级与 GPU、机器限制），然后用 `scripts/scaffold.py` 写 skeleton，建立 `main` 和 `dev`，并验证或安装工具。

3. 前提：想手工复现；`answers.json` 需按 `skills/hardware-in-the-loop/references/interview.md` 的格式填好；下面命令是 README 原文，执行目录要能让 `skills/...` 路径可达。Windows/PowerShell 路径：
```bash
python -I skills/hardware-in-the-loop/scripts/scaffold.py --answers answers.json --dest <your-repo> --with-examples
pwsh -File skills/hardware-in-the-loop/scripts/setup_tools.ps1 -ToolsRoot D:\hiltools -VerifyOnly
cd <your-repo> && pwsh -File windows/ci.ps1
```
README 把工具、固定版本和 hash 放在 `docs/TOOLS.md`；文件树里另有 `setup_tools.sh`，但 Quick start 没有给出对应命令。

4. 前提：skeleton 已生成。把它改成自己的项目：替换 example board、enclosure、firmware core 和 twin plant；增加本领域需要的检查；上 fab 前人工打开 CAD 和板子，让 agent 对每个 part 和每个数字解释“为什么”，并让一个“拿到文件、不拿结论”的新 agent 对 schematic、layout、BOM、CAD、firmware 做 adversarial review。README 原话是 green gates 只代表“存在的检查通过了”，不能替代工程师查看。

5. 前提：板子按“Python 脚本即设计”的方式写。让统一 pipeline 跑 12 个步骤，不要在 KiCad 里手改 `.kicad_pcb`；pipeline 在第一个错误处停止。README 说只有 ERC 为 0/0、最终 DRC 在 KiCad 默认严重度下为 0 violations / 0 unconnected / 0 parity items、每条采购行都 live resolve 到原理图指定的 MPN 时，才写 fab 文件。确定性靠 hashed string order、uuid5 schematic UUID、seeded board KIID、frozen route 实现，目标是跨运行 byte-identical 的 `.kicad_pcb`。

6. 前提：多 agent 或长任务时使用它的“笼子”规则。agent 在 git worktree 工作，所有 lane 都落到 `dev`（包括红门禁），`main` 只在该 commit 的 CI 报告全绿且零回归时提升；重任务拿 slot，slot 门控 RAM 和 CPU；长链 detached 运行，watcher 在成功和失败时唤醒 agent；未提交工作每 20 分钟快照；usage tripwire 触发时所有 agent 停止、push、写 resume document。README 明确建议默认用 single session、不用 subagent；swarm 要“有意识地选”。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
- 能力发现：README 声称 agent 可以设计 PCB（从 Python 数据到 KiCad 原理图、布线、fab set、STEP）、设计 CadQuery 外壳/装配体、写带 host suite 和数字孪生的固件，并能在夜间无人值守跑长链。它来自一个私有 multi-board 项目，agent 在这些门禁下做了数周 PCB、CAD 和固件；但这是作者自述，项目细节已移除。
- 任务匹配：明确绑定 Claude Code skill；默认 single session 逐步做，长机器任务 detached；swarm 是 lead agent 加并行 lane agents，成本高，只在有意选择时用。重任务用 slot 门控 RAM/CPU；review notes 可由 viewer 落到 JSONL，供下一个 agent 读取。README 指向 `docs/SWARM.md` 的角色、wave、brief、skeptic、integrator，但输入里没有该文档正文。
- 条件供给：信息上要过 onboarding interview，覆盖目标、预算、数量、打印材料、紧固、外壳密封、fab vendor、MCU、仿真层级与 GPU、机器限制；手工路线要 `answers.json`。工具上需要 KiCad 10、CadQuery 2.x、Freerouting、Claude Code，按需 CMake、编译器、Unreal >= 5.8.4、Isaac Sim、CUDA；`setup_tools.ps1` 负责固定版本工具链，`check_twin_tools.ps1` 查找工具。权限/环境上要 git worktree、`dev`/`main` 分支、merge lock、slot、detached job、watcher、WIP backup、usage tripwire。反馈上靠 ERC/DRC、live distributor 检查、no-shortcut audit、CI 回归、host suite、twin 场景、bench register 和人工 adversarial review。
- 主动推进：README 给出多种触发/状态机制：detached night chains 每步有 slot 和 timeout；watcher 在成功、失败、hang、crash 时唤醒 agent；usage tripwire 在额度将尽时让 agent 停止、push、写 resume document；未提交工作每 20 分钟快照；morning questions 带已采取的默认答案；`main` 只在 CI 绿且零回归时提升。这些属于时间、事件、状态触发的持续执行，不只是“人工每步叫一下”。
- 效果验证：README 给出的硬指标包括 ERC 0/0、最终 DRC 0 violations / 0 unconnected / 0 parity items（KiCad 默认严重度）、每条采购行 live resolve 到 MPN、no-shortcut audit 对新 stub、canned success、admitted guesses 失败、CI matrix 带 regression compare、`main` 只接受 exact commit 全绿且零回归。测试退出 0 但没有 summary line 算失败，空 suite 算失败；host suite 有 165 个 host checks、20 次 scenario runs、determinism 和 Python 侧 ABI 测试；Unreal 自动化测试的 trace hash 与 native runner 相等。示例板 README 一处说 12 步 21 秒，另一处 skeleton 表说约 15 秒，存在不一致。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
- Claude Code（adopt）：这是直接依赖和扩展。它把 skill 放进 `.claude/skills/`，用 Claude Code 做 agent runtime，并额外加硬件生成 pipeline、门禁、CI、worktree、slot、watcher、usage tripwire 和 handoff。
- ripwire（watch）：README 没有提到 ripwire，也没有把它用于代码检索或审计；清单中这一条与本仓库没有可见关系。
- arXiv（try）：有间接关系。仓库的 `CITATION.md` 要求每个模型来源经 Crossref / arXiv / publishers 核验（README 说 16 行），`references/research-citations` 也讲如何查找、核验和引用来源；但 README 没有给出具体论文或 arXiv 使用流程，不能把它当成 arXiv 条目本身的实践证据。
- 清单中没有直接对应 KiCad/CadQuery/HIL 门禁的条目；最相关的是 Claude Code。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
证据方面：README 给了可执行 Quick start、scaffold/setup/CI 命令、项目骨架文件表、implemented vs roadmap 表，以及若干具体数字和案例：示例板 12 步 21 秒（另一处约 15 秒）、165 个 host checks、20 次 scenario runs、Unreal 5.8.4 headless 自动化测试通过且 trace hash 与 native 相等、一个 distributor code 本以为是 0402 却解析成 0603、被 live check 拦住、40 条 lessons、一次 swarm day 烧 4-5 million tokens、lane agents 各带 300-800k tokens 上下文。

局限方面：输入只有 README，没有 `docs/METHOD.md`、`docs/PCB.md`、`docs/LESSONS.md` 等正文，无法核验 12 步 pipeline 的具体参数、interview schema、CI 实现和 40 条 lessons 的可操作性；README 说项目来自无法公开的私有工作流，证据主要是作者自述。implemented vs roadmap 表明确列出未建部分：DESIGN_STANDARDS 的机器检查器、fine-pitch escape 的 in-house completion router、BGA fan-out、panelization、精确接触面积的干涉检查、register-level device models、lockstep RTOS shim、rendered sensor models、bench-versus-twin 对比工具、viewer 的铜层/线束间隙/弯折半径/测量/爆炸图/构建 diff。Isaac Sim harness 写明“written against API and not run here”，ChaosTorque 的 acceptance run 还是项目第一步；所以不能把这些当已验证能力。README 反复说 green gates 只证明已有检查通过，不是工程师替代品；示例板时间数字也不一致。许可证是 HIL-ASA-1.0，非 OSI 开源，卖工具本身有限制，商用设计自己的产品可以但需保留 credit。适用条件是硬件工程，且产物能由代码生成、能被自动门禁验证；对没有可自动验证产物的知识工作，只能借鉴其“生成器 + 门禁 + CI + 人工复核”的结构，不能照搬 KiCad/CAD 细节。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
最小试用：选一个低风险、可丢弃的 2 层 breakout 或一个小外壳/一段固件控制核心，建独立仓库；按 Quick start 安装 skill，先用 `--with-examples` 跑通 example 和 `windows/ci.ps1`；再用自己的小板替换 example board，只加一个 enclosure 或一个固件 host suite，保持 single session，不开 swarm。不要直接下单真实板；先让 agent 解释每个 part/数字，并做一次 fresh-agent adversarial review。

判断指标：
1. 门禁通过率：ERC 是否 0/0，最终 DRC 是否 0 violations / 0 unconnected / 0 parity items，live distributor 是否每条采购行都解析到正确 MPN，no-shortcut audit 是否无新增 stub/guess。
2. 提前发现错误：在人工 review 或 fab 之前，pipeline 拦下多少个真实错误（如封装/MPN 不符、未连接、DRC 违规），对比不用该流程时同类错误的数量。
3. 确定性与可复现：同一输入跑两次，`.kicad_pcb` 是否 byte-identical；host suite 是否有可解析 summary line 且 suite 非空；twin scenario 的 determinism hash 是否稳定。
4. 效率与成本：从 scaffold 到首个 green fab set 的时间；单任务 token 成本；single session 与 swarm 的成本/产出对比；人工 review 分钟数；中断后能否从 WIP snapshot 和 resume document 恢复。
5. 人工信任：adversarial review 是否发现门禁漏掉的阻断问题；green gate 的 false positive/false negative 有多少；工程师是否愿意基于该结果签核。

最小成功标准可定为：一个真实小板从 scaffold 跑到 green fab set；两次运行输出一致；所有采购行 live 验证通过；audit 无新增 stub/guess；CI 零回归；人工复核未发现被门禁漏掉的阻断问题。达不到就只保留其 harness/门禁思路，不进入 adopt。
