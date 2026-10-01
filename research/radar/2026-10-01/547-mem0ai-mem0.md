# mem0ai/mem0

- 结论：**值得一试**。按 README 的 CLI 四步（安装→agent 注册→add→search）先跑通通路，再把 search+add 嵌进一个固定 user_id 的重复性任务做 1–2 周小范围试；理由是原文给出了可直接复制的安装、CLI、SDK、自托管与 Agent Skills 接入步骤，但性能数字是托管平台自报、开源版明确无法复现同等数字，还不足以作为手册标准做法直接采用。
- 原文：https://github.com/mem0ai/mem0
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T11:27:31.710Z

## 是什么

Mem0 是一个给 AI 助手和 agent 加「持久记忆层」的开源项目（Apache 2.0，README 标注 66k+ stars），让模型记住用户偏好、跨会话保留 User / Session / Agent 状态，从而不必每次重新交代背景。它提供四种使用形态：Python/JS 库、自托管服务器（docker compose）、云托管平台、以及命令行 CLI；另外还提供给编码助手（Claude Code、Codex、Cursor、Windsurf、OpenCode、OpenClaw 等支持 skills 标准的工具）用的 Agent Skills。

README 说明 2026 年 4 月版记忆算法有五个变化：单次 ADD-only 抽取（一次 LLM 调用，不做 UPDATE/DELETE，记忆只累积不覆盖）、agent 生成的事实与用户事实同等权重存储、实体抽取与链接、多信号并行检索（语义 + BM25 关键词 + 实体匹配后融合）、时间感知检索（区分当前状态、过去事件、未来计划对应的时点实例）。

## 具体做法（编号步骤）

**前提条件**：Mem0 依赖一个 LLM（默认 OpenAI 的 `gpt-5-mini`），默认 embedding 是 `text-embedding-3-small`；要用混合检索（语义 + 关键词 + 实体加权），README 建议至少用 Qwen 600M 或同级别 embedding 模型。需要相应的模型供应商 API key（可用其它受支持的 LLM，见文档）。

### 路线 A：CLI 最小验证（最快，先确认通路）

原文称 agent 可在 5 秒内自助拿到可用 API key，无需邮箱、控制台或 OTP：

```bash
# 1. Install
npm install -g @mem0/cli      # or: pip install mem0-cli

# 2. Sign up as an agent (replace `claude-code` with your name)
mem0 init --agent --agent-caller claude-code

# 3. Add a memory
mem0 add "I am using mem0"

# 4. Search
mem0 search "am I using mem0"
```

人类 owner 之后可用 `mem0 init --email <their-email>` 认领该账号，key 与已存记忆都保留。带用户隔离的常规用法：

```bash
mem0 init
mem0 add "Prefers dark mode and vim keybindings" --user-id alice
mem0 search "What does Alice prefer?" --user-id alice
```

### 路线 B：库方式接进自己的程序

```bash
pip install mem0ai
```

需要 BM25 关键词匹配与实体抽取的增强混合检索时：

```bash
pip install mem0ai[nlp]
python -m spacy download en_core_web_sm
```

JS 版本：`npm install mem0ai`。README 给出的核心调用模式是「取记忆 → 拼进 system prompt → 生成回答 → 把整轮对话写回记忆」，原文代码（README 另有 main() 交互循环，此处保留核心函数）：

```python
from openai import OpenAI
from mem0 import Memory

openai_client = OpenAI()
memory = Memory()

def chat_with_memories(message: str, user_id: str = "default_user") -> str:
    # Retrieve relevant memories
    relevant_memories = memory.search(query=message, filters={"user_id": user_id}, top_k=3)
    memories_str = "\n".join(f"- {entry['memory']}" for entry in relevant_memories["results"])

    # Generate Assistant response
    system_prompt = f"You are a helpful AI. Answer the question based on query and memories.\nUser Memories:\n{memories_str}"
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": message}]
    response = openai_client.chat.completions.create(model="gpt-5-mini", messages=messages)
    assistant_response = response.choices[0].message.content

    # Create new memories from the conversation
    messages.append({"role": "assistant", "content": assistant_response})
    memory.add(messages, user_id=user_id)

    return assistant_response
```

