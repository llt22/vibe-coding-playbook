# Letting users trust their own MCP clients, without opening a phishing hole

- 结论：**值得一试**。建议作为 MCP 服务器授权层的候选方案小范围试用：在测试环境按原文清单实现「authorize 时按用户校验重定向地址」、手打 host、邮件通知和撤销联动；理由是原文给出了可操作的七条防护规则与自查清单，但证据主要来自单一厂商实践和外部事件，尚未证明能普适降低风险。
- 原文：https://streamvessel.com/blog/mcp-trusted-redirect-uris
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-04T22:43:46.708Z

## 是什么

这篇原文讨论 MCP OAuth 中重定向 URI 的信任设计。问题是：MCP 客户端注册时会声明一个 redirect URI，授权服务器如果只接受运营方 allowlist（Claude、ChatGPT、Cursor、VS Code 等），自建 agent、Slack bot、VPS 上的服务或周末写的 MCP client 就无法接入；如果任意接受 redirect URI，攻击者可以注册一个冒充「Claude」的客户端，把授权码送到 evil.example，形成钓鱼和账户接管。

原文提出的方案是：保留服务器级 allowlist 和 loopback，同时允许每个用户为自己的账户信任最多 10 个精确 https 重定向地址；把「授权码可以送到哪里」的检查从注册阶段推迟到用户登录后的 authorize 页面。任何 code 或 error 都不得重定向到不受信任地址；拒绝时显示自家域名下的拒绝页，而不是跳回客户端。原文还给出七条防绕过规则和一份 MCP 服务器自查清单。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：你运营一个支持自助注册的 MCP OAuth 授权服务器；能识别已登录用户；能存储每用户的重定向地址列表；能发送邮件和写审计日志；能控制 authorize 与 token 交换阶段的响应。原文没有给出代码、命令或配置文件，以下按原文清单整理为实现步骤。

1. 保留服务器级 allowlist 和 loopback，作为所有账户都可用的信任来源；额外增加每用户精确 https 重定向地址列表，原文实现上限为 10 个。注册阶段可以接受 https URI 作为候选，但不要据此发放 code；真正的放行决定放在用户登录后的 authorize 页面。

2. 在 authorize 阶段、重定向之前检查目标地址：只有属于服务器级 allowlist、loopback，或当前用户自己信任的地址，才允许收到 code。这个检查必须覆盖所有响应，包括错误响应和用户点击 Deny 的分支；不通过时渲染自家域名下的拒绝页，不做重定向。原文特别指出，只在 token exchange 阶段检查不够，Cloudflare workers-oauth-provider 的 CVE-2025-4143 就是只检查后者的案例。

3. 在同意屏上只显示本次登录实际要返回的 redirect host，并说明它为什么被允许：在 allowlist 上、是 loopback，或「你在某年某月某日自己信任了这个地址」。不要把客户端注册的多个地址都列出来。权限默认从只读开始。

4. 修改用户信任列表只能通过用户自己的浏览器会话，不能通过 app 或 API token，避免被盗 token 扩大授权码可去的位置。从拒绝页添加地址时，要求用户手动输入 host；页面显示 host、完整地址纯文本、将要加入的账户和警告；在输入 host 之前，「Trust and continue」保持禁用。

5. 每次添加地址都发邮件通知用户；活动日志开启时写入审计。邮件以 host 开头，写明时间和账户，完整地址不要变成可点击链接。

6. 删除地址时，撤销经该地址建立的所有 grant，并丢弃已批准但尚未交换的 code；删除后即使该地址正处于登录流程中，也要立即切断。

7. 拒绝浏览器和服务器 URI 解析器读法不一致的 host，例如把 good.example%2eevil.example 解析成一个 host、浏览器却跳到另一个 host 的情况；注册时和用户列表里都要拒绝。只做精确匹配，不支持通配符、前缀匹配或 loopback 式端口灵活匹配。

8. 原文还给出一份服务器自查清单，核心是：在 authorize 而非 registration 决定 code 去向；所有响应包括错误都按同一规则检查，不通过就拒绝到自家页面；同意屏显示本次 redirect host 和允许依据；扩大列表必须是登录流程之外的刻意动作或带手打确认；每次添加都发邮件；删除时撤销 grant 和 in-flight code；拒绝浏览器与解析器读法不一致的 URI。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- 能力发现：原文只间接涉及。它提到自建 agent 可以通过 MCP server 读写删用户自己的 S3 存储，说明 MCP 能把文件操作能力开放给自建客户端；但没有讨论「AI 还能做哪些没想到交给它的工作」。

- 任务匹配：原文涉及的是客户端与授权方式的匹配，不是模型选择。它指出官方客户端可以走运营方 allowlist，自建客户端常被挡住；Claude Code 的 localhost callback 在精确匹配 allowlist 下会登录失败。因此不同客户端类型需要不同的准入路径，但没有给出模型、工具搭配的方法。

- 条件供给：这是原文的核心。它要求提供：同意屏上的 redirect host 和允许依据、默认只读权限、每用户可信地址列表、手打 host 的确认、添加邮件、审计日志、删除即撤销的反馈机制。权限边界上，它强调不能让 app 或 API token 修改信任列表，避免 token 被盗后扩大授权范围。

- 主动推进：原文没有讨论由时间、事件或状态触发并持续完成的 AI 工作。它只有安全流程中的事件触发：添加地址时发邮件、删除地址时撤销 grant 和 in-flight code、authorize 时拒绝不受信任地址。这些不是 AI 任务主动推进。

