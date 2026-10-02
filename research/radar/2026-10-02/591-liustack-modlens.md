# liustack/modlens

- 结论：**值得一试**。给纯文本模型（尤其已 adopt 的 Claude Code、try 的 DeepSeek 这类无视觉通道）装上 ModLens，按 README 的一条命令安装、配一个免费 Gemini key 或复用本机已登录的 CLI，就能把粘贴的截图/图表转成结构化文字证据再回答，值得在一台机器上小范围试；但全部效果只有作者自证的演示，没有基准数据，先小范围验证再决定是否写进手册。
- 原文：https://github.com/liustack/modlens
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T08:28:17.311Z

## 是什么

ModLens 是一个给**纯文本模型补视觉输入**的插件/技能。图片直接粘进聊天（不用先存文件再传路径），插件把图片转成结构化证据——全文转录、按阅读顺序的版面区域、实体与关系列表——再由原来的文本模型作答。

两种交付形态：DeepSeek Harness（dsh）上的一个插件；skills.sh 上的一个 skill（用于 Claude Code、Codex、Pi、OpenCode）。作者称其为「市场上最轻的接法」：无 hook、无 wrapper、无本地代理守护进程，不动任何 harness 配置，卸载就是删一个文件夹。

视觉来源共有十处：6 个内置 provider（gemini-api、openai、anthropic、antigravity-cli、claude-cli、kimi-cli）+ 4 个可复用登录的本地 CLI（Codex、OpenCode、Pi、Grok）。不指定 provider 时，所有已配置引擎串成一条 failover 链，快速 API 先试、agent CLI 兜底。

## 具体做法

**步骤 1：在 DeepSeek Harness 上安装（一行命令）**
前提：已装 Node.js，已有 dsh。

```bash
npx -y @deepseek-ai/dsh plugin --profile web add @liustack/modlens@3.26.5
```

**步骤 2：在其他 harness 上安装（两条路，选一）**

路 A，用 skills.sh 装到用户级：

```bash
npx -y skills add liustack/modlens --skill modlens --global
```

装完重启 harness，然后让 AI 去配置 modlens 并跑健康检查。

路 B，把安装整个交给 AI，直接发这一句：

> Install and configure the modlens skill following https://github.com/liustack/modlens/blob/main/INSTALL.md, then run the health check and tell me the result.

安装会先盘点本机已有什么（Claude Code / Codex / OpenCode / Pi 的已有登录可能就够了），复用前会先问。

