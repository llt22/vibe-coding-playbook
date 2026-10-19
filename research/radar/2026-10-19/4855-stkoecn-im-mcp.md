# stkoecn/im-mcp

- 结论：**值得一试**。按 README 的「uv tool 安装 → wechat-init/dingtalk-init 初始化 → 客户端 MCP 配置」三步在一两台机器上小范围试跑，它能把微信/钉钉的沟通上下文变成 agent 可直接检索的只读数据源；但涉及本地数据库解密与明文落盘、强依赖客户端版本，且只有作者自述无实测数据，暂不宜作为通用做法直接写进手册。
- 原文：https://github.com/stkoecn/im-mcp
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-19T04:20:32.695Z

## 是什么

im-mcp 是一个基于 Model Context Protocol（MCP）的**本地、只读、离线**即时通讯检索服务，把微信（原文称“绿泡泡”，4.x 全系列，兼容 3.9.x）和钉钉（原文称“DuangDuang”，7.x）的本地数据库解密为 SQLite、建 FTS5 全文索引，再通过 MCP 工具暴露给 Claude Desktop、Cursor、Cline、Pi 等 AI 客户端。

它提供的不是“聊天机器人”，而是**给 agent 补一段私有沟通上下文**的检索层：微信侧 16 个工具（消息全文检索、会话历史、按日期/时间范围拉取、会话与通讯录、群成员、图片解密、共享文件/媒体检索、收藏、表情、活跃度统计、沟通风格画像、同步状态与增量同步），钉钉侧 5 个工具（消息检索、会话列表、历史消息、通讯录、同步）。所有工具声明为只读。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**步骤 1：确认前置条件（不满足则后面全部无效）**
- 平台：Windows x64 或 macOS（Apple Silicon / Intel）。原文未提 Linux 支持。
- 客户端版本：微信 4.x（原文实测 `4.1.15.13` Windows、`4.1.35.15` macOS ARM64、`4.1.15`(270115) macOS x86_64）；钉钉 7.x（实测 `7.6.0.x`，另有 7.5.x / 7.0.x）。
- Windows 上初始化需**管理员权限终端**且**微信已登录**（要扫描 `Weixin.exe` 内存取密钥）；macOS 4.1+ 需 64 位 hex passphrase。
- 已安装 `uv`；客户端支持 MCP 配置。

**步骤 2：安装（推荐 `uv tool` 全局隔离安装，一次装好、冷启动快）**
```bash
# 全局安装 CLI 工具链 (wechat-init, dingtalk-init, wechat-mcp, dingtalk-mcp, im-clean)
uv tool install "git+https://github.com/stkoecn/im-mcp.git" --with "im-mcp[all]"
# （国内网络用户亦可使用 Gitee 源：uv tool install "git+https://gitee.com/ws4m/im-mcp.git" --with "im-mcp[all]"）

# 后续如需更新到最新版本，仅需执行：
uv tool upgrade im-mcp
```
按需只装一侧（前提：只用一个平台）：
```bash
pip install "git+https://github.com/stkoecn/im-mcp.git#egg=im-mcp[wechat]"
pip install "git+https://github.com/stkoecn/im-mcp.git#egg=im-mcp[dingtalk]"
```

**步骤 3：一次性初始化（提取密钥 + 解密 + 建 FTS5 索引）**
```bash
# Windows: 管理员终端、微信已登录，一键提取密钥、解密为 SQLite 并自动构建 FTS5 全文索引（默认保存至 ~/.wechat_mcp/）
wechat-init

# macOS (微信 4.1+ 配合 passphrase):
wechat-init --passphrase <64位十六进制passphrase>

# 高级选项（跨平台通用）
wechat-init --output ~/.wechat_mcp/decrypted   # 指定解密数据库保存路径（默认 ~/.wechat_mcp/decrypted）
wechat-init --only-extract                     # 仅提取密钥保存至 all_keys.json，不立即解密
wechat-init --etl-only                         # 仅执行数据清洗与重构 FTS5 索引（无需重复解密）
```
```bash
# 一键同步并解密当前登录DuangDuang的数据库
dingtalk-init

# 高级选项（可选）
dingtalk-init --output-dir ~/.dingtalk_mcp/decrypted  # 指定输出路径
```

