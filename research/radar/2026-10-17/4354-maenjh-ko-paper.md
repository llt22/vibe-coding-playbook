# maenjh/ko-paper

- 结论：**值得一试**。先小范围试：按 README 把 ko-paper 装成 Claude Code / Codex 的 skill，用一篇 2 页公开论文验证版式、公式、术语一致性与 token 消耗，再决定是否把「PDF 版式保持翻译」这类流程纳入自己的文档处理链路。理由：原文给出了可直接复制的安装命令、CLI/网页用法、术语表 CSV 格式和缓存/并发等参数，属于可照做的具体流程，但输出语言固定为韩语、证据全部来自作者自述，因此不宜直接 adopt。
- 原文：https://github.com/maenjh/ko-paper
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-17T10:46:50.792Z

## 是什么

ko-paper 是一个开源（AGPL-3.0-or-later）工具，把外语论文 PDF（默认英语，另支持德语、法语、日语等 10 种）翻译成韩语 PDF，并尽量保留图、表、公式的原有位置。

分工方式很明确：

- **版式处理交给 BabelDOC**（另一个开源项目），它负责解析 PDF 结构、定位图/表/公式、回填译文。
- **翻译交给 Claude**（通过本地已登录的 Claude Code，`claude -p`）或 Codex（`codex exec`）。
- 两者被封装成一个 **Claude Code / Codex skill**，装好后说一句「이 논문 번역해줘（帮我翻译这篇论文）」即可触发。
- 另外提供网页 UI（固定监听 `127.0.0.1:8787`）和 CLI 两条入口。

对「把 AI 用到最好」这个项目来说，它的价值不只在翻译本身，而在于示范了一种**把多步骤工具链（版面解析 + 大模型翻译 + 缓存 + 术语表 + 队列）封装成 agent skill 的做法**，以及一段「让 agent 自己把多步安装跑完」的提示词模板。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 1. 确认前提

- 已登录的 Claude Code（`claude`）**或** Codex，二选一即可；
- 已安装 `uv`；
- 已安装 `git`；
- Windows 上若没有 git，先执行：

```powershell
winget install --id Git.Git -e
```

BabelDOC 和 Python 依赖在第一次运行时自动安装。翻译后端会自动选择：有 `claude` 就用 Claude Code，只有 `codex` 才用 Codex。

### 2. 安装成 skill（推荐路径）

**2a. 把安装这件事直接交给 agent** —— 原文给了一段可原样粘贴到 Claude Code 或 Codex 的提示词，明确要求「不要问我，直接装完」：

```text
ko-paper(https://github.com/maenjh/ko-paper)를 이 컴퓨터에 설치해 줘. 나에게 질문하지 말고 끝까지 진행해.
1. 운영체제를 직접 확인해(uname 또는 $env:OS). 사용자에게 묻지 않는다.
2. macOS·Linux면 실행:
   curl -fsSL https://raw.githubusercontent.com/maenjh/ko-paper/main/install.sh | bash
   Windows PowerShell이면 실행:
   irm https://raw.githubusercontent.com/maenjh/ko-paper/main/install.ps1 | iex
3. 네트워크나 샌드박스 때문에 막히면 권한 상승을 요청해 같은 명령을 다시 실행해.
4. 출력 끝에 "kopaper ready"가 나오면 성공. 실패 줄(✗ 또는 [x])이 있으면 그 안내대로 직접 고치고
   ko-paper doctor 로 다시 확인해. 로그인처럼 내가 브라우저에서 해야 하는 일만 마지막에 한 줄로 알려 줘.
5. 끝나면 설치된 위치와 "에이전트를 다시 시작하면 '이 논문 번역해줘'로 쓸 수 있다"만 짧게 알려 줘.
```

这段提示词本身是可复用的模板：让 agent 自己探测环境、装完、自检、只把需要人工做的事（登录）回抛给人。

**2b. 用插件市场装（Claude Code）**

```text
/plugin marketplace add maenjh/ko-paper
/plugin install ko-paper@ko-paper
```

**2c. 用脚本装**（下载到 `~/.ko-paper/src`，并给找到的每个 agent 各复制一份 skill）

