# Show HN: AgentRun – open-source, Self-improving Managed Agents

- 结论：**值得一试**。先在本地用 `npx @parcha/agentrun` 启动服务，并给一个模板（建议用 `code-review` 或 `kyb`）设置费用上限，跑一批自有数据，重点验证「learning 打开前后同一批任务的 token 成本与通过率」以及它相对现用工具的缺陷发现率；理由是 README 给出了可直接执行的安装、模板、workflow JSON、CLI/API 与触发器的完整路径，但所有收益数字均为作者自报、样本小（30 个 PR），且无独立复现，暂不宜作为手册中的默认方案。
- 原文：https://github.com/Parcha-ai/agentrun/blob/main/README.md
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T20:41:39.699Z

## 是什么

AgentRun 是 Parcha Labs（Grep.ai 团队）开源的（Apache-2.0）代理运行平台，定位不是新的 agent 框架，而是套在已有 harness 外面的「控制平面 + 持久化执行 + 学习层」：

- **学习层**：每轮运行结束后多给 agent 一轮，让它提出要保留的东西（note / skill / workflow），经代码校验和一次 grader 评分后提交到该 agent 自己的 git 目录，下一轮从这里开始。
- **持久化执行**：agent、revision、run、step 都存在同一个 store（默认 SQLite，可换 Postgres），杀掉服务再起，run 继续；多 runner 时死掉的 runner 的 run 在其 30 秒租约到期后被别的 runner 接管。
- **控制平面**：工具级审批（允许/询问/拒绝）、花费上限、Mission Control 汇总、人工接管浏览器/桌面。
- 可选的 harness：`pi`（默认）、`claude-agent`（Claude Code）、`codex`、`opencode`。
- 计算机类型：`none` / `sandbox` / `desktop` / `phone` / `browser`，各配 Docker、Daytona、Modal、E2B、Orgo、Browserbase、Kernel 等 provider。

## 具体做法（编号步骤）

**步骤 0：前提**
Node 24.22.3 或更新，macOS 或 Linux。想用 Docker sandbox 需本机 Docker 在运行（镜像首次构建需数分钟）。

**步骤 1：本地起服务**

```sh
npx @parcha/agentrun
```

它在 7340（被占用则顺延）起 server 和一个 runner，数据存 `~/.agentrun`，并自动打开浏览器控制台。

**步骤 2：设密码 + 加模型 key**
在控制台设密码，然后 **Settings → Model keys** 加 key。对应关系（原文）：
- `OPENROUTER_API_KEY`：给所有 harness 供模型；
- Anthropic key：跑 `pi` 和 Claude Code；
- OpenAI key：跑 `pi`、Codex、OpenCode。

**步骤 3：用模板跑第一个 agent（验证链路，不需要自备工具）**
打开 **Templates → Apply → KYB due diligence**，输入一个公司名和网址即可跑。跑完看 run 的 **Report** tab（带结论、每条陈述有引用），再看该 agent 的 **Learning** tab 看它留下了什么。
（原文强调：Apply 模板不会自动授予任何 MCP 工具权限，需自己逐个勾选。）

如果想让编码 agent 代劳，原文给的指令是：

```
Read agentrun.ai/SKILL.md and set up AgentRun for me
```

**步骤 4：打开学习（关键能力）**
在 agent 定义里加 `"learning": true`。每轮结束后的保留流程：

1. 最后一步提议题案（notes / skill / workflow）；
2. 先过代码校验（大小、数量、命名、形状等规则；出现密钥、隐藏字符、目录外文件、删除操作或整份索引则整份丢弃）；
3. 再由一个 grader 判一次，通过的提交到 `main`；
4. 高风险规则等你点 OK；从网页或粘贴邮件里读到的「规则」、含账号的 note 会被丢弃；
5. 某个 skill 已服务 3 轮后，下一轮会要求把它写成 workflow 草案，草案先 dry-run（不调模型、不跑工具）才保留。

退役某条保留项：

```sh
npx @parcha/agentrun learning retire
```

（配合该 note 的 ETag。）

**步骤 5：把重复工作写成 workflow（不是所有活都该交给 agent）**
workflow 是 typed steps 的 JSON 文档，可调工具、跑模型、做快速 typed 判断（是/否、选一、打分，各带置信度）、按答案分支、并行 map、有限次循环、调用其他 workflow，或把疑难案例交给 agent。原文示例（可直接照抄改）：

