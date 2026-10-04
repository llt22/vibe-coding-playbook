# try2love/codex-mobile-bridge

- 结论：**值得一试**。建议在单台 macOS/Windows 电脑上加装该桌面 App，先在局域网和账号密码模式下小范围试用，把已有 Codex 会话接到手机做异步审批和完成通知；原因是它给出了可照做的安装、启动、通知和部署 Agent 步骤，但依赖 Codex App 内部 IPC、属社区项目，外网暴露和安全边界需自行验收。
- 原文：https://github.com/try2love/codex-mobile-bridge
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-04T10:46:26.309Z

## 是什么
Codex Mobile Bridge 是一个社区项目，把电脑上 Codex App 的已有聊天接到手机浏览器：手机可查看回复、发送消息、选择模型与 Skill、回应待确认操作；本地任务仍在原电脑执行，SSH 任务仍在原服务器执行，模型请求沿用原会话的 provider 和认证。网关提供独立账号密码登录，不要求手机登录与电脑相同的 OpenAI 账号，支持局域网、临时 Cloudflare HTTPS、自有服务器 SSH、NAS/Docker 反代，并支持 Bark/ntfy 手机通知。桌面 App 为 v1.3.1，支持 macOS 和 Windows，Linux 为实验性。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
前提：macOS 或 Windows 10/11，电脑已安装并运行 Codex App；电脑保持唤醒、联网；日常使用发布版桌面 App 无需安装 Python、Node.js 或打开终端。

