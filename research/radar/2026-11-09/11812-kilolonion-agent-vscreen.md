# kilolonion/agent-vscreen

- 结论：**值得一试**。建议先在备用 Android 手机上按 README 安装授权，用 `vscreen` CLI/MCP 小范围试用后台虚拟屏操作，并保留浮窗接管、应用规则和支付确认；因为原文给出了可照做的安装、命令与 MCP 配置，但项目较新、缺少独立验证，且 token 等同手机控制权，不宜直接全面采用。
- 原文：https://github.com/kilolonion/agent-vscreen
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T07:00:52.752Z

## 是什么
Agent-VScreen 是 Android 应用，为手机 Agent 提供一块不可见的虚拟后台屏：Agent 可在后台启动并操作其他应用，用户主屏保持自用；浮窗只展示 AI 在做什么，用户可随时接管或停止。它通过 `vscreen` CLI、MCP 或 HTTP 接入，自身不调用模型，由调用方 Agent 的模型判断屏幕含义。当前 README 标注版本 1.1.7，Android 11+、arm64、仅需 Shizuku、不需要 root。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
1. 前提：准备 Android 11+（推荐 Android 14+）、arm64 手机，安装 APK 并打开 Agent-VScreen。
2. 前提：Shizuku 已运行。在应用内点 **Grant Shizuku** 授权。
3. 前提：需要浮窗、通知、无障碍只读、电池优化和后台运行权限。点 **One-tap setup**；在 Honor、Huawei、Xiaomi、OPPO、vivo 等手机上，再到 **System background management** 允许自启动和后台活动。
4. 前提：手机上的 Agent 能执行终端命令。进入 **Connect agent**，点 **Copy message for agent**，把消息原样发给 Agent；按 README，它会安装 `vscreen` 命令并把简短指南写入自己的长期记忆，首页会显示是否记住。然后可运行：
```sh
vscreen launch Settings
vscreen act "tap Search; type About phone; key enter until text:About phone"
vscreen help all
```
5. 前提：用 Operit 且希望走 MCP。推荐先试 ToolPkg：导入由 `integrations/operit` 构建的 `agent-vscreen.toolpkg`（Releases 中也有），把 token 发给 Operit 的 AI 保存；截图会直接给模型。也可用远程 MCP：完成首次设置并确保服务运行，在 **Connect an agent → MCP** 复制 token，在 Operit 的 MCP 管理页点 **Import/Connect → Connect remote**，填入：
   - Name (plugin ID): `vscreen`
   - URL: `http://127.0.0.1:18765/mcp`（18765 是默认端口，改过则用实际端口）
   - Connection type: `httpStream`
   - Bearer Token: 刚复制的 token
   保存并打开开关；远程插件不需要 “Deploy”，状态显示 active 即可。可在聊天里试：
```text
Use vscreen to open Settings on the virtual screen and tell me the system version.
```
   也可粘贴配置后点 **Merge config**：
```json
{
  "mcpServers": {
    "vscreen": {
      "url": "http://127.0.0.1:18765/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```
   注意：Operit 与 Agent-VScreen 必须在同一台手机；若 Operit 在另一设备，URL 换成 Tailscale 地址。若要让 Agent 只操作后台屏，在角色提示词中加：
```text
Always use the vscreen tool to operate other apps; never touch the main screen.
```
   token 等同手机控制权，不要贴到公开角色卡、共享配置或截图中。
6. 前提：需要从电脑或另一台手机调用，且接受 Tailscale。服务默认只监听 `127.0.0.1:18765`；在 **Connect an agent** 第 1 步选 **Another device (Tailscale)**，再选 **Built-in**，在应用内登录 Tailscale，只有自己 tailnet 的设备能访问；**Tailscale app** 模式和 SSH 端口转发也可用。应用不提供公网链接。
7. 更多 CLI、MCP、HTTP、会话、watch、浮窗、远程访问和已知限制见 `API.md`（中文）。

## 对应的研究问题
- **能力发现**：README 明确列出后台启动应用、点击、滑动、输入、按键、等待屏幕变化；每步返回当前屏幕、可见文本、可点击元素和截图，并有离线 OCR；可 watch 条件、collect 整页文本、spots 找色块、zoom 坐标尺；可 handoff 进出主屏应用；多个 Agent 可用 sessions 轮流操作同一屏；应用可保存 notes 和步骤段。这些是可直接交给手机 Agent 的后台操作与观察能力。
- **任务匹配**：有终端的 Agent 用 `vscreen` CLI；会 MCP 的 Agent 用 MCP；自己的代码走 HTTP；云/桌面 Agent 可经 Tailscale。README 明确“手机端不调用模型”，由调用方模型决定屏幕含义；实时游戏可用保存的暂停/恢复步骤变成回合制；多 Agent 用 `BUSY` 判断屏幕归属和释放时间。
- **条件供给**：需要 Shizuku、浮窗/通知/无障碍只读/电池优化/后台运行权限，部分手机还要自启动和后台活动；需要 token、同机或 Tailscale 网络；需要应用规则（完全阻止或只读）和支付按钮确认；需要提示词约束 Agent 只动 vscreen。返回信息包括带时间戳的屏幕变化、文本、可点击元素、截图和 OCR。
- **主动推进**：任何动作后可加 `until` 条件（文本出现/消失、画面变化/静止、像素颜色、指定应用在前台）和时限；`--stop` 在整个区间被监视，`--watch` 在步骤结束后继续看，`--keep notify|wake` 在回合结束后继续监视并通知用户或唤醒 Agent。屏幕约每秒看 5 次、文本约每秒读 1 次并带时间戳，能记录 Meanwhile 块中的出现、消失、闪烁和画面变化；保存的暂停/恢复步骤可在每段开始恢复、结束暂停。
- **效果验证**：每步会校验；`until` 未达成、文本不在框内、焦点不在点击位置等“错步”会停止该段、跳过剩余步骤并描述当前屏幕；点错会列出最接近候选。浮窗边框颜色显示 AI 工作中/空闲/用户接管/已停止；应用规则和支付确认提供额外拦截。这些可作为过程验证信号，但 README 没有给出成功率或延迟基准。

## 与已有做法的关系
清单中只有 Semble（tool，status=try），材料没有说明它的功能，无法判断与 Agent-VScreen 是替代、互补还是无关；除此之外清单中没有相关条目。

## 证据与局限
README 给出了版本、Android 要求、Shizuku 免 root、CLI/MCP/HTTP 接入、安装命令、MCP JSON 配置、Operit 连接步骤、浮窗和规则说明，并有演示 GIF 与四个 Android Agent 连接同一后台屏的截图。局限：这只是项目 README，引用的 `API.md` 未在输入中展开；没有独立测试、成功率、延迟、长时稳定性或兼容性数据；32 stars 说明使用面还小；功能多为作者主张。适用条件是 Android 11+ arm64、能运行 Shizuku、Agent 能走 CLI/MCP/HTTP，且接受 token 等同手机控制权的安全风险。应用 UI 目前为中文。

## 怎么试、怎么验证
最小试用：用一台备用/测试 Android 手机按上述 1–4 步安装授权，连接一个可执行命令或 MCP 的 Agent；先跑 README 的 Settings 冒烟命令，再让它走一次 Operit MCP 提示词。验证指标：同一任务能否在后台屏完成；`until` 条件是否按预期命中；错步是否被停止并给出当前屏幕；需要人工接管或点 “Stop AI” 的次数；用户主屏是否保持不被占用；token 是否只留在本机/可信 tailnet；应用规则和支付确认是否按预期拦截。若这些指标稳定且明显减少对主屏的打扰，再扩大任务范围。
