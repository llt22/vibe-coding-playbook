# xerj-org/xerj

- 结论：**值得一试**。建议在一台单人开发机上小范围试：装单二进制、起本地节点、对模型没见过的私有/内部代码库 autoindex 后接入 Claude Code 的 MCP，用“先检索同类解法再写码”的流程和 grep 对照跑 3-5 个任务；之所以给 try 而不是 adopt，是因为原文确实给了可直接复制的安装、启动、索引、MCP 配置和提示词，但全部收益数字都来自项目自报的案例研究与用户反馈，无法独立复核，且 --insecure 有明确信任边界。
- 原文：https://github.com/xerj-org/xerj
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-16T02:14:25.815Z

## 是什么

XERJ 是一个单静态二进制、本地部署的搜索引擎（Apache-2.0，Rust 编写），对外说 Elasticsearch REST API（默认 localhost:9200）。它的核心用途是让编码 agent“先检索、再写码”：`xerj autoindex` 把项目源码自动索引成 AST 感知（tree-sitter，带符号和行号）的索引，agent 用一次查询拿到精确段落（file:line），而不是把整个文件读进上下文。README 称在受控研究中把编码 agent 的输出 token 降到 grep 的 1/2.7（相比纯记忆 1/26），解决率同为 16/16。

除参考编码外，同一个原语 `xerj autoindex <folder>` 还能索引文档、日志、PDF、SQLite、CSV、Office/EPUB/Jupyter/man page/mail 等，用于代码库问答、安全审计、日志分析、agent 长期记忆（`/_memory/{namespace}`）。

## 具体做法

前提：Linux/macOS/Windows 的 x86-64 或 arm64；能跑本地进程；建议先在一台单人开发机上做。

1. 安装（安装器会打印 xerj 落地路径，默认 `~/.local/bin`，必要时加进 PATH）。

```sh
curl -fsSL https://xerj.org/get | sh
```

Windows PowerShell：

```powershell
irm https://xerj.org/get.ps1 | iex
```

2. 起一个本地开发节点（前提：单用户开发机）。`--insecure` 关闭 TLS 和 API key 认证，任何能访问该端口的人都是超级用户，可读取和删除所有索引（含 /_memory 命名空间）；新节点只绑 127.0.0.1，非本机接口的明文绑定会拒绝启动。

```sh
xerj --insecure --data-dir ./data &
```

确认 http://localhost:9200 有响应后再继续。

3. 如果你用开启认证的节点（不带 `--insecure` 的默认启动，包括从配置文件启动），必须把同一个 key 交给 autoindex——它不会从 xerj.toml 读取 key，否则所有请求返回 401 Unauthorized。

```sh
xerj --data-dir ./data &
export XERJ_API_KEY="$(cat ./data/admin.key)"
xerj autoindex ~/my-project
```

4. 索引任意文件夹。不写 schema、不配 pipeline；XERJ 嗅探每个文件并按其类型建索引，源码经 tree-sitter 解析成带符号和行号的记录。

```sh
xerj autoindex ~/my-project
```

输出形如：

```
phase A: 593 datasets inferred, 1955 junk/skipped files
phase B: indexing 25329 files with 8 workers
done in 158.1s, 593 datasets, 83103 records live, 790 junk records
```

5. 一条命令把 XERJ 接进 Claude Code / Cursor（MCP + skill）：

```sh
xerj init
```

6. 用命令行查询。

```sh
xerj search "how do we rotate the WAL segment"   # ranked passages, file:line
xerj def "euler_to_rotationmatrix"               # go-to-definition: file:line + signature
```

7. 或者直接用 Elasticsearch 客户端/DSL 查询。

```sh
curl localhost:9200/_cat/indices
curl "localhost:9200/ax-*/_search?q=checkout+error"
curl localhost:9200/ax-orders/_search -H 'content-type: application/json' -d '{
  "query": { "range": { "total": { "gte": 100 } } },
  "aggs":  { "by_status": { "terms": { "field": "status" } } }
}'
```

8. 给不能执行 shell 的桌面助手/函数调用型 host 接 MCP。前提：先跑第 2 步的节点；`xerj mcp` 自己不起节点，它用 stdio 跟客户端说话、用普通 HTTP 连 `XERJ_URL`（默认 http://localhost:9200）。用绝对路径，因为从桌面图标启动的 MCP host 不继承 shell 的 PATH；节点开了认证就再加 `XERJ_AUTH`。

```json
{
  "mcpServers": {
    "xerj": {
      "command": "/home/you/.local/bin/xerj",
      "args": ["mcp"],
      "env": { "XERJ_URL": "http://localhost:9200" }
    }
  }
}
```

9. MCP 暴露 13 个工具：`xerj_search`、`xerj_semantic_search`、`xerj_vector_search`、`xerj_hybrid_search`、`xerj_memory_store`/`xerj_memory_recall`、`xerj_brain_overview`/`xerj_brain_ego`/`xerj_brain_link`/`xerj_brain_unlink`、`xerj_plan`（纯规则、非 LLM 的自然语言→查询 DSL）、`xerj_map`、`xerj_code_search`（跑 `xerj code` 参考编码流水线）。工具 schema 发布在 xerj.org/docs/agents/schemas/mcp-tools.json。