1. 下载桌面 App。到 Release 下载 v1.3.1 对应系统安装包：Windows x64 用 Setup.exe 或完整 ZIP；macOS Apple Silicon 用 arm64 DMG，Intel 用 x64 DMG；Ubuntu x64/ARM64 可试 .deb（实验性）。ZIP 必须完整解压后运行，不要单独移动 exe。
2. 安装并首次打开。Windows 运行安装包后从快捷方式打开；macOS 打开 DMG，将 Codex Mobile Bridge.app 拖入“应用程序”。macOS 未公证，首次打开可能需到 系统设置 → 隐私与安全性 → 仍要打开。若提示“已损坏”，先核对 SHA-256，确认来源可信后再移除下载隔离标记：
```sh
xattr -dr com.apple.quarantine '/Applications/Codex Mobile Bridge.app'
```
3. 启动局域网网关。在电脑上打开原来的 Codex App，再打开 Codex Mobile Bridge。在“网络与登录”保留局域网访问，保存后点击“启动网关”；已有配置时沿用原端口。
4. 手机扫码登录。手机连接同一局域网，在 App 首页展开对应地址下的“扫码登录”，用手机相机扫描进入，无需输入密码。二维码 5 分钟内有效、仅可使用一次；网关重启后全部失效。也可以手动打开地址，使用 App 提供的登录凭据。使用期间保持电脑唤醒、Codex App 和网关运行。
5. 在手机继续会话。选择已有聊天或新建聊天，看到“已连接”后即可发送消息、补充当前任务、排队、撤回待发送消息、停止任务；可回应命令、文件、临时权限请求及提问卡片；可切换模型与推理强度、选择 Skill、上传附件（每消息最多 10 个，单个 1 字节至 20 MiB，总计不超过 100 MiB）、使用计划模式或目标模式。复杂 MCP 表单、身份验证挑战和部分特殊请求需回到桌面处理。
6. 配置手机通知（可选）。iPhone 推荐 Bark：安装 Bark 并允许通知，在桌面 App“手机通知 → Bark 推送”填服务地址和 Device Key；例如手机展示 `https://api.day.app/你的密钥`，服务地址填 `https://api.day.app`，Device Key 只填密钥。Android 用 ntfy：安装 ntfy 并允许系统通知、锁屏显示和后台运行；测试可用 `https://ntfy.sh`，点“生成随机主题”，手机 ntfy 订阅相同服务和完整主题名，公共匿名主题 Token 留空。启用通道、保存，再分别点“发送 Bark 测试通知”或“发送 ntfy 测试通知”，以手机实际收到为验收标准。启动网关后，在网页 设置 → 全会话通知 选择请求处理通知和运行完毕通知；每个聊天的“提醒”可跟随全局、开启或关闭。
7. 需要外网访问时再配入口。临时 HTTPS：在“网络与登录”添加并启用“临时 HTTPS · Cloudflare”，在“运行配置”点击“一键下载并安装” cloudflared，保存后启动网关；等待入口就绪并检查实际 HTTPS 地址，`127.0.0.1` 不是手机外网入口。自有服务器 + SSH：填固定 HTTPS 地址、已有 SSH 别名或 user@hostname，可导出 Caddy Docker 包；链路是 手机 → 服务器 HTTPS → 服务器回环端口 → SSH → 电脑网关 → 原 Codex App。NAS / 已有反代：填固定 HTTPS 地址和 NAS 可达的电脑 HTTP 地址，可直接反代或导出 Nginx Docker 包；反向代理读取超时建议不少于 300 秒，保留外部 Host。
8. 仅源码部署时的命令行启动。前提：Python 3.9+；网关本身只用 Python 标准库。Windows 在 PowerShell 执行：
```powershell
git clone https://github.com/try2love/codex-mobile-bridge.git
cd codex-mobile-bridge
py -3 -B .\run.py --lan
```
macOS 执行：
```sh
git clone https://github.com/try2love/codex-mobile-bridge.git
cd codex-mobile-bridge
python3 -B "$PWD/run.py" --lan
```
临时外网追加 `--tunnel --cloudflared <实际路径>`；已有自有 HTTPS 入口追加 `--origin https://codex.example.com`。修改密码：
```sh
python3 -B run.py --set-password
```
显式免密仅适合受控网络：
```sh
python3 -B "$PWD/run.py" --lan --no-auth
```
9. 安全与数据。默认账号密码，密码至少 12 位；登录有效期默认 12 小时，可设 0–87600 小时，0 表示不自动过期。HTTP API、SSE 和长轮询都需要登录，并校验 Host、Origin；写操作另校验 CSRF。免密时任何能访问网关的人都能读取聊天并控制对应 Codex 会话。配置、通知密钥、凭据和投递记录位于网关数据目录；`.local/` 不应上传到 issue 或公开仓库。
10. 可把下面这段原样复制给电脑上的 Agent 做部署：
```text
请帮我部署并运行 https://github.com/try2love/codex-mobile-bridge ：先识别当前电脑是 Windows 还是 macOS，阅读仓库 README 中的“给部署 Agent 的执行说明”，优先使用已发布的桌面 App 或复用现有安装，按我的需求完成配置、启动和验收；复用现有 Codex App 会话及模型认证，默认启用账号密码和局域网访问，保持已有局域网端口。若我需要外网访问，优先复用已有 NAS/HTTPS 反向代理，有自有服务器和域名时可配置 SSH 回程与固定 HTTPS，没有现成入口再配置临时 HTTPS 隧道；验证聊天读取、实时同步和可用的操作链路，保持服务运行，最后给我可点击的手机访问地址、登录凭据获取方式、App 启停操作或命令、验证结果及仍需我完成的步骤。
```

