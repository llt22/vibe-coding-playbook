# 把反复翻查的文档变成可问答、能定时交活的知识入口

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：把散落的自有文档变成带来源引用的问答入口、把每周重复的固定动作交给定时任务自动产出，同时避免被一份很长的功能清单牵着走。
> 先试这一步：先用 Docker 按仓库里的 ./docker/HOW_TO_USE_DOCKER.md 起一个实例，设好 DISABLE_TELEMETRY=true，只接一个你已在用的模型，上传 20–50 份同主题文档，用 10 个已知答案的问题测引用是否命中真正含答案的那份。
> 最近修订：2026-10-02

## 解决什么问题

把散落的自有文档（PDF/TXT/DOCX）变成能带来源引用回答的入口，并把每周重复的固定动作交给 cron 定时执行。同时避免被一份很长的功能清单牵着走——README 给的是能力入口，不是可照做的参数，先小范围试、再决定用不用。

## 适用与不适用

**适用**

- 需要本地优先（runs locally by default）部署，把文档上下文、多模型、agent 与定时调度放在同一个应用里。
- 想把一批自有文档变成可问答、回答带来源引用的知识入口。
- 想用 cron 定时跑重复任务或提示词，且任务具备完整 agent 能力。
- 有本地模型（Ollama / LM Studio / LocalAI / llama.cpp 兼容模型）或已在用的云端 provider（README 列出 30+ LLM provider、10+ embedder、9 个向量库）。
- 需要多用户与权限、或需要把问答挂件嵌到网站——这两项**仅 Docker 版本提供**。

**不适用**

- 只是偶尔问一次问题，不需要文档库和调度。
- 敏感数据场景且需要安全/合规结论——README 未提供安全或合规说明。
- 出网严格受限的环境——即使关掉遥测，使用外部模型/向量库仍有对应厂商外连，应用本身还会连 `cdn.anythingllm.com` 与 github/githubusercontent。
- 想直接照抄定时任务、动态模型路由、Agent Flows 的具体参数——README 对这些只给文档链接和一句话描述，没有配置样例。

## 前置条件

- 一台能跑 Docker 的机器（或走 README 指向的 `./BARE_METAL.md` 无 Docker 部署；也可直接下载桌面版，支持 Mac/Windows/Linux）。
- 一个已经能用的模型 provider：本地推理需先把模型服务跑起来；云端 provider 需要相应 API Key。
- 一个向量库：默认 LanceDB，零配置；也可从 PGVector、Astra DB、Pinecone、Chroma、Weaviate、Qdrant、Milvus、Zilliz 中选。
- 20–50 份同主题、答案位置明确的文档，用于验证。
- 走源码开发模式时，`server/.env.development` 必须填好。

## 操作步骤

先决定走哪条路：

- **做法 A：Docker 部署**。要开多用户、要把问答挂件嵌进网站，只能走这条（两项均仅 Docker 版本提供）。
- **做法 B：源码开发模式**。本地看效果、要改代码时用；README 里可直接复制的命令只有这一组，但它只是「跑起来」的步骤，不是「用好」的步骤。

### 做法 A：Docker 起实例

1. 打开仓库里的 `./docker/HOW_TO_USE_DOCKER.md`，按其中给出的命令起服务。
   - 前提：本机已装 Docker。
   - 注意：README **只提供了指向该文件的入口链接，没有给出可直接复制的 `docker run` 命令**，命令需点进该文件获取。
   - 预期结果：本机或内网可访问 AnythingLLM；顺手记录一次「冷启动到可用」的耗时，作为后面比较的基线。

2. 关闭遥测（默认开启）。在 server 或 docker 的 `.env` 中写入：

```env
DISABLE_TELEMETRY=true
```

   也可以不改配置，在应用内 sidebar > `Privacy` 里关闭。
   - README 说明遥测只发送事件类型（安装类型、文档增删事件、向量库类型、LLM provider 与模型 tag、聊天发送事件），不含聊天内容、IP 或可识别信息，收集方为 PostHog；源码中所有 `Telemetry.sendTelemetry` 调用点可查。
   - 前提与预期：即使关闭遥测，使用外部模型/向量库仍会有对相应厂商的外连；应用仍会连 `cdn.anythingllm.com`（拉取模型镜像）和 github/githubusercontent（下载上下文窗口缓存文件）。在有出网限制的环境里要提前评估。

### 做法 B：源码开发模式

1. 在仓库根目录依次执行（README 原文命令）：

```bash
yarn setup        # 生成各模块所需的 .env 文件
yarn dev:server   # 本地启动服务端
yarn dev:frontend # 本地启动前端
yarn dev:collector # 运行文档收集器
```

2. `yarn setup` 之后手工填写生成出来的 `.env`，尤其是 `server/.env.development`。
   - README 原文提示：Ensure `server/.env.development` is filled or else things won't work right。
   - 预期结果：server 与 collector 同时在线；collector 不在线时文档解析会失败。

### 两条路都要做的部分

3. 接入模型与向量库，**先只接一个** provider，作为基线。
   - 本地推理选 Ollama / LM Studio / LocalAI / llama.cpp 兼容模型，云端选 OpenAI / Anthropic / DeepSeek 等。
   - 前提：云端 provider 需要 API Key；本地 provider 需要模型服务已跑起来。

