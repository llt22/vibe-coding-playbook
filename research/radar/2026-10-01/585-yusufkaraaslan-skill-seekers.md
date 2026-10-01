# yusufkaraaslan/Skill_Seekers

- 结论：**值得一试**。建议小范围试用：用 Skill Seekers 把一份项目文档或本地代码库自动转成 Claude Skill/IDE 上下文，先验证质量门禁和在真实任务中的效果，再决定是否纳入手册。理由：README 给出了完整的 CLI 步骤（安装、create、package、install-agent、MCP），但质量与效率数据多为作者自述，需自行验证。
- 原文：https://github.com/yusufkaraaslan/Skill_Seekers
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T14:26:24.658Z

## 是什么
Skill Seekers 是一个 Python CLI + MCP 服务，把文档站点、GitHub 仓库、本地代码库、PDF、Word、EPUB、Jupyter、OpenAPI、PPTX、AsciiDoc、HTML、RSS、man page、视频、Confluence、Notion、Slack/Discord 导出等 18 类来源，转成结构化知识资产（SKILL.md、参考文件、RAG 分块、IDE 上下文），再打包成 22 种目标格式，供 Claude、Gemini、OpenAI 等 AI Skills，LangChain/LlamaIndex/向量库，以及 Cursor、Windsurf、Cline 等编码助手使用。它还支持多源合并时的冲突检测与成对综合。

## 具体做法
前提：Python 3.10+、Git；如需上传 Claude 需 ANTHROPIC_API_KEY；视频、Confluence、Notion、Slack 等需对应 extras 或凭证。

1. 安装核心包：
```bash
pip install skill-seekers
```
按需安装扩展：
```bash
pip install skill-seekers[all-llms]    # 所有 LLM 平台
pip install skill-seekers[mcp]         # MCP 服务器
pip install skill-seekers[all]         # 全部
```
不确定时运行向导：
```bash
skill-seekers-setup
```

2. 从任意来源创建技能。可先预览来源识别：
```bash
skill-seekers detect https://docs.djangoproject.com/ --json
skill-seekers create https://docs.djangoproject.com/
```
指定增强用的 AI 智能体：
```bash
skill-seekers create https://docs.djangoproject.com/ --agent kimi
skill-seekers create https://docs.djangoproject.com/ --agent-cmd "my-custom-agent run"
```
其他来源示例：
```bash
skill-seekers create facebook/react            # GitHub 仓库
skill-seekers create ./my-project              # 本地代码库
skill-seekers create manual.pdf                # PDF
skill-seekers create report.docx               # Word
skill-seekers create book.epub                 # EPUB
skill-seekers create notebook.ipynb            # Jupyter
skill-seekers create openapi.yaml              # OpenAPI/Swagger
skill-seekers create presentation.pptx         # PowerPoint
skill-seekers create guide.adoc                # AsciiDoc
skill-seekers create page.html                 # 本地 HTML（或整个目录）
skill-seekers create feed.rss                  # RSS/Atom
skill-seekers create curl.1                    # Man page
```

3. 扫描项目并自动生成配置：
```bash
skill-seekers scan ./my-react-app --out ./configs/scanned/
# → react.json, vite.json, tailwind.json, jest.json, my-react-app-codebase.json
skill-seekers create ./configs/scanned/react.json
```
本地代码库可选深度预设：
```bash
skill-seekers create ./my-project --preset quick          # 1–2 分钟，表面级
skill-seekers create ./my-project --preset standard       # 平衡（默认）
skill-seekers create ./my-project --preset comprehensive  # 深度、详尽
```

4. 为技能加搜索索引（可选，默认关闭，不改动 Markdown）：
```bash
skill-seekers create <source> --index
```
会生成仅用标准库的 `scripts/search.py` 和 SQLite FTS5 索引，便于智能体先定位 `file#anchor` 再读取大文件。

