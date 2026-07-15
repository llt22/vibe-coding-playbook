---
description: Review code changes for correctness, error handling, edge cases, and maintainability. Use when the user wants to review source code or a diff. If the user explicitly asks to review a design document or API spec, use design-review instead.
---

# 代码 Review

你正在 review 代码变更。关注**正确性和可维护性**，不是风格偏好。

## 第一步：确定 Review 范围

按以下优先级自动识别要 review 的代码：

1. 用户指定了 PR → `gh pr diff <number>`
2. 用户指定了 commit → `git diff <commit>~1 <commit>`
3. 用户说"上一个 commit" → `git diff HEAD~1`
4. 有 staged changes → `git diff --cached`
5. 有 unstaged changes → `git diff`
6. 用户选中了代码（IDE selection）→ 直接使用选中内容
7. 以上都没有 → 问用户要 review 什么

## 第二步：理解上下文

拿到 diff 后，**先检索变更文件的调用链和上下游依赖，再开始检查**：

- 搜索被改动的函数/类/字段的调用方和被调用方
- 对照变更前后的行为差异
- 阅读相邻实现、测试文件、配置文件和相关文档

不要只看 diff 本身就下结论。

## 第三步：逐维度检查

### 正确性

逻辑在边界情况和并发场景下是否仍然正确？

关注：空值/空列表/None/零/负数/超长字符串；竞态条件、重复提交、中途失败；类型注解和运行时类型是否一致。

> 例：一个函数假设列表非空直接取 `items[0]`，但调用方在某个分支下会传空列表——diff 里看不出来，得查调用方才知道。

### 错误处理

外部调用失败时会发生什么？

关注：DB/HTTP/文件 IO 有没有错误处理；异常是显式暴露还是被静默吞掉（空 catch）；失败路径会不会导致数据不一致（半写入）；错误信息是否足够定位问题。

> 例：try/except 捕获了所有异常但只 log 了一行，调用方拿到 None 返回值当成功处理——静默失败，数据已经写了一半。

### 数据一致性

多步操作的原子性有没有保证？

关注：事务边界对不对；多表操作有没有原子性保证；缓存和 DB 的一致性。

### 安全

有没有引入安全风险？

关注：用户输入校验；硬编码密钥/密码；SQL 注入、路径穿越、SSRF。

### 向后兼容

变更是否破坏了现有的接口契约或外部依赖？

关注：公开 API 的签名/返回值变化；数据库 schema 变更是否需要迁移；配置项变更是否向后兼容。

### 性能（仅关注明显退化）

有没有引入明显的性能问题？

关注：N+1 查询；循环内的重复 IO；无必要的全表扫描；大数据量下的内存膨胀。

**不要提**：纯风格偏好（引号、空行、import 顺序）、"可以更优雅"类建议、当前复杂度不需要的抽象、linter/formatter 能处理的问题。

## 输出格式

### 总览

一句话概括：`发现 X 个必须修复，Y 个建议修复`（数量为 0 的级别省略）。如果没发现问题，直接输出「无问题」。

### 🔴 必须修（会导致 bug、安全漏洞或数据问题）

每条包含：
- **文件:行号**
- **问题**：一句话
- **失败场景**：具体什么输入/状态会触发
- **建议修法**

### 🟡 建议改（不会立即出错但有隐患）

同上格式。

### ✅ 没问题的部分

简要说明 review 了哪些文件、关注了哪些逻辑，确认没发现问题。避免让人以为只看了有问题的部分。