**步骤 4：接入 AI 客户端（方案 A：`uvx` 即席运行，零环境污染，原文最推荐）**
前提：已在步骤 3 完成初始化。把下面 JSON 写进客户端的 MCP 配置：
```json
{
  "mcpServers": {
    "wechat": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/stkoecn/im-mcp.git[all]",
        "wechat-mcp"
      ],
      "env": {
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUTF8": "1"
      },
      "description": "绿泡泡聊天记录与群聊检索 MCP"
    },
    "dingtalk": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/stkoecn/im-mcp.git[all]",
        "dingtalk-mcp"
      ],
      "env": {
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUTF8": "1"
      },
      "description": "DuangDuang聊天记录、群聊与通讯录检索 MCP"
    }
  }
}
```
方案 B（前提：步骤 2 已 `uv tool install` 成功，且命令在 PATH 中；若提示 not on your PATH 可 `uv tool update-shell` 或重启终端，受限环境可直接写绝对路径如 `C:\\Users\\<用户名>\\.local\\bin\\wechat-mcp.exe`）：
```json
{
  "mcpServers": {
    "wechat": {
      "command": "wechat-mcp",
      "description": "绿泡泡聊天记录与群聊检索 MCP"
    },
    "dingtalk": {
      "command": "dingtalk-mcp",
      "description": "DuangDuang聊天记录、群聊与通讯录检索 MCP"
    }
  }
}
```

**步骤 5：给 agent 装配套技能文档（把“怎么调用、出错怎么办”的 SOP 交给模型自己读）**
```bash
# 通用智能体环境 (Pi / Codex / Pebrel)
mkdir -p ~/.agents/skills/im-mcp && cp skills/im-mcp/SKILL.md ~/.agents/skills/im-mcp/
# Claude Code / Desktop
mkdir -p ~/.claude/skills/im-mcp && cp skills/im-mcp/SKILL.md ~/.claude/skills/im-mcp/
# 当前项目工作区本地生效
mkdir -p .agents/skills/im-mcp && cp skills/im-mcp/SKILL.md .agents/skills/im-mcp/
```

**步骤 6：让 agent 自己完成配置（原文给出的“复制即用提示词”）**
```text
请阅读并遵循开源项目 https://github.com/stkoecn/im-mcp 中的 README.md 与 skills/im-mcp/SKILL.md，帮我配置并启用本机的绿泡泡与DuangDuang MCP 服务。
```

**步骤 7：用完即清（公共机器或试用结束后必须做）**
先完全退出 AI 客户端（否则 SQLite 句柄与 `-shm`/`-wal` 锁会阻止删除），或强制结束进程：
```powershell
Get-Process | Where-Object { $_.ProcessName -match "wechat-mcp|dingtalk-mcp" } | Stop-Process -Force
```
```bash
im-clean --dry-run          # 先预览待删文件与占用
im-clean                    # 交互式安全清理（二次确认）
im-clean --scope wechat     # 按平台清理
im-clean -y --force         # 残留句柄时强制结束并清除
uv tool uninstall im-mcp    # 卸载工具链
```

**步骤 8：日常使用方式（工具→场景映射，照抄即可发起任务）**
- “找一下群里谁发过关于‘某某需求’的讨论” → `search_wechat_messages`
- “总结一下这个项目群最近 50 条消息都在聊什么” → `get_session_history`
- “帮我汇总 2026-10-16 那天所有沟通做日报” → `get_messages_by_date`
- “拉一下上周三到周五这个群聊了什么” → `get_messages_by_range`
- “找一下上周有人发在群里的那个理财报告 Excel” → `search_shared_files`
- “把刚才查到的那张聊天图片解密提取出来看下” → `get_message_image`
- “查一下张工的微信号和备注名” → `search_contacts`
- “数据是不是最新的” → `get_sync_status`；“刚聊了几句，帮我更新一下数据库后再查” → `sync_wechat_database`

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 已能做、但没想到交给它的工作）**
原文把一批“平时靠翻聊天记录手工做”的工作变成一次工具调用：跨群全文找人找话题、按日期/时间段汇总沟通做日报、按人/群拉取上下文、找群文件与图片、列出群成员与通讯录、统计群活跃时段、分析某人的沟通风格（画像+高频用语+典型语句）。这给出了“私有沟通上下文供给”这一类工作的具体能力边界。