```bash
curl -fsSL https://raw.githubusercontent.com/maenjh/ko-paper/main/install.sh | bash
# 只装一个：  ... | bash -s -- --claude   或   ... | bash -s -- --codex
```

**2d. Windows（PowerShell）**

```powershell
irm https://raw.githubusercontent.com/maenjh/ko-paper/main/install.ps1 | iex
# 同时装 Claude Code：  $env:KOPAPER_WITH="claude-code"; irm .../install.ps1 | iex
# 同时装 Codex：        $env:KOPAPER_WITH="codex"; irm .../install.ps1 | iex   （需要 Node.js）
# 只装一个：            $env:KOPAPER_AGENTS="claude"  或  "codex"
```

Windows 上 Claude Code 通过 Git Bash 执行命令，因此 skill 用 `kopaper.sh`；Codex / PowerShell 下用 `kopaper.ps1`。

**2e. 更新**：`ko-paper update`，或重跑安装命令（只重装最初安装的那个 agent）。

### 3. 自检

```bash
ko-paper doctor
```

输出末尾出现 `kopaper ready` 即成功；出现 `✗` 或 `[x]` 按提示修复后重新 doctor。doctor 会实际尝试加载编译好的模块，被系统策略拦截时会直接报出拦截事实而不是谎报 ready。

### 4. 使用（三种入口）

**4a. 在 Claude Code 里直接用自然语言（skill 方式）**

```text
~/Downloads/attention.pdf 이 논문 번역해줘
1~3쪽만 한글본으로 뽑아줘
~/Downloads/aufsatz.pdf 독일어 논문인데 한글로 번역해줘
```

结果生成在输入文件旁边：`<文件名>.ko.pdf`（韩语本）与 `<文件名>.ko.dual.pdf`（原文对照本）。以 skill 方式运行时，缓存、术语表、任务日志落在 `~/.ko-paper/data`。

**4b. 命令行**

```bash
ko-paper                                   # 打开网页 UI
ko-paper translate ~/Downloads/paper.pdf   # 终端直接翻译
```

手动安装后的 CLI 示例（原文给的完整参数）：

```bash
.venv/bin/kopaper translate paper.pdf                # paper.ko.pdf + paper.ko.dual.pdf（生成在输入旁边）
.venv/bin/kopaper translate a.pdf b.pdf -o out/      # 多篇，指定输出目录
.venv/bin/kopaper translate paper.pdf -p 1-3 --mono-only
.venv/bin/kopaper translate paper.pdf -m opus        # 换模型（默认 sonnet）
.venv/bin/kopaper translate aufsatz.pdf -l de        # 德语论文（原文语言，默认 en）
.venv/bin/kopaper translate paper.pdf -g my_terms.csv  # 用自己的术语表（优先级最高）
.venv/bin/kopaper serve --proxy-only                 # 只起代理（127.0.0.1:8787）
```

代理没起时 `translate` 会自动拉起。

**4c. 网页 UI**

```bash
.venv/bin/kopaper serve --open    # 打开 http://127.0.0.1:8787/
```

- 拖入 PDF 进队列，一次翻译一篇；
- 可选手写原文语言，输出固定为韩语；
- 实时显示阶段名、进度、已用时间、剩余时间估计；
- 完成后可看韩语本、下载韩语本/对照本/术语表；进行中可取消，完成可删除、重译；
- **术语表编辑**：在已完成任务里打开该论文术语表，改完点「保存后重译」，只重译受影响的段落；
- 顶部显示最近 5 小时内 ko-paper 发出的 Claude 调用次数与 token 数；触限时告警并自动重试（订阅剩余额度 Claude 不公开，无法显示）；
- 服务只监听 127.0.0.1，并通过 Host / Origin 检查阻止其他站点调用；
- 任务记录在 `data/web_jobs.sqlite`，文件在 `data/web/<任务 ID>/`；重启服务会把进行中的任务标记为失败。

### 5. 术语表（可直接照抄的格式）

CSV 列为 `source,target,tgt_lng`。冲突优先级：

1. `-g` 传入的用户术语表；
2. 网页上改过的论文级术语表 `data/glossaries/<paper_id>.user.csv`（存在时替代自动抽取的术语表）；
3. 领域术语表 `glossary/<domain>.csv`（`-d` 选择，默认 `cs_ml`）；
4. 论文级自动抽取术语表 `data/glossaries/<paper_id>.csv`。

