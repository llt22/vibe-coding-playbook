# Derrors/iphone-control

- 结论：**值得一试**。建议在专用 iPhone、专用 Apple ID、开启工具调用确认的隔离环境中小范围试用：按 README 用 Docker 或 macOS 二进制安装，跑 setup/doctor，再用 claude mcp add 接入 Claude Code 验证真实 App 操作；理由是它给出了可复制的安装、MCP 工具和运维命令，但整机控制风险高且缺少效果数据，不适合直接 adopt。
- 原文：https://github.com/Derrors/iphone-control
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-06T20:08:09.532Z

## 是什么
iphone-control 是一个用 Rust 实现的单二进制工具，让 AI agent 通过 MCP 操作一台插在 Linux 或 Apple Silicon Mac 上的真实 iPhone；README 称无需 Xcode、付费开发者账号或越狱。它把截图、点击、滑动、长按、输入文字、读元素树、启停 App、打开 URL、等待文本、批量步骤等暴露为 MCP 工具；后台 daemon 持有 USB/WebDriverAgent/HID 会话，并声称可处理重插、重启、WebDriverAgent 崩溃和证书续签。README 工具表列出 15 个工具，但 Features 文案写 17 个，存在口径不一致。

## 具体做法
前提：iPhone 需 iOS 17+，用数据线连接；准备专用免费 Apple ID；主机为带 Docker 的 Linux 或 Apple Silicon Mac；只在自己拥有的设备和账号上使用。全程在 MCP 客户端保留工具调用确认，避免 agent 误触支付、删除、发送。

1. Linux + Docker 安装并启动。
```bash
git clone https://github.com/Derrors/iphone-control.git && cd iphone-control
cp .env.example .env
docker compose up -d --build
docker exec -it iphone-control iphone-control setup
```
`cp .env.example .env` 是可选配置代理/通知；首次构建需几分钟。`setup` 是引导式配置，可重复运行，需按提示在手机上完成配对、开发者模式、Apple ID 登录和安装 WebDriverAgent。

2. 把 MCP server 注册到 Claude Code。
```bash
claude mcp add iphone -s user -- docker exec -i iphone-control iphone-control mcp
```
前提是已安装并登录 Claude Code；注册后重开 Claude Code 会话。

3. macOS 直接跑二进制（Docker 不能透传 USB）。
```bash
V=v0.1.3
curl -fsSL https://github.com/Derrors/iphone-control/releases/download/$V/iphone-control-$V-macos-arm64.tar.gz | tar xz
mkdir -p ~/.local/bin && install -m 755 iphone-control-$V-macos-arm64/iphone-control ~/.local/bin/
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile && source ~/.zprofile
iphone-control daemon
```
另开终端：
```bash
iphone-control setup
iphone-control mcp-config
```
`daemon` 终端需保持打开；`mcp-config` 会打印注册命令，照抄到 MCP 客户端。`V=v0.1.3` 是 README 示例版本，使用前可换最新 release。

4. 用自然语言下发任务。README 示例：在 Claude Code 里说“Open Clock, switch to the stopwatch and start it.” 工具会先启动 Clock、点击元素，再启动秒表。

5. 日常运维与排障。
```bash
docker exec -it iphone-control iphone-control status
docker exec -it iphone-control iphone-control doctor
docker exec -it iphone-control iphone-control resign --force
docker exec -it iphone-control iphone-control passcode set
docker exec -it iphone-control iphone-control devices
docker exec -it iphone-control iphone-control notify-test
```
`doctor` 逐层检查 USB 到 WebDriverAgent 并给修复提示；`resign` 在签名快过期时重签；`passcode set|clear` 控制自动解锁；`notify-test` 测试 Telegram/Bark 通知。源码安装或 macOS 可直接用 `iphone-control <command>`。

6. 按任务选工具。原生 App 优先用 `iphone_list_elements` + `iphone_tap_element`，可避开浮动栏和键盘遮挡；游戏、地图、视频播放器没有元素树，改用 `iphone_screenshot` + 坐标点击。动作工具可带 `then` 参数返回动作后的元素树或截图；多步操作可用 `iphone_batch` 一次跑最多 20 步，遇错停止；等待界面变化用 `iphone_wait_for`，不要反复截图轮询。