- 效果验证：原文提供了外部测量和事件案例，但没有给出「工作效果改善」的指标。对这套设计，可按原文规则做负向验证：未信任 redirect 不能收到 code 或 error、Deny 不跳转、解析混淆 URI 被拒、删除后旧 code 和 grant 失效、添加必须手打 host、邮件和审计必达。

## 与已有做法的关系（对照给出的清单条目；没有就写「清单中没有相关条目」）

- Claude Code（adopt）：原文提到 Claude Code issue #66511，精确匹配 redirect allowlist 的组织无法从 Claude Code 登录，因为它的 http://localhost:<port>/callback host 和 path 固定，该 issue 被关闭为 not planned。若用 Claude Code 接 MCP，需要允许 loopback 或提供每用户信任机制，否则会卡在授权。

- Cursor（watch）：原文提到 Cursor 用户在内的用户报告 Atlassian MCP server 的 redirect URI 不在白名单内。每用户可信地址可以缓解这类非默认客户端的接入摩擦。

- Atlas（watch）：原文未提及 Atlas，清单中没有直接对应条目。

- Obsidian（drop）：原文中的 Obsidian Security 是安全公司报告，不是清单里的 Obsidian 工具；清单中的 Obsidian 状态为 drop，与此没有直接关系。

- 原文还对比了已有做法：GitHub 要求开发者自建 OAuth app 并手填 callback；MCP spec 的预注册选项让用户手工注册客户端；Atlassian 允许组织添加可信 redirect 域名。原文认为这些都不适合匿名自助注册的客户端，因此把信任决定放到每个用户登录时。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

原文给出的数据和案例：

- 2026 年 5 月一项测试 119 个启用 OAuth 的 MCP server，其中 114 个、95.8% 的注册端点接受匿名请求者提供的任意 redirect_uri；同一研究称 60.5% 的测试服务器不显示 redirect host。

- 2026 年 1 月 Obsidian Security 报告 Square 的 MCP server 存在该攻击链：自助注册接受任意 redirect 地址，一次点击暴露商户资料、交易和银行信息；研究者称此前授权过 Square MCP server 的任何用户都受影响，Square 的修复只针对新注册客户端。

- 某公司 SSO 前的 MCP proxy 也发现同一攻击链，每次点击可换来 24 小时 access token 和 14 天 refresh token；漏洞赏金项目中有时被当作社会工程忽略。

- n8n CVE-2026-42230（2026 年 4 月）会把点击 Deny 的用户直接送到攻击者注册的地址；Cloudflare workers-oauth-provider CVE-2025-4143（2025 年 5 月）只在 token exchange 检查。

- 原文引用 RFC 9700 §4.11.2、MCP authorization security considerations 和 MCP client registration 2026-07-28，说明规范要求精确校验 redirect URI，但把「trust」的具体策略留给服务器。

局限：

- 这是 Stream Vessel 的单一厂商博客和实践描述，没有独立评估，也没有给出采用后事故下降、用户成功率提升等效果数据。

- 作者明确说这套设计不能阻止有决心的社会工程师：用户被说服手打攻击者 host 并批准，仍然会被钓鱼。它只是用 host 手打、警告、邮件、即时撤销和默认只读来限制影响。

- 作者曾把用户可信地址限制为写权限，后来因为用户想要完整权限而取消；因此被钓鱼后仍可能获得完整权限。

- 每用户上限 10、精确匹配、不支持通配符和端口灵活匹配，会带来接入摩擦；是否适合你的用户群需要实测。

- 适用条件是运营 MCP OAuth 授权服务器、支持自助注册、能给用户发邮件并维护审计日志。对普通 AI 使用者或不做 MCP server 的团队，这不是直接可用的工作方法。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用方式：

1. 若你使用 Stream Vessel：在自己的 agent 中加入 https://mcp.streamvessel.com 并登录；如果客户端不在 allowlist，应落到拒绝页，手动输入 host 后才能继续。观察同意屏是否只显示本次 redirect host 和允许依据，权限是否默认只读。

2. 若你自建 MCP OAuth server：在测试环境实现「authorize 时按用户校验重定向地址」和每用户精确 https 列表，保留服务器级 allowlist 与 loopback。按原文七条规则逐条做负向测试。

3. 测试用例：注册一个 redirect 为 evil.example 的客户端并发起 authorize，确认不会向 evil.example 发送 code 或 error；对合法客户端确认同意屏显示正确 host 和依据；点 Deny 确认不跳转到攻击者地址；用 app 或 API token 尝试添加地址应失败；从拒绝页添加地址必须手打 host；删除地址后确认旧 grant 被撤销、未交换 code 失效；构造解析器读法不一致的 URI 确认被拒。

判断指标：

- 安全负向指标：未信任 redirect 收到 code 或 error 的比例应为零；Deny 分支重定向到未信任地址的比例应为零；解析混淆 URI 被接受的比例应为零；删除地址后旧 code 和 grant 仍可用的比例应为零；添加地址的邮件和审计记录覆盖率应为 100%。原文没有给目标数值，建议以「零泄露」为门槛。

- 正向体验指标：合法自建客户端的首次连接成功率、完成手打 host 的比例、从发起到连通的耗时、因 redirect URI 被拒产生的支持工单数。改善的标准应是安全负向测试全过，同时合法客户端成功率不下降、接入耗时没有明显恶化。
