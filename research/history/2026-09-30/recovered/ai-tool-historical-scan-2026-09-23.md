已完成 **2026-03-01 至 2026-09-23** 的第一轮历史回溯。共抓到数百个仓库，去重后有 **17 个值得关注、7 个值得立即试用**。

**最容易被你漏掉的 7 个**

| 首次起量 | 项目 | 判断 |
|---|---|---|
| 3 月 | [gstack](https://github.com/garrytan/gstack) | 23 个工程、设计、Review、QA、发布 Skill 组成的完整 Claude Code 工作流。很有影响力，但比较强势、偏 Claude Code。 |
| 3 月 | [Orca](https://github.com/stablyai/orca) | 多 Agent + 独立 worktree + diff 审查 + 手机/远程控制。目前最值得亲自试。Reddit 实际使用讨论超过 110 条。 |
| 3 月 | [Herdr](https://github.com/herdrdev/herdr) | 面向多个编码 Agent 的终端运行时，能识别 working/blocked/idle，并允许 Agent 相互调度。HN 最高一轮 404 分、178 条评论。 |
| 4 月 | [Graphify](https://github.com/Graphify-Labs/graphify) | 把代码、文档、Schema 建成可查询知识图谱。Reddit 有 220+ 评论的使用讨论，也已出现竞品对比帖。 |
| 4–5 月 | [Semble](https://github.com/MinishLab/semble) | 给 Agent 用的本地语义代码搜索。HN 445 分、151 条评论，是历史扫描里社区验证最扎实的工具之一。 |
| 4 月 | [ego-lite](https://github.com/citrolabs/ego-lite) | 共享已登录浏览器状态。HN 两次发布只有 12 分和 1 分，说明它确实非常容易被榜单机制漏掉。 |
| 7 月起量 | [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) | 让 Agent 原生读写 Word、Excel、PowerPoint，并有渲染检查闭环。HN 215 分、61 条评论。 |

**第二梯队：按需求试**

- [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector)：安装 Skill 前检查提示注入、数据外泄、危险代码、MCP 工具投毒。随着 Skill 生态扩张，这类扫描器已经从“可选”变成基础卫生措施。
- [Atlas](https://github.com/pacifio/atlas)：Claude Code、Codex 等共享本地记忆、决策和历史；适合频繁切换 Agent 的工作流。
- [CodeBurn](https://github.com/getagentseal/codeburn)：统计 37 种编码工具的 token 和成本。注意它存在每日一次、可关闭的使用快照上传。
- [wigolo](https://github.com/KnockOutEZ/wigolo)：本地优先的搜索、抓取、研究 MCP，无 API key；目前明确标注 Beta。
- [Google Workspace CLI](https://github.com/googleworkspace/cli)：Drive、Gmail、Calendar、Sheets、Docs 的结构化 CLI，并附 Agent Skills。
- [Lark CLI](https://github.com/larksuite/cli)：飞书官方 200+ 命令和 20+ Skills，中文团队尤其值得留意。
- [SkillHub](https://github.com/iflytek/skillhub)：企业内部自托管 Skill Registry，包含版本、RBAC、审计和私有部署。
- [Open Science](https://github.com/aipoch/open-science)：本地研究工作台，强调可追溯产物、连接器、权限和可复现研究。

**观察，不急着安装**

- [Open Multi-Agent](https://github.com/open-multi-agent/open-multi-agent)：持久审批、运行日志、离线 Run Viewer 与自托管方向很完整，但公开社区采用信号仍弱。
- [OpenBot](https://github.com/CopilotKit/OpenBot)：每个 Agent 独立容器和浏览器，调用前过 Policy、调用后写 Audit。设计值得 ProjectCore 研究，但 README 明确称为 Alpha 模板，不是成品。
- [Google AX](https://github.com/google/ax) + [Agent Substrate](https://github.com/agent-substrate/substrate)：9 月最强的基础设施信号，代表持久 Agent、沙箱和声明式调度开始成套出现。
- Graft、Treg、ArcBox、OpenMuse：都是近期强信号，继续观察版本稳定性和非发布帖中的真实反馈。

**明确回避**

- `codex-auth-helper`：核心能力涉及导出已登录 ChatGPT 会话配置和 `auth.json`，凭据风险不值得承担。
- `codex-chatgpt-web` 一类复用网页会话、绕额度的项目：认证状态、服务条款和供应链风险都较高。
- 会读取全部历史会话并提取凭据的知识库工具：功能价值不足以抵消明文凭据集中化风险。

这次回溯还说明：**不能拿 GitHub star 数当最终排序**。不少 2026 年项目 star 增长异常快，所以我优先采用了 HN 评论量、Reddit 实际使用帖、持续更新和 README 中可验证的产品形态。

按试用优先级，我建议依次是：

> **Orca → Herdr → Semble → SkillSpector → Graphify → OfficeCLI → gstack**

其中真正属于“已经火过、你此前可能完全错过”的，是 **gstack、Herdr、Semble 和 OfficeCLI**；Orca 则是最可能成为下一个 ego-lite 式信息差的项目。