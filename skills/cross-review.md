---
description: Multi-model cross-review via model-router. Runs the same review skill across multiple LLMs in parallel, then cross-references findings with voting. Depends on model-router for discovery and invocation.
---

# Cross-Review（多模型交叉 Review）

通过 model-router 的 OMP 通路并发调用多个外部模型执行同一份 review，然后交叉比对，输出合并报告。

**前置依赖**：model-router skill（模型发现 + OMP 调用规范）。

## 参数

从用户输入中提取（未指定则用默认值）：

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--skill` | `code-review` | review skill 名：`code-review`、`arch-review`、`design-review` |
| `--models` | 自动发现后取 3-4 个差异化最大的 | 逗号分隔的模型 selector（provider/model 全名） |
| `--scope` | 自动检测 | diff 范围：PR 号、commit、分支名 |

## 执行流程

### 1. 模型发现

按 model-router 的 discovery 流程探测可用模型：

```bash
omp models list --json
```

从结果中选取 3-4 个差异化模型（不同 provider、不同架构）。用户指定 `--models` 时跳过发现，直接用指定列表。`--model` 参数必须用 `provider/model` 全名（selector）。

### 2. 确定 diff 范围

按以下优先级：
1. 用户指定了 `--scope PR#<number>` → `gh pr diff <number>`
2. 用户指定了 commit → `git diff <commit>~1 <commit>`
3. 在非默认分支上 → `git diff <default-branch>...HEAD`
4. 有 staged/unstaged changes → `git diff`
5. 以上都没有 → 问用户

保存 diff 和 stat：
```bash
git diff <range> > /tmp/cross-review-diff.patch
git diff <range> --stat > /tmp/cross-review-stat.txt
```

可根据项目情况排除生成文件、迁移脚本、测试等（如 Python 项目排除 `alembic/`、`tests/`）。

### 3. 生成输入

拼接 `/tmp/cross-review-input.md`：

```markdown
# {Skill} Review

{diff stat 生成的变更概要}

## 完整 Diff

{diff 内容}
```

`arch-review` 额外追加项目源码目录结构树。

skill 内容不混入输入——通过 `@` 语法独立传入，保持输入中立。

### 4. 并发调用

按 model-router 的 Task Package Requirements，构造调用。OMP 可并发，用 `nohup` 保活：

```bash
mkdir -p docs/review
DATE=$(date +%Y%m%d)

for model in <model-list>; do
  short=$(echo $model | sed 's|.*/||')
  nohup omp -p --no-session --cwd "$PWD" \
    --model "$model" \
    @~/.claude/commands/{skill-name}.md \
    @/tmp/cross-review-input.md \
    2>/dev/null > "docs/review/${short}-{skill-type}-${DATE}.md" &
done
```

### 5. 等待 + 检查

轮询或 Monitor 等待所有 omp 进程结束。检查每个输出文件：
- 非空 → 成功
- 空文件 → 标记该模型失败，记入报告

### 6. 交叉比对

读取所有模型输出，提取 🔴 和 🟡 发现，执行去重和投票：

**去重**：两个 finding 算同一问题——指向同一文件同一段逻辑，描述同一个 bug/风险（不要求行号和措辞完全一致）。

**投票**：
- **Confirmed**：≥2 个模型独立命中
- **Needs Verify**：仅 1 个模型命中

**验证**：对所有 Confirmed 和看起来合理的 Needs Verify，读取源码验证真伪。外部模型的 findings 是 candidates，不是 facts（model-router 原则）。

### 7. 输出合并报告

保存到 `docs/review/cross-review-{skill-type}-{YYYYMMDD}.md`，同时在终端输出：

```markdown
# Cross-Review 合并报告

**模型**: {model1}, {model2}, {model3}
**Skill**: {skill-name}
**Scope**: {branch} ({N} files, +{ins}/-{del})
**日期**: {YYYY-MM-DD}

## 🔴 Confirmed（≥2 模型命中，已验证）

| # | 问题 | 文件 | 命中模型 | 验证结果 |
|---|---|---|---|---|

## 🟡 Needs Verify（仅 1 模型命中）

| # | 问题 | 文件 | 来源模型 | 验证结果 |
|---|---|---|---|---|

## ✅ 共识无问题

## 📋 各模型原始报告

- [{model1}]({model1}-{skill-type}-{date}.md)
- [{model2}]({model2}-{skill-type}-{date}.md)
```
