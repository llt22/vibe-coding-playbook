# win4r/MuseAI-Skills

- 结论：**值得研读**。建议按 study 处理：用 `GIT_LFS_SKIP_SMUDGE=1` 克隆后只读 `opt/hatch/skills/` 下的 SKILL.md / manifest / eval 三层文件，把它的“触发条件—权限分层—交付验收”结构借用到自己的 agent 指令里，而不是照搬执行；因为仓库自述不是可部署包、核心程序为 ELF 二进制、多项辅助脚本缺失，来源也未独立验证。
- 原文：https://github.com/win4r/MuseAI-Skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T22:27:23.706Z

## 是什么

一个 311 stars 的 GitHub 存档仓库（win4r/MuseAI-Skills），内容是 muse.ai / Muse / Hatch 个人 AI Agent 运行环境的部分文件快照，而不是完整源码或可一键部署的安装包。

仓库自称包含：

- **72 个 `SKILL.md` 路径**：68 个独立技能文件 + 4 个符号链接别名，按 9 类归档（Agent 工作流与记忆、文档/表格/产物验收、旅行与预订、办公邮箱与知识工具、社交与消息、购物与金融、健康与健身、图像音频视频、设备通信网络、Muse 产品操作）。
- **配套文件**：全目录另有 40 个 manifest 路径和 12 份 eval YAML（README 明确说明这是配套文件数，不是额外技能数，也不代表评测已通过）。
- **产品与设备说明文档 26 份**（goals、feed、self_improvement、scheduling-and-watching、connectors、artifacts、privacy-and-credentials 等）。
- **运行环境脚本与二进制**：`opt/hatch/runtime-cell/` 生命周期脚本、`opt/hatch/bin/` 77 个程序路径（主 daemon 为 ELF 二进制）。

对研究“AI 用到最好”的价值在于：技能文本具体描述了**何时触发、如何分流任务、使用哪些工具、怎样处理授权与失败、如何验收交付物**。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 前提说明：本次输入只提供了仓库 README，**各 SKILL.md 的正文并未给出**，因此下面只能给出“读什么、按什么顺序读、抄哪一层结构”的做法，无法给出可照抄的提示词或配置内容。