注意 `search` 用 `filters={"user_id": ...}` 和 `top_k=3` 控制取回范围；`add` 传的是整轮消息列表加 `user_id`。

### 路线 C：自托管服务器

```bash
# Recommended: one command — start the stack, create an admin, issue the first API key.
cd server && make bootstrap

# Manual: start the stack and finish setup via the browser wizard.
cd server && docker compose up -d    # http://localhost:3000
```

前提：自托管默认开启鉴权（auth）。如果是从无鉴权的旧版本升级，需要设置 `ADMIN_API_KEY`、通过向导注册一个 admin，或**仅在本地开发**时用 `AUTH_DISABLED=true`。

### 路线 D：给编码助手装 Agent Skills

```bash
# 参考资料型（常驻上下文）
npx skills add https://github.com/mem0ai/mem0 --skill mem0
npx skills add https://github.com/mem0ai/mem0 --skill mem0-cli
npx skills add https://github.com/mem0ai/mem0 --skill mem0-vercel-ai-sdk

# 流水线型（按需执行端到端流程）
npx skills add https://github.com/mem0ai/mem0 --skill mem0-integrate
npx skills add https://github.com/mem0ai/mem0 --skill mem0-test-integration
npx skills add https://github.com/mem0ai/mem0 --skill mem0-oss-to-platform
```

在已有仓库里用 `/mem0-integrate` 以 test-first 流程接入 Mem0，再用 `/mem0-test-integration` 验证；要从 OSS 迁到托管平台用 `/mem0-oss-to-platform`。

### 路线选择（README 原表结论）

测试/原型用库（`pip install mem0ai`）；团队自建基础设施用自托管（`docker compose up`）；想要零运维生产直接用云平台（app.mem0.ai 注册）。旧版本升级见 `https://docs.mem0.ai/migration/oss-v2-to-v3`。

## 对应的研究问题

**1. 能力发现**：把「记住用户偏好与历史」从每次人工复述变成 agent 的默认动作。README 点名的可迁移场景是客服（回忆过去工单和用户历史）、AI 助手（跨会话一致、上下文丰富的对话）、医疗（跟踪患者偏好与病史）、生产力与游戏（按用户行为自适应的工作流与环境）。

**2. 任务匹配**：README 明确给出按场景选形态的判断——测试/原型用库，团队自建基础设施用自托管，零运维生产用云。模型侧默认 `gpt-5-mini` + `text-embedding-3-small`，追求混合检索质量时换更强 embedding。集成面包括 LangGraph、CrewAI、Vercel AI SDK、CLI 和各类支持 skills 的编码助手。

**3. 条件供给**：需要提供（a）一个 LLM 供应商的 key；（b）稳定的 `user_id` 作为检索过滤维度；（c）把每轮完整对话（user + assistant）回传给 `add()` 的写入习惯；（d）混合检索还要额外装 `mem0ai[nlp]` 与 spacy 模型；（e）自托管还需要 docker 与 admin/API key 配置。

**4. 主动推进**：README 支持 agent 自助注册并自行调用 CLI/skills，为长时运行的 agent 累积记忆提供了条件；单次 ADD-only 抽取意味着记忆随每次交互自动累积、不需要额外整理步骤。但原文没有给出由时间、事件或状态触发的调度机制，只有「每次交互写回」这一被动累积路径。

**5. 效果验证**：README 报了一组可对照的指标（表格见下节），并声明评测框架已开源（`github.com/mem0ai/memory-benchmarks`），供任何人复现。这是本材料里唯一可直接借用为验证方法的部分。

## 与已有做法的关系

