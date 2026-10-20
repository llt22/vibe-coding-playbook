# chaenmasahiro0425/claude-security-scan

- 结论：**值得一试**。建议先小范围试用：按 README 安装后用 --demo 验证，再只对一个低风险域运行 --skip repos，确认只读、脱敏和“未能确认”标注可靠后再扩大。理由是它把跨 Mac、仓库、云和 Gmail 的例行检查封装成一句触发和定时任务，步骤具体；但它是跨多账户读取敏感信息的第三方技能，目前只有 README 证据，不宜直接全量 adopt。
- 原文：https://github.com/chaenmasahiro0425/claude-security-scan
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-20T06:13:05.804Z

## 是什么
`claude-security-scan` 是一个 Claude Code 技能。安装后，在 Claude Code 里说一句「セキュリティチェックして」，就会用本机已有的 CLI 和配置好的 API token，对 Mac 本体、本地全部 git 仓库、GitHub、Vercel/公开站点、AWS、Google Cloud、Azure、Cloudflare、Supabase、Gmail 做只读横跨检查。它输出按重要度分级的 HTML 报告，并标出「前次相比新增」的项目；不做配置改写、发送、删除。没有安装/登录的域会进入「未能确认的项目」并附理由，而不是当成「没有问题」。

## 具体做法
1. 准备运行环境（前提：已安装 Claude Code、git、bash；Python 3.11 以上；能访问 GitHub）。把仓库克隆到 Claude Code 的技能目录，并安装 gitleaks 与 osv-scanner：
```bash
git clone https://github.com/chaenmasahiro0425/claude-security-scan ~/.claude/skills/security-scan
bash ~/.claude/skills/security-scan/scripts/install-tools.sh   # gitleaks と osv-scanner を取得（SHA256を検証）
```
2. 按需准备各域的只读登录（前提：只对你确实要检查、且已安装对应 CLI 的域执行；原文说「入っているものだけでOK」，缺什么就会在报告里标为未确认）。原文给出的准备命令/动作如下；`...` 处需换成你自己的只读 token：
```bash
gh auth login
vercel login
aws configure        # または aws sso login
gcloud auth login    # 閲覧者 roles/viewer 相当の権限
az login             # 閲覧者 Reader 相当の権限
export CLOUDFLARE_API_TOKEN=...   # 読み取り専用のAPIトークン
supabase login
export SUPABASE_ACCESS_TOKEN=...  # RLS などの診断用
gog auth add you@example.com
```
3. 先用示例数据确认安装和报告样式（前提：第 1 步已完成；不依赖真实账户数据）：
```bash
python3 ~/.claude/skills/security-scan/scan.py --demo --open
```
4. 跑真实扫描。可全量，也可去掉较重的本地仓库代码检查（前提：第 2 步中至少完成一个域的登录；全量会读取本机全部 git 仓库）：
```bash
python3 ~/.claude/skills/security-scan/scan.py
python3 ~/.claude/skills/security-scan/scan.py --skip repos   # 重いコード検査を外す
```
5. 在 Claude Code 里用自然语言触发和追问（前提：技能已放在 `~/.claude/skills/security-scan`，并在 Claude Code 会话中）。原文示例提示词：
```text
セキュリティチェックして
前回から新しく出たリスクだけ教えて
直せるところある？
毎週月曜にスキャンするようにして
```
6. 可选：设置 macOS 每周一 8:00 自动执行（前提：macOS；第 1 步已完成）：
```bash
bash ~/.claude/skills/security-scan/scripts/install-schedule.sh
```
7. 可选：限制扫描对象。原文说无配置也能运行；需要时把 `config.example.toml` 复制到 `~/.config/security-scan/config.toml` 后编辑。AWS 默认只查东京 `ap-northeast-1` 和弗吉尼亚 `us-east-1`，其他区域要在配置的 `[aws] regions` 中追加（前提：知道自己的区域和要限制的范围）。
8. 查看结果：报告保存在 `reports/<日時>/report.html`，可按重要度、领域、NEW 过滤。报告含弱点清单，原文要求注意共享，且保存在本机、权限 700（前提：扫描已运行）。

