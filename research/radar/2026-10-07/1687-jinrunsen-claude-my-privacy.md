# jinrunsen/claude-my-privacy

- 结论：**值得一试**。值得在 Claude Code 上小范围试用：它给出了可直接照抄的配置目录、安装、状态校验和更新命令，能在把私有名称/公司信息交给模型前替换为别名、本地执行前还原，从而降低上下文泄露面；但替换是 best-effort、无白名单、失败不锁会话，且仅在 macOS + Claude Code 2.1.290 验证过、无开源许可证，所以先按虚构示例跑通再换真实信息。
- 原文：https://github.com/jinrunsen/claude-my-privacy
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-06T23:45:43.564Z

## 是什么

`claude-my-privacy` 是一个 Claude Code 插件（仓库名 `claude-my-privacy`，安装标识 `my-privacy@my-privacy-marketplace`，命令统一用 `/my-privacy-` 前缀，当前版本 0.5.0）。它的行为链条是：

1. 在送往模型的输入文本里，把配置好的名称/公司信息替换为别名；
2. 在本地工具真正执行前，把别名还原成原始信息；
3. 对工具返回的文本做脱敏（redact）；
4. 尝试在支持的助手回复显示中还原别名。

作者明确声明：**它只处理配置过的词条，不是通用 PII 检测器**；未配置的信息和未支持的内容可能保持不变；仓库内不含任何真实映射，插件本身不调用模型、也不走网络检测服务。

## 具体做法

前提：先确认 `claude` 命令可用；以下命令均在**仓库根目录**执行；真实信息只能写在仓库之外。

### 1. 创建私有配置

把虚构示例复制到仓库外的私有目录，再改成自己的映射。下面的复制命令**不会覆盖已存在的文件**。

```sh
mkdir -p "$HOME/.config/claude-my-privacy"
chmod 700 "$HOME/.config/claude-my-privacy"
if [ ! -e "$HOME/.config/claude-my-privacy/mappings.json" ]; then
  cp -n examples/mappings.example.json "$HOME/.config/claude-my-privacy/mappings.json"
fi
chmod 600 "$HOME/.config/claude-my-privacy/mappings.json"
```

示例配置使用的虚构映射为：陈星河 → 陈瑞恩，`chenxinghe` → `ryanchen`，云杉智科 → 海岚数科，`cedarbyte` → `harborwave`。格式、大小写处理与别名选择见 `docs/user/configuration.md`。

### 2. 安装插件

把当前目录注册为本地 marketplace，再安装插件：

```sh
claude plugin marketplace add "$PWD" --scope user
claude plugin install my-privacy@my-privacy-marketplace --scope user
```

### 3. 确认配置生效

在 Claude Code 会话里依次执行：

```text
/reload-plugins
/my-privacy-status
```

判定标准：
- 配置非空且加载成功时，状态里出现 `Configuration: loaded`，且 `mappings` 计数大于 0；
- `loaded; mappings: 0` 表示词条列表为空（等于没保护）；
- `unavailable` 或 `invalid` 表示替换未生效。

各状态的处理步骤见 `docs/user/troubleshooting.md`。注意：状态命令**不显示词条列表**，插件也没有常驻状态栏。

### 4. 日常使用

照常输入请求、照常使用工具即可。例如在示例配置下，模型侧看到的是 `staff42@harborwave.example`，而真正执行工具时被还原为 `staff42@cedarbyte.example`。插件还会尝试还原 Write、Edit、Bash 写文件时用到的执行参数；支持的助手回复显示会尝试展示原文，但**不修改**已存储的会话文本或模型上下文。

每次修改私有配置后，都要重新执行 `/reload-plugins`，再用 `/my-privacy-status` 检查——插件每次加载只读一次配置。诊断用 `/my-privacy-audit`，它只保留结构性元数据，不含命令或正文文本。

### 5. 更新

更新源码并递增插件版本后，在终端执行：

```sh
claude plugin update my-privacy@my-privacy-marketplace --scope user
```

然后在活动会话里再次执行 `/reload-plugins` 和 `/my-privacy-status`。源码目录即 marketplace 安装源，运行副本在 Claude 插件缓存中；如果移动了源码目录，需要重新注册 marketplace 路径。

注意：`install.py` 会额外改动插件顺序、禁用指定的 compaction 插件、写入遥测相关设置；日常安装请用上面的 CLI 命令。

## 对应的研究问题

