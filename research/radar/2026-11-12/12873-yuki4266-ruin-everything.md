# yuki4266/ruin-everything

- 结论：**值得一试**。建议小范围试用：按 README 的 uvx 启动方式和 MCP 配置接入本地 Chrome，先在低风险、可复核的网页任务上验证登录复用、后台执行和回执留存；理由是它给出了可执行命令、配置和工具接口，但站点覆盖有限、不少流程仅浏览器夹具验证，且本地明文密码与验证码处理带来安全合规风险。
- 原文：https://github.com/yuki4266/ruin-everything
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T13:56:07.971Z

## 是什么
Ruin Everything 是一个本地 Chrome 运行时和 MCP 服务，让浏览器智能体复用同一 Chrome 配置中的会话、Cookie 和扩展，在后台标签页中导航、点击、填表、读取页面，并在支持范围内继续登录/验证步骤、留下提交回执。它提供六个工具：`ruin_browser`、`ruin_action`、`ruin_auto_register`、`inspect_application_challenge`、`get_ashby_receipt`、`watch_ashby_receipt`。它不是独立模型，智能体用自己的模型连接来规划和调用这些浏览器动作。

## 具体做法
1. 准备环境并启动共享浏览器。前提：Python 3.11+、Google Chrome、uv。运行：
```sh
uvx --from 'ruin-everything @ git+https://github.com/yuki4266/ruin-everything.git@main' ruin browser
```
Ruin 会在 `127.0.0.1:9222` 启动或重连 Chrome，持久配置目录是 `~/.ruin-everything/canvas-browser`。需要在这个配置里登录目标站点；它不会导入另一个 Chrome 配置的登录态。命令退出后 Chrome 和任务标签仍保持打开。

2. 连接智能体。前提：MCP 客户端能运行 `uvx`。在 MCP 客户端配置中加入并重启连接：
```json
{
  "mcpServers": {
    "ruin-everything": {
      "command": "uvx",
      "args": [
        "--isolated", "--refresh", "--from",
        "ruin-everything @ git+https://github.com/yuki4266/ruin-everything.git@main",
        "ruin-mcp"
      ],
      "env": { "RUIN_AUTO_UPDATE": "0" }
    }
  }
}
```
使用已发布包时，把 Git 源替换为 `ruin-everything`。MCP 服务本身不需要 API key；智能体用自己的模型连接。

3. 发起第一个任务。向智能体下指令，例如：
```
Use Ruin to open https://example.org and tell me the page title and visible links.
```
入口是 `ruin_browser(operation="navigate", url="https://example.org")`，后续调用使用返回的当前 URL。

4. 配置账号辅助（可选）。前提：需要持久化检出。运行 `ruin identity`，在后台编辑标签页填写资料，决定是否启用自动注册；运行 `ruin ats-setup` 单独启用 ATS 密码恢复。只应在授权账号上使用。

5. 上传本地文件（可选）。前提：已知精确标签页 URL 和绝对文件路径。调用 `ruin_browser(operation="upload")` 或别名 `set_files`；当页面及其 frame 中只有一个文件输入时可省略 `selector`，多输入时指定目标输入。也可走显式 drop-area 路径。

6. 提交表单。前提：获得授权并使用精确当前 URL 和可见按钮文字。调用 `ruin_action` 提交；它会检查点击后的验证步骤。README 强调：验证码被清除只是前进一步，站点回执才是提交证据。

7. 留存 Ashby 回执。前提：任务在 Ashby 站点。用 `watch_ashby_receipt` 监听原始 Ashby 标签页的确认并保存，之后用 `get_ashby_receipt` 在不打开 Chrome 的情况下查询。没有记录表示结果未知。

8. 可选引擎切换。安装 Patchright：`pip install -e ".[patchright]"`，设置 `RUIN_BROWSER_ENGINE=patchright`，或把 `{"engine":"patchright"}` 保存到 `~/.ruin-everything/browser-engine.json`。切换后重启现有 runtime 客户端和 vault。

9. 控制敏感存储。自动登录 vault 把明文密码存到 `~/.ruin/auth_vault.json`，权限 `0600`，不进入智能体工具结果；可设置 `RUIN_LOCAL_AUTH_VAULT=0` 禁用该客户端的自动监听启动。不要在不受控机器上保存生产密码。

10. 跑回归测试（开发检出时）。前提：开发检出和 Chromium：
```sh
python -m pip install -e '.[agent]'
python -m playwright install chromium
RUIN_AUTO_UPDATE=0 RUIN_RULE_UPDATES=0 python -m unittest discover -s tests -v
```

