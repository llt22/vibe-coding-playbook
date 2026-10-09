# BerriAI/litellm

- 结论：**值得一试**。值得小范围试：照 README 给的命令先在本地起一个 LiteLLM 网关（uv tool install 'litellm[proxy]' + litellm --model gpt-4o），把 1–2 个模型统一成 OpenAI 格式并开启花费追踪，用自己的成本和失败率数据决定是否推广；它给出了可复制的安装与调用步骤，但整体是特性索引+宣传，实际收益需自测。
- 原文：https://github.com/BerriAI/litellm
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-09T16:33:03.895Z

## 是什么

LiteLLM 是一个开源 AI Gateway（也提供 Python SDK），用 OpenAI 格式统一调用 100+ LLM 提供商（OpenAI、Anthropic、Gemini、Bedrock、Azure 等）。两种用法：

- **Python SDK**：在代码里直接 `import litellm` 调用多provider模型。
- **AI Gateway / Proxy Server**：部署成团队/组织级的中心化服务，README 中列出的网关能力包括：虚拟密钥与鉴权授权、按项目/用户的多租户成本追踪与花费管理、按项目的日志/guardrails/缓存定制、管理后台 UI。SDK 侧能力包括：跨多个部署（如 Azure/OpenAI）的 Router 重试与回退、应用级负载均衡与成本追踪、OpenAI 兼容错误处理、可观测性回调（Lunary、MLflow、Langfuse 等）。

此外 README 还描述了 A2A Agent 网关、MCP 工具网关、以及把 Claude Code / Codex / OpenCode / Deep Agents 这类 agent harness 跑在任意模型上的能力。

注意：抓取到的原文在 Terraform 输出段被截断（停在 `output "litellm_url" { va`），云部署部分只有前半段可依据；README 大量内容是指向 docs 的链接，本身不是完整教程。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 路线 A：先做 Python SDK 级最小验证

**1. 安装 SDK**
前提：有可用的 Python 环境与 `uv`。
```shell
uv add litellm
```
注意 README 明确提示：另有一个独立的 `litellm-core` 发行版，提供相同 `import litellm` API 但没有可选 extras、CLI 入口和内置 dashboard；**同一环境只能装一个 SDK 发行版**，因为 `litellm` 与 `litellm-core` 会写重叠的 Python 文件。要用 proxy/CLI/可选 extras 就装 `litellm`。

（README 另给了一条从源码构建 core 包的路径，前提是装了 Git、`uv` 和 Rust 工具链，且要在没有 `litellm` 的全新环境里安装：）
```shell
python scripts/build_core_distribution.py --out-dir dist/core
python -m pip install dist/core/litellm_core-*.whl
```

**2. 配置各provider的 API Key（环境变量）**
前提：你至少有一个provider的 key。
```python
import os
os.environ["OPENAI_API_KEY"] = "your-openai-key"
os.environ["ANTHROPIC_API_KEY"] = "your-anthropic-key"
```

**3. 用同一个函数调不同模型**（把原来多个 SDK 的调用收敛成一处；换模型只改 `model` 字符串）
```python
from litellm import completion

# OpenAI
response = completion(model="openai/gpt-4o", messages=[{"role": "user", "content": "Hello!"}])

# Anthropic  
response = completion(model="anthropic/claude-sonnet-4-20250514", messages=[{"role": "user", "content": "Hello!"}])
```

### 路线 B：起本地 AI Gateway（成本追踪/虚拟密钥的入口）

**4. 安装并启动 proxy**
前提：装的是带 `[proxy]` extra 的发行版；本机 4000 端口可用。
```shell
uv tool install 'litellm[proxy]'
litellm --model gpt-4o
```

**5. 用标准 OpenAI SDK 指向网关**（业务代码零改造，只换 base_url）
```python
import openai

client = openai.OpenAI(api_key="anything", base_url="http://0.0.0.0:4000")
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```
前提：已在网关侧配置好上游 key 与虚拟密钥（README 指向 docs 的 E2E 教程与 Docker 快速上手，本页未展开）。

