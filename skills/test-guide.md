---
description: Guide and audit test coverage for a project. Analyzes what tests should exist based on interface docs + code structure, checks what's missing, and tells you what to write next. Does not generate test code — it generates a test plan and gap report.
---

# Test Guide（测试策略指导 + 覆盖检查）

分析项目应该有哪些测试、当前缺什么、下一步该补什么。不生成测试代码——输出测试计划和缺口报告。

## 参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--doc` | 无 | 接口设计文档路径。有则分析契约覆盖；无则只分析代码层 |
| `--check` | false | 只检查现有测试覆盖缺口，不输出完整计划 |

## 四类测试，各有各的 expected 来源

| 类型 | expected 从哪来 | 验证什么 | 什么时候写 |
|---|---|---|---|
| **契约测试** | 接口设计文档 | 代码跟文档字段名、路径、枚举、结构对不对齐 | 拿到文档后，写代码前 |
| **集成测试** | 消费方代码取值的 key | 模块 A 的输出能被模块 B 正确消费 | 写完跨模块调用后 |
| **单元测试** | 业务规则 + 边界条件 | 函数逻辑、计算、分支对不对 | TDD，写代码时同步写 |
| **E2E 测试** | 用户场景 | 整条链路在真实环境跑不跑得通 | 联调前、上线前 |

**核心原则：每类测试的 expected 必须从它的来源取，不能从被测代码取——否则测试和代码一起错。**

## 执行流程

### 第 1 步：扫描现状

**a) 扫描已有测试**

```bash
find tests -name '*.py' -exec grep -l 'def test_' {} \;
```

提取每个测试文件的测试函数名和 docstring，归类：
- 有文档章节引用（如 `§3.6`、`联调接口设计`）→ 契约测试
- 调用了真实 service/converter 函数 → 集成测试
- mock 了依赖只测单函数 → 单元测试
- 发 HTTP 请求 → E2E/冒烟测试

**b) 如果有 `--doc`，扫描文档提取应有的契约点**

- 字段表 → 每个接口应有字段集测试
- JSON 示例 → 每个示例应有 fixture 测试
- 路径常量 → 每个路径应有常量断言
- 枚举定义 → 每个枚举应有允许值测试
- 映射表 → 每个映射应有完整性测试

**c) 扫描代码提取应有的集成测试点**

grep 跨模块 import：
```bash
grep -rn 'from app\.modules\.\([a-z_]*\)\.' app/modules/ --include='*.py'
```

每个 `from app.modules.X import func` 出现在 `app/modules.Y/` 中（X ≠ Y），就是一个跨模块依赖，应有集成测试验证 func 的输出包含 Y 期望的 key。

**d) 扫描代码提取应有的单元测试点**

- 有 `if ... raise AppError` 的校验分支 → 应有边界测试
- 有 `for item in items` + DB 写入的循环 → 应有空列表/单元素/多元素测试
- 有状态流转（`status == "pending"` → `"running"`）→ 应有状态机测试
- 有 hash/加密计算 → 应有确定性输入输出测试

### 第 2 步：输出覆盖报告

```
测试覆盖分析:
  文档: docs/design/联调接口设计.md
  已有测试: 207 个

  ── 契约测试 ──
  应有: 30 个契约点
  已覆盖: 28 个 (test_contract.py + test_contract_gen.py)
  缺口:
    ✗ §4.2 PassageDTO 7 个 openTextId 角色字段 — 无测试
    ✗ §4.2 OtherDTO 字段集 — 无测试

  ── 集成测试 ──
  跨模块依赖: 8 对
  已覆盖: 5 对
  缺口:
    ✗ converter → service.create_*: converter 输出的 CreateExtractRequest 字段集未断言
    ✗ guardian → advancement.try_advance_to_postprocess: 未测试调用参数
    ✗ guardian → notify.enqueue_terminal_notification: 未测试调用参数

  ── 单元测试 ──
  关键分支: 15 个
  已覆盖: 10 个
  缺口:
    ✗ audit converter: parseMode=3 + smartParsePath 未知编码 → AppError
    ✗ extract hashing: bizId 不同 + 内容相同 → hash 不同
    ✗ file_service._sniff_extension: 非 PDF/PNG/JPG 文件 → 返回空

  ── E2E ──
  已有: tests/e2e/run_extract.sh (手动冒烟)
  建议: 联调前跑一遍即可，不需要自动化

  ── 总结 ──
  覆盖最好: 契约测试 (93%)
  最大缺口: 集成测试 (62%)
  下一步建议: 先补 3 个集成测试缺口（跨模块数据流是 bug 高发区）
```

### 第 3 步：输出补测计划

按优先级排序——优先补拦截 bug 概率最高的：

```
补测计划（按优先级）:

1. [集成] converter 输出 → service 消费
   文件: tests/test_integration.py
   验证: convert_external_parse_request 输出的 CreateExtractRequest 包含 service 需要的全部字段
   expected 来源: service.create_extract_request 代码中对 req.X 的取值

2. [契约] PassageDTO openTextId 角色字段
   文件: tests/test_contract.py
   验证: 回调 passageList DTO 包含 openTextIdFirst/Last/Index/Pic/Provide/All
   expected 来源: 联调接口设计 §4.2

3. [单元] file_service._sniff_extension 边界
   文件: tests/test_file_service.py
   验证: GIF/BMP/空文件 → 返回空字符串
   expected 来源: SUPPORTED_EXTENSIONS 常量
```

## `--check` 模式

只输出缺口，不输出完整计划。适合 CI 或 review 前快速检查：

```
/test-guide --check --doc docs/design/联调接口设计.md
```

输出：
```
测试缺口: 5 个
  2 契约 / 3 集成 / 0 单元
  详见上方报告
```

## 使用时机

- **项目初期**：跑一次完整分析，输出测试计划，按优先级逐步补
- **每轮重构后**：跑 `--check` 看有没有新缺口
- **文档更新后**：跑完整分析看契约测试要不要更新
- **code review 前**：跑 `--check` 确认测试覆盖没退化