1. **克隆仓库，跳过 LFS 大二进制。** 前提：只研究技能文本、不需要运行随包程序。

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/win4r/MuseAI-Skills.git
cd MuseAI-Skills
```

2. **打开 `opt/hatch/skills/`，按 README 的“建议优先阅读”清单起步。** 前提：先不下载二进制。README 给出的 8 个优先项及各自值得研究的设计点是：

| 技能 | README 指出的研究点 |
|---|---|
| `wide-research` | 如何限定协调者与 worker、统一输出契约、报告失败覆盖 |
| `skill-creator` | 如何让触发条件明确、主文件精简、参考资料按需加载 |
| `artifacts/testing` | 如何把“生成成功”与“交付物可用”分开验收 |
| `goals` | 如何按领域区分首次建目标与后续跟进，避免重复 intake |
| `forget` | 如何处理副本、衍生状态与可能重新写回信息的后台任务 |
| `travel-planning` | 如何把行程研究与实时可订查询、交易分开路由 |
| `magic-moment` | 如何从事实素材、叙事、视觉到时间线与渲染前审阅组织流水线 |
| `gmail` | 如何结合技能正文、方法级权限 manifest 与行为评测场景阅读 |

3. **每个技能按固定三层读法依次读**（README 给的“怎样把文件串起来读”以 Gmail 为例）：

- `SKILL.md`：frontmatter 描述触发条件，正文描述操作流程和边界；
- `manifest.yaml`：机器可读的连接器元数据、权限默认值、scope 要求与命令映射，**方法级设置可覆盖分组默认值**；
- `eval/scenarios.yaml`：行为评测场景、用户目标及期望行为；
- 最后对照通用契约 `home/hatch/docs/connectors.md`。

4. **只抽取可迁移的结构，不迁移具体工具名。** README 明确：工作流模式可以用于改进自己的 Agent 指令，但需要按目标环境调整**工具名、工作区路径、授权规则和验收步骤**。按这个清单逐项改写。

5. **区分“可见 / 已连接 / 已授权”三层状态再设计权限。** README 反复强调三处不等式，可作为权限设计的检查项：

- `home/hatch/config/skills.yaml` 声明 31 个技能 available ≠ 账户已连接、≠ 已授权；
- `skill-scopes.conf`（技能目录可见性，按部署渠道）与 `bin-scopes.conf`（CLI 可见性）的**可见性 gating 不等于执行授权**；
- `manifest.yaml` 里的方法级权限才是操作授权层。

6. **明确哪些东西抄了也跑不起来。** README 自述缺失项：Artifacts 验证脚本、skill-creator 的连接器脚手架、Magic Moment 的 `mm` 可执行程序、Spaces 的 SDK/构建资源；核心程序为 Linux x86-64 ELF 二进制，构建源码、完整宿主配置、rootfs 不在快照中。连接器技能依赖对应 CLI/MCP、账户连接、OAuth scopes 和运行时授权，**复制 Markdown 不会自动获得这些能力**。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：README 的 9 类技能目录本身就是一份“AI 可以做哪些还没想到交给它的事”的清单，含明显超出常规办公的场景：旅行行程规划与实时可订查询（travel-planning / booking / duffel / flightaware / opentable / ticketmaster）、本地地点比较（places-search）、健康与健身数据读取（apple-healthkit / google-health-connect / function-health / withings / peloton）、智能家居与车辆（philips-hue / tessie / tailscale）、播客与语音生成（generate_podcast / tts / voice-design）、记忆遗忘流程（forget）、以及自我认知与能力自述（self-awareness）。

**2. 任务匹配**：README 给出若干分流设计线索——`wide-research` 限定协调者与 worker 并统一输出字段/覆盖率/失败项；`travel-planning` 把“行程研究与实时可订查询、交易”分开路由；`ticketmaster` 只交付购票链接、**不直接完成购买**；`voice-selector` 是静态语音目录、**不是面向用户的工作流**；`artifacts/testing` 把生成与验收分离。

**3. 条件供给**：每个连接器技能配有 `manifest.yaml`（方法级权限、scope、命令映射），技能还有按渠道的可见性配置（`skill-scopes.conf` / `bin-scopes.conf`），并有凭据/隐私文档（`privacy-and-credentials.md`、connectors.md 的失败处理）。这是“需要给哪些权限、信息与反馈”的分层样本。

**4. 主动推进**：仓库含 `goals`（分领域建目标、持续跟进）、`self_improvement`（后台记忆、关系、研究、回顾、技能维护及证据追踪）、`scheduling-and-watching`（轮询式监测、调度限制、运行历史与通知交付）、`PROACTIVE_PREFERENCES.md`（主动联系的主题、禁忌、时间和格式偏好模板，README 注明**当前主题栏为空**）。注意：这些只是文件存在与用途描述，触发与调度的具体正文未在输入中给出。

**5. 效果验证**：`eval/scenarios.yaml` 是行为评测场景；`flightaware/eval/findings.md` 是历史评测发现与基础设施阻塞记录；`artifacts/testing` 按产物类型检查、重新渲染、目视验收与占位符扫描；`muse_db` 的受限只读查询用于诊断执行和交付记录。README 同时声明：**存在场景不代表已经运行通过**。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

**原文给出的数据**：311 stars（初筛指标）；68 个独立技能 + 4 个别名 = 72 个 `SKILL.md` 路径；40 个 manifest 路径；12 份 eval YAML；`skills.yaml` 声明 31 个技能 available；`muse_db` schema 文档覆盖 17 个 schema 下的 195 个关系；26 份产品与设备说明文档；`opt/hatch/bin/` 77 个程序路径；原快照有 17 个硬链接路径（Git checkout 不保留该 inode 关系）；npm 10.9.4 第三方工具包。

**哪些只是作者/仓库主张**：技能“值得研究的设计”一栏是仓库作者的主观挑选，README 自己声明“不代表运行效果排名，也不代表可以直接安装使用”；所有产品能力描述被明确标注为“账号特定的能力和历史可用性描述，不应当作已核实的当前产品事实”；来源“未独立认证其官方来源”，不代表官方发布或认可；随包名为 `codex` 的二进制“仅有该文件不能确定完整版本、来源或线上主模型”。

**适用条件与硬约束**：不是完整源码仓库，也不是一键部署安装包；核心为 ELF 二进制；构建源码、完整宿主 unit 与 nspawn 配置、rootfs 缺失；`opt/hatch/runtime-cell/` 的脚本是**实现脚本而不是可以照抄执行的启动教程**；`/run`、`/var/lib`、`/etc` 等绝对路径描述的运行时内容大多不在仓库中，`runtime-cell/etc/` 只有 3 个模板；仓库根的 `~` 指 `/home/hatch`，不是本机用户目录；Artifacts 验证脚本、skill-creator 脚手架、Magic Moment `mm` 程序、Spaces SDK/构建资源均缺失，“技能文档可阅读，执行链路并不完整”。

**噪音**：README 顶部有邀请码推广（`ZLSD3V`，附“送 10 亿 token”说法），属于推广内容，与研究无关，不应采信或采用。

**本次输入的最大局限**：只提供了 README，**所有 SKILL.md 正文、manifest 内容、eval 场景内容均未给出**，因此无法从原文提炼任何可照抄的提示词、权限配置或命令；所有关于“技能内部怎么做”的判断都只是 README 的一句话转述。

## 怎么试、怎么验证

**最小试用方式**：

1. 按第 1 步的命令克隆（跳过 LFS），只读 `opt/hatch/skills/`，不执行任何随包程序。
2. 挑 3 个与自己日常工作最近的技能（建议 `wide-research`、`artifacts/testing`、`skill-creator`），只读它们的触发条件段、输出契约段和验收段。
3. 用这套结构改写自己现有的一条 agent 指令：补上明确的触发条件、把主文件精简、把参考资料拆成按需加载、补上“生成成功 ≠ 交付可用”的验收步骤，并把工具名/路径/授权规则替换成自己环境的。
4. 对一条真实任务跑一次改写前后的对照。

**判断有没有改善的指标**：

- 触发准确率：不改措辞直接提出任务时，指令是否被正确触发；错误触发次数。
- 人工补问次数：完成同一任务需要你补充说明的次数是否下降。
- 交付验收通过率：对照 `artifacts/testing` 的思路做重新渲染 + 占位符扫描后，一次通过的比例。
- 失败可见性：失败项/未覆盖项是否被显式报告（对照 `wide-research` 的“报告失败覆盖”）。
- 权限边界是否清晰：每条指令能否说清“可读 / 可写 / 需授权”三档，而不是笼统给全权。

因为原文未给出技能正文，以上都属于“借结构”的试验，不能宣称已复现该仓库的实际效果。
