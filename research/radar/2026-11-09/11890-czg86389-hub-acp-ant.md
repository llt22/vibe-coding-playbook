# czg86389-hub/ACP-Ant

- 结论：**值得一试**。把 ACP-Ant 当作“模型供给层”小范围试：手上已有可用的 Antigravity 账号、又想让 Codex/Cline/OpenAI SDK 这类现成 Agent 换一个模型后端时，按 install.sh（或 Docker）+ 面板加账号 + 三要素接入的流程就能跑通，自测脚本也齐；但它是个人开源项目、只在 agy 1.5.2 上验证、把个人订阅额度共享出去可能违反 Google 条款，且明确不支持 Claude Code，所以只宜作为可选备用通道，不宜作主力依赖。
- 原文：https://github.com/czg86389-hub/ACP-Ant
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T14:00:09.205Z

## 是什么

ACP-Ant 是一个跑在本机（默认 `127.0.0.1:8095`）的网关，把 Google 官方 Antigravity CLI（`agy`）通过 ACP 协议（Agent Client Protocol）包装成三种标准大模型接口：OpenAI Chat Completions（`/v1/chat/completions`）、OpenAI Responses（`/v1/responses`，Codex 用这个）、Anthropic Messages（`/v1/messages`），三者都支持流式输出。带工具调用、图片输入（data URL、http(s) 图片链接由网关代下载、工具结果里的图片）。

关键设计有两条，值得单独提炼：

1. **工具主权留在调用方**。网关给 `agy` 注册的 agent 没有任何内置工具，权限请求一律拒绝；Antigravity 自己不碰用户机器。工具只在 Agent 那边执行。
2. **工具调用靠提示词模拟**。ACP 本身不能把工具调用交还给上层 Agent，所以网关把 Agent 的工具清单（名字、说明、参数格式）写进系统提示词，规定模型用 `<tool_calls>[...]</tool_calls>` 格式提出调用，网关解析成标准 `tool_calls` / `tool_use` / `function_call` 返回；Agent 执行完把结果发回来，再写回对话。

多账号是第二个卖点：每个账号一个独立 HOME 目录（登录凭据只存在这里，账号间互不串），可选一个独立代理（`http://`、`https://`、`socks5://`，可带用户名密码），添加时测出口 IP 和国家，两个账号同一 IP 会提醒。额度用完、被限速、要求验证时冷却并换下一个账号；登录失效则停用。附带网页控制面板做账号管理、额度查看、开关、巡检、在线测试和接入信息展示。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 0. 前提条件

- Linux（x86_64 或 arm64），Python 3.10+，`curl`、`git`；或者只要 Docker。
- 一个或多个能用 Antigravity 的 Google 账号（原文举例 Google AI Pro）。
- 可选：每个账号一个代理节点。
- 先读免责声明：个人开源项目，不是 Google 官方项目；把个人订阅额度提供给多人或商业服务使用可能违反条款并导致账号被限制或封禁；测试于 `agy` 1.5.2，CLI 与 ACP 协议仍在变化。

### 1. 安装（三种方式任选一种，装好后都在网页面板操作）

方式一：系统服务（推荐，需要 sudo）。安装脚本会做四件事：从 `https://antigravity.google/cli/install.sh` 装 `agy` 到 `/opt/acp-ant/bin`；建 Python 虚拟环境并装 FastAPI/Uvicorn（缺 `python3-venv` 时有 apt 就自动补）；生成随机网关密钥写进 `/opt/acp-ant/gateway.env`（权限 600）；装成 systemd 服务 `acp-ant`，只监听 `127.0.0.1:8095`。

```bash
git clone https://github.com/czg86389-hub/ACP-Ant.git
cd ACP-Ant
./install.sh
```

改安装位置和端口、或不想装服务：

```bash
AGY_ROOT=/srv/acp-ant AGY_PORT=9000 ./install.sh
./install.sh --no-systemd
```

方式二：用户服务（不用 sudo）。装到 `~/acp-ant`，作为当前用户的服务运行。注意要用 SSH 直接登录该用户再安装（不要 `su` 过去），否则连不上用户的 systemd。

```bash
git clone https://github.com/czg86389-hub/ACP-Ant.git
cd ACP-Ant
./install.sh --user
systemctl --user status acp-ant
journalctl --user -u acp-ant -f
```