**6.（生产）用 Terraform 模块部署到 AWS / GCP**
前提：AWS 账号 + CloudShell（或在自有 root 配置里调用模块）；README 称 AWS 布局为 ECS Fargate + Aurora + ElastiCache + ALB，GCP 同样有模块，模块发布在公开 Terraform Registry 上、无需额外认证。
```bash
git clone https://github.com/BerriAI/litellm.git
cd litellm/terraform/litellm/aws/examples/default
cp terraform.tfvars.example terraform.tfvars   # edit region/tenant/env
terraform init && terraform apply
```
或从自己的 root config 调用：
```hcl
# main.tf
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.60" }
  }
}

provider "aws" {
  region = "us-west-2"
}

module "litellm" {
  source  = "BerriAI/litellm/aws"
  version = "~> 1.89"

  region = "us-west-2"
  azs    = ["us-west-2a", "us-west-2b"]
  tenant = "acme"
  env    = "prod"

  # Production: provide an ACM cert. Without one, set allow_plaintext_alb = true
  # (dev/trial only).
  # acm_certificate_arn = "arn:aws:acm:us-west-2:111122223333:certificate/..."
  allow_plaintext_alb = true
}
```
README 同时提示：生产环境要提供 ACM 证书，没有证书则设 `allow_plaintext_alb = true`（仅限 dev/trial）；稳定版用带 `-stable` 标签的 docker 镜像，这些镜像发布前经过 12 小时负载测试。

### 路线 C：把工具（MCP）接到模型上

**7. 网关侧先登记 MCP Server**
前提：MCP server 已可用；持有 master key 或虚拟 key。README 指向 docs 的 “Adding your MCP” 步骤，本页未展开配置细节。

**8. 通过 `/chat/completions` 调 MCP 工具**
```bash
curl -X POST 'http://0.0.0.0:4000/v1/chat/completions' \
  -H 'Authorization: Bearer <your-master-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Summarize the latest open PR"}],
    "tools": [{
      "type": "mcp",
      "server_url": "litellm_proxy/mcp/github",
      "server_label": "github_mcp",
      "require_approval": "never"
    }]
  }'
```

**9. 在 Cursor IDE 里直接用网关的 MCP 端点**
```json
{
  "mcpServers": {
    "LiteLLM": {
      "url": "http://localhost:4000/mcp/",
      "headers": {
        "x-litellm-api-key": "Bearer <your-master-key>"
      }
    }
  }
}
```
README 特别提醒一个坑：MCP OAuth 场景下，上游可能宣称支持动态客户端注册，但实际用 HTTP 401/403 拒绝请求；若 provider 要求预注册 OAuth app，需在该 MCP server 上配置 `credentials.client_id`，必要时配 `credentials.client_secret`，以跳过网关登录流程里的动态注册；且 provider 必须批准该 app 用于 MCP 访问——能打开授权页不代表登录或工具调用会成功。

### 路线 D：让 coding agent 跑在你的网关上

**10. 用 harness 指定 agent 与模型**
前提：安装 `starlette`、`uvicorn` 以及对应 agent 的 CLI（`claude`、`codex` 或 `opencode`）；用 Deep Agents 则装 `deepagents langchain-litellm`。
```python
import litellm
from litellm import Harness, sandbox

result = litellm.agent(
    Harness.CLAUDE_CODE,  # or Harness.CODEX, Harness.OPENCODE, Harness.DEEPAGENTS
    "Find why tests/test_router.py is flaky and fix it.",
    sandbox=sandbox.local("./repo"),
    model="litellm_proxy/claude-sonnet-4-5",  # a model group on your AI Gateway
)

print(result.text, result.cost, [f.path for f in result.files])
```
设置 `LITELLM_PROXY_API_BASE` 和 `LITELLM_PROXY_API_KEY` 后，agent 的每一次模型调用都会走你的网关，并打上 `harness,claude_code` 标签；去掉 `litellm_proxy/` 前缀则直接调 provider。

### 路线 E：A2A Agent

**11. 用 A2AClient 直连 agent**
```python
from litellm.a2a_protocol import A2AClient
from a2a.types import SendMessageRequest, MessageSendParams
from uuid import uuid4

client = A2AClient(base_url="http://localhost:10001")

request = SendMessageRequest(
    id=str(uuid4()),
    params=MessageSendParams(
        message={
            "role": "user",
            "parts": [{"kind": "text", "text": "Hello!"}],
            "messageId": uuid4().hex,
        }
    )
)
response = await client.send_message(request)
```
前提：网关侧已把 agent 加入（按 agent 设 `protocolVersion` 为 `1.0` 或 `0.3`）；走 A2A SDK 需 `a2a-sdk>=1.1.0`。支持的 agent 来源：LangGraph、Vertex AI Agent Engine、Azure AI Foundry、Bedrock AgentCore、Pydantic AI。