**2. 任务匹配（什么工作适合什么模型/工具/协作方式）**
- 模式是“**检索在前、生成在后**”：agent 先用 MCP 工具做结构化检索（FTS5 全文 + 时间/会话过滤 + offset 分页），再让模型做总结。适合总结、找人、找文件、日报这类“先定位再归纳”的任务。
- 协议层用 MCP，客户端侧明确列举 Claude Desktop / Cursor / Cline / Pi，即插即用、不绑定单一模型。
- 本地 SQLite 直读 + FTS5 索引，而非走云端 API；原文声称“毫秒级响应”，但未给测量方法。
- 工具表里写明了每个工具“适用场景”，等于给了任务→工具的对照表。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
原文对供给条件写得最细，这本身是可复用的经验：
- **权限**：Windows 需管理员终端（读进程内存取密钥）；macOS 需 64 位 hex passphrase 或 `wechat-passphrase.json` 持久化。
- **状态前提**：客户端必须已登录、版本在支持范围内。
- **数据目录**：`~/.wechat_mcp/`、`~/.dingtalk_mcp/` 为默认落盘位置，可用 `--output` / `--output-dir` 改。
- **工具供给**：`uv`/`uvx`/`pip` 三种安装路径，`[wechat]` / `[dingtalk]` / `[all]` 可选依赖。
- **反馈回路**：`get_sync_status` 查索引新鲜度、`sync_wechat_database`/`sync_dingtalk_data` 触发增量同步，形成“先看是否最新、再决定是否同步、再查询”的 SOP；`skills/im-mcp/SKILL.md` 明确写了“依赖运行策略、初始化前置检查、工具链调用 SOP、异常处置禁令”，即把失败处置也交给 agent 读文档。
- **编码环境**：客户端 env 固定 `PYTHONIOENCODING=utf-8`、`PYTHONUTF8=1`。

**4. 主动推进（时间/事件/状态触发、持续完成）**
有一定依据但**不完整**：原文提供了可被触发的原子能力——`sync_wechat_database`（增量 ETL）、`sync_dingtalk_data`（拷贝+WAL 解密同步）、`get_sync_status`（判断是否需要重新同步），足以支撑“状态检查→按需同步→出摘要”这类自动化循环；但 README 未给出任何定时/事件触发的实现（无 cron、无 webhook、无守护进程说明），调度层需自行搭建。

**5. 效果验证（怎样判断确实改善了结果）**
原文只给了**兼容性验证**（一张覆盖 Windows/macOS、多个微信/钉钉版本的“实测验证版本”表），没有任何效果指标、任务成功率或对照数据。验证方式需自行设计（见末节）。

## 与已有做法的关系

- **Claude Code（adopt）**：本工具是给 Claude Code 这类客户端**加 MCP 数据源**的外部依赖，与 Claude Code 本身不冲突；它把“读本地私有沟通记录”这一此前需手工复制的环节自动化。原文把 Claude Code/Desktop 列为明确支持对象，并给出 `~/.claude/skills/im-mcp/` 的技能安装路径。
- **Cursor（watch）、Cline（watch）**：原文兼容性列表与配置示例直接点名这两者，说明同一套 MCP 配置可以复用到多个客户端，是“一次接入、多端复用”的实例；但原文未给出在这两者中的实测细节。
- **Agent skills（adopt）**：仓库自带 `skills/im-mcp/SKILL.md`（含依赖策略、前置检查、调用 SOP、异常处置禁令、附录参考目录），是三处安装路径（`~/.agents/skills`、`~/.claude/skills`、工作区 `.agents/skills`）可直接照抄的 Agent Skill 实例，可作为“如何为工具写 skill 文档”的样板。
- 清单中没有与“本地 IM 聊天记录 MCP 检索”直接对应的条目；也没有 MCP 协议本身的条目。

## 证据与局限