**步骤 3：只有当健康检查为空，才配一个免费引擎**
推荐免费 Gemini API key（Google AI Studio，约 3 分钟，不需要信用卡），配好后每次读取 5-10 秒。想完全免注册，改装 Antigravity CLI 并登录：

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
agy                                                           # 登录，然后退出
```

**步骤 4：用 openai 兼容端点接任意视觉模型**
前提：拿到该平台的 key、baseUrl、模型名。

```bash
modlens config set openai.baseUrl https://dashscope.aliyuncs.com/compatible-mode/v1   # qwen-vl
modlens config set openai.apiKey  <key>
modlens config set openai.model   qwen3-vl-plus
```

同一组三个键对 GLM 开放平台、SiliconFlow、OpenRouter、自建 vLLM/Ollama 或自建网关通用。`apiKey` 也接受逗号分隔的多 key 列表：认证、限流、配额类失败时轮换到下一个 key；网络、5xx、解析类失败则跳过剩余 key、保持 provider 级 failover。

**步骤 5：复用本机已有的登录（零新 key，但每个都要显式授权）**

```bash
modlens config set reuse.codex true
modlens config set reuse.opencode true
modlens config set reuse.pi true
modlens config set reuse.grok true
```

前提：对应 CLI 已登录、且持有视觉模型。`modlens doctor` 会发现可复用的 CLI。每次复用读取都会在 `meta.warnings` 里标注消耗了谁的配额。

**步骤 6：选路与网络**

```bash
modlens config set provider <name>     # 表达偏好，failover 链仍然兜底
modlens <命令> -p <name>               # 精确钉死一个，没有回退
modlens config set proxy <url>         # 或在环境里设 HTTPS_PROXY
modlens config set openai.proxy ""     # 内网端点退出代理
```

**步骤 7：日常使用**
直接粘贴图片或丢一个路径，正常提问，技能会自己触发。粘贴一次之后，针对同一张图的后续问题不需要重新粘贴。在 dsh 里也可以先在模型选择器里选一个 `(modlens vision)` 条目（选择会被记住，选一次就够），再粘贴，这样缩略图会留在消息里；插件会自动为每条符合条件的路由（原生 text-only 的 DeepSeek / GLM / MiMo Pro）生成一个带 vision 的条目，原生多模态模型会被自动排除。

dsh 上也可以走图形界面：Settings → Plugins → Plugin config，打开 ModLens 卡片，切换引擎、勾选 `auto` 模式可复用哪些本地 CLI，保存即生效（dsh 0.1.7 起在侧边栏 Plugins 页选 `@liustack/modlens`）。

## 对应的研究问题

- **能力发现**：把「读图」这件事交给本来没视觉的文本模型。原文演示的任务类型包括：UI 截图逐元素解读、推文截图（作者、文案、图片细节、时间戳、全部互动数据）、一次粘贴三张图并识别它们属于同一视觉家族、128 个 AI 模型的散点图（双轴、对数刻度、按 provider 的颜色编码、高亮区域、带虚线标记的每个 DeepSeek 模型）、幻灯片全文与版式。
- **任务匹配**：适用场景是「工作流里有图片、但手上的模型是 text-only」。引擎侧按速度分档：API 类 5-10 秒，agent CLI 类 15-45 秒；模型侧只在「元数据明确确认是 text-only」时才接管，未确认的一律不碰，原生视觉模型保持自己的粘贴路径。
- **条件供给**：需要 (a) 装插件或 skill；(b) 至少一个视觉引擎——免费 Gemini key、OpenAI 兼容端点、或复用一个已登录的本地 CLI；(c) 对每个被复用的 CLI 显式授权；(d) 需要时配代理；(e) 可读的文档：INSTALL.md、docs/cli.md、docs/output-schema.md、docs/security.md、docs/harness-setup.md。
- **主动推进**：原文**没有**给出任何基于时间、事件或状态的持续触发机制。唯一沾边的是会话内「同一张图粘贴一次、后续追问不用再粘」，以及引擎自动 failover。这一条基本无依据。
- **效果验证**：`modlens doctor` 做健康检查；`meta.attempts` 记录每次尝试，使回退从不静默；`meta.warnings` 标注复用读取消耗了哪个账号的配额；输出是结构化 JSON，有 docs/output-schema.md 可解析。原文给的都是演示截图，没有量化评测。

## 与已有做法的关系

- **Claude Code（adopt）**：ModLens 以 skill 形式装进 Claude Code（skills.sh 安装或 INSTALL.md 流程），同时把 Claude Code 已登录的订阅当作 `claude-cli` 引擎复用。两者可互为供给。
- **DeepSeek（try）**：主要服务对象就是 text-only 的 DeepSeek 模型；原文所有演示都跑在 DeepSeek-V4-Flash 上。
- **DeepSeek Harness（watch）**：一等公民，有专门的一行安装命令、设置页卡片、以及专门的 harness-setup 文档。若这条线索被采纳，dsh 的状态可能需要重估。
- **OpenCode（watch）**：宣称已验证兼容，并可作为 `reuse.opencode` 复用其登录。
- **skills.sh（try）**：作为安装渠道之一被直接使用。

## 证据与局限

**原文给出的证据**：仓库 4101 stars；npm 包 `@liustack/modlens` 版本号 3.26.5；MIT 许可；完整的安装命令、配置命令、provider 对照表、CLI 复用对照表；五组「未剪辑」演示截图（dsh 内粘贴、Codex 桌面读推文截图、三图批量、128 模型散点图、Claude Code 终端读幻灯片）。

**只是作者主张的部分**：「市场上最轻的触感」「最强大的 dsh 视觉插件」「验证过真机」等定性说法；每次读取 5-10 秒 / 15-45 秒 / 20-45 秒的耗时数字；「读取的是证据而非想象」；对模型家族（GLM-5.3、DeepSeek-V4、MiMo Pro）的现状描述。这些都没有基准测试、没有错误率、没有第三方复现。

**适用条件与风险**：
- 只对 text-only 模型有意义；已经在用原生多模态模型的话没有收益。
- 复用他人 CLI 登录会消耗对应账号的配额和额度，受各上游服务条款约束（原文明确把上游条款责任交给使用者）。
- 图片内容被当作不可信输入处理（见 docs/security.md），远程 URL 的抓取行为也需要核对。
- 项目单人维护、**不接受 PR**，长期可持续性是一个未知数；README 里提到的多数文档（cli.md、output-schema.md、security.md、harness-setup.md）不在本次输入中，无法据以判断细节是否准确。
- 原文里出现的模型名和版本可能已过时，落地前需自行核实引擎当前是否可用。

## 怎么试、怎么验证

**最小试用（约 15 分钟）**：
1. 在一台已经装了 Claude Code（清单里状态为 adopt）的机器上执行 `npx -y skills add liustack/modlens --skill modlens --global`，重启 harness。
2. 让 AI 跑健康检查（或 `modlens doctor`），记录结果。若为空，配一个免费 Gemini key，再跑一次健康检查。
3. 挑 3 张真实工作图片：一张 UI 截图、一张带数字的图表、一张含文字的照片或扫描件。逐一粘贴提问，让模型把读到的内容和数字列出来。
4. 人工逐项核对：关键数字、标题文字、实体名称对不对；有没有把不确定的地方如实标出（原文提到过一次「对截断文件名的诚实不确定」）。
5. 对同一张图追问第二轮，确认不需要重新粘贴。
6. 卸载（删掉那个 skill 文件夹），确认 harness 回到原样。

**判断有没有改善的指标**：
- 读取延迟：与作者声称的 5-10 秒（API）/ 15-45 秒（CLI）区间比较，是否可接受。
- 准确率：关键数字和文字的逐项正确率，对比「人读完口述给模型」这条基线。
- 无回退率：`meta.attempts` 长度为 1 的比例，以及 `meta.warnings` 里出现配额复用告警的频率——回退是否在被记录。
- 交互成本：从「截图」到「模型答出内容」需要几步人工操作；对比「手动 OCR 再贴文字」的步骤数。
- 可逆性：卸载后 harness 是否确实恢复原状。

只有在这几项都过得去、且确实替代了「手工把图片转成文字再喂给模型」这条现有工序时，才考虑把它从 try 提升为写进手册的 adopt。