**12. 用 MCP Bridge 把 MCP 工具装进任意模型**
```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from litellm import experimental_mcp_client
import litellm

server_params = StdioServerParameters(command="python", args=["mcp_server.py"])

async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()

        # Load MCP tools in OpenAI format
        tools = await experimental_mcp_client.load_mcp_tools(session=session, format="openai")

        # Use with any LiteLLM model
        response = await litellm.acompletion(
            model="gpt-4o",
            messages=[{"role": "user", "content": "What's 3 + 5?"}],
            tools=tools
        )
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
- README 给出的一条“原本可能没想到”的用法：把 Claude Code / Codex / OpenCode / Deep Agents 这些 coding agent 通过 harness 跑在**任意模型**上（含你自己网关里的 model group），并按 `harness,claude_code` 打标签。这相当于用统一网关给已有 agent 换后端/换模型做对照实验。
- MCP Bridge 让任意 LiteLLM 模型都能加载 MCP 工具（`load_mcp_tools(..., format="openai")`），即“模型不变、工具可插拔”。
- A2A 协议把 LangGraph / Vertex AI Agent Engine / Azure AI Foundry / Bedrock AgentCore / Pydantic AI 的 agent 接到统一网关下调用。

**2. 任务匹配**
- README 明确给出二选一判据：**中心化服务、多模型接入、需要鉴权/多租户成本追踪/虚拟密钥/管理后台** → 用 AI Gateway（面向 Gen AI Enablement / ML Platform 团队）；**在代码里直接调用、需要 Router 重试回退、应用级负载均衡与成本追踪、可观测性回调** → 用 Python SDK（面向开发者）。
- 支持矩阵里列出 **Auto Router (`auto_router`)** 条目（指向 `/docs/proxy/auto_routing`），说明存在按任务路由的官方路径，但本页未给路由规则配置细节，不能据此写出可照做的路由策略。
- 端点上支持 `/chat/completions`、`/responses`、`/embeddings`、`/images`、`/audio`、`/batches`、`/rerank`、`/a2a`、`/messages`，可按任务类型选择不同端点。
- 各 provider 在不同端点上的支持情况由支持矩阵逐行给出（如 Anthropic 支持 chat/messages/responses/batches，Jina AI、Voyage、Infinity 只支持 embeddings），可作为“哪类任务派给哪个 provider”的筛选表。

**3. 条件供给（需要提供什么）**
- 凭据：各provider的 API Key 环境变量；网关侧的 master key 或虚拟密钥（示例里放在 `Authorization: Bearer <your-master-key>` / `x-litellm-api-key` 头里）。
- 接入点：本地 `base_url="http://0.0.0.0:4000"`、MCP 端点 `http://localhost:4000/mcp/`、A2A 端点 `http://localhost:4000/a2a/<agent-name>`。
- 工具与依赖：`uv`、Docker；构建 core 版需 Git + `uv` + Rust 工具链；跑 harness 需 `starlette`、`uvicorn` 加 agent CLI（`claude`/`codex`/`opencode`）或 `deepagents langchain-litellm`；走 A2A SDK 需 `a2a-sdk>=1.1.0`。
- 云资源：AWS 侧 ECS Fargate + Aurora + ElastiCache + ALB（或 GCP 对应模块），生产需 ACM 证书。
- 反馈/可观测：网关提供 spend tracking（按项目/用户）、按项目定制日志、guardrails、缓存、管理面板；SDK 侧可接 Lunary、MLflow、Langfuse 等回调。MCP OAuth 额外需要预注册 app 的 `client_id`/`client_secret`，并且 provider 必须批准该 app。

**4. 主动推进（时间/事件/状态触发）**
- README 未描述任何定时触发或长时运行的任务调度机制。
- 有依据的“状态触发”只有：Router 的跨部署**重试与回退**逻辑、应用级**负载均衡**——即在失败或负载状态下自动改走别的部署；以及 `/batches` 端点这类批处理接口。除此之外不能推断有主动推进能力。

**5. 效果验证**
- 可直接用的量化口径：网关的**多租户成本追踪与花费管理（按项目/用户）**；harness 返回值里带 `result.cost`（单次 agent 任务成本）和 `result.files`（产出文件清单）。
- 性能口径：README 自述 **8ms P95 latency @ 1k RPS**，并链接到 benchmarks 页（本页未给压测方法与环境）。
- 可观测性口径：可把调用日志接到 Lunary / MLflow / Langfuse 等回调，用外部工具做评测追踪（README 未给具体评测流程）。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：README 的 harness 明确支持 `Harness.CLAUDE_CODE`，可以把 Claude Code 指到 LiteLLM 网关上的 model group（示例为 `litellm_proxy/claude-sonnet-4-5`），并在网关侧统一看到它的调用与成本。这与清单中已 adopt 的 Claude Code 是叠加关系，不是替代。
- **OpenCode（watch）**：对应 `Harness.OPENCODE`，同一段 harness 代码切换枚举即可，属同一机制下的可选后端。
- **Cursor（watch）**：README 给出把 LiteLLM 作为 MCP server 接进 Cursor 的 `mcpServers` 配置，是 Cursor 的一个工具来源扩展。
- **DeepSeek（try）**：支持矩阵中有 `deepseek` 一行（`/chat/completions`、`/messages`、`/responses` 均支持），即可以把 DeepSeek 纳入同一个网关统一调用与计费；README 未给 DeepSeek 专属配置示例。
- **GitHub Copilot（drop）**：支持矩阵里有 `github_copilot` 与 `github`（GitHub Models）两行，但 README 只是声明“可调用”，不构成改变其现有状态的新做法。
- **Greptile（study）**：Greptile 只出现在 OSS Adopters 的 logo 图里，README 未给任何集成或用法说明，不能据此判断关系。
- 清单中没有与“统一网关 / 多provider成本追踪 / 虚拟密钥”直接对应的条目；这部分是新增能力。