- **Claude Code（adopt）**：README 明确把 Claude Code 列为 Agent Skills 支持对象，并给出 `npx skills add` 直接接入命令；还以 `--agent-caller claude-code` 作为 CLI 注册示例。
- **Cursor（watch）/ OpenClaw（watch）/ OpenCode（watch）**：README 的 skills 支持列表明确包含这三者，等于给出了从 watch 转为可用的一条具体接入路径。
- **Agent skills（adopt）**：Mem0 自身就提供 reference skills（常驻）与 pipeline skills（按需执行）两类，是该概念的一个现成实例，可直接作为手册里 skills 写法的参照。
- **arXiv（try）**：README 附论文引用 `Chhikara et al., Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory, arXiv:2504.19413, 2025`，可作为进一步核实的来源。
- **Trendshift（watch）**：README 顶部放了 Trendshift 徽章，属展示性内容，无实质做法。

## 证据与局限

原文给出的量化数据（全部为厂商自报）：

| Benchmark | Old | New | Tokens | Latency p50 |
| --- | --- | --- | --- | --- |
| LoCoMo | 71.4 | 92.5 | 7.0K | 0.88s |
| LongMemEval | 67.8 | 94.4 | 6.8K | 1.09s |
| BEAM (1M) | — | 64.1 | 6.7K | 1.00s |
| BEAM (10M) | — | 48.6 | 6.9K | 1.05s |

原文自述的评测条件：所有 benchmark 跑在同一个「生产代表性模型栈」上，单次检索（一次调用、无 agentic 循环），检索预算 top_200；LongMemEval 的 assistant memory recall 为 98.2。

**关键局限（原文自己写明）**：上述分数反映的是 Mem0 托管平台，其中包含开源 SDK 不具备的专有优化；开源用户「应期待方向相似的增益，而不是相同数字」。也就是说，任何人按路线 B/C 自测，很可能拿不到表里的数字。

其它需注意的：
- 所有数字均为厂商自报，材料中没有第三方复现结果；评测框架虽声明开源，但本次材料未包含其内容。
- 未涉及成本、数据隐私/合规、多租户隔离、记忆删除与纠错流程的具体做法。
- 新增的 ADD-only 抽取意味着记忆「只累积不覆盖」，原文未说明如何清理错误记忆，实际使用需要自行设计删除路径。
- 本文只拿到仓库 README，未包含 docs.mem0.ai 与论文正文，配置细节需以官方文档为准。

**适用条件**：需要有可用的 LLM 与 embedding 供应商（默认 OpenAI）；自托管需要 docker 与鉴权配置；需要能稳定拿到 user_id 的产品结构（否则记忆无法按人检索）。

## 怎么试、怎么验证

**最小试用（半天内）**：
1. 跑路线 A 的四条命令，确认能写入并检索到 `I am using mem0`。
2. 跑路线 B，把上面的 `chat_with_memories` 函数接进一个真实重复性任务（例如客服问答、固定用户的周报助手），固定一个 `user_id`。
3. 跑 1–2 周，保持同一套问题清单，另开一个不接 Mem0 的对照组。

**判断有没有改善的指标**：
- 记忆命中率：`search(top_k=3)` 返回的条目中与当前问题相关者所占比例（人工标注后计算）。
- 复述成本：用户在同一任务中需要重复交代背景信息的次数（预期下降）。
- 注入成本：每轮拼进 system prompt 的记忆 token 数，以及检索延迟 p50，与原文的 6.7–7.0K、约 1s 量级做对照。
- 结果质量：同一批问题在「有记忆 / 无记忆」两种设置下的正确率或人工评分（A/B 对比）。
- 污染率：错误或过时记忆被检索并影响回答的比例——这一条对 ADD-only 设计尤其重要，因为它不会自动覆盖旧记忆。

若自托管/开源版本跑不出 README 的数字，属原文已声明的预期内情况；届时以「相对自身基线是否有改善」而不是「是否达到 92.5」作为判断标准。