- **能力发现**：揭示了一类平时不会想到交给 AI 的边缘工作——「给送给模型的文本做术语级别名替换、给工具返回做脱敏」，这是在模型输入/工具执行边界上做数据最小化，而不是让模型干活。
- **任务匹配**：适合 Claude Code 这一宿主 + 本地插件机制；插件以本地 marketplace 方式注册，`--scope user` 用户级生效。不属于「换模型」类匹配，而是宿主扩展。
- **条件供给**：这是本条目最实的一块。需要提供的信息是 `mappings.json` 词条映射（姓名、公司、域名、邮箱）；需要的权限是配置文件目录 `700`、配置文件 `600`；需要的工具是 `claude` 命令；反馈通道是 `/my-privacy-status` 看加载状态与 mappings 计数、`/my-privacy-audit` 做结构级诊断。改配置后必须 `/reload-plugins`（只在加载时读一次配置）。
- **主动推进**：较弱但对得上「事件触发」——替换在每次模型输入与工具执行事件上自动发生，无需人工逐次操作。原文没有提到时间触发或状态驱动的持续任务。
- **效果验证**：给了可判定的状态信号（`loaded` + `mappings > 0` vs `mappings: 0` / `unavailable` / `invalid`），以及一条可观察的端到端案例（模型侧 `harborwave`，工具执行侧 `cedarbyte`）。审计命令只留结构元数据、不留命令与正文，这本身也是一种可验证的设计约束。

## 与已有做法的关系

清单中有 **Claude Code**（kind: tool，status: adopt）。本条目就是 Claude Code 的一个插件，属于在已采用的宿主上补「条件供给／隐私边界」的一层，不替代 Claude Code，而是叠加在它的模型输入与工具执行链路上。

## 证据与局限

**原文给出的数据/事实：**
- 插件版本 0.5.0；仓库 35 stars（来自抓取指标）；
- 在 macOS + Claude Code **2.1.290** 上，离线工具与终端显示检查已通过；
- 示例配置含 4 组虚构映射，可据此复现行为；
- 明确的命令与状态返回值（`loaded; mappings: 0` / `unavailable` / `invalid`）；
- 项目**尚无开源许可证**，插件清单标注 `UNLICENSED`。

**只是作者主张、原文自己也弱化的部分：**
- 替换是 **best-effort**，不做保证；
- **没有命令或邮箱白名单**；
- **替换失败时不锁定会话**；
- 对助手回复显示的还原用的是「attempts to restore」，且不改动已存储的会话文本或模型上下文。

**适用条件与风险：**
- 只保护配置过的词条，未配置信息和未支持内容可能原样进入模型上下文；
- 不调用模型、不做网络检测，所以它不是兜底防线；
- 仅在 macOS + Claude Code 2.1.290 验证过，换版本或换平台需重新验证（见 `verification/README.md`）；
- 无开源许可证，长期使用与二次分发的合规性不明；
- `install.py` 有额外副作用（改插件顺序、禁用 compaction 插件、写遥测设置），不要拿它当常规安装脚本。

## 怎么试、怎么验证

**最小试用（建议顺序）：**
1. 先**不要**写真实姓名/公司，直接用示例里的虚构映射（陈星河 → 陈瑞恩、`cedarbyte` → `harborwave` 等）跑通全流程；
2. 按上面第 1–3 步建配置、装插件、`/reload-plugins` + `/my-privacy-status`；
3. 发一条含虚构邮箱 `staff42@cedarbyte.example` 的请求，让模型回显它，再让 Write/Bash 用它落一个文件，观察两侧显示的差异；
4. 确认行为后再把真实信息写进 `$HOME/.config/claude-my-privacy/mappings.json`（仓库外），重跑 `/reload-plugins` + `/my-privacy-status`。

**判断有没有改善的指标：**
- 正向：`/my-privacy-status` 显示 `Configuration: loaded` 且 `mappings` 计数 > 0；模型侧看到的是别名，工具实际执行/落盘的是原名；`/my-privacy-audit` 里只有结构元数据、看不到命令与正文。
- 负向（视为未生效）：状态为 `unavailable` / `invalid`，或 `loaded; mappings: 0`；把未配置的真实敏感词丢进请求，模型输入里仍然原样出现（这正是它声明不覆盖的范围，用来确认边界而不是当成 bug）。
- 成本侧：配置改一次就要 `/reload-plugins` 一次的额外操作次数；以及因 best-effort 漏替换而需要人工复核的次数。