```json
{
  "v": 2, "name": "read-site",
  "schemas": {
    "In":   { "type": "object", "required": ["website"], "properties": { "website": { "type": "string" } } },
    "Page": { "type": "object", "required": ["ok"], "properties": { "ok": { "type": "boolean" } } }
  },
  "input":  { "schemaId": "In" },
  "output": { "schemaId": "Page", "path": "home" },
  "root": { "node": "chain", "steps": [
    { "node": "call", "label": "Read the home page", "via": "tool", "tool": "web_fetch",
      "args": { "url": "{website}" }, "out": "Page", "as": "home", "deadline_s": 60 }
  ] }
}
```

保存为 agent 的 `workflow` 字段前先校验：

```sh
npx @parcha/agentrun workflows validate
```

workflow 作为 agent 的一个 revision 运行，沿用该 agent 的工具权限和花费上限。

**步骤 6：用 CLI 跑一轮「会停下来问你」的 run（可直接复制）**

```sh
# 1. Make an agent that can write files and ask you things.
cat > agent.json <<'EOF'
{"definition": {"id": "notes", "version": 1, "name": "Notes",
  "instructions": "Do what you are asked, and write what you make to a file.",
  "skills": [], "tools": ["write", "ask_person"]}}
EOF
npx @parcha/agentrun agents create --body @agent.json

# 2. Start a capped run and wait. It stops to ask you which region (exit code 8: it waits on you).
npx @parcha/agentrun runs start notes --max-cost-usd 1 --wait \
  --body '{"input": {"content": "Ask me which region to cover, then write region.md about it."}}' > out.json

# 3. Answer, wait for it to finish, and read what it wrote.
run=$(node -p 'require("./out.json").run_id')
npx @parcha/agentrun runs message "$run" --content "Europe"
npx @parcha/agentrun runs wait "$run" > out.json
npx @parcha/agentrun runs read-file "$run" region.md
```

退出码：0 完成、1 失败、8 在等你（提问 / 触顶 / 审批）。`runs timeline RUN_ID --follow` 流式看每一步。

**步骤 7：从代码调用（TypeScript / Python）**

```sh
export AGENTRUN_BASE_URL=http://127.0.0.1:7340/v2
export AGENTRUN_API_KEY=$(cat ~/.agentrun/.token)
```

```ts
import { AgentRun } from "@parcha/agentrun-client";

const client = new AgentRun(); // AGENTRUN_BASE_URL and AGENTRUN_API_KEY
const started = await client.runs.start("notes", { input: { content: "Ask me which region to cover, then write region.md about it." }, max_cost_usd: 1 });
let run = await client.runs.wait(started.run_id);
if (run.pending?.kind === "question") await client.runs.message(run.run_id, { content: "Europe" });
run = await client.runs.wait(run.run_id);
console.log(run.status, run.cost.usd);
```

Python 客户端：`pip install parcha-agentrun`，方法同名。

**步骤 8：给 agent 配「计算机」**

```yaml
computer:
  kind: sandbox        # none, sandbox, desktop, phone or browser
  provider: daytona    # one you connected in Settings → Computers (none takes no provider)
```

前提：provider 的 key 先在 **Settings → Computers** 加一次（server 会封存，只显示已设/缺失，不会进到 agent 的计算机里）；Daytona / Modal / E2B 只有在开启 Archil disk 后才可用，且此时 Docker sandbox 被拒绝。

**步骤 9：定时 / 事件驱动**
Triggers 可自启动有上限的 run：schedule、带签名的 webhook、GitHub pull request 事件。`code-review` 模板会自己配好 GitHub 触发器。

**步骤 10：跑模板的评测用例**

```sh
npx @parcha/agentrun template eval DIR
```

在一次性临时 server 上把模板的 eval 用例当真实 run 跑并打分。

**步骤 11：部署（可选）**
- Render 一键：单个 1 CPU / 2 GB 实例 + 10 GB 盘，约 $25/月 + 磁盘 $2.50（原文写作时价格），用你自己的 OpenRouter key（建议设额度上限和有效期）。
- Docker Compose（Linux）：