4. 建一个 workspace，拖拽上传那 20–50 份 PDF/TXT/DOCX 文档，由 `collector` 解析入库。
   - 前提：`collector` 服务在运行。
   - 预期结果：在对话中得到带来源引用的回答。

5. 配 1 个 cron 定时任务：选一件你本来每周手动做一次的固定动作，让它按计划产出。
   - README 指向 `docs.anythingllm.com/scheduled-jobs/overview`，**未给出 cron 表达式或任务配置样例**，需读官方文档；agent 类任务需要相应的工具权限。
   - 预期结果：连续观察 2–3 次触发，看是否按时、产出是否可用。

6. 可选，按需要再加：
   - 动态模型路由，按自定义规则把对话自动路由到合适的 provider / 模型（README 指向 `docs.anythingllm.com/model-router/overview`，未给出规则字段与写法）。
   - no-code Agent 构建器（Agent Flows）搭自定义 agent。
   - 对外集成用 Full Developer API；给站点加问答入口用 embed 挂件（仅 Docker 版）。

## 怎么判断变好了

**最小试用方式（单机、单人、一周内可完成）**

1. 按做法 A 起一个实例，先设 `DISABLE_TELEMETRY=true`，记录一次冷启动到可用的耗时。
2. 只接一个你已经在用的模型，作为基线，不做切换对比。
3. 建 workspace，上传 20–50 份你日常需要反复翻查的文档（同一主题，含明确的答案位置）。
4. 准备 10 个你已知答案的问题，逐个提问，逐条记录：答案是否正确、引用是否指向真正含答案的那份文档、回答耗时。
5. 配 1 个 cron 定时任务，选一件你本来每周手动做一次的固定动作，连续观察 2–3 次触发是否按时、产出是否可用。
6. 对照基线：同一批问题用你现在的做法（手工翻文档，或直接把文档贴进通用聊天窗口）走一遍，用同样的记录口径。

**可观察的指标**

- 10 个已知答案问题的答案正确数。
- 引用命中率：引用是否指向真正含答案的那份文档。
- 单次回答耗时，以及冷启动到可用的耗时。
- 定时任务 2–3 次触发的按时率与产出可用率。

**试多久**

一周。一周内如果引用命中率没有明显优势，或定时任务产出不可用，就不要继续投入。

## 常见坑

- **README 只有入口链接，没有可直接复制的命令**。Docker 部署要自己点进 `docker/HOW_TO_USE_DOCKER.md`；定时任务、模型路由、Agent Flows、MCP 兼容也各只有一个文档链接，没有参数、配置样例和步骤。
- **多用户支持与网站嵌入挂件仅 Docker 版本提供**。选错部署方式，后面这两项直接做不了。
- **遥测默认开启**，需要主动关闭；关闭后仍有固定外连（模型厂商、`cdn.anythingllm.com`、github/githubusercontent）。
- **`server/.env.development` 不填好，开发模式跑不起来**。`yarn setup` 生成 `.env` 后必须手工填写。
- **把宣传性表述当成数据**。「Intelligent Skill Selection……token 使用最多降低 80%」、「比其它 chat UI 成本更低、响应更快」、「battle-tested」、「no extra configuration required」这些都没有测法、没有对照，只是作者主张。
- **README 没有任何效果、性能、成本数据，也没有安全/合规说明**，无法据此判断敏感数据场景是否可用。
- **`yarn` 那组命令只是「跑起来」的步骤**，不是「用好」的步骤，后者要另找官方文档。

## 证据与来源

全部操作项来自 Mintplex-Labs/anything-llm 仓库 README：MIT 许可、66,645 stars、monorepo 六模块（`frontend` / `server` / `collector` / `docker` / `embed` / `browser-extension`）、支持清单（30+ LLM provider、10+ embedder、9 个向量库、多 TTS/STT）、部署方式一览表，以及开发模式的三条 `yarn` 命令与 `server/.env.development` 前置要求。

遥测范围与关闭方式为 README 自述（PostHog 收集事件类型，不含聊天内容、IP 或可识别信息），并说明可在源码中按 `Telemetry.sendTelemetry` 检索核对。

以下仅为作者主张、无数据支撑，本手册只作提示、不作结论：token 使用最多降低 80% 的「Intelligent Skill Selection」；「比其它 chat UI 更低成本、更快响应」的优化说法；「battle-tested」「no frustrating setup」「no extra configuration required」「Production-ready for any cloud deployment」；多用户权限与嵌入挂件「更安全/更私密」的定性描述。

本份调研只有 README，没有官方文档正文，也没有任何性能、成本、效果或安全合规数据。文中的最小试用方式、20–50 份文档、10 个已知答案问题、2–3 次触发观察，均为该调研给出的试用建议，不是厂商数据；「怎么算变好」需要自己按上述口径采集。

## 依据的调研

- [Mintplex-Labs/anything-llm](../research/radar/2026-10-02/546-mintplex-labs-anything-llm.md)：值得一试，可以小范围试：按 README 给出的开发/自托管入口把 AnythingLLM 在本机或内网部署起来，接入已有模型，用「文档问答」和「cron 定时任务」各跑一个真实场景，理由是它把本地文档上下文、多模型、agent 与定时调度打包成一套可直接部署的应用；但 README 只给功能入口链接、缺少定时任务/模型路由等关键功能的可照做参数，也没有任何效果数据，因此先试不直接采用。