脚本会顺便开 `loginctl enable-linger`；若服务器不允许，让管理员跑一次 `sudo loginctl enable-linger 你的用户名`。

方式三：Docker。账号、密钥、面板密码、统计都在 `./data`，删掉重建容器也不丢。

```bash
git clone https://github.com/czg86389-hub/ACP-Ant.git
cd ACP-Ant
docker compose up -d --build
cat data/panel-initial-password.txt     # 面板初始密码（可能要 sudo）
```

### 2. 取两个凭据（别混用）

面板管理员密码和客户端用的 API 密钥是两回事：

```bash
cat /opt/acp-ant/panel-initial-password.txt      # 面板初始密码

grep AGY_GATEWAY_KEY /opt/acp-ant/gateway.env    # 客户端用的网关密钥
```

面板密码在「设置」里改成自己的之后，`panel-initial-password.txt` 会自动删除；也可以直接在 `gateway.env` 里写 `AGY_PANEL_PASSWORD=` 指定。

### 3. 登录面板

本机打开 `http://127.0.0.1:8095/`，绑定域名后打开 `https://你的域名/`。面板里能看到：每账号状态（正常 / 已关闭 / 需要 Google 验证 / 冷却中 / 需要重新登录）、代理与出口 IP、三组额度（Gemini 模型、Claude/GPT 模型、Gemini 4 Argon，各有每周和 5 小时剩余百分比与重置时间）、今天和近 7 天成功/失败次数与 Token 用量、最近错误。

### 4. 添加账号（面板向导，推荐）

前提：账号能登录 Antigravity；若走代理，先备好代理串。向导流程：填名字和代理 → 自动测出口 IP（同一 IP 被别的账号用过会提醒）→ 点按钮打开 Google 登录页 → 把授权码或落地页网址粘贴回面板 → 自动检测，通过后自动开启。登录全程在自己的浏览器里完成，面板只转交授权码、不保存。

命令行等价做法（每个账号起一个名字，字母、数字、`-`、`_`）：

```bash
/opt/acp-ant/account.sh add g1
```

1. 输入代理地址（输入时屏幕不显示，粘贴后直接回车），例如 `socks5://用户名:密码@1.2.3.4:1080`；脚本会测出口 IP 和国家。
2. 屏幕出现授权网址，复制到**自己电脑**的浏览器打开，选这个账号并同意；浏览器最后会跳到打不开的 `localhost` 网址，或显示一串授权码，把整串网址或授权码粘贴回终端回车。
3. 显示「已登录，可用模型：…」即成功。中途关掉没关系，再跑一次 `add g1` 会接着做。

不想用代理（两处都要改）：

```bash
AGY_REQUIRE_PROXY=0 /opt/acp-ant/account.sh add g1
# 同时在 gateway.env 里加一行：AGY_REQUIRE_PROXY=0
```

其它账号命令：

```bash
/opt/acp-ant/account.sh list        # 账号、代理（只显示主机端口）、出口 IP、登录状态、可用模型
/opt/acp-ant/account.sh check g1    # 真发一句话测试；需要验证时打印验证网址
/opt/acp-ant/account.sh login g1    # 重新登录（代理不变）
/opt/acp-ant/account.sh proxy g1    # 换代理节点
/opt/acp-ant/account.sh remove g1   # 删除账号（含凭据，会先确认）
```

### 5. 在 Agent 侧填三要素

- 地址：`http://127.0.0.1:8095/v1`（Anthropic 格式客户端填 `http://127.0.0.1:8095`）
- 密钥：`grep AGY_GATEWAY_KEY /opt/acp-ant/gateway.env` 看到的那串
- 模型名：推荐 `gemini-3.8-flash-medium`

Agent 在本地、网关在服务器时，用 SSH 隧道，不要暴露 8095 到公网：

```bash
ssh -N -L 8095:127.0.0.1:8095 用户名@服务器
```

确实要公网访问，前置 Nginx / Caddy 加 HTTPS 反向代理。

### 6. Codex CLI 配置（原文给的原样配置）

```toml
model_provider = "acpant"
model = "gemini-3.8-flash-medium"

[model_providers.acpant]
name = "ACP-Ant"
base_url = "http://127.0.0.1:8095/v1"
env_key = "ACPANT_KEY"
wire_api = "responses"
```