首次整篇翻译时 BabelDOC 自动抽术语并存下来；同一文件再翻会复用并跳过抽取步骤，术语不会每次变，token 约省 30%。只翻部分页面的那次运行不保存术语。自动抽取会过滤掉会议/机构/出版社名等应保持原文的专有名词。

### 6. 关键环境变量（照抄即用）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `KOPAPER_BACKEND` | `claude-code` | `claude-code`、`codex`、`anthropic-api`（skill 按已装 CLI 自动选） |
| `KOPAPER_CODEX_MODEL` | Codex 默认模型 | `codex` 后端的模型 |
| `KOPAPER_CODEX_EFFORT` | `low`（选 opus 时 `medium`） | `codex` 后端的推理强度 |
| `KOPAPER_PORT` | `8787` | 代理端口 |
| `KOPAPER_MAX_CONCURRENCY` | `4` | 并发 Claude 调用数 |
| `KOPAPER_EFFORT` | `medium` | API 后端的 effort |
| `KOPAPER_EXTRA_MATH_FONTS` | Cambria Math | 视为公式的字体名正则 |
| `KOPAPER_DATA` | `./data`（skill 为 `~/.ko-paper/data`） | 任务、缓存、日志位置 |
| `KOPAPER_MERGE_TABLE_CELLS` | `1` | 设 `0` 关闭表格单元格合并 |
| `KOPAPER_TABLE_LINE_SKIP` | `1.15` | 表格单元格内行距 |

### 7. 手动安装（不用 skill，走 CLI / 网页）

前提：已登录 Claude Code（运行 `claude` 后 `/login`）。

```bash
uv tool install --python 3.12 "babeldoc==0.5.24" --with "bitstring<5"   # 版式修正对应这个版本
uv sync                                                                  # 在本仓库内
uv sync --extra api                                                      # 需要 API 后端时
```

### 8. Windows 遇到 Smart App Control（SAC）拦截时

症状：

```text
ImportError: DLL load failed while importing _mupdf: 애플리케이션 제어 정책에서 이 파일을 차단했습니다.
```

原文的建议是**不要关 SAC**，二选一：

- **简易模式（免安装）**：在 Claude Code / Codex 里以 skill 请求翻译，doctor 检测到拦截时，agent 不走 BabelDOC 直接翻译，产出 `<文件名>.ko.lite.pdf`（用 Edge 生成）。保留原文结构（标题、段落、表格、图注、公式），但不保留原始版式（双栏、页面位置）与图片。说「간단히 번역해줘 / 설치 없이 번역해줘」也可在其他系统触发。
- **WSL（保版式，推荐）**：

```powershell
wsl --install          # 在管理员 PowerShell 里执行，结束后重启
```

重启后打开 Ubuntu，执行 macOS/Linux 安装命令并登录：

```bash
curl -fsSL https://raw.githubusercontent.com/maenjh/ko-paper/main/install.sh | bash -s -- --with-codex   # Claude 订阅则 --with-claude-code
codex login            # Claude 则 claude auth login
ko-paper               # 浏览器没自动打开就访问 http://127.0.0.1:8787
ko-paper translate /mnt/c/Users/<名字>/Downloads/paper.pdf   # Windows 的 C: 盘在 /mnt/c
```

结果 PDF 生成在原文件旁（Windows 文件夹里）。WSL 里装的 ko-paper 在 Ubuntu 终端里用，与 Windows 侧 Claude/Codex 的 skill 相互独立。

### 9. 给只用 App 的人（无终端）

原文给了一段可粘贴到 ChatGPT / Claude / Codex 应用的提示词，核心是：不问用户、直接给出对应订阅与系统的安装命令；若 App 能执行命令（Claude 桌面版 Code/Cowork、Codex App）就自己装完；ChatGPT/Claude 网页聊天**不支持**在其沙箱里直接翻译（BabelDOC 和本机订阅登录必须在自己电脑上）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现** —— 原文明确说明可以交给 AI 做、但未必想到的具体事项：
- 图内图例与条目名、表头与单元格内容一并翻译，公式与数字保持不动；
- 只译指定页范围（`-p 1-3`）；
- 改术语表后**只重译受影响的段落**，而不是整篇重跑；
- 参考文献区先识别出来、不发给模型，最后在结果 PDF 里还原原文；
- 扫描件（无文本层）在翻译前停下并告知，可用 `--ocr`（实验性、质量低）先 OCR。