10. 一键提示词（可直接粘给 agent）：

```text
Install XERJ (docs: https://xerj.org/llms.txt), index this project's sources, and set up
reference coding: clone and index the open-source repos closest to what we're building,
and search how they solved a problem before writing code.
```

README 另给三个可用提示词：读 llms.txt 并把 XERJ 设为搜索后端、索引 `./docs`、展示每个索引一个示例查询；跑 `xerj autoindex map` 报告数据类型/数量/记录到的坑，再改用搜索回答；用 `/_memory/notes` 作为项目长期记忆，下次会话按语义召回。

11. 参考编码循环（README 说 llms.txt 给的就是这个顺序）：安装 → 起服务 → `xerj autoindex .` → 用任意 Elasticsearch 客户端查询 → clone 相似开源项目、索引它、写代码前先检索它怎么解决、引用出处、遵守许可证。

12. 核对收益。

```sh
xerj gain                                        # what it did for you — counted, not estimated
```

13. 复现代码索引基准（需要稳定版 Rust 工具链）：

```sh
XERJ_EXTRACT_BENCH=/path/to/repo cargo test -p xerj-autoindex --release \
  extract_bench -- --nocapture --ignored
```

从源码构建：

```sh
git clone https://github.com/xerj-org/xerj
cd xerj/engine
cargo build --release -p xerj-server
./target/release/xerj --insecure --data-dir ./data
```

14. 可选重排（默认关闭，开了才发数据）：在 `_search` 里加 `"rerank": {}`，XERJ 把 top 结果发给 TypeSafe 的 Jev 服务，需要 operator 配好 provider key；这会把这些结果的文本发到外部服务器，`[rerank] enabled = false` 可完全禁止。另有本地版本 `POST /v1/systemone`、`POST /_decide`，用你已标注的相似文档投票，数据不出机器、不需要 key，但必须有标注样本。

15. 反馈（README 把这当成加入社区的唯一要求）：`xerj feedback` 起草报告并填入版本/OS/索引内容，`xerj feedback --open-pr` 直接开 PR；或手动 `gh pr create`，diff 里只加 `user-feedback/16-agent-field-reports/` 下的一个 markdown 文件。

## 对应的研究问题

- **能力发现**：README 明确列出的、可以交给它的活儿有——参考编码（先检索同类 OSS 的解法再写码）、代码库问答与 RAG、安全审计（跨所有文件类型查 sink 模式/密钥/危险调用）、日志与事故分析、agent 长期记忆（`/_memory`）、以及用已标注样本做本地决策打分。它把“读文件”这个动作整体换成“查索引”。
- **任务匹配**：①收益按“模型是否见过”分档——私有、内部、小众、训练截止之后的代码有收益，模型已熟知的流行公开库中性甚至有害；②接入方式按 host 能力分档，能跑 shell 的用 CLI，只能函数调用的走 MCP（`xerj mcp` + 13 个工具）；③模型分档，README 说小模型 + 检索可以超过靠记忆的贵模型；④检索模式分档，默认嵌入器是 lexical feature-hashing（离线），`--embed-mode neural` 才用神经嵌入，且需本地先放好三个模型文件（约 90 MB）。
- **条件供给**：需要提供——本地数据目录和一个可用端口（9200）；要索引的语料目录；认证开启时的 API key（`--api-key` 或 `XERJ_API_KEY`，autoindex 不读 toml）；MCP 场景需要绝对路径的二进制、`XERJ_URL`，认证时 `XERJ_AUTH`；rerank 需要 provider key；systemone 需要已标注样例；神经嵌入需要预置模型文件，气隙环境按仓库里的 air-gapped 配方走。反馈侧要供给一份 field report。
- **主动推进**：原文没有给出定时/事件触发的持续编排步骤，只给了一条与“状态触发”相关的机制——重索引是增量的，内容字节级未变的文件跳过解析、把上次的结果顺延，所以改几个文件后重跑的工作量正比于改动量（常见的编辑-重跑/CI 场景通常 >95% 文件未变），总时长由内容哈希而非解析兜底。至于“每次编辑后自动重索引”这类编排，原文没写，得自己搭。
- **效果验证**：`xerj gain` 输出它自己统计的收益（counted, not estimated）；受控案例给的是 output tokens / 花费 / 解决率三列；基准带复现命令；重排给的是公开 FiQA 的 nDCG@10 和总花费；本地决策给的是 AG News（12 万标注样本）准确率。README 自己声明“任何你无法复现的数字，包括我们的，都该存疑”。

## 与已有做法的关系