```bash
export ACPANT_KEY=你的网关密钥
codex
```

新版 Codex 已不支持 `wire_api = "chat"`，必须用 `responses`。

### 7. 其它客户端接入

原文实测：Codex CLI 0.134（Responses）真跑通 shell 工具任务；三种接口的工具调用由 `scripts/agent_test.py` 覆盖。Claude Code 不可用（见下）。其余按 OpenAI 兼容填即可（接口已测，软件本身未逐一实测）：

| 软件 | 怎么配 |
|---|---|
| OpenAI SDK、LangChain（`ChatOpenAI`）、LlamaIndex、AutoGen、CrewAI | `base_url` 填地址，`api_key` 填密钥，`model` 填模型名 |
| Cline / Roo Code / Kilo Code（VS Code 插件） | API Provider 选「OpenAI Compatible」，填 Base URL、API Key、Model ID |
| Continue、Cherry Studio、Open WebUI、LobeChat、Dify、n8n | 添加「OpenAI 兼容」模型供应商，填地址、密钥、模型名 |
| OpenCode | 在 `opencode.json` 里加一个 `@ai-sdk/openai-compatible` 供应商，`baseURL` 填地址 |
| Cursor | 需要公网 HTTPS 地址（Cursor 从自己的服务器发请求），本机地址和 SSH 隧道都不行 |

Aider 命令行：

```bash
aider --openai-api-base http://127.0.0.1:8095/v1 --openai-api-key 你的密钥 --model openai/gemini-3.8-flash-medium
```

Python 带工具的例子（原文示例）：

```python
from openai import OpenAI
client = OpenAI(base_url="http://127.0.0.1:8095/v1", api_key="你的网关密钥")
r = client.chat.completions.create(
    model="gemini-3.8-flash-medium",
    messages=[{"role": "user", "content": "巴黎现在天气怎么样？"}],
    tools=[{"type": "function", "function": {"name": "get_weather", "description": "查询城市天气",
            "parameters": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}}}],
)
print(r.choices[0].message.tool_calls)
```

### 8. 接完先跑自测，再谈效果

```bash
python3 /opt/acp-ant/agent_test.py            # 三种接口的工具调用、流式、JSON 模式，约 1–2 分钟
python3 /opt/acp-ant/smoke_test.py [图片路径] [并发数]   # 短回复、系统提示词、读图、并发
HOME=/opt/acp-ant/accounts/g1 HTTPS_PROXY=<代理地址> python3 /opt/acp-ant/acp_probe.py --prompt "Reply with OK"
```

`acp_probe.py` 直接和 `agy acp` 握手、打印协议往来，用来确认账号实际提供哪些模型和思考档位。

### 9. 调参（面板能改的别改文件；以下在 `gateway.env`）

- 每账号并发：`AGY_PER_ACCOUNT`，1–10，默认 3；N 个账号即同时 N×3，超出排队不报错。面板「设置」里改立即生效。
- 流式心跳：`AGY_HEARTBEAT` 默认 15 秒，静默超时发 SSE 注释行 `: keep-alive` 或 Anthropic `ping`（Cloudflare 100 秒无数据会断）。
- 模型名兜底：`AGY_MODEL_FALLBACK=0` 改为报错；默认兜底到 `AGY_DEFAULT_MODEL`（`gemini-3.8-flash-medium`）。
- 自定义别名：`AGY_MODEL_ALIASES={"fast": ["gemini-3.8-flash", "low"]}`。
- 更新检查：`ACPANT_UPDATE_CHECK_HOURS=0` 彻底关掉（默认每 6 小时读一次 GitHub 上的 CHANGELOG.md）。
- 用自己的 fork：`ACPANT_UPDATE_REPO=你的用户名/ACP-Ant`。

模型名与思考档位：`gemini-3.8-flash-high/-medium/-low`、`gemini-3.8-flash`（账号默认）、`gemini-4-argon-high` / `gemini-4-argon`。不在表里的名字原样传给 Antigravity，结尾 `-high/-medium/-low` 自动当思考档位；`GET /v1/models` 列出别名与账号实际模型（处理过一次请求后才知道）。OpenAI 的 `reasoning_effort`、Responses 的 `reasoning.effort` 也会当思考档位（模型名里写了档位的以模型名为准）。