原文明确的安全边界（执行时按此核对）：只读——gog 用 `--readonly`，各云只用 list/get/describe 和 API 的 GET，对网站只用 GET；不保留秘密值——gitleaks 用 `--redact`，Vercel 环境变量只记名称和类型，AWS key ID 只留末尾 4 位，常驻程序不记录启动参数，错误文也先脱敏再保存；抓取失败的账号/组织/仓库范围，不因「这次没看到」而在与上次比较时算作「已解决」或「新增」。

## 对应的研究问题
1. 能力发现：原文展示的可交给 AI 的具体工作是跨 Mac 本机、全部本地 git 仓库、GitHub、Vercel、多个云和 Gmail 的例行只读安全检查；这些检查原本分散，作者主张「去看几秒就能知道，但没人每周全看一遍」，因此适合交给 AI 按固定清单巡检。
2. 任务匹配：适合 Claude Code 技能 + 终端 Python 脚本 + 各系统已有 CLI 的组合；用 gitleaks、osv-scanner 做代码侧检查，用云厂商的 list/get/describe 和 API GET 做云侧检查，用一句自然语言触发，也可直接跑 `scan.py`。原文明确不做攻击性测试，检测只是线索，最终判断和修正由人做。
3. 条件供给：需要 Claude Code、Python 3.11 以上、git/bash；按域需要 `gh`、`vercel`、`aws`、`gcloud`、`az`、`supabase`、`gog` 等 CLI 及登录状态；Cloudflare 和 Supabase 需要只读 API token；GCP 需 viewer 级权限，Azure 需 Reader 级权限；报告保存在本机，配置文件可选。缺工具/权限不会中断，而是进入「未能确认」并附理由。
4. 主动推进：有明确的时间触发——macOS 下 `install-schedule.sh` 可设为每周一 8:00 自动执行；也可在 Claude Code 里说「毎週月曜にスキャンするようにして」。它还通过「前回から増えたもの」支持跨次比较；原文没有给出事件触发或状态机式的持续执行机制。
5. 效果验证：报告可按重要度、领域、NEW 过滤，并用「前次相比新增」判断变化；抓取失败的范围不会算作已解决或新增。但原文没有给出检出率、误报率或对照实验，作者也强调检测是线索、需人工最终判断，因此验证要靠人工复核和连续运行记录。

## 与已有做法的关系
清单中有 Claude Code（tool，adopt）。该仓库是 Claude Code 的一个技能：安装到 `~/.claude/skills/security-scan` 后，在 Claude Code 里用一句自然语言触发；同一套脚本也可从终端直接运行。它把 Claude Code 的使用范围从单点问答扩展到跨系统只读检查、报告和定时运行。清单中没有其他相关条目。

## 证据与局限
原文是仓库 README，给出了检测项清单、安装命令、各域准备方式、报告路径、安全设计和限制；仓库指标为 32 stars。没有给出检出率、误报率、真实用户案例或独立评测，也没有提供代码审计结果。作者关于「最近信息泄露多由疏忽造成」「这些检查去看几秒就能知道」等是主张，不是数据结论。原文自述的限制包括：Google Workspace 整体管理设置因需 Admin API 委派而不在范围内；AWS 区域检查默认只覆盖东京和弗吉尼亚，其他区域需手动加配置；不做暴力/模糊测试等攻击性检查；检测结果需人工最终判断。另需注意：这是会读取多账户敏感信息的第三方技能，README 中的只读与脱敏设计尚未在本报告依据的材料中经过代码级验证；Gmail 依赖第三方 `gog`；token 的 export 命令中 `...` 是占位符，需要自行替换。

## 怎么试、怎么验证
最小试用：先执行 `scan.py --demo --open` 只看示例报告；再在隔离或低风险环境里只登录一个域（例如个人 GitHub），用 `--skip repos` 跑一次，确认报告能生成、失败项进入「未能确认」、没有明文秘密、没有对测试仓库/账号产生写入或发送。确认后再逐域增加登录，最后才考虑全量扫描和每周定时。

验证指标：1）人工复核首次报告中的 high/medium 项，记录真实问题数与误报数，计算可确认的准确率；2）连续两周运行，记录 NEW 项数量及其中经复核为真的比例；3）统计「未能确认」项及原因，确认没有把失败静默当成无问题；4）记录单次运行时间和每周定时是否完成；5）在测试账号/仓库比对扫描前后配置与文件，确认只读边界成立。若误报过多、权限范围过宽或报告泄露敏感值，应缩小域、改为仅手动运行或放弃采用。
