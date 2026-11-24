---
name: skill-management
description: Skill 安装和管理规范。安装、卸载或查询任何 skill 前必须先读取本文件。
---

# Skill Management

所有 AI 工具在安装、卸载或查询 skill 时，必须遵守以下规范。

## 目录结构

```
~/skills/                        # 唯一正本，所有 skill 在此创建
  ├── skill-management/          # 本文件
  ├── ai-tool-radar/
  └── ...

~/.claude/skills/                # Claude Code 适配层，仅放符号链接
~/.codex/skills/                 # Codex 适配层，仅放符号链接
~/.agents/skills/                # Agents/OMP 适配层，仅放符号链接
```

## 安装规则

1. skill 正本必须放在 `~/skills/<name>/SKILL.md`。
2. 在**所有**工具目录创建符号链接指向 `~/skills/<name>/`。
3. **禁止**将 skill 文件直接放入工具目录，禁止复制。
4. 每个 skill 都直接注册，不经过路由。

安装示例：

```bash
# 1. 创建 skill
mkdir -p ~/skills/my-skill
# 编写 ~/skills/my-skill/SKILL.md

# 2. 链接到所有工具目录
ln -s ~/skills/my-skill ~/.claude/skills/my-skill
ln -s ~/skills/my-skill ~/.codex/skills/my-skill
ln -s ~/skills/my-skill ~/.agents/skills/my-skill
```

## 多台电脑同步

`~/skills` 本身是私有 git 仓库（github.com/llt22/skills），每台电脑都克隆到 `~/skills`。

- 新增或修改 skill 后提交并推送；其他电脑执行 `git -C ~/skills pull`，链接不用重建。
- 新增 skill 时，其他电脑拉取后还要按上面的步骤在各工具目录建链接。
- 正本在项目仓库里的 skill（例如 api-dashboard），在 `~/skills` 里只放指向项目的链接，并写进 `.gitignore`，各台电脑自己建链接，因为项目路径因机器而异。

## 卸载规则

1. 先删除各工具目录中的符号链接。
2. 再删除 `~/skills/<name>/` 正本，提交并推送。
3. 其他电脑拉取后，删除各工具目录中失效的链接。

## 查询

列出当前所有 skill：

```bash
ls ~/skills/
```

查看某个 skill 的注册情况：

```bash
for dir in ~/.claude/skills ~/.codex/skills ~/.agents/skills; do
  [ -L "$dir/<name>" ] && echo "$dir: linked" || echo "$dir: not linked"
done
```

## 例外

工具厂商自管理的内置 skill（非用户创建）不受此规范约束。