5. 打包成目标平台格式：
```bash
skill-seekers package output/django --target claude
skill-seekers package output/react --target langchain
skill-seekers package output/react --target llama-index
skill-seekers package output/react --target ibm-bob
```
常用 LLM 目标：`claude`、`gemini`、`openai`、`minimax`、`opencode`、`kimi`、`deepseek`、`qwen`、`openrouter`、`together`、`fireworks`、`markdown`；RAG/向量库：`langchain`、`llama-index`、`haystack`、`chroma`、`faiss`、`weaviate`、`qdrant`、`pinecone`；其他：`atlas`、`ibm-bob`。

6. 上传到 Claude：
```bash
export ANTHROPIC_API_KEY=sk-ant-...
skill-seekers package output/react/ --upload   # 打包并上传
skill-seekers upload output/react.zip          # 上传已有 zip
```
无 API key 时，手动到 claude.ai/skills 上传 `output/react.zip`。

7. 安装到 AI 编码助手：
```bash
skill-seekers install-agent output/react/ --agent cursor
skill-seekers install-agent output/react/ --agent all      # 所有检测到的助手
skill-seekers install-agent output/react/ --agent cursor --dry-run
```
支持的助手包括 Claude Code（`~/.claude/skills/`）、Cursor（`.cursor/skills/`）、VS Code/Copilot（`.github/skills/`）、Amp、Goose、OpenCode、Letta、Aide、Windsurf、Neovate、Roo Code、Cline、Aider、Bolt、Kilo Code、Continue、Kimi Code、IBM Bob。

8. 启动 MCP 服务，让助手用自然语言调用：
```bash
# stdio 模式（Claude Code、VS Code + Cline）
python -m skill_seekers.mcp.server_fastmcp

# HTTP 模式（Cursor、Windsurf、IntelliJ）
python -m skill_seekers.mcp.server_fastmcp --transport http --port 8765
```
之后可直接对助手说：`Package and upload the React skill.`

9. 质量门禁与诊断：
```bash
skill-seekers quality output/react/ --threshold 7
skill-seekers quality output/react/ --json
skill-seekers doctor          # 诊断安装与环境
skill-seekers doctor --json   # 供 CI 和智能体使用的机器可读诊断
skill-seekers sync-config     # 检测配置漂移
```

10. 视频来源（需 `skill-seekers[video]`）：
```bash
skill-seekers create --video-url https://www.youtube.com/watch?v=... --name mytutorial
skill-seekers create --setup   # 自动安装 GPU 感知的视觉依赖
```

11. Confluence / Notion / Slack/Discord：
```bash
skill-seekers create --space-key TEAM --name wiki               # Confluence
skill-seekers create --database-id ... --name docs              # Notion
skill-seekers create --chat-export-path ./slack-export --name team-chat  # Slack/Discord
```

## 对应的研究问题
- 能力发现：原文显示 AI 可承担“把散落文档/代码/视频整理成智能体可用的知识资产”这项工作，包括抓取、分类、写 `SKILL.md`、提取用法示例、检测多源冲突、生成 RAG 分块和 IDE 上下文。有依据的功能：18 类来源、22 种导出目标、AI enhancement、unified multi-source scraping 的冲突检测与成对综合。
- 任务匹配：适合需要给 Claude、Gemini、OpenAI 等智能体供给领域知识，或构建 RAG、给编码助手提供上下文的任务。工具选择：用 `--target` 选 22 种目标；用 `--agent` 选 API 模式或 LOCAL 模式（Claude Code、Kimi Code、Codex、Copilot、OpenCode、自定义）；用 `--enhance-level 0-3` 控制增强深度；通过 MCP 让助手按需调用（40 个工具）。
- 条件供给：需要提供源（文档 URL、仓库、本地代码库、PDF、视频等），Python 3.10+ 与 Git 环境，上传 Claude 需 `ANTHROPIC_API_KEY`，视频/Confluence/Notion/Slack 需对应 extras 或凭证。反馈机制：`quality` 评分与 `--threshold` 门禁、`doctor` 诊断、`sync-config` 配置漂移检测。
- 主动推进：原文提到 doc-change detection with scheduled re-scrapes and notifications、incremental updates；`sync` 模块负责文档变更检测与通知；`quality --json` 和 `doctor --json` 可用于 CI；生态中有 GitHub Action 用于 CI/CD。这些可支持由时间或状态触发的持续知识库更新。
- 效果验证：`skill-seekers quality output/react/ --threshold 7` 可作为质量门禁；README 给出 3,900+ 测试、68 个 workflow presets、性能表（小/中/大型文档的耗时与输出大小）、声称“99% faster”、生成的 `SKILL.md` 常为 500+ 行、RAG-ready chunks。但缺少与人工基线的对照实验，多数为作者主张。

