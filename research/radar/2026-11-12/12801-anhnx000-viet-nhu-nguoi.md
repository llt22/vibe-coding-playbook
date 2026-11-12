# anhnx000/viet-nhu-nguoi

- 结论：**值得一试**。建议在越南语写作流程中小范围试用：安装该 Claude Code skill，按“提供受众与真实事实→生成/改写→scan 定位→check_facts 核对→人工复读”的闭环执行；它的步骤和脚本具体可照做，但评分来自自带扫描器、缺少独立验证，且主要面向越南语，暂不宜直接定为全团队标准。
- 原文：https://github.com/anhnx000/viet-nhu-nguoi
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T08:30:59.188Z

## 是什么
这是一个面向越南语的 Claude skill，README 称也支持英语。它把 AI 起草的邮件、报告、幻灯片、社媒文章按“像人写的”规则改写，并附带 0–100 分扫描器和事实核查脚本。安装后可作为 Claude Code 的 skill/plugin 使用，也可通过通用 skills 工具装到 Cursor、Codex、Gemini CLI、OpenCode。原文强调分数只反映文本套模板的程度，不能判断是否 AI 写的，也不保证绕过 AI 检测器。

## 具体做法
1. 准备运行环境。前提：使用能读写本机 skill 目录的本地 AI 助手，例如 Claude Code 桌面版、Codex、Cursor、Gemini CLI、OpenCode；浏览器里的 Claude 或 ChatGPT 不能安装本机 skill。脚本需要 Python 3，且只依赖标准库。
2. 让助手安装。最省事的方式是在本地助手聊天框粘贴：
```
Cài giúp tôi skill viet-nhu-nguoi từ https://github.com/anhnx000/viet-nhu-nguoi
```
然后按提示同意下载和安装。README 说通常不到一分钟。
3. 或用命令行安装。前提：机器有 npx：
```
npx skills add anhnx000/viet-nhu-nguoi -g -y
```
在 Claude Code 中也可按插件安装：
```
/plugin marketplace add anhnx000/viet-nhu-nguoi
/plugin install viet-nhu-nguoi@viet-nhu-nguoi
```
或用 git 克隆后运行安装脚本：
```
git clone https://github.com/anhnx000/viet-nhu-nguoi.git ~/viet-nhu-nguoi
bash ~/viet-nhu-nguoi/install.sh --copy
```
Windows 无 bash/git 时，README 建议下载 main.zip，解压后把 `skills/viet-nhu-nguoi` 复制到 Claude Code 的用户级 skill 目录。
4. 验证安装。新开对话问：
```
Máy tôi có skill viet-nhu-nguoi chưa?
```
再试一条写作任务：
```
Viết như người: soạn giúp tôi email xin sếp lùi hạn nộp báo cáo 3 ngày, xưng em
```
若返回邮件简短、直接进入正事、全篇用“em”，说明 skill 已生效。
5. 日常调用。可以直接像吩咐同事一样说任务，例如“Làm slide báo cáo tiến độ dự án tuần này để sếp duyệt”“Sửa file bao-cao-q3.pptx cho bớt giọng AI”“Soi giúp đoạn này chỗ nào giọng AI”。要覆盖整段对话时输入：
```
/viet-nhu-nguoi
```
6. 给足写作条件。每次至少说明：谁读、你和对方什么关系/如何称呼、要对方做什么决定、是当面讲还是发过去读。再贴一段你自己写的同类文字让 skill 学句长和用词；数字、姓名、日期给真实值，缺的地方让它留空或追问，不要让它补编。看到不对就说“mình không nói thế”，README 称 skill 会在当前对话内记住调整。
7. 先扫描再改写。在仓库根目录执行，前提是文件为 `.md`、`.txt` 或 `.pptx`：
```
python3 -I skills/viet-nhu-nguoi/scripts/scan.py file.md
```
常用选项：`--json` 输出机器可读结果；`--max 30` 在分数超过 30 时以退出码 1 结束，可用于 CI 或 pre-commit；`--meta` 跳过引用、表格、引号内文字；`--titles` 只列标题；`--text` 打印 pptx 每页文字和备注。
8. 改写后做事实核查。前提：保留改写前原件：
```
python3 -I skills/viet-nhu-nguoi/scripts/check_facts.py goc.md moi.md
```
两个 `.pptx` 也可比较。脚本会报告数字、日期时间、链接、代码是否丢失或被新增，缺少专名会提醒。
9. 人工复读扫描结果。不要只追求 0 分；先看扫描器标出的位置，再判断是否真的不自然。重要幻灯片可让另一个不了解背景的 AI 助手读一遍，按 7 个标准打 70 分制，再由人决定采纳哪些意见；README 只说明有这个流程，未在摘要中展开 7 个标准的具体内容。