### 10. 运维接口与排障

```bash
curl -H "Authorization: Bearer $KEY" http://127.0.0.1:8095/admin/status
curl -H "Authorization: Bearer $KEY" "http://127.0.0.1:8095/admin/status?quota=1"   # 加额度，查询不消耗额度，缓存 10 分钟
curl -X POST -H "Authorization: Bearer $KEY" http://127.0.0.1:8095/admin/reset/g1      # 重新登录或换代理后清冷却/停用标记
curl http://127.0.0.1:8095/healthz                                                     # 不需密钥，只返回账号数
journalctl -u acp-ant -f
```

密钥可放 `Authorization: Bearer <密钥>`、`x-api-key` 或 `api-key` 请求头。OpenAI 格式非流式回复里有 `x_account` 字段，标明这次用的哪个账号。每账号的 `agy` 日志在 `accounts/<名字>/gw/`。

面板里打开「自动巡检」：默认每 6 小时给每个开启的账号读一次额度（原文称不消耗额度），顺带刷新 Google 登录令牌、确认代理和登录正常，发现失效标「需要重新登录」；可选每天再真发一句话（每天消耗一次极小额度）以提前发现「需要 Google 验证」。原文特别说明：官方 `agy` 每次使用会自动续期令牌，严格意义的保活不是必须，巡检的价值在于提前发现问题。

### 11. 安全与隐私必做项

- 默认只监听 `127.0.0.1`，除 `/healthz` 外所有接口都要密钥；不要直接把 8095 暴露公网。
- `accounts/`、`gateway.env` 已写进 `.gitignore`，**不要把它们传到任何地方**。
- 代理地址（含密码）在 `accounts/<名字>/proxy.env`，权限 600；`list` 只显示主机和端口。
- 网关启动 `agy` 时加了 `--disable-telemetry`；`agy` 每次对话的本地记录，网关每小时删掉超过 6 小时的（可配置）。
- 面板接口在 `/panel/api/` 下：会话 Cookie（HttpOnly、SameSite=Strict），修改类请求要带 `X-ACP-Panel: 1` 头，登录失败按 IP 限次。

### 12. 更新

`git clone` 安装的（方式一、二）：面板点「立即更新」，会拉最新代码、装依赖、等正在处理的请求做完后自动重启，一般 1 分钟内完成，账号、密钥、面板密码、统计都保留。手动：

```bash
git pull && ./install.sh          # 用户服务加 --user
```

Docker：

```bash
git pull && docker compose up -d --build
```

### 13. 明确不要做的

- 不要拿它接 Claude Code：Antigravity 服务端会拒绝带 Claude Code 特征内容的请求（`x-anthropic-billing-header` 加上一句固定身份介绍），返回 `RESOURCE_EXHAUSTED (429)`，与账号额度无关，ACP-Ant 不做绕过（绕过有封号风险），网关会在 2–3 秒内把它当 429 返回。
- 不要指望 `temperature`、`max_tokens` 生效：ACP 协议没有这两个参数，会被忽略。回复被截断时网关会在同一会话里让模型接着写，最多 3 次。
- 不要把共享账号当成扩并发的首选：Google 未公布同账号并发上限，原文判断真正限制是每账号 5 小时 / 每周额度，想服务更多人最稳的办法是加账号。

## 对应的研究问题

**1）能力发现（AI 能做哪些还没想到交给它的工作）**

这篇的重点不在“模型还能干什么”，而在“已有的 Agent 还能接什么后端”。可提炼的一条：把只能命令行交互的 CLI Agent 用协议包装成标准 API，原有工具链一行配置就能换模型源——这是很多团队没想到的复用方式。另外一条更通用：**上游可能把错误当正文返回**（审核拦截、要求验证、`RESOURCE_EXHAUSTED`），有时还在后台重试几分钟，调用方需要专门识别这种“软错误”，否则会把错误文本当答案用掉。原文没给任何具体业务场景的能力清单。

**2）任务匹配（什么工作适合怎样的模型、工具和协作方式）**