## 与已有做法的关系
清单中有 Claude Code（adopt）、Atlas（watch）、Cline（watch）、Cursor（watch）、DeepSeek（try）、goose（watch）、OpenCode（watch）、Trendshift（source, watch）。Skill Seekers 与其中多项直接配合：
- Claude Code：安装路径 `~/.claude/skills/`，支持 MCP，可打包并上传 Claude Skill。
- Cursor、Cline、OpenCode、goose：`install-agent` 支持这些助手，把生成的技能装入其 skills 目录。
- DeepSeek：可作为 `--target` 导出目标之一。
- Atlas：在“其他（2）”导出目标中明确列出 `atlas`。
- Trendshift：仅作为 README 徽章出现，无实质关系。
总体关系：Skill Seekers 是这些工具的知识供给层，不替代它们，而是把文档/代码/PDF 等转成它们能读的 Skill/上下文/RAG 数据。

## 证据与局限
证据：README 给出具体 CLI 命令、安装 extras、支持的来源与目标列表、MCP 启动命令、质量门禁命令、性能表、版本号 3.9.0、MIT 许可、15k stars、3,900+ 测试、68 个 workflow presets、40 个 MCP 工具。数据与案例来自项目自述。
局限：原文只是 GitHub README，不是独立评测；没有准确率、失败率、与人工流程的对照数据；“99% faster”“Real skill quality”等是作者主张；实际效果依赖所选源、AI 增强模型/智能体、网络环境和额外依赖；需要 Python 3.10+、Git，部分功能需 API key 和额外 extras；大型文档集需用 `stream`；冲突检测的具体算法和可靠性未在原文说明。适用条件：团队或个人愿意在本地 Python 环境试用，并愿意对生成质量做人工抽检。

## 怎么试、怎么验证
最小试用：选一份小规模项目文档或一个本地代码库，只跑通“创建→质量检查→打包→装入一个助手”的链路。

```bash
pip install skill-seekers
skill-seekers create https://docs.example.com/ --name mytest
skill-seekers quality output/mytest/ --threshold 7
skill-seekers package output/mytest/ --target claude
skill-seekers install-agent output/mytest/ --agent claude-code --dry-run
```

然后在一个真实任务上对比“有技能”和“无技能”两种方式，例如让编码助手用该文档/代码库回答 API 用法、生成示例代码或定位配置。建议指标：
- 任务完成时间与人工粘贴上下文的次数是否下降；
- 助手回答中 API/配置错误的次数是否减少；
- `quality` 分数是否达到预设阈值（如 7）；
- 若用了 `--index`，智能体能否通过 `scripts/search.py` 找对 `file#anchor`，减少整文件读取；
- 若用于 RAG，用一组固定问题测检索命中率与答案正确率；
- 多源场景下，检查冲突检测是否给出可解释结果；
- 运行 `skill-seekers doctor` 确认环境无阻断问题。
先小范围试 1–2 个来源、1 个目标平台，如果质量门禁和真实任务指标没有改善，则降级为 study 或换用其他方案。