## 对应的研究问题
- 能力发现：原文列出可直接交给 AI 的具体写作任务：把 AI 草稿改成越南语人味、把幻灯片标题改成结论句、按上下级/客户关系固定称呼、清理从英文翻译来的生硬句式、写 Facebook/LinkedIn/博客草稿、发前审查 AI 腔。还能量化扫描 `.md`/`.txt`/`.pptx` 并核对事实。
- 任务匹配：适合越南语（README 英文版称也支持英语）的邮件、报告、幻灯片、社媒长文和译文润色；适合本地 Claude Code 类助手，也可通过通用 skills 装到 Cursor、Codex、Gemini CLI、OpenCode。不适合浏览器端无法装 skill 的聊天场景；也不适合拿分数当 AI 检测器。
- 条件供给：需要提供读者身份与称呼关系、任务目的、真实数字/姓名/日期、同类自写样本、对不自然句子的即时反馈；工具上需要本地 agent 的安装权限、Python 3 标准库、待处理文件；权限上 skill 只读写本地文件与所用模型，不联网收集数据。
- 主动推进：原文给出有限触发方式：`/viet-nhu-nguoi` 可对整段对话持续生效；以你名义写邮件、消息、帖子时 skill 会自动启用；`scan.py --max 30` 可放进 CI 或 pre-commit，在文件分数超阈值时失败。没有给出定时任务或长期后台监控方案。
- 效果验证：提供两层验证：`scan.py` 给 0–100 分并列出命中的 AI 文风标记；`check_facts.py` 对比原稿和改稿，检查数字、日期、链接、代码是否保持一致。原文还给了改写前后分数和案例，但分数是自带扫描器自评，不能证明文本质量或是否 AI 所写，仍需人工复读。

## 与已有做法的关系
- 清单中的 Claude Code 状态为 adopt：本仓库就是一个 Claude Code skill/plugin，可直接补进 Claude Code 的写作工作流，尤其是越南语邮件、报告和 pptx。
- 清单中的 Cursor、OpenCode 状态为 watch：README 说可用 `npx skills add anhnx000/viet-nhu-nguoi` 装到 Cursor、Codex、Gemini CLI、OpenCode，但这只是通用 skill 安装路径，是否稳定和体验如何需自行小范围验证。
- 清单中没有“越南语去 AI 腔”“写作扫描评分”“改稿事实核查”这类条目；本线索可作为写作质量验证环节的补充。

## 证据与局限
- 原文给出的数据：邮件样例从 84/100 降到 0/100，幻灯片从 48/100 降到 0/100，长文从 55/100 降到 0/100；邮件样例原文称 17 个标记、5 行、110 词；幻灯片样例 21 个标记、7 页、176 词。还给出 62 类 AI 文风标记、9 类越南语特有例子、扫描命令输出样例。
- 案例来自仓库自带 examples 和作者自述；没有第三方评测、用户研究或与其他工具对照。分数由同一套扫描器给出，存在自评循环；README 也承认分数只能参考，不能判断是否 AI 写的，不能保证躲过 AI 检测器。
- 适用条件：主要是越南语写作，README 英文版称支持英语但正文证据集中在越南语；适合邮件、报告、幻灯片、社媒文章和译文润色；需要本地 agent 和 Python 3；事实核查要求有原稿可比。
- 原文明确反对用 skill 代写作业、冒名或拿标记列表断定别人用 AI。扫描器对 `.md`、`.txt`、`.pptx` 有效，其他格式需先转换。

## 怎么试、怎么验证
- 最小试用：选一小批真实且不敏感的越南语写作任务，覆盖一封邮件、一份报告或长文、一份 pptx，保留改写前原件。先记录不用 skill 的基线，再安装 skill 按第 5–8 步执行：给受众和事实、生成/改写、scan 扫描、check_facts 核对、人工复读。
- 看四项指标：1）scan 分数和命中标记是否下降，尤其是标题标签化、翻译腔、空动词、虚假对立等；2）check_facts 是否零丢失、零新增数字/日期/链接/代码，专名是否保留；3）盲评自然度、称呼正确性、标题是否先给结论、是否出现编造事实；4）从初稿到可发送的修改时间是否下降。
- 判定改善：只有 scan 下降且事实核查通过、盲评认为更自然更符合角色、修改时间不升，才保留进流程；若分数下降但人读更差，或事实核查频繁报错，就退回只把 skill 当审查提示，不自动改写。不要用 scan 分数判断文本是否 AI 生成。