- 写代码的 Agent（Codex 这类）是「发请求 → 本机执行工具 → 再发请求」一步一步来，一个任务同时只占 1 个位子——所以并发需求应按“人”算，不是按“任务”算。
- Codex 新版必须 `wire_api = "responses"`，`chat` 已不支持——接口形态要跟客户端版本对齐。
- 思考档位：高思考档非常慢，复杂长文一次可能几分钟，一般用 `medium` 就够。
- Claude 系客户端在“没有可用账号”时收到 529（overloaded）会自动重试，Anthropic 格式因此在客户端侧更“自愈”。
- 反例：Claude Code 接不进来，说明“任务匹配”里也要写清哪些客户端与该后端不兼容。

**3）条件供给（需要提供哪些信息、工具、权限和反馈）**

这是原文最扎实的部分：

- **接口三要素**：地址、密钥、模型名，填完即可接入；Anthropic 客户端地址少一级 `/v1`。
- **工具供给**：Agent 的工具清单（名字、说明、参数格式）写进系统提示词，并约定 `<tool_calls>[...]</tool_calls>` 格式；支持一次调用多个工具、支持 `tool_choice`。
- **权限最小化**：给 `agy` 注册的 agent 不挂任何内置工具，权限请求一律拒绝；工具只在 Agent 侧执行。
- **隔离**：每账号独立 HOME、独立代理文件（600），凭据不串、代理密码不外显。
- **反馈通道**：错误分类映射成标准码（额度 429、验证 503、审核 400、全忙 503/529、超时 504）、`x_account` 标明用哪个账号、`/admin/status` 给出每账号成败次数与冷却秒数、面板显示“正在处理/同时上限/排队数”。
- **网络条件**：SSH 隧道而非公网暴露；流式心跳防 Cloudflare 100 秒断连。

**4）主动推进（哪些工作可由时间、事件或状态触发并持续完成）**

- 时间触发：每 6 小时自动巡检读额度、刷新令牌、验代理（可选每天真发一句话）；每 6 小时检查更新；每小时清理 6 小时前的会话记录。
- 状态触发：额度用完歇 30 分钟、限速歇 90 秒、要求验证歇 10 分钟、登录失效停用；请求按“最闲账号优先、同档轮转”分流；满了就排队，290 秒内没排上才返回忙。
- 事件触发：新账号加进来不用重启，网关自动发现；面板「立即更新」等正在处理的请求做完再重启。

**5）效果验证（怎样判断确实改善了结果）**

原文只到“接口通不通”这一层：`agent_test.py` 覆盖三种接口的工具调用、带工具结果第二轮、流式、JSON 模式、自定义工具；`smoke_test.py` 覆盖短回复、系统提示词、读图、并发；面板给成功/失败次数、Token 用量、近 7 天统计、在线测试；`/healthz` 做存活检查。这些是**可用性验证**，不是**工作结果是否变好**的验证——手册里要补任务层指标（见末节）。

## 与已有做法的关系

清单里已有的条目多为“客户端/Agent”，ACP-Ant 是它们的上游“模型供给层”，二者是组合关系而非替代关系。

- **Claude Code（adopt）**：原文明确**不支持**。Antigravity 服务端拒绝带 Claude Code 特征内容（`x-anthropic-billing-header` 和一句固定身份介绍）的请求，返回 `RESOURCE_EXHAUSTED (429)`，与额度无关；ACP-Ant 不做绕过。因此不要把 ACP-Ant 当作 Claude Code 的后端；反过来，如果手册以 Claude Code 为主推工具，这条是“什么接不进去”的负面清单。
- **Cline（watch）**：列为“API Provider 选 OpenAI Compatible，填 Base URL / API Key / Model ID”，属“接口已测、软件本身未逐一实测”。若要试，Cline 是最小验证成本最低的一档。
- **Cursor（watch）**：需公网 HTTPS 地址，本机地址和 SSH 隧道都不行（Cursor 从自己服务器发请求）。这与“只监听 127.0.0.1 + SSH 隧道”的安全默认直接冲突，等于要额外开公网入口，需要单独权衡。
- **Google Antigravity（watch）**：本项目的上游与前提；需要可用 Antigravity 的 Google 账号，测试于 `agy` 1.5.2，协议仍在变化。
- **OpenCode（watch）**：`opencode.json` 里加 `@ai-sdk/openai-compatible` 供应商，`baseURL` 填地址。

原文没有与清单中任何条目做正面比较，也没有给出相对这些客户端自带供应商方案的优劣数据。

## 证据与局限

**原文给出的数据与案例（可核对的实测）**