```sh
git clone https://github.com/Parcha-ai/agentrun && cd agentrun/deploy
printf 'AGENTRUN_SEAL_KEY=%s\n' "$(openssl rand -base64 32)" > .env && chmod 600 .env
echo 'OPENROUTER_API_KEY=...' >> .env
docker compose up -d --build
docker compose logs server     # the console's link, the first visit's setup code and, the first time, the token
```

注意该 compose 文件没有 Docker socket，因此 agent 只有文件工具和 `web_fetch`、没有 shell；需要 shell 得用仓库根目录的单 server `compose.yaml`（Docker Engine 26+）或 Daytona/E2B + Archil disk。端口只绑本机 loopback，对外要加 TLS 代理。
- 多 runner：server 用 `--no-runner` 起，每个 runner 从同一镜像以 `runner --data /data --name <name>` 起，全部进程共享同一个 `AGENTRUN_SEAL_KEY`。

**步骤 12：安全前提**
所有密钥封存在 `AGENTRUN_SEAL_KEY` 下，丢了就解不开；密钥只写，控制台只显示已设/缺失；API token 不能写密钥、不能批准工具调用；run 只拿到自己模型和工具需要的 key。

## 对应的研究问题

**1. 能力发现**
README 给出五个开箱模板，本身就是「可以直接交给 AI 的工作」清单：`code-review`（八个独立 reviewer 在只读 checkout 上评审 PR、合并并核验发现、每条引用对应行、返回 JSON）、`kyb`（公司尽调：注册库、股东、制裁名单、有日期的负面新闻、带引用的结论）、`market-monitor`（每周一推送关注公司的变化，每条带日期和链接）、`inbound-lead`（webhook 进来的线索按 ICP 打 0–100 分）、`release-notes`（把上次发布以来的 PR 变成草稿 issue 交给人工）。另有「skill 服务满 3 轮后自动要求写成 workflow」这条机制——即把已摸清的工作从「每次重新推理」升级为「一次调用」。

**2. 任务匹配**
- 显式反对「万物皆 agent」：「A lot of agents don't need to be agents」，可重复工作应写成 typed workflow，只在案例不清楚时回落到 agent。
- 模型分层：先用 Opus 摸清商户分类该怎么做，再把学到的东西交给便宜模型执行（案例见证据节）。
- harness 与任务对应：`pi` 默认、Claude Code / Codex 首次使用时自安装、OpenCode 需 server 旁有 `opencode-ai` 包；用 `npx @parcha/agentrun server capabilities` 查本 server 支持哪些。
- 计算机与任务对应（原文表格）：`none` 只读写 run 目录无 shell；`sandbox` 跑代码装包留在后台进程；`desktop` 看 Linux 屏幕、动鼠标、打字；`phone` 在 Android 上点划输入读屏；`browser` 浏览网页并可随时把控制权交给人（登录、验证码场景）。

**3. 条件供给**
模型 key、逐个勾选的 MCP 工具权限、工具级审批（allowed / asks / denied，`"Never ask"` 可无人值守但 server 侧的 deny 仍然生效）、花费上限（触顶是暂停并告诉你最少还需要什么，而不是失败）、provider key 与 Archil disk、run 文件夹在 `/workspace` 挂载、learning 目录是单分支 `main` 的普通 git。

**4. 主动推进**
triggers 支持 schedule、签名 webhook、GitHub PR 事件启动有上限的 run；durable execution 使 run 在服务重启后继续、runner 死亡 30 秒租约后被接管、已完成的 step 不重跑、被崩溃切断的写操作标记为 interrupted 而非重试；`ask_person` 让 run 停在等人（CLI 退出码 8）。

**5. 效果验证**
- Mission Control：按天、按 harness、按工具给出 agents / runs / tokens / run time / success rate / cost。
- agent 的 Learning tab：保留了什么、自学习以来发生了什么变化、每条 run 用了哪些 note。
- 模板自带 eval 用例，`template eval DIR` 在一次性 server 上跑真实 run 并打分。
- 学习机制自身的把关：代码校验 + 一个 grader + 高风险规则人工确认 + workflow 草案 dry-run。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：AgentRun 不替代它，而是把它作为可选 harness（`harness: claude-agent`，首次使用时自安装），在其外面加学习、持久化、审批、花费上限、触发器和控制台。清单里若已有 Claude Code 的用法，AgentRun 属于「在其之上加一层运维与学习」，不是并列选项。
- **Greptile（清单状态 study）**：README 的 code-review 案例正是以 Greptile 为基准——Greptile 从 3 月起每次 review 收 1 美元、账单从 $180/月涨到 $6,451，于是自建 reviewer 跑在便宜模型上并用自家 PR 调优，结果每次 0.18 美元，在 30 个没见过的 PR 上抓到 1.6 倍于 Greptile 的真实 bug。这条可作为「用评测集替换按次计费的外部工具」的案例，但数字是作者自报。
- **OpenCode（清单状态 watch）**：作为第四种可选 harness，前提是 server 旁边装了 `opencode-ai` 包（AgentRun 会打印安装命令）。

