---
description: Generate contract tests from an interface design document. First extracts a structured contract checklist (YAML) for review, then generates tests where expected values come from the document — not the code. Use before implementing or after refactoring to catch doc-code drift.
---

# Contract Test Generator（契约测试生成）

从接口设计文档生成契约测试。分两步：先提取结构化契约清单，确认完整后再生成测试。

**核心原则：expected 值从文档来，不从代码来。**

## 参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--doc` | 无（必填） | 接口设计文档路径 |
| `--output` | `tests/test_contract_gen.py` | 测试文件输出路径 |
| `--checklist-only` | false | 只输出契约清单，不生成测试 |

## 执行流程

### 第 1 步：提取契约清单

读取文档，将每个可测试的契约点提取为结构化 YAML，保存到 `{output}.checklist.yml`。

提取规则——**只提取可机器验证的**，跳过描述性文字：

**a) JSON 示例 → fixture**
文档中每个 ```json 代码块，直接作为 expected fixture。不让 AI 理解后转述，原样搬。

**b) 字段表 → 字段集**
文档中每个"| 字段 | 类型 | 必填 |"表格，提取字段名列表。必填标"是"的单独标记。

**c) 路径常量**
文档中每个 HTTP 路径（如 `POST /teceval/api/v1/.../saveCallbackData`），提取为常量断言。

**d) 枚举值**
文档中每个枚举定义（如 `TRANSFER_SUCCESS / TRANSFER_FAILED`、`hard / review / soft`），提取为允许值集合。

**e) 映射表**
文档中每个编码映射表（如 smartParsePath 编码 → 业务表），提取为 dict。

输出格式示例：

```yaml
# 自动提取自: docs/design/联调接口设计.md
# 提取时间: 2026-07-16

contracts:
  - id: extract-submit-response
    section: "§3.6"
    type: field_set
    source_json: |
      {"applyGuid": "...", "parseMode": 1, "localConversationGuid": "...", "status": "pending", "inputSummary": {"materialItemCount": 8, "fileCount": 12}}
    required_fields: [applyGuid, parseMode, localConversationGuid, status, inputSummary]

  - id: extract-callback-top-fields
    section: "§4.1"
    type: field_set
    required_fields: [applyGuid, conversationGuid, localConversationGuid, status, logInfo, opinion, parseMode, errorFileList]
    conditional_fields: [examList, otherList, passageList, socialList, scienceList, qualificationList, studyList, beforeList, summarizeList]

  - id: extract-callback-path
    section: "§一 #6"
    type: path_constant
    value: "/teceval/api/v1/tecevalDifyConversation/saveCallbackData"

  - id: severity-enum
    section: "§9.3"
    type: enum
    allowed: [hard, review, soft]

  - id: smartparsepath-codes
    section: "§8.1"
    type: mapping
    entries: {"1": "考试", "2": "考试", "3": "考试", "4": "学位学历", ...}
```

### 第 2 步：输出清单供确认

在终端输出契约清单摘要：

```
提取了 15 个契约点:
  §3.1  extract 入参必填字段 (3 个)
  §3.6  extract 同步响应字段集 (5 个) + JSON fixture
  §4.1  extract 回调顶层字段 (8 必填 + 9 条件)
  §4.2  ExamDTO 字段 (9 个)
  ...
  §9.3  问题码枚举 (22 个)

缺失检查:
  ⚠ §4.2 PassageDTO 有 7 个 openTextId 角色字段，已提取
  ⚠ §5.1 parseMode=3 条件必填 smartParsePath，已提取

是否有遗漏？（按 --checklist-only 查看完整 YAML）
```

### 第 3 步：生成测试

从 checklist YAML 逐条生成测试。**生成规则是机械的，不需要 AI 判断**：

| 契约类型 | 测试模式 |
|---|---|
| `field_set` | `assert required - schema.model_fields.keys() == set()` |
| `field_set` + `source_json` | 集成测试：seed → 触发 → 捕获 → `assert required <= payload.keys()` |
| `path_constant` | `assert CONSTANT == "文档里的路径"` |
| `enum` | `assert value in allowed_set` |
| `mapping` | `assert doc_keys <= code_keys` |

每个测试函数名：`test_{id}_matches_doc_{section}`
每个 docstring：`联调接口设计 {section} {描述}`

### 第 4 步：写入文件

- 输出为独立文件（默认 `tests/test_contract_gen.py`），不追加到已有测试
- 如果目标文件已存在，对比差异后覆盖（旧文件备份为 `.bak`）
- checklist YAML 保留在 `{output}.checklist.yml`，下次重新生成时可 diff

### 第 5 步：跑测试 + 输出报告

```bash
uv run pytest {output} -v
```

```
契约测试生成完成:
  文档: docs/design/联调接口设计.md
  契约点: 15 个
  生成测试: 15 个
  通过: 13
  失败: 2
    ✗ test_extract_submit_response_matches_doc_3_6: 缺少 parseMode
    ✗ test_callback_dto_has_order_number: ExamDTO 缺少 orderNumber
```

## 与手写契约测试的关系

- 手写的 `test_contract.py` 是人工编写的高价值测试，保留不动
- 本 skill 生成的 `test_contract_gen.py` 是从文档机械提取的全量覆盖
- 两者互补：手写的更精准（有 seed 数据 + 集成验证），生成的更全面（不漏章节）
- 有重叠时以手写为准，生成的标 `# covered by test_contract.py` 跳过