## 对应研究问题
- **能力发现**：README 明确覆盖网页导航、点击、输入、选择、文本提取、后台标签页、文件上传、表单提交、登录复用、支持范围内的邮箱/短信/图形验证继续，以及 Ashby 提交回执保存。
- **任务匹配**：适合已有模型连接、需要操作网页并复用本地 Chrome 登录态的智能体；MCP 客户端是接入点。可选的本地 Ollama 视觉模型用于部分图形挑战，Patchright 是可选浏览器引擎。不是通用自动化平台，站点支持范围有限。
- **条件供给**：需要 Python 3.11+、Chrome、uv；需要在 Ruin 的持久配置目录中登录目标站点；需要 MCP 客户端配置；短信读取需要 macOS Messages 权限，邮件流程需要 Outlook Web 已登录，部分图形验证需要本地 Ollama 视觉模型。账号辅助还需要 `ruin identity` / `ruin ats-setup` 配置。
- **主动推进**：`watch_ashby_receipt` 可在原始 Ashby 标签页监听确认并保存回执；后台标签页让任务不打断前台应用；未解决的验证会返回 pending 状态。README 没有给出通用时间/事件调度器，主动推进主要限于这些内置监听和支持流程。
- **效果验证**：Ashby 可用 `get_ashby_receipt` 查询站点提交确认；README 反复区分“验证码被清除”和“站点回执”，并说明缺失记录表示结果未知。仓库还提供 133 个回归测试和本地浏览器测试，但明确区分本地夹具与真实站点证据。

## 与已有做法关系
清单中没有相关条目。可把它视为“给浏览器智能体接入本地 Chrome、复用登录态并留存提交回执”的基础设施型做法，但无法与清单中的现有条目直接对照。

## 证据与局限
- README 给出了可复制的启动命令、MCP JSON 配置、工具名和调用方式，以及回归测试命令，这是可试用的主要依据。
- README 称当前 133 个回归测试在 Playwright 引擎下一次运行全部通过，源码/wheel 构建和 Twine 元数据检查也通过；但这些是作者自述，未独立复核。
- 有少量真实站点观察：ZhongAn/Moka/飞书招聘的短信倒计时、ZhongAn 成功页和申请历史、Bilibili 图标挑战一次通过、携程手机验证、IEEE/Duke 重定向和 PDF 访问。
- 更多流程只到浏览器夹具或局部观察：Greenhouse/Outlook 实时兼容性未验证；Workday/iCIMS 为夹具加局部实时对话框检查，生产布局会变；Ashby 回执为本地回执和浏览器集成测试；ACM/Springer 由夹具覆盖。
- 局限包括：站点支持是特定流程而非通用能力；登录仍会过期，部分验证仍需人工；验证码/验证流程可能涉及站点条款和合规风险；自动登录 vault 以明文保存密码；连接的智能体可能把页面文本发给其模型提供方；仓库仅 30 stars，成熟度有限。
- 适用条件是本地机器、授权站点、在 Ruin 自己的 Chrome 配置中完成登录，并按需准备 macOS Messages、Outlook Web 或本地 Ollama 视觉模型。

## 怎么试、怎么验证
1. 用测试账号和低风险站点做最小试用，不要先用生产密码或高价值账号。启动共享浏览器后，只在 `~/.ruin-everything/canvas-browser` 中登录测试站点。
2. 先做只读任务：让智能体导航、读取标题和链接、提取页面文本，确认 MCP 连接和后台标签页可用。
3. 再做可复核的提交任务：选一个允许自动化测试的表单，用 `ruin_action` 提交，记录是否出现验证步骤、是否需要人工接管、站点是否给出确认页或回执。
4. 如果是 Ashby，用 `watch_ashby_receipt` 保存回执，再用 `get_ashby_receipt` 查询；非 Ashby 站点不要假设有通用回执，需人工另行留存站点确认。
5. 与人工基线对比同一组任务：完成率、人工干预次数和耗时、Chrome 重启后会话复用成功率、提交后能否拿到站点回执、是否出现“智能体声称成功但没有回执”的假成功。
6. 判断标准：若只读和后台执行稳定、提交任务能拿到可核验回执、没有凭据泄露或越权操作，可扩大试用；若提交回执不稳定或需要频繁人工处理验证码，则只保留为只读/辅助工具，不把自动提交写入手册。安全上可先用 `RUIN_LOCAL_AUTH_VAULT=0` 关闭自动登录监听，并避免启用自动注册。