## 证据与局限

**原文给出的数据/示例**
- 仓库指标：60,526 stars，当日 +95。
- 自述性能：8ms P95 latency @ 1k RPS（附 benchmarks 链接，本页无方法细节）。
- 稳定版镜像经过 12 小时负载测试后才发布（`-stable` 标签）。
- 大量可复制代码：SDK 安装与 `completion()` 调用、proxy 安装与启动、OpenAI SDK 指向网关、MCP curl 与 Cursor 配置、harness 调用、A2AClient 调用、MCP Bridge、Terraform 模块调用。
- OSS Adopters 区域以 logo 形式列出 Stripe、Netflix、Google ADK、OpenHands、OpenAI Agents SDK、Greptile 等，未给使用场景或规模数据。

**只是主张、缺少支撑的部分**
- “Production-ready gateway”“Enterprise-ready”“no provider-specific SDK juggling”属营销性表述，本页无对照测试。
- 支持矩阵的 ✅ 只表示“支持”，不代表质量、延迟或成本等价。
- “Drop-in OpenAI compatibility”在基础 chat 场景有代码示例支撑，但复杂参数/流式/工具调用的兼容程度本页未说明。

**局限与适用条件**
- 抓取文本在 Terraform 段被截断，云部署路线只覆盖到 AWS 模块前半部分，GCP 与后续输出不可见。
- README 是入口索引，绝大多数能力（虚拟密钥怎么建、guardrails 怎么配、Router 怎么配重试与回退、auto_routing 规则、MCP server 怎么登记、日志回调怎么接）都只在 docs 链接里，**不能仅凭本页复现**。
- 明确的环境约束：`litellm` 与 `litellm-core` 不能同环境共存；构建 core 需要 Rust 工具链并在干净环境安装。
- 明确的功能坑：MCP OAuth 若上游拒绝动态注册（401/403），必须预注册 app 并配 `client_id`/`client_secret`，且 provider 需批准。
- 适用条件：需要跨多个 provider 或需要按团队核算 LLM 花费、希望业务代码只认 OpenAI 格式的场景，收益最大；只用一个模型、一个人的场景，引入网关会先增加运维成本。

## 怎么试、怎么验证

**最小试用（半天内可完成）**
1. 本地装 proxy 并只接一个模型，打通链路：`uv tool install 'litellm[proxy]'` → `litellm --model gpt-4o` → 用 openai SDK 指向 `http://0.0.0.0:4000` 发一次请求。
2. 接第二个 provider（如 Anthropic），把同一个业务脚本的 `model` 字符串从 `openai/gpt-4o` 改成 `anthropic/claude-sonnet-4-20250514`，验证“换 provider 不改代码结构”。
3. 若你已在用 Claude Code，再做一步对照：用 harness 把同一个任务（如“找出 tests/test_router.py 为什么 flaky 并修复”）分别跑在直连 provider 和网关 model group 上，比较 `result.cost` 与 `result.files`。
4. 把网关日志接到一个已有回调（如 Langfuse），确认能看到按项目的调用与花费记录。
5. 云部署（Terraform 路线）不要作为首次试用，放到本地验证通过之后。

**判断有没有改善的指标**
- **成本**：同一批任务的 spend 能否按项目/用户拆出来；单任务 `result.cost` 是否可控、是否比直连时更可解释。
- **失败率与回退**：Router 重试/回退触发次数、失败请求占比（对照接入前后的同一任务集）。
- **切换成本**：换 provider 时需要改动的代码行数（理想是只改 model 字符串，等于 0 处结构性改动）。
- **性能**：端到端 P95 延迟（README 自述 8ms P95 @1k RPS 是网关自身口径，需用自己的真实链路复测）。
- **可观测性**：能否在不改业务代码的情况下拿到每次调用的模型、耗时、成本与标签（如 `harness,claude_code`）。
- **运维负担**：本地/云部署后每周为此投入的维护时间——如果只用一个模型，这个数很可能不划算。
