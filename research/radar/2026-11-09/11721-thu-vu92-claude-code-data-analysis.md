# thu-vu92/claude-code-data-analysis

- 结论：**值得一试**。建议按“本地 SDV 合成数据→Claude Code Cloud 写代码→本地真实数据运行”小范围试，原文的三步流程和提示词可直接照搬；但 README 未给完整 SDV 代码和合成数据保真度验证，先试一个数据集再决定是否纳入手册。
- 原文：https://github.com/thu-vu92/claude-code-data-analysis
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T00:59:08.222Z

## 是什么
这是 thu-vu92/claude-code-data-analysis 仓库 README 介绍的一套隐私优先数据分析工作流：先在本地用 SDV 生成与真实数据同结构、同字段类型的合成替身；再在 Claude Code 的 Cloud mode 中只上传合成 CSV，让 Claude 写 EDA notebook 和 dashboard；最后把 notebook 和 requirements.txt 下载到本地，换成真实数据运行和修改。仓库包含代码、数据和视频中使用的提示词，并链接了完整视频教程。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
1. 明确分析问题并准备本地单表 CSV。前提：数据是表格型、可在本地用 Python 处理，且你有权限使用。原文示例是 2000 条酒店客人记录，含邮箱、账单地址、信用卡号等 PII；作者建议只保留回答分析问题所需的最小列，不需要的敏感列先删掉。
2. 在本地生成合成替身。按仓库的 Synthetic Data Generation Notebook 流程：安装 SDV（具体安装方式按 SDV 官方文档），用 SDV 的 CSVHandler 加载 CSV，自动检测表元数据，人工检查并修正误识别列（原文例子：billing_address 被识别成 id 而不是 address），用 GaussianCopulaSynthesizer 拟合，采样 100 行，得到 hotel_guest_data_synthetic.csv。前提：单表、字段类型可识别；合成数据只用于让 AI 写代码，不用于得出业务结论。
3. 打开 Claude Code 的 Cloud mode（原文称它零访问本地文件），只上传合成 CSV，并粘贴 Prompt 1：
```text
Create a Jupyter notebook to explore this hotel guest data. Use pandas and Plotly (or any other package or library you prefer).

1. Firstly, I want to know how many nights our guests usually stay at our hotel.
2. Secondly, I'm curious what are the most common email domains of our guests.
3. Identify how many regular individual household customers and how many high-volume corporate office accounts we have in our data.

Add code comments to walk the reader through, and mention all the gotchas and data warnings (such as missing values or invalid data). Finally, generate a live dashboard for me to look at the results.
```
前提：Cloud mode 可用；上传文件只含合成数据和最小列。
4. 让 Claude 生成依赖文件。原文在本地首次运行下载的 notebook 时遇到缺少 nbformat、导致 Plotly 图表无法渲染的错误，于是用了 Prompt 2：
```text
Please give me a requirements.txt file with the required packages to run this notebook.
```
5. 下载 notebook 和 requirements.txt 到本地，安装依赖并运行。原文给出的安装命令是：
```bash
pip install -r requirements.txt
```
原文还给出仓库试用命令（需替换占位符）：
```bash
git clone <your-repo-url>
cd <your-repo-folder>
```
然后把 notebook 中的数据路径从合成 CSV 改成真实数据集（原文示例改为 hotel_guest_data.csv），重启 kernel，运行所有单元格。前提：本地有真实数据访问权限；运行前审查代码，确认不会把数据回传。
6. 处理运行错误并核对结果。遇到缺依赖、渲染错误或数据格式问题时，把错误反馈给 Claude 让它补代码或补 requirements；同时检查 notebook 中的数据质量警告（缺失值、无效数据），并按需增删改代码。

注意：原文 README 没有给出完整的 SDV 代码和命令，只描述了 notebook 中的步骤，实际执行需参照仓库 notebook 和 SDV 文档。

## 对应的研究问题
1. 能力发现：原文显示 Claude Code 可承担写 EDA notebook、数据质量检查、住宿晚数分桶、邮箱域名统计、家庭客户与企业账户分类、生成 dashboard、生成 requirements.txt 等工作；重点不是让 AI 直接分析真实数据，而是让它写可检查、可本地运行的代码。
2. 任务匹配：适合需要隐私保护的表格数据分析；工具组合是 Claude Code Cloud mode + SDV + pandas + Plotly + Jupyter。协作方式是 AI 在云端对着合成数据写代码，人在本地对真实数据运行和审查。
3. 条件供给：需要提供合成 CSV、明确的分析问题、库偏好、要求加注释并说明数据警告、要求生成 dashboard；权限上要使用 Cloud mode 并只上传最小列；反馈上要把本地运行错误（如 nbformat 缺失）交回给 Claude。
4. 主动推进：原文没有涉及由时间、事件或状态触发并持续完成的工作，这套流程是人工触发的一次性协作。
5. 效果验证：原文没有给量化指标；可验证的点包括 notebook 能否在本地一次跑通、依赖是否完整、数据质量检查是否覆盖缺失值和无效值、分析结果能否与人工独立计算核对、真实数据是否始终没有上传。

## 与已有做法的关系
清单中已有 Claude Code（状态 adopt）。本文不是新工具，而是 Claude Code 在隐私敏感数据分析中的具体协作流程：用合成数据作为代理，让 Claude Code 写可检查、可本地运行的代码。可作为 Claude Code 条目的场景补充。清单中没有其他相关条目。

## 证据与局限
原文给出的数据/案例：2000 条虚构酒店客人记录、100 行合成代理数据、两个可直接复制的提示词、仓库包含 notebook 和 requirements.txt，并提到 nbformat 缺失导致 Plotly 渲染错误的真实问题。作者主张：数据分析师不需要 AI 直接分析数据，只需要 AI 写可靠代码；即使使用合成数据，也只应共享回答问题所需的最小列。
局限：README 是教程索引，SDV 的完整代码和合成数据质量评估未在文本中给出；100 行合成数据是否足够代表真实分布未验证；GaussianCopula 对复杂关系和高基数字段可能有限；Cloud mode 是产品功能，未来可能变化；没有与人工分析或直接上传真实数据的对照数据；dashboard 的部署和运行细节也不充分。适用条件：单表结构化数据、有 Python/Jupyter 环境、可本地处理数据、Claude Code Cloud 可用。

## 怎么试、怎么验证
最小试用：选一个非关键或已脱敏的单表数据集，按三步走一遍，使用原文 Prompt 1 和 Prompt 2，只上传最小列的合成数据；同时用同一分析问题手写一次 EDA 作为对照。
判断指标：
- 隐私：上传文件是否只含合成数据和最小列；真实数据是否从未离开本地；运行前代码审查是否发现外传行为。
- 效率：从提问到 notebook 在本地跑通的时间；依赖错误数量；人工修改代码的行数。
- 质量：notebook 一次运行成功率；缺失值和无效值检查是否覆盖；核心统计结果与人工独立计算的一致率；图表和 dashboard 是否可复现。
- 可维护性：代码注释是否足够、requirements.txt 是否完整、代码是否易读。
若隐私风险可控、跑通时间明显低于手写、结果核对一致，可扩大试用；若合成数据导致代码对真实数据不适用或需要大量返工，则降级为 study/watch。
