# yjid/kensaku

- 结论：**值得一试**。建议小范围试用：把工作文件夹纳入本地索引，以只读 MCP 接入 Claude/Cursor，用全文、OCR 和语义检索给 agent 补上下文；工具配置具体可照做，但版本较新、缺少工作效果验证，先限定范围试用。
- 原文：https://github.com/yjid/kensaku
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T06:47:54.356Z

## 是什么
Kensaku 是一个 MIT 许可的本地桌面搜索与启动器，支持文件名、文件全文、图片 OCR、语义匹配和自然语言时间查询，并提供 `kensaku-cli` 与 MCP/HTTP 接口，让 AI agent 只读检索同一份本地索引。当前 README 标注版本为 1.0.6。它不是云搜索，也不是已经上线的“向文件提问”答案层；后者只在路线图中。

## 具体做法
1. **安装应用与 CLI。前提：本机可安装桌面应用，并能接受首次运行的未签名警告。** 从 latest release 下载对应平台安装包。Windows 在 SmartScreen 中点击 More info → Run anyway；macOS 在 System Settings → Privacy & Security 点击 Open Anyway。每个 release 同时包含 `kensaku-cli` 和 `SHA256SUMS`。若要从源码构建，前提是 Rust stable、Bun 1.1+ 和平台 webview 库：
```bash
git clone https://github.com/yjid/kensaku
cd kensaku
bun install
bun run tauri build
```
2. **建立最小索引。前提：先只选一个工作相关文件夹，避免把敏感目录全量纳入。** 首次运行选择要索引的文件夹和排除项，可选下载 OCR 或模型包；首次扫描期间搜索已可用。默认跳过隐藏文件、常见构建目录，以及 `.pem`、`.key`、`.pfx` 等凭据文件，并尊重 `.gitignore` 和 `.cursorignore`。索引包含文件名和抽取文本，应视为敏感数据，不要同步到共享位置。
3. **先用 CLI 验证检索是否覆盖你的工作材料。前提：`kensaku-cli` 已可从命令行调用。**
```bash
kensaku-cli search "docker error"
kensaku-cli search "invoice" --ext pdf --since 30d
kensaku-cli search "resume" --json
kensaku-cli state
```
4. **把本地索引接入 MCP 客户端。前提：客户端支持 MCP，且你只需要只读检索。** 将 MCP 客户端指向 CLI：
```json
{
  "mcpServers": {
    "kensaku": { "command": "kensaku-cli", "args": ["mcp"] }
  }
}
```
5. **需要 HTTP 接入时再启动本地服务。前提：客户端只能走 HTTP，且你接受本地 bearer token 管理。** 运行 `kensaku-cli serve`；README 说明它只监听 loopback，并要求配置目录中的 bearer token。
6. **设定 agent 使用边界。前提：保持默认只读，不把索引当可写工作区。** README 说明 agent 工具不能改文件，`reindex` 默认关闭；响应有大小预算，文件内容作为数据返回、不作为指令。除非确有需要，不要打开写操作或重建索引权限。

## 对应的研究问题
- **能力发现：** README 明确展示了几类常被忽略的 agent 可检索材料：截图中的报错文本、PDF/DOCX/PPTX/XLSX/EPUB 等文档全文、代码与日志、按“意思”描述查找文件，以及“上周的截图”这类自然语言时间查询。对 agent 来说，这相当于补上本地文件与截图 OCR 的“眼睛”。
- **任务匹配：** 适合“答案在本地文件、截图、代码或日志里”的检索与上下文补充任务，可通过 MCP 交给 Claude 或 Cursor，也可用 CLI 做脚本化、精确搜索或 `--json` 输出。它本身不做文件编辑，也不是已上线的问答推理层；不要把它当成通用 agent 或文档问答系统。
- **条件供给：** 需要提供索引范围、排除项、可选 OCR/模型包、MCP 配置和只读权限；用过滤器、排序、查询语言和自然语言时间表达提升检索精度；用 `--json` 把结果交给程序；通过 recents 排序和增量索引获得反馈。安全条件是索引留在本机、agent 只读、索引不同步共享位置。
- **主动推进：** 只有有限支持：增量索引会跟踪变更、重命名和删除，不需要全盘重扫；搜索可由人按键触发，或由 agent 经 MCP 调用触发。README 没有给出按时间、事件或状态自动完成工作流的机制，因此不能据此设计持续自动推进流程。
- **效果验证：** README 给出了检索性能基准，但没有给出“使用后工作结果改善”的研究或案例数据。可用于验证工具层面的速度、索引开销和检索命中，但不能直接证明任务完成质量提升；需要自行做前后对照。

## 与已有做法的关系
清单中有 **Cursor（tool，watch）**。Kensaku 与 Cursor 是互补关系：Cursor 作为 agent/编辑器，可通过 MCP 获得 Kensaku 的本地只读全文、OCR 和语义检索能力，用于补上下文；Kensaku 不替代 Cursor 的编辑与推理能力。清单中没有其他直接相关条目。README 还对比了 Everything、Listary、PowerToys Run、Spotlight、Raycast、Alfred，但这些不在给定清单中，只能作为作者对竞品的说明。

## 证据与局限
README 给出的数据主要来自作者自测：Linux 8 vCPU、SSD、100,000 文件下，文件名内存搜索平均 1.3 ms；首次索引 101,101 文件耗时 184 s、峰值 183 MB；无变化重索引 0.56 s；10 万文件名与元数据约 12 MB。Windows 1.0.6 的安装包 9 MB，加载 24,500 文件索引后托盘空闲约 20 MB 私有内存，活跃浏览约 150 MB。案例主要是“截图考古”“按描述找 PDF”“在日志里找报错”等使用场景，属于作者主张和演示，不是独立效果研究。局限包括：构建未代码签名、自动更新尚未接通；OCR 默认 Tesseract，可选 PP-OCRv6；缩略图仅覆盖图片；视觉搜索仍是 beta 且未进入搜索结果；Windows 获得最多真实测试，macOS/Linux 仍需更多实践验证；性能对比未测量 Spotlight、Everything、Listary，且数字来自 Linux。README 没有提供推荐提示词模板，也没有证明它能提升工作产出。

## 怎么试、怎么验证
最小试用：选一个包含文档、截图、代码或日志的项目文件夹建立索引；保持 agent 只读，接入一个 MCP 客户端，试用 1–2 周。设计一组固定任务做前后对照，例如“找出某次部署失败的日志行”“找出包含 CUDA 报错的截图”“按描述找出数据库索引相关 PDF”“在代码库中找某个函数/错误文本”。记录每次从开始到找到目标的时间、前 5 条结果是否命中、是否需要退回手动翻目录、agent 任务是否因缺少上下文而重试，以及 OCR 误识别和隐私暴露事件。判断改善的标准应建立在同一任务集的前后对比上：若检索时间下降、命中率提高且没有权限或隐私问题，再扩大索引范围；若只是搜索速度好看但任务完成没有改善，就停留在小范围试用，不写入手册主流程。
