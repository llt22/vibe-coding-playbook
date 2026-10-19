# Show HN: WhatsApp MCP running free on Cloudflare

- 结论：**值得一试**。建议小范围试用：在自己的 Cloudflare 账户部署只读 WhatsApp MCP，接入 Claude Code 验证搜索、跨聊天查找和群聊补课类任务；它给出了完整部署步骤和工具接口，但属于非官方协议、仅单账号验证，不宜直接作为团队默认方案。
- 原文：https://github.com/finereli/whatsapp-mcp
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-19T01:09:23.994Z

## 是什么
这是一个可部署在自己 Cloudflare 账户中的 WhatsApp MCP 服务器。手机仍是消息真源，服务器作为已链接设备，让任意 MCP 客户端（Claude Code、Claude Desktop 等）读取和搜索聊天记录、给电话号码保存姓名，但不能发送消息。消息存放在 Cloudflare Durable Object 的 SQLite 中；服务器不常连 WhatsApp，只在 agent 请求且本地副本超过十分钟时、以及每天 04:00 UTC 定时拉取。

## 具体做法
1. **前提**：准备 Cloudflare 账户（README 要求 Workers Paid 计划；免费计划未验证，作者建议删掉 `limits` 块并预期首次导入不稳定）、Node 20+、自己的手机和 WhatsApp 账号。只用于读取自己的个人账号；README 明确说这使用非官方协议、违反 WhatsApp 条款，不要用来发消息或多人共用。
2. **克隆并安装依赖**：
```sh
git clone https://github.com/finereli/whatsapp-mcp
cd whatsapp-mcp
npm install
```
3. **创建 OAuth KV 命名空间**：运行后把打印出的 id 填进 `wrangler.jsonc`。
```sh
npx wrangler kv namespace create OAUTH_KV
```
4. **设置 owner 密码**：至少 12 个字符，用于登录链接手机的管理页。
```sh
npx wrangler secret put OWNER_PASSWORD
```
5. **部署**：
```sh
npm run deploy
```
6. **打开部署 URL 并链接 WhatsApp**：Wrangler 会打印形如 `https://whatsapp-mcp.your-name.workers.dev` 的地址。打开后按页面提示扫码：WhatsApp 设置 → 已链接设备 → 链接设备；如果无法扫码，可用手机号选项。首次链接会导入历史，页面显示进度，可关闭页面。
7. **接入 MCP 客户端**：以 Claude Code 为例，然后输入 `/mcp` 并用密码登录；其他客户端指向同一个 `/mcp` URL。
```sh
claude mcp add --transport http whatsapp https://your-url/mcp
```
8. **调用读取/搜索工具**：可用工具包括 `list_chats`、`get_messages`、`search_messages`、`unnamed_chats`、`set_contact_names`、`sync_now`、`link_status`、`relink`。可直接对 agent 说：
```text
"What did Dana say about the flights?"
"Find every message where someone mentioned the lease, across all my chats."
"Summarize what I missed in the family group this week."
```
9. **补全未命名聊天**：对 agent 说 `find names for my unnamed chats`；agent 会调用 `unnamed_chats`，用已有联系人工具匹配号码，再用 `set_contact_names` 保存姓名。前提是 agent 已有 Google Contacts、Gmail 等联系人访问工具；服务器本身不连接联系人服务。
10. **可选调试配置**：设置 `PIN`（32+ 随机字符）后，可用 `x-pin` 头访问 `/debug`、`/debug/pull`、`/debug/chats?q=`、`/debug/messages?chat=`、`/debug/search?q=`、`/debug/types`、`/debug/unnamed`、`/debug/sql?q=`、`/debug/logout`。不设置则关闭这些路由。

## 对应的研究问题
- **能力发现**：可把跨聊天搜索、按人/主题找消息、群聊补课、未命名聊天补名交给 agent；这些是 README 直接给出的示例和工具能力。
- **任务匹配**：适合个人、只读、低频的消息检索与摘要；技术组合是 MCP 客户端 + Cloudflare Worker + Durable Object/SQLite（含 FTS5）+ Baileys。不适合发送消息、多人共享、媒体转写；README 明确说媒体只显示 `[image]`、`[voice note 12s]` 等标签，不下载不转写。
- **条件供给**：需要 Cloudflare 付费 Workers、Node 20+、手机、`OAUTH_KV`、`OWNER_PASSWORD`、完成设备链接、给客户端 `/mcp` URL；补名还需要 agent 侧联系人工具。反馈条件包括 `link_status`、`/debug`、首次导入进度和工具返回的提示。
- **主动推进**：每天 04:00 UTC 由 cron 执行 pull；读工具在本地副本超过十分钟时先补拉；`sync_now` 可即时触发。局限是登出不会主动通知，姓名不会自动刷新。
- **效果验证**：README 给出可执行的检查：`npm run typecheck`、`npm test`；部署后 `GET /debug` 应为 `phase: "idle"` 且 `paired: true`；`GET /debug/pull` 在安静账号上约十秒返回 `reason: "idle"`；再调用 `list_chats`、`get_messages`、`search_messages`，并用 `unnamed_chats` 和 `set_contact_names` 验证补名；改过 ingest 后重链接，确认消息计数不增长。没有业务效果指标。

## 与已有做法的关系
清单中只有 **Claude Code（adopt）** 与本条直接相关：这个项目是给 Claude Code 这类 MCP 客户端增加 WhatsApp 读取/搜索工具的服务器，不替代 Claude Code 本身。清单中没有其他 WhatsApp、MCP 服务器或 Cloudflare 部署条目。

## 证据与局限
原文是仓库 README，给出了完整部署命令、配置项、工具表、架构和调试步骤，属于可照做的材料；HN 的 35 points、23 comments 只能说明关注度，不能证明效果。作者明确说只在一个真实账号上跑过；首次历史导入每个链接只发生一次，失败后要重新链接才能补；免费计划未验证，付费计划才能提高 CPU limit；媒体不下载、不转写；只支持一个部署对应一个 WhatsApp 账号和一个 owner。它是非官方实现，使用 WhatsApp Web 协议和 Baileys，作者承认违反 WhatsApp 条款，认为只读链接的实际风险低但不是零。已知缺口包括未命名聊天不会自动刷新、每日 pull 发现登出不会通知、编辑/删除路径未用真实事件测试。

## 怎么试、怎么验证
最小试用：在自己的个人 Cloudflare 账户部署，链接一个个人 WhatsApp 账号，接入 Claude Code，只做只读查询，不做发送、不共享给多人。选一组真实任务（例如按人找航班信息、跨聊天找租约、补看家庭群、给未命名聊天补名），先人工完成并记录耗时和结果，再用 MCP 工具完成同样任务。

验证指标：任务是否完成、答案是否正确、是否漏掉已知消息、耗时相对人工是否下降、工具报错次数、`link_status` 的 `last_pull` 是否正常更新、补名后聊天是否显示姓名、重链接后消息计数是否不增长。若出现导入失败、隐私/合规不可接受、或结果明显不如人工，就停止试用。只看“能连上”不够，必须用同一组任务对比人工结果。