## 证据与局限

**原文给出的数据/案例**（均为作者自述，无第三方复现）：
- code review：账单 $180/月 → $6,451 → 自建后 0.18 美元/次；30 个未见过的 PR 上抓到的真实 bug 是 Greptile 的 1.6 倍。样本 30 个 PR，量级小且由作者选定。
- 商户分类：Opus 摸索 + 便宜模型执行，同一工作从 $0.89 降到 $0.12 每家商户。
- Learning tab 截图里的「2 秒 vs 10 秒、$0.0077 vs $0.05」——原文自己标注为 **console 录制 fixtures 的演示数据**，不能当证据。
- support workflow 的 gif 原文标注为「控制流示意，不是模型运行的录像」。

**只是主张、无从验证的部分**：「用更少 token 越跑越聪明」「run 永不丢失」等属设计目标陈述；学习机制的质量主要由一个 grader 把关，grader 本身的可靠性原文未给数据。

**适用条件与硬限制**：
- Node ≥ 24.22.3，仅 macOS / Linux；
- 部署到 Render 约 $25/月 + $2.50 磁盘，另加模型与远程计算机费用（远程计算机走你自己的 vendor 账号）；
- 默认 compose 无 Docker socket ⇒ 无 shell；Daytona/Modal/E2B 必须配 Archil disk；
- 丢失 `AGENTRUN_SEAL_KEY` 即丢失所有已封存密钥；
- 「Coming next」里的每调用选择计算机、第一方计算机、iPhone/macOS/Windows 计算机、桌面/手机 run 的观看接管、Composio 工具目录、ACP harness、Slack 与 Parallel 触发器，目前都还没有；
- 项目很新（Show HN 43 分、3 条评论，版权年份 2026），尚无独立基准或长期运维报告。

## 怎么试、怎么验证

**最小试用（半天内可完成）**
1. 本地 `npx @parcha/agentrun`，只配一个带额度上限和有效期的 OpenRouter key。
2. 先跑 `kyb` 模板 3–5 家公司，确认链路（报告、引用、Learning tab 有内容）。**不要**在这步接生产系统。
3. 把 `code-review` 模板用 `docs/tutorials/tune-a-template.md` 的循环在自家仓库上调一遍，检查点：
   - 每次 review 的 `cost.usd`（Mission Control 与 run 详情可读）；
   - 在**调优时没见过的**一批 PR（≥30 个，且包含已知的人工标注 bug）上，与现用工具（如 Greptile）比真实 bug 召回；
   - 误报数与每条发现是否引用了具体代码行。
4. 学习效果的 A/B：挑一件重复性工作（如 release notes 或线索打分），先用 `"learning": false` 跑 10 次记录 token 与成功率，再开 `"learning": true` 跑同样 10 次，比较 tokens/次、耗时、成功率、人工介入次数（审批与提问次数）。原文声称会变好，但这必须由你自己的数据确认。
5. 主动推进只做一件：给 `market-monitor` 配一个 schedule，观察两周内触发失败率与花费是否被 cap 拦住。

**判断改善的指标（全部可从平台自身读到，或需你自建标注集）**
- 单位任务成本（$/run）与 token/run，学习开启前后对比；
- 任务成功率、人工介入次数（审批 / 提问 / 接管）；
- 质量：自建标注集上的召回与误报，以及模板自带 eval 的通过率（`template eval DIR`）；
- 稳定性：故意 kill server 后 run 是否续跑、step 是否重复执行。

**止损条件**：若在自有标注集上召回不优于现用工具、或学习开启后 token 不降、或需要频繁人工干预超过现流程，就停在「study」，不要把具体配置写进手册默认路径。
