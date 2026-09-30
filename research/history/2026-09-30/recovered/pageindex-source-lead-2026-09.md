# PageIndex：从历史工具结果补回的仓库线索

仓库：[VectifyAI/PageIndex](https://github.com/VectifyAI/PageIndex)。

状态：**已补录来源，尚未独立研读或实测**。整理日期：2026-09-30。

历史检索结果将其描述为 “Document Index for Vectorless, Reasoning-based RAG”，可归入文档索引、文档检索与知识使用研究。这里记录的是当时返回的项目定位，不代表本次确认其实现、效果或维护状态。

## 找到的历史记录

### 2026-09-04（UTC）

来源：`~/.codex/sessions/2026/09/04/rollout-2026-09-04T23-53-45-01a06d20-3fb3-77e2-be46-1bf74024c602.jsonl:343`。

原始工具结果摘录：

```text
VectifyAI/PageIndex	35517	3129	MIT	2026-09-04T15:35:18Z	https://github.com/VectifyAI/PageIndex	📑 PageIndex: Document Index for Vectorless, Reasoning-based RAG
```

### 2026-09-27（UTC）

来源：`~/.omp/agent/sessions/-WebstormProjects-project-rebuild/2026-09-27T03-11-41-180Z_01a0e0d8-d27c-774c-b1b5-5400e9290a2b.jsonl:81`。

原始工具结果摘录：

```text
- [Assess - PageIndex](https://www.thoughtworks.com/radar/tools/summary/pageindex)
```

### 2026-09-28（UTC）

来源：`~/.omp/agent/sessions/-WebstormProjects-project-rebuild/2026-09-28T16-04-29-940Z_01a0e8c2-b674-76e4-94a1-776af44eca4b.jsonl:196`。

原始工具结果摘录：

```text
- [Assess - PageIndex](https://www.thoughtworks.com/radar/tools/summary/pageindex)
```

09-04 的记录是仓库检索结果；09-27 和 09-28 的记录是同一个 Thoughtworks 雷达入口中的 `Assess` 列表项，不算两份独立评价。检索结果中的数字与标签只保留为历史摘录，不作为当前数据。

## 为什么之前漏掉

前两轮主要从用户消息中的链接、主题和助手最终回答恢复材料。PageIndex 出现在工具返回的候选清单中，没有进入已恢复的最终报告，因此未被收录。另一些 `pageIndex` / `getPageIndex` 命中只是分页或 PDF 渲染代码变量，不能算这个仓库的研究记录。

这说明“工具看见过”与“形成了可追溯的资料条目”之间仍有漏项。后续补漏应增加工具结果中的仓库链接和资料标题，但先筛掉代码变量、重复来源与无关日志，不直接归档全部工具输出。

## 后续值得验证的问题

- 对长文档、手册和报告的定位与引用，它能否比现有全文搜索或向量检索更好地支持真实任务？
- 索引构建、文档更新、扫描件处理及模型调用分别需要什么条件和成本？
- 检索错误和遗漏是否可观察，能否回到原文核对证据？

以上是待研究的问题，不是已经验证的能力。本轮没有重新读取该仓库、运行代码或比较检索效果。