- **Claude Code（已 adopt）**：README 里 `xerj init` 明确就是“wire XERJ into Claude Code/Cursor (MCP + skill)，一条命令”。它给 Claude Code 补的是一个“外部语料检索后端”，与文件读取/grep 是替代关系而非叠加——对模型没见过的代码，README 建议用检索替换读文件。
- **Cursor（watch）**：同上，`xerj init` 覆盖 Cursor；Cursor 侧也可以直接用第 8 步的 MCP 配置。
- **Trendshift（watch，source）**：只是 README 顶部 trending 徽章的来源，与做法无关。
- 清单中没有其他相关条目。

## 证据与局限

原文给出的数据（全部出自 README 自身的表格、案例研究和仓库内链接）：

- 受控研究：8 个任务、4 种语言、每臂 16 次运行、真实 `claude -p` token 计数——纯记忆 260,916 output tokens / $11.18 / 11/16；grep agent 26,477 / $3.27 / 16/16；XERJ 9,982 / $1.58 / 16/16。即比 grep 少 2.7x output token、比纯记忆少 26x、便宜 2.1x，解决率相同；单个 Java 任务上最多少 278x。另有一组：模型没见过的 Rust 库，带检索 9/9，纯记忆 0/9。
- 输入侧：grep 会把整个文件拉进上下文，在一个语料上实测高达 1.06M input tokens；WordPress core 的 PHP 约 520 万 token（≈26 个满上下文窗口），某次 AI 安全审计在 1,492 个 PHP 文件上只用约 26,000 tokens。
- 现场报告：用户称端到端约省 5x token（README 链接到 user-feedback 下的 field reports）。
- 兼容性：ES-YAML conformance 当前通过 1366/1369，未过的列在仓库里。
- 性能：对 Elasticsearch 8.13.4 的闭环测试 55 胜 26 平 4 负，含 1.72x 摄取吞吐和 1.61x 更小的磁盘占用；4 个败绩是同一个缺口——高写入压力下的读 p99，已单独写文。
- 重排：公开 FiQA 上 nDCG@10 从 0.24 到 0.36，648 次搜索总计约 $0.64；本地决策在 AG News（12 万标注样本）上 92% 正确。

哪些只是作者主张：整个 README 是项目方自述，上述案例研究、现场报告、基准页都在 xerj.org / 仓库内链接上，材料里没有抓取到内容，无法独立复核；“用户报告约 5x”是用户反馈而非受控测量；README 自己注明重排“用真实模型时的排序质量尚未验证”，且那些数字未良好校准。

安全边界是硬约束：`--insecure` 等于把每个能访问端口的人当成超级用户（可读可删所有索引，包括 `/_memory`）；rerank 是本节点唯一会在搜索时把文档文本发出去的功能（proxy embeddings 和 WAL tap 在 operator 配置后也会）。适用条件是“模型没见过的代码”，对流行的公开库可能中性甚至有害。

另需注意：初筛理由里提到的“40x 数据”在原文里没有对应数字，原文给的是 2.7x（对 grep）、26x（对纯记忆）、单任务最多 278x。README 里引用的若干文件路径带未来日期（如 2026-08-11、2026-09-20、2026-07-08 的报告与基准结果），这些内容本材料中没有，无法核对。

## 怎么试、怎么验证

最小试用（一台开发机，1-2 小时）：

1. 装好后 `xerj --insecure --data-dir ./data &`，确认 localhost:9200 有响应；只在单人机器上这么做。
2. 选一个模型不可能见过的语料：自己项目的私有模块、内部服务，或一个刚发布的库。`xerj autoindex <该目录>`。
3. `xerj init` 接进 Claude Code（或按第 8 步给 Cursor 配 MCP），确认 agent 真的看到了 XERJ 的工具。
4. 挑 3-5 个“改一个内部 API / 修一个私有库里的 bug”的小任务，每个任务跑三种条件并记录：A. 只靠模型记忆写；B. 允许 grep + 读文件；C. 要求先 `xerj search` 检索再写。
5. 交叉验证收益，别只信 `xerj gain`：用 `claude -p` 或客户端侧的 token/花费统计做同一口径的对照，`xerj gain` 只用来对账。
6. 想验神经检索/重排/本地决策，再单独开一轮：`--embed-mode neural`（先本地放好模型文件）；加 `"rerank": {}` 前先读 docs/RERANK.md 并确认可以接受文本出站；本地决策要先有标注样本。

判断有没有改善的指标：

- 输出 token 与花费（同任务同口径，理想情况接近原文的 grep→XERJ 差距）。
- 解决率 / 一次通过率，以及进入 fix loop 的轮数（原文的对照是 16/16 持平，说明省 token 不该以降正确率为代价）。
- 检索命中质量：返回的段落是否真的带着正确的 file:line 和签名（`xerj search` / `xerj def` 的输出可直接看）。
- 上下文规模：agent 单次任务的输入 token 是否从“整文件”降到“段落”级。
- 反向指标：在模型已熟知的公开库任务上是否没有改善甚至变差——如果有，说明该按“私有/小众/新代码”挑使用场景。
- 安全指标：索引目录里是否含密钥/隐私数据；节点是否只在 127.0.0.1；是否误开了 rerank 把文本发出去。

如果两三个任务下来 token 和通过率都没有可测量的改善，就停在这里，不扩大范围。