**原文给出的可核查内容**
- 明确的兼容版本表：微信 4.x（实测 Windows `4.1.15.13`、macOS ARM64 `4.1.35.15`、macOS x86_64 `4.1.15`(270115)）、钉钉 7.x（实测 `7.6.0.x`）。
- 明确的工具清单与每项“适用场景”（微信 16 个、钉钉 5 个）。
- 明确的安装/初始化/配置/清理命令与 JSON 配置，可直接复制执行。
- 明确的实现原理：微信侧 Windows 运行时扫描 Config.Cipher 取 Salt 密钥；macOS 用 `CommonCrypto`(CCCrypt)、PBKDF2 256,000 轮派生、离线 HMAC 校验；钉钉侧 PBKDF2-HMAC-SHA1 + MD5 推导 AES-128、合并 WAL；钉钉按 `tbmsg_000`~`tbmsg_127` 128 分表聚合查询。

**只是作者主张、无数据支撑**
- “超低延迟”“毫秒级响应”“启动极快”“极速解密”——无任何基准测试、数据规模或耗时数字。
- “安全、高速”“绝不上云”——只能证明设计意图（只读、本地），无审计或第三方验证。
- 各版本兼容性仅列出“实测验证版本”，未说明未列版本的行为（是报错、静默失败还是数据错乱）。

**适用条件与风险（必须在手册中标注）**
- **强版本耦合**：客户端升级即可能失效，微信 3.9.x 只是“兼容”、4.1+ macOS 还需 passphrase，属于易碎集成。
- **合规与隐私风险高**：本质是解密本地客户端数据库并导出明文 SQLite（`~/.wechat_mcp/decrypted`），原文用“绿泡泡/ DuangDuang”代称、并专设 `im-clean` 与“公共机器彻底清理”章节，说明作者清楚其敏感性；在企业环境使用前需自行评估平台协议、数据合规与同事知情同意问题。
- **权限代价**：Windows 需管理员终端读进程内存；这本身是一项安全面扩大。
- **成熟度有限**：30 stars、单一仓库维护，原文自述为某上游项目的 fork（`reference/wechat-local-viewer`、`reference/dingwave-V3` 以 submodule 归档），无测试报告、无 issue 处理情况说明。
- **只覆盖两个平台**：无 Linux、无飞书/企微/ Slack 等。
- **只读但非无痕**：数据虽只读，但会把明文副本与密钥（`all_keys.json`）落盘。

## 怎么试、怎么验证

**最小试用（半天，1 台机器、1 个平台）**
1. 在**非关键**设备的 Windows 上装 `uv`，执行步骤 2 的 `uv tool install`；先只跑 `wechat-init --only-extract`，确认密钥提取这一步能过，再执行完整 `wechat-init`。
2. 若 `wechat-init` 失败，立刻用 `im-clean --dry-run` 确认落盘范围、`im-clean -y` 清除，不带着半成品继续配客户端。
3. 用步骤 4 方案 A 的 JSON 只接 `wechat` 一个 server，重启客户端，确认工具列表出现 16 个工具。
4. 选 3 个真实任务做对照：①找某群里某人发过的某个文件；②汇总某一天的群沟通写日报；③查某联系人备注/微信号。先手工做一遍记时记结果，再用 agent 做一遍。

**判断有没有改善的指标**
- **效率**：同一任务手工耗时 vs. agent 耗时（含澄清轮次）；三个任务的中位数。
- **准确率**：检索结果与手工结果是否一致（漏检/误检条数）；日报汇总是否出现原文没有的信息（幻觉率）——这是最关键的一条，因为摘要类任务最容易编。
- **数据新鲜度**：每次查询前 `get_sync_status` 报告的时间戳与实际最后一条消息时间是否吻合；不吻合则记录同步一次需要多久。
- **边界行为**：故意问一个不存在的群/人、问超出时间范围的消息、问无权限的会话，看工具是返回空、报错还是编造——把“异常处置”表现写进手册。
- **可逆性**：试用结束执行步骤 7，确认 `~/.wechat_mcp`、`~/.dingtalk_mcp` 被清空、进程无残留、`uv tool uninstall` 后命令消失。**可逆性不通过就不进手册。**
- **稳定性**：客户端升级一次后重跑上述三个任务，若失效则把“版本锁定”写进手册的使用前提。

**升级为 adopt 的条件**：在 2 台以上不同机器上重复成功、三个对照任务准确率不低于手工、可逆清理无残留，且合规评估通过。任一不满足，保持 try 或降为 study。
