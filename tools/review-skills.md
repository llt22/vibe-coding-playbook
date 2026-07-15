# Review Skills 方案

> 研发链路上的质量检查工具：需求拷问 → 设计文档 review → 架构 review → 代码 review → 验证。每个阶段犯的错不同，发现越晚成本越高。

---

## Skill 概览

| 命令 | 阶段 | 输入 | 检查什么 |
|------|------|------|----------|
| `/grill-me` | 需求 | 口头方案 | 一问一答拷问方案细节，确保共识 |
| `/design-review` | 设计 | 一份设计文档 | 命名、一致性、自包含、完整性、过度设计 |
| `/arch-review` | 架构 | 整个项目代码 | 职责边界、重复耦合、可发现性、分层一致性、API 设计 |
| `/code-review` | 实现 | 代码 diff | 正确性、错误处理、边界、安全、性能 |

触发方式：全部为手动 `/命令名` 触发（放在 `~/.claude/commands/`）。review 是明确的、有成本的动作，不应该 AI 自动判断触发。

---

## `/design-review` — 设计文档 Review

**核心理念：不是检查逻辑对不对，而是检查目标读者拿到文档后能不能不思考就用起来。**

### 工作方式

1. **判断目标读者**：从文档内容推断读者是谁（对接开发者/维护工程师/运维/业务人员），以及拿到文档后要完成什么任务
2. **切换视角**：对每个字段名/状态值做联想测试——第一眼想到什么，跟实际含义一不一致
3. **逐维度检查**：

| 维度 | 关注点 | 锚点示例 |
|------|--------|----------|
| 命名 | 字段名、枚举值、状态值第一眼会不会想到别的 | status 值叫 `reviewed`，读者以为"审核通过了"，实际是"处理完成（可能有问题）" |
| 一致性 | 同一个东西在文档任何地方名字/类型/结构是否一样 | 创建接口 items 是 `[{name, price}]`，查询返回变成 `[{name, price: {amount, currency}}]` |
| 自包含 | 拿到一个数据节点能不能直接用，还是得去别处查 | items 里只有 tagId，要拿 tag 名称得去顶层 tags 数组里查 |
| 完整性 | 照着文档能不能不问任何人就干完活 | 字段表列了 `suggestion`，但所有示例里都是 null，不知道什么时候有值 |
| 过度设计 | 删掉后读者工作是否更简单 | materialItem 三个 status（completed/invalid/no_files），统一成 completed + 看 issues 就够了 |

### 输出格式

```
总览：发现 X 个必须改，Y 个建议改，Z 个确认项

🔴 必须改：位置 / 问题 / 读者会怎么想（第一人称）/ 建议
🟡 建议改：同上
🟢 确认项：不是对错，是取舍
总结：1-2 句话
```

### 反思与教训

这个 skill 从实战中迭代出来，几个关键教训：

1. **AI review 的盲区是易用性**：AI 站在全知视角验证一致性，人站在使用者视角感受易用性。skill 必须显式要求角色切换，不能只说"检查有没有问题"。
2. **抽象规则 + 锚点示例**：纯抽象规则（"检查一致性"）AI 不知道该查多深；纯 checklist 又变成机械打勾。每个维度一个匿名化的例子定深度。
3. **过度设计维度不能缺**：最初没有这个维度，导致 AI 只做加法（"这里应该加个字段"），不做减法（"这个字段删掉更好"）。

### 安装

```bash
# 复制到 Claude Code 全局命令目录
cp design-review.md ~/.claude/commands/design-review.md
```

完整 SKILL 文件见：[design-review.md](../skills/design-review.md)

---

## `/arch-review` — 项目架构 Review

**核心理念：新人接手这个项目，能不能在一天内改出第一个 bug fix？**

### 工作方式

1. **建立全局地图**：扫描目录结构，读入口和配置文件，画出模块地图
2. **切换视角**：假装是刚加入团队的开发者，要改一个功能，从入口追到实现
3. **逐维度检查**：

| 维度 | 关注点 | 锚点示例 |
|------|--------|----------|
| 职责边界 | 每个模块是否有清晰的单一职责 | `utils` 目录里有 300 行业务逻辑——它不是 utils |
| 重复与耦合 | 同样的逻辑是否写了两遍 | extract 和 audit 各自实现了一套 issue 写入，几乎一样 |
| 可发现性 | 能不能通过目录和命名找到想找的代码 | 所有东西都在 `services/`，找"文件下载"得翻十几个文件 |
| 分层一致性 | 路由→服务→数据层是否一致 | 大部分走 route→service→db，但有一个直接在 route 里写 SQL |
| API 设计 | 接口命名/结构是否合理（无文档时从代码审查） | 创建返回 `{orderId}`，查询返回 `{order_id}`——两种命名 |

### 输出格式

```
模块地图：
project/
├── app/api/          — 路由层
├── app/modules/xxx/  — 业务模块
├── ...

🔴 必须改：位置 / 问题 / 新人会怎么被坑 / 建议
🟡 建议改：同上
✅ 做得好的地方
总结：1-2 句话
```

### 安装

```bash
cp arch-review.md ~/.claude/commands/arch-review.md
```

完整 SKILL 文件见：[arch-review.md](../skills/arch-review.md)

---

## `/code-review` — 代码 Review

**核心理念：关注正确性和可维护性，不是风格偏好。**

### 工作方式

1. **确定范围**：按优先级识别——PR > commit > staged > unstaged > selection
2. **理解上下文**：先查调用链和上下游依赖，不要只看 diff 就下结论
3. **逐维度检查**：

| 维度 | 关注点 | 锚点示例 |
|------|--------|----------|
| 正确性 | 边界、并发、类型安全 | 函数假设列表非空取 `items[0]`，但调用方可能传空列表 |
| 错误处理 | 外部调用失败会怎样 | try/except 捕获所有异常但只 log，调用方拿到 None 当成功 |
| 数据一致性 | 事务边界、多表原子性 | 写了两张表，第一张成功第二张失败，数据不一致 |
| 安全 | 输入校验、硬编码密钥 | — |
| 向后兼容 | 接口签名/返回值变化 | — |
| 性能 | N+1、循环内 IO | — |

**不要提**：纯风格偏好、"可以更优雅"、linter 能处理的问题。

### 输出格式

```
总览：发现 X 个必须修复，Y 个建议修复

🔴 必须修：文件:行号 / 问题 / 失败场景 / 建议修法
🟡 建议改：同上
✅ 没问题的部分：列出 review 了哪些文件
```

### 安装

```bash
cp code-review.md ~/.claude/commands/code-review.md
```

完整 SKILL 文件见：[code-review.md](../skills/code-review.md)

---

## Skill 文件

为方便直接安装，完整的 SKILL 文件放在 `skills/` 目录下：

```
vibe-coding-playbook/
├── tools/
│   ├── agent-tools.md          # 外部工具（Context7/Tavily/OMP 等）
│   └── review-skills.md        # 本文件：review skills 说明
└── skills/
    ├── design-review.md        # /design-review 完整 prompt
    ├── arch-review.md          # /arch-review 完整 prompt
    └── code-review.md          # /code-review 完整 prompt
```

安装全部 review skills：

```bash
cp skills/design-review.md ~/.claude/commands/
cp skills/arch-review.md ~/.claude/commands/
cp skills/code-review.md ~/.claude/commands/
```