7. 安全与数据。所有状态在 `data/`：配对记录、Apple ID 会话和签名密钥、自动解锁密码。要备份，绝不提交或分享。README 明确警告该工具可完全控制手机，agent 可能点到支付、删除或发送按钮；启用自动解锁前先读 SECURITY.md。

## 对应的研究问题
- 能力发现：可把“看屏幕、点按/滑动/长按、输入中英文、读元素树、按文字点按、启停 App、打开 URL、等待文本出现、批量执行最多 20 步”交给 agent，覆盖真实 iPhone 上重复性 UI 操作。
- 任务匹配：适合 MCP 客户端（Claude Code 或任意 MCP client）；原生 UI 用元素树，自绘 UI 用截图坐标；简单单步用单工具，多步固定流程用 `iphone_batch`，状态等待用 `iphone_wait_for`。
- 条件供给：需要 iOS 17+ 真机、数据线、专用 Apple ID、Linux Docker 或 Apple Silicon Mac、配对/开发者模式/WebDriverAgent 安装、MCP 注册；还要给 agent 工具权限并保留确认，准备 `data/` 备份和通知渠道。
- 主动推进：daemon 可长期持有手机连接，声称能从重插、重启、WebDriverAgent 崩溃中恢复，并在 7 天签名过期前重签；失败/离线/需要密码时发 Telegram 或 Bark 通知。它提供的是持续运行和异常恢复，不是时间/事件调度器；定时触发仍需外部 MCP 客户端或系统调度。
- 效果验证：`doctor` 做逐层健康检查，`status` 看 daemon、签名剩余时间和日志，`notify-test` 验证告警链路；但 README 没有给出任务成功率、效率提升或误操作率的实测数据，效果需自行定义指标验证。

## 与已有做法的关系
清单中只有 Claude Code（tool，adopt）。iphone-control 不替代 Claude Code，而是通过 MCP 给 Claude Code 增加“真实 iPhone 操作”工具层：Linux 用 `claude mcp add ... docker exec ... iphone-control mcp` 注册，macOS 用 `iphone-control mcp-config` 打印注册命令。清单中没有其他相关条目。README 还称它接替 iphone-control-toolkit 并保持 MCP 工具兼容，但这不是清单条目。

## 证据与局限
- 证据仅来自 GitHub README：有安装命令、工具表、日常命令和一个“打开 Clock 并启动秒表”的演示说明；没有基准测试、成功率、延迟对比、用户案例或第三方评测。仓库指标只有 31 stars，不能证明成熟度。
- “减少往返”“可无人值守”“自动恢复/重签”等是作者主张，README 未给量化数据；工具数量在徽章/Features/工具表之间也不一致（15 与 17），需以实际版本为准。
- 适用条件明确：iOS 17+、数据线、Linux Docker 或 Apple Silicon Mac、免费 Apple ID；macOS 上 Docker 不能透传 USB，必须直接跑二进制；WebDriverAgent 免费签名约 7 天需续签。
- 元素树只适用于有可访问性元素的原生 UI；游戏、地图、视频播放器要退回截图坐标，稳定性更依赖视觉和坐标。
- 安全风险高：可完全控制手机，可能误触支付/删除/发送；自动解锁会保存密码；`data/` 含敏感凭据。README 建议保留工具调用确认，且只用于自有设备和账号。

## 怎么试、怎么验证
最小试用：找一台专用 iPhone 和专用 Apple ID，先备份 `data/`，在 MCP 客户端开启工具调用确认；按上面的 Linux Docker 或 macOS 步骤安装，跑 `setup` 和 `doctor`，再注册 MCP。先做 3 类低风险任务：打开 Clock 并启动秒表、打开指定 URL、用 `iphone_wait_for` 等待某个文本出现；稳定后再用 `iphone_batch` 串 2–3 步。不要先用支付、删除、发送类操作试。

验证指标：以 10 次为一组记录任务成功率、人工介入次数、单任务耗时、工具调用/往返次数、失败原因、误触或危险操作次数；另测一次重插/重启后的恢复情况和 `doctor` 报警是否准确。只有当你预先设定的成功率门槛被达到、且没有高危误触，才扩大使用范围；若主要任务是游戏/地图/视频类自绘 UI，优先评估截图坐标方案的稳定性，不要直接推广。