**2. 任务匹配** —— 原文给出了明确的后端/模型对照，属于「什么任务用什么模型/工具」的可照抄依据：

| 后端 | 用谁的账号 | 备注 |
|---|---|---|
| `claude-code`（默认） | Claude Code 登录（Claude 订阅） | 每次调用约 0.9k token 开销 |
| `codex` | Codex 登录（ChatGPT 套餐） | 每次调用约 9k token 开销；2 页样例比 Claude 慢约 2 倍 |
| `anthropic-api` | `ANTHROPIC_API_KEY`（按量计费） | 需要 `uv sync --extra api`；对外提供服务只能用这个 |

模型选择（sonnet / opus / haiku）在 `codex` 后端会映射成推理强度（haiku、sonnet → low，opus → medium）。分工上：版式解析交给 BabelDOC（非 LLM），文本翻译交给 LLM——任务切分本身也是可借鉴的匹配方式。

**3. 条件供给** —— 需要提供什么：
- 输入：带文本层的 PDF（否则只能走实验性 OCR 或停下）；
- 账号与权限：本机已登录的 Claude Code 或 Codex（订阅）；`anthropic-api` 后端需要 API Key；
- 词汇约束：术语表 CSV（`source,target,tgt_lng`），支持 `-g` 用户表、网页改过的论文级表、领域表、自动抽取表四层优先级；
- 运行环境：`KOPAPER_DATA` 指定数据目录（缓存/日志/术语表），`KOPAPER_MAX_CONCURRENCY=4` 控制并发，`KOPAPER_PORT` 指定端口；
- 反馈通道：网页 UI 的术语表编辑 +「保存后重译」、doctor 自检、顶部用量显示、rate limit 告警与自动重试、issue 反馈（要求附 OS、安装方式、`ko-paper doctor` 输出）。

**4. 主动推进** —— 原文有依据的部分：PDF 拖入后进入队列、一次一篇顺序执行；实时显示阶段/进度/预计剩余时间；触限自动重试；可取消、可删除、可重译；同一文件重跑走缓存更省；术语表复用后跳过抽取步骤。注意：这属于「事件触发（拖入文件）+ 队列持续推进」，原文**没有**给出按时间或状态自动触发的调度机制，别过度推广。

**5. 效果验证** —— 原文提供的可核对信号：
- `ko-paper doctor` 必须输出 `kopaper ready`，且 doctor 会实际加载编译模块，被拦就报错而不是假装成功；
- 网页头部显示最近 5 小时调用次数与 token；
- 同时产出 `.ko.pdf` 与 `.ko.dual.pdf`，可逐段对照原文检查；
- 术语表复用使 token 约省 30%；重译同一文件走缓存明显更省。

## 与已有做法的关系

清单中相关条目：**Claude Code（工具，状态 adopt）**。本条目可以看作 Claude Code 的一个应用/封装层：

- 它用 Claude Code 的 headless 模式（`claude -p`）作为流水线里的翻译后端，外面套一个本地 FastAPI 代理做缓存、用量记录和并发控制；
- 它把多步骤工具链（BabelDOC + Python 依赖 + 登录）封装成 Claude Code / Codex 的 skill，并给出「让 agent 自己装完、只把浏览器登录回抛给人」的提示词模板——这套「skill 化 + agent 自安装 + doctor 自检」的模式可以直接迁移到其他文档处理任务；
- 除此之外，清单中没有其他相关条目。

## 证据与局限

**原文给出的数据/案例：**
- 31 页论文用 Claude Sonnet 翻译：约 200 次调用、约 67 万 token；
- 2 页样例（作者为 README 专门写的样例论文）：约 40 秒，Claude Sonnet；网页给出样例原文/韩语本/对照本与截图；
- `codex` 后端每次调用开销约 9k token（Claude Code 约 0.9k），2 页样例上比 Claude 慢约 2 倍；
- 术语表复用使 token 约省 30%；
- BabelDOC 版本锁定为 `babeldoc==0.5.24`（配 `bitstring<5`），因为版式修正按该版本对齐。