## 对应的研究问题
1. 能力发现：README 明确把“继续电脑 Codex App 已有聊天”“手机回应待确认操作”“选择模型与 Skill”“查看执行过程和思考摘要”“计划模式/目标模式”“新建聊天”“上传附件”等列为可交给手机端完成的工作。这些是原先容易默认只能在桌面做的事，可纳入能力发现清单。
2. 任务匹配：适合已有 Codex App 本地会话或 SSH 会话的延续、异步审批、完成通知和移动阅读；模型与 Skill 按会话所在主机和工作目录读取，SSH 会话交给对应远端主机。复杂 MCP 表单、身份验证挑战和部分特殊请求不适合，需回桌面。没有多用户角色隔离，不应共享账号。
3. 条件供给：需要电脑保持唤醒、Codex App 和网关运行；模型请求沿用该会话提供商与认证，不要求手机放模型 API key；登录可用独立账号密码；局域网需同一网络，外网需 cloudflared 临时 HTTPS、自有服务器反代或 NAS 反代；SSH 需 App 中已配置主机、电脑上可非交互连接、远端有 Python 3；通知需 Bark/ntfy 通道和 Token/主题配置。
4. 主动推进：新出现的命令、文件、权限请求或提问会触发通知；运行完毕通知可单独开关；被关注聊天在手机网页关闭后继续监听，前提是电脑、网关、原 Codex App 和相关 SSH 连接仍可用。计划模式可先规划再执行，目标模式可通过本机 Codex 原生 Goal 接口设置目标并由原桌面 owner 执行。投递按通道、目标、聊天和事件记录状态，网关重连或重启后去重；失败会退避重试，但不承诺严格恰好投递一次。
5. 效果验证：README 给出验收维度：登录与访问保护、原 App 会话读取、同一会话发消息、手机回应、模型与 Skill、SSH、列表、外网、持续运行。Agent 部署说明要求每项使用“当前环境实测通过 / 自动测试覆盖 / 待用户确认 / 未验证 / 不适用”等状态，并用独立检查确认进程存活、HTTP 就绪、App 会话可连接；通知以手机实际收到为验收标准；蜂窝网络可达性需真实移动网络验证。

## 与已有做法的关系
清单中有“OpenAI Codex”（tool，adopt）。Codex Mobile Bridge 不替代 Codex，而是把已有 Codex 桌面会话扩展到手机浏览器和异步审批、通知流程；实现上依赖 Codex App 内部 IPC，模型和权限策略默认继承原会话。清单中没有其他相关条目。

## 证据与局限
证据：仓库 README 给出 v1.3.1 下载与安装步骤、局域网/临时 HTTPS/自有服务器/NAS 反代/SSH 的配置方式、Bark 与 ntfy 通知步骤、命令行参数、数据保存位置、已知限制、验证记录入口，以及可直接复制给部署 Agent 的提示词。来源是仓库 README，非 OpenAI 官方文档；当前 stars 为 32。
作者主张：手机无需登录与电脑相同的 OpenAI 账号；不要求把模型 API key 放到手机；任务继续在原电脑或 SSH 服务器执行；模型请求沿用会话提供商与认证。这些是项目设计说明，未见独立性能数据或第三方评测。
局限与适用条件：社区项目，与 OpenAI 无隶属关系；依赖 Codex App 内部 IPC，App 更新后可能不兼容；macOS/Windows 实测范围需看 VERIFICATION.md，Linux 为实验性；免密模式风险高，仅适合受控网络；无多用户角色隔离；云聊天、SSH 文件下载尚未接入；复杂 MCP 表单、身份验证挑战需桌面处理；保存历史可能含上下文注入文本，手机排版不保证与桌面完全一致；临时隧道地址会变化、无持续可用性保证；通知不承诺严格恰好一次投递；外网和蜂窝网络可达性需在真实设备上验收。

## 怎么试、怎么验证
最小试用：在一台 macOS 或 Windows、已运行 Codex App 的电脑上安装 v1.3.1 桌面 App，只启用局域网和账号密码，不开启外网。启动网关后用手机同局域网扫码登录，选择一条获准测试的已有聊天，发送短标记，确认原 Codex App 同一会话收到输入并产生助手回复；测试一次待确认卡片回应；切换模型或推理强度后恢复；配置 Bark/ntfy 并分别发送测试通知，以手机实际收到为准；关闭手机网页后观察完成通知是否仍触发；重启网关，确认未过期登录保留、地址和会话仍可用。
判断改善的指标：手机能读取原会话历史并看到实时更新；手机消息到达原会话并产生回复；手机审批能作用于对应请求；通知手机实际收到且不重复轰炸；未登录读取聊天返回 401；停止网关后手机不可访问，重启后能恢复；没有出现重复提交、重复执行或误操作。若要做外网，再用真实手机蜂窝网络访问 HTTPS 地址并确认长轮询有更新，不能只测 `127.0.0.1`。若出现 IPC 不兼容、外网暴露风险或无法稳定保持运行，回退到只用桌面 Codex。