- Codex CLI 0.134 用 Responses 接口真跑通：用 shell 工具建文件、再读回来，15 秒。
- `scripts/agent_test.py` 三种接口的工具调用全部通过：首轮、带工具结果第二轮、流式工具调用、JSON 模式、自定义工具（custom tool）；Anthropic 侧还测了 `count_tokens`。
- 速度（服务器本机实测，`gemini-3.8-flash-medium`）：短回复首字约 1.3–2 秒；约 300 字回答首字 6–9 秒；长文首字 8–10 秒，之后边生成边输出约每秒 100 字。
- 优化效果：每账号一个常驻 `agy` 进程、所有会话共用，新建会话约 0.02 秒（每会话单独起进程约 2 秒）；服务启动时预热。
- 一组默认值（是配置而非效果数据）：单次请求 290 秒超时、每账号并发 3、心跳 15 秒、冷却 30 分钟 / 90 秒 / 10 分钟、会话记录保留 6 小时。

**只是作者主张、没有独立证据的部分**

- “Gemini 3.8 Flash 用提示词模拟工具调用的成功率很高”——只给了自家测试通过，没有失败率、也没有跨模型对比。
- “几秒内就能认出软错误”——无量化。
- 额度查询与自动巡检“不消耗额度”——无第三方验证。
- “真正的限制是每账号 5 小时 / 每周额度，而不是并发”——是基于观察的判断。

**适用条件与局限**

- 个人开源项目，与 Google 无任何关系；作者自己写明仅供自担风险使用。
- 仅在 `agy` 1.5.2 上测试；Antigravity CLI 与 ACP 协议都在变化，新版本可能改变行为。
- 条款风险：把个人订阅额度提供给多人或商业服务使用，可能违反 Google Antigravity 及订阅条款，导致账号被限制或封禁。这是本项目最硬的一条约束，做团队落地前要先过合规。
- 工具调用是提示词模拟：模型偶尔不按 `<tool_calls>` 格式写，网关会把原文当普通回答返回，Agent 一般会重试或继续——即存在静默降级。
- `temperature`、`max_tokens` 被忽略，ACP 不支持；截断续写最多 3 次。
- Claude Code 不可用，且不做绕过。
- 平台面：只测 Linux；Cursor 需公网 HTTPS。

## 怎么试、怎么验证

**最小试用（一个人、一个账号、一台上机，目标是把链路跑通再谈价值）**

1. 用 Docker 或 `./install.sh --user` 安装，别先动系统服务；不配代理的话两处都设 `AGY_REQUIRE_PROXY=0`；确认只监听 `127.0.0.1`。
2. 只加 1 个账号，跑 `account.sh check g1` 或面板「检测」，确认登录与可用模型。
3. 跑 `python3 /opt/acp-ant/agent_test.py`，三种接口的工具调用全绿再往下（1–2 分钟）。
4. 选一个真实但低风险的任务做对照：例如让 Codex CLI 用 Responses 接口跑“建文件 → 读回 → 改一行”的小任务，或让 Cline 走 OpenAI Compatible 做一次带工具的多轮问答。
5. 全程开着面板，记录一次会话的首字延迟、总时长、是否触发换号、是否出现软错误。

**判断有没有改善的指标**

- 接口层：`agent_test.py` 是否三项全绿；面板“今天成功/失败次数”里的失败占比；软错误误判（把正常回答当错误、或把错误文本当回答）出现的次数。
- 延迟：短回复首字是否 ≤2 秒、300 字首字是否 ≤10 秒（与原文实测对齐，超出说明代理或档位有问题）；面板里的排队数与等待时长。
- 稳定性：连续 N 次请求中的换号次数、冷却触发次数、需要手动 `/admin/reset` 的次数；自动巡检是否在真实请求之前就发现了登录失效或代理挂掉。
- 额度成本：每周与 5 小时两个窗口的剩余百分比下降速度，与直接开官方 IDE 使用相比是否更省。
- 任务层（原文没给，需自建基线）：同一任务在接入前后对比——完成时间、人工介入次数、产出返工次数。只有任务层指标改善，才算“工作方式被改善”，否则只是换了条通道。
- 停止条件：一周内若账号被限制或要求验证的频率明显上升，或合规上无法接受订阅共享，就回退到官方客户端，把这套只留作个人实验记录。