**属于作者主张、非独立验证的部分：**
- 「图和表按原位置保留、图表内文字也翻译、公式不动」的效果，证据是仓库自带截图与样例文件，均为作者自产，本材料无法独立复核；
- 「版式保真」是尽力而为：作者自己列出已知缺陷——小型大写字母（small caps）标题可能残留原文字符或被破坏，行距很窄的作者行与单位行可能被合并成一个段落；旋转过的坐标轴标签等文字可能仍是原文。这两类问题都源自 BabelDOC 的段落识别阶段。

**适用条件与限制：**
- **输出语言固定为韩语**，对中文使用者而言可直接复用价值有限，真正可迁移的是流程与封装方式；
- 设计为「各人在自己电脑上、用自己账号」的工具：默认后端是本机登录的订阅，**不得**用它起服务给别人用；对外服务必须切 `KOPAPER_BACKEND=anthropic-api`（按量计费）；Web UI 只绑 127.0.0.1；
- **PDF 文本会发往 Anthropic 或 OpenAI**：机密文档、未公开稿件、含个人信息的文档不要用；普通模式不发送参考文献，但简易模式会让 agent 读整个 PDF；
- 翻译本仅供个人学习，再分发前须核对原文许可；工具本身为 AGPL-3.0-or-later（因其加载并 patch 了 AGPL 的 BabelDOC 内部模块），修改后分发或作为网络服务提供需开源；
- Windows 开启 Smart App Control 时无法做保版式翻译（被拦的是未签名的 PyMuPDF 等编译模块；`Unblock-File` 大概率无效），只能走简易模式或 WSL；
- 服务重启会把进行中的任务标记为失败；订阅剩余额度 Claude 不公开，网页无法显示。

**材料本身的局限：** 输入文本为仓库 README，看起来完整（含许可证段落），内容详实、命令与参数齐全；但它是**作者自述**，没有第三方基准测试或独立复现记录，也未见错误率、术语准确率一类质量指标。

## 怎么试、怎么验证

**最小试用（约 10–20 分钟，一次性）：**
1. 找一台个人机器（macOS/Linux 最省事），确认已登录 Claude Code 或 Codex、有 `uv` 和 `git`；
2. 把原文那段「不要问我、直接装完」的提示词粘进 Claude Code，让它自己跑安装；
3. 确认末尾出现 `kopaper ready`，再单独跑一次 `ko-paper doctor` 复核；
4. 用一篇你熟悉的、公开可下载的 2 页论文（有图、表、公式）跑：

```bash
ko-paper translate ~/Downloads/<样例>.pdf
```

5. 同时看 `.ko.pdf` 与 `.ko.dual.pdf`，逐个检查下文列的指标。

**判断有没有改善的指标：**
- **自检通过**：`ko-paper doctor` 输出 `kopaper ready`（不是靠人肉猜依赖是否装好）；
- **版式保真**：图的图例/条目名、表头与单元格内容被翻译且未与下一行重叠；公式与数字保持原样；对比作者自列的已知缺陷（small caps 标题、窄行距作者行）；
- **可核对的成本**：抄下网页顶部显示的调用次数与 token（对照 31 页 ≈200 次调用 / ≈67 万 token 的量级判断是否划算）；
- **缓存有效性**：同一文件再翻一次，token 应明显低于首次；
- **术语一致性**：改一次术语表并「保存后重译」，检查是否只重译受影响段落（对比修改前后的 token 与耗时）、且全文该术语确实统一；
- **人工时间对比**：记录「自己读原文 + 手动过一遍机器翻译」所需时间，与「跑 ko-paper + 只校对图表和术语」所需时间作对比——这才是本项目真正关心的「是否明显改善工作方式」。

**如果目标是把这个模式搬到自己的工作（推荐方向而非照搬工具）：** 把「输出语言」换成中文、把「版式引擎」换成你手头已有的文档解析器，保留原文最有价值的三件事：① skill 化封装与 agent 自安装提示词；② 术语表 CSV + 优先级的可配置设计；③ 本地代理做缓存、用量记录与并发控制——这三项都能在非论文翻译的文档任务上直接复现。
