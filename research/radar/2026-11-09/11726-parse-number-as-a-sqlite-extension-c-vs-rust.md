# parse_number() as a SQLite extension: C vs Rust

- 结论：**值得一试**。建议小范围试：把“让 AI 用两种语言实现同一个小工具、实测对比、再针对瓶颈让它重写”的流程，用在自己工作中需要反复做的数据清洗、解析函数上；理由是原文给出了可直接复用的三段提示词和实测数字，但没有附代码与基准脚本，需要自己补齐后才能照做。
- 原文：https://simonwillison.net/2026/Nov/8/sqlite-parse-number-c-vs-rust/
- 来源：rss:src-simon-willison-blog，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T03:00:20.392Z

## 是什么

Simon Willison 的一次实验记录：他用 Claude（Opus 5.5）写一个 SQLite 自定义函数 `parse_number()`，把 `-$1,234.56`、`12.5%` 这类字符串转成可求和、可排序的数值。同一个行为分别用 C 和 Rust（Rusqlite、sqlite-loadable-rs）实现，比较每行耗时、代码复杂度和生成的扩展体积。第一轮 Rust 更快，他再让 Claude 手写 C 解析函数追赶，最终优化后的 C 实现最快（16–19 ns/行）。文中原样给出了三段提示词。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **先固定函数规格**。原文给出的规格是：去掉 `,`、`$`、`£`、`%`，处理前导 `-`，无法解析时返回 `NULL`。前提：你要先能用自己的话把输入、输出、边界条件写清楚，否则后续对比没有共同基准。

2. **第一条提示词：让模型同时给出 C 与 Rust 两版方案并做对比**。前提：使用支持长对话和代码生成的模型（原文为 Claude Opus 5.5 的普通聊天）。

```text
I'm thinking about a SQLite custom function 'parse_number(value)' that strips ',', '$', '£' and '%', handles a leading '-', and returns 'NULL' for anything it can’t parse 

 Explore the difference between building this as a SQLite extension in C v.s. in Rust - I want to compare performance and code complexity and size of the resulting .so (or whatever) file
```

3. **编译扩展并做基准测试**。按两版代码各自编译成 SQLite 可加载扩展，在同样数据上跑 200 万行，记录每行净耗时；数据分三类分别看：混合数据（整数、小数、带符号、带百分号混在一起）、仅整数、仅小数。前提：本机有 C 编译器和 Rust 工具链，能编译 SQLite 扩展；基准脚本原文未给出，需要自己写（构造测试表、循环调用函数、计时、扣除空跑基线）。

4. **根据第一轮结果追加提示词：让模型针对瓶颈重写**。原文第一轮发现 Rust 更快，作者把原因归结为 Rust 中对应 C `strtod` 的实现“快两倍”，于是发出第二条提示词。前提：你要能从基准结果里看出瓶颈在“解析数字”这一层，而不是在 SQLite 调用开销或数据构造上。

```text
Try writing your own C function for parsing text into a decimal number that catches up to or beats the Rust implementation
```

5. **复测四版实现**。把第一版 C、新 C、Rusqlite 版、sqlite-loadable-rs 版放同一张表里横评，同时记录每行耗时和生成的 `.so` 体积。原文数字：C 14 KB，Rusqlite 321 KB，sqlite-loadable-rs 298 KB。

6. **做跨实现一致性校验（模糊测试）**。原文提到四种实现在 800 万次 fuzz 检查中结果一致。可照做的做法是：随机生成大量字符串（含货币符号、千分位、百分号、负号、非法输入），分别喂给四版实现，逐条比对返回值是否完全相同，包括 `NULL` 的情形。前提：先定义好“一致”的判定标准。

7. **（可选）第三条提示词：让模型把调查整理成仓库风格的研究报告**。前提：能访问 `simonw/research` 仓库，并按该仓库的目录结构归档。

```text
Clone simonw/research from GitHub and turn your above investigation into a research report as seen in that repository - you can give me a zip file to download that contains your new folder
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：原文显示，可以直接交给 AI 的工作不只是“写一段代码”，还包括：写 SQLite C 扩展、写 Rust 绑定、设计并执行跨语言基准对比、在得知瓶颈后重写底层解析函数、把整个调查整理成指定仓库格式的报告。
- **任务匹配**：同一任务让模型给出 C 与 Rust 两版实现，用实测数据选型；当某一版明显更慢时，再让模型针对具体瓶颈（`strtod` 等价实现）重写。原文用的工具链是 Claude 聊天、Rusqlite、sqlite-loadable-rs 和 SQLite 扩展机制。
- **条件供给**：需要提供明确的函数规格（字符集、负号、`NULL` 语义）、对比维度（性能、代码复杂度、产物大小）、数据规模（200 万行、三类数据）以及可编译、可跑基准的环境。
- **主动推进**：原文没有涉及由时间、事件或状态触发并持续运行的机制，只描述一次性的对话式实验，因此这一条没有依据。
- **效果验证**：用每行 ns 的基准数据做四实现横评，再加上 800 万次 fuzz 一致性检查，而不是只看“代码能跑”。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

- **原文给出的数据**：扩展体积为 321 KB（Rusqlite）、298 KB（sqlite-loadable-rs）、14 KB（C）；200 万行基准的每行净耗时（ns，越低越好）：混合数据 67 / 19 / 46 / 41；仅整数 25 / 16 / 36 / 32；仅小数 106 / 18 / 55 / 47（依次为第一版 C、新 C、Rusqlite、sqlite-loadable-rs）；800 万次 fuzz 检查四版结果一致。
- **只是作者主张的部分**：Rust 中对应 C `strtod` 的实现“快两倍”——这是解释第一轮为何 Rust 更快的说法，文中没有给出独立验证；代码复杂度也只是定性描述，没有代码行数等量化。
- **局限**：没有附完整代码、基准脚本、编译命令、SQLite 版本和硬件信息；只做了一次实验，属于个案；模型版本为 Opus 5.5，换模型后提示词效果可能变化；“C 最终最快”只在作者给定的数据分布和实现下成立，不能直接外推到其他解析规则或数据形态。

## 怎么试、怎么验证

**最小试用方式**：从自己工作里挑一个反复用 SQL `replace()` 清洗数字的表格，按步骤 2 的提示词让模型生成 C 与 Rust 两版 `parse_number()` 扩展，跑 10 万–200 万行基准，分别记录每行耗时、生成的 `.so` 体积和代码规模；再用几百到几万条随机字符串做跨实现一致性比对。

**判断是否改善的指标**：

1. 每行耗时相对现有 SQL `replace()` 方案的倍数；
2. 按数据分布分桶看（混合、整数、小数），不能只看总体均值；
3. 跨实现 fuzz 结果差异数（应为 0，包括 `NULL` 行为）；
4. 产物体积与部署复杂度（14 KB 对 300 KB 量级）；
5. 代码维护成本（行数、涉及语言、团队能否接手）。

**结论判定**：只有在“解析语义完全一致 + 在目标数据形态上稳定快于现状”同时成立时，才算改善；如果只在某类数据上快，就只在对应查询场景使用，或回到原方案。
