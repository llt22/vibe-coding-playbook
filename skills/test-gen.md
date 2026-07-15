---
description: Generate all test types from an interface design document + code structure. Outputs contract tests (from doc), integration tests (from module call chains), and critical path unit tests (from business rules). One skill, one run, full coverage.
---

# Test Generator（测试生成）

从接口文档 + 代码结构一次性生成三类测试。一个 skill 覆盖全部。

**核心原则：契约测试的 expected 从文档来；集成测试的 expected 从真实模块输出来；单元测试的 expected 从业务规则来。**

## 参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--doc` | 无（必填） | 接口设计文档路径 |
| `--output` | `tests/test_gen.py` | 测试文件输出路径 |
| `--checklist-only` | false | 只输出测试清单，不生成测试 |

## 三类测试，一次生成

| 类型 | 来源 | 验证什么 | 占 bug 拦截率 |
|---|---|---|---|
| **契约测试** | 文档的字段表、JSON 示例、路径、枚举 | 代码跟文档对不对齐 | ~60% |
| **集成测试** | 代码的模块间调用链（A 输出 → B 消费） | 跨模块数据流能不能跑通 | ~25% |
| **单元测试** | 文档的业务规则、边界条件、条件分支 | 关键逻辑对不对 | ~5% |

剩余 ~10% 是部署/环境问题（缺 migration、配置漏、认证没带），测试覆盖不了，靠联调 checklist。

## 执行流程

### 第 1 步：提取测试清单

读取文档 + 扫描代码调用链，生成 `{output}.checklist.yml`。

**a) 契约层（从文档提取）**

逐章节扫描文档，提取可机器验证的契约点：
- JSON 代码块 → fixture（原样搬，不转述）
- 字段表 → 字段集（必填/条件必填分开标）
- HTTP 路径 → 常量断言
- 枚举定义 → 允许值集合
- 编码映射表 → dict

**b) 集成层（从代码提取）**

扫描代码中的模块间数据流：
- 找到"模块 A 产出 dict/对象，模块 B 从中取值"的调用链
- 提取 B 期望的 key 集合
- 生成测试：调用 A 的真实函数，断言输出包含 B 需要的 key

典型模式：
```
service.build_callback_data() → notify_service 取 materials/files/issues
service.create_*() → routes 返回给客户端
converter.convert_*() → service.create_*() 消费
```

**c) 单元层（从文档业务规则提取）**

扫描文档中的业务规则描述：
- 条件必填（如 parseMode=3 时 smartParsePath 必填）
- 枚举约束（如 parseMode 只允许 1/2/3/4）
- 边界值（如材料项上限 50、文件上限 200）
- 状态流转（如 status 只能 pending→running→completed/failed）

### 第 2 步：输出清单摘要

```
测试清单:
  契约测试 (23 个):
    §3.1  解析入参必填字段
    §3.6  解析同步响应字段集 + JSON fixture
    §4.1  解析回调顶层字段 + 9 模块 List
    ...
  集成测试 (8 个):
    extract.build_callback_data → notify 消费
    audit.build_callback_data → notify 消费
    converter → service.create 消费
    ...
  单元测试 (5 个):
    parseMode=3 + 空 smartParsePath → 400
    材料项超 50 → LIMIT_EXCEEDED
    ...
```

### 第 3 步：生成测试代码

从 checklist 机械生成。按类型分区块写入同一个文件：

```python
# ══ 契约测试（from 联调接口设计.md）══════════════════════
# expected 值从文档抄来

def test_extract_submit_response_matches_doc_3_6():
    ...

# ══ 集成测试（from 模块调用链）═══════════════════════════
# 调用真实函数，断言输出结构

def test_build_callback_data_output_consumed_by_notify():
    ...

# ══ 单元测试（from 业务规则）═════════════════════════════
# 验证条件分支和边界

def test_parsemode_3_without_smartparsepath_returns_400():
    ...
```

**生成规则：**

| 契约类型 | 测试模式 |
|---|---|
| `field_set` | `assert required <= schema.model_fields.keys()` |
| `field_set` + `source_json` | seed → 触发 → 捕获 → `assert required <= payload.keys()` |
| `path_constant` | `assert CONSTANT == "文档里的路径"` |
| `enum` | `assert value in allowed_set` |
| `mapping` | `assert doc_keys <= code_keys` |
| `integration` | 调用 A 的真实函数 → `assert B_expected_keys <= output.keys()` |
| `boundary` | 构造边界输入 → `assert raises AppError` 或 `assert result == expected` |
| `condition` | 构造条件输入 → `assert raises / assert not raises` |

### 第 4 步：写入文件 + 跑测试

- 输出为独立文件，覆盖式（旧文件备份 `.bak`）
- checklist YAML 保留供 diff
- 自动跑 `pytest {output} -v`

### 第 5 步：输出报告

```
测试生成完成:
  文档: docs/design/联调接口设计.md
  契约测试: 23 个 (23 passed)
  集成测试: 8 个 (7 passed, 1 failed)
    ✗ test_build_callback_data_keys: notify 期望 errorFileList 但输出没有
  单元测试: 5 个 (5 passed)
  总计: 36 个 (35 passed, 1 failed)
```

## 使用时机

- **拿到接口文档后**：第一件事跑这个 skill，生成红色测试，再写代码让它变绿
- **重构后**：跑一遍确认没偏
- **文档更新后**：重新生成，diff 看哪些测试变了
- **新增模块时**：加入调用链的集成测试
