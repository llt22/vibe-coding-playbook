# 把私有名称交给模型前先做别名替换

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在把私有名称、公司信息交给模型前，用配置好的别名替换它们，并在本地工具执行前还原，从而降低上下文泄露面。
> 先试这一步：先不要写真实姓名/公司，直接用示例里的虚构映射跑通建配置、装插件、`/reload-plugins` + `/my-privacy-status` 的流程。
> 最近修订：2026-10-07

## 解决什么问题

把私有名称、公司信息交给模型前，用配置好的别名替换它们；在本地工具真正执行前，再把别名还原成原始信息；对工具返回的文本做脱敏。作者明确声明：它只处理配置过的词条，不是通用 PII 检测器；未配置的信息和未支持的内容可能保持不变；仓库内不含任何真实映射，插件本身不调用模型、也不走网络检测服务。

## 适用与不适用

适用：Claude Code 用户，在把私有名称/公司信息送给模型前想加一层术语级别名替换与工具执行前还原。已验证环境是 macOS + Claude Code 2.1.290。

不适用：把它当通用 PII 检测器；指望它保护未配置的词条；把它当兜底防线（它不调用模型、不做网络检测）；换版本或换平台不重新验证；需要明确开源许可证或二次分发合规性的场景（项目尚无开源许可证，清单标注 `UNLICENSED`）。

## 前置条件

- `claude` 命令可用。
- 以下命令均在仓库根目录执行。
- 真实信息只能写在仓库之外。
- 配置文件目录权限 `700`，配置文件权限 `600`。
- 已验证组合：macOS + Claude Code 2.1.290。

## 操作步骤

**做法 A 与做法 B 怎么选**：做法 A 是先用示例里的虚构映射跑通全流程；做法 B 是确认行为后再把真实信息写进仓库外的配置文件。除非你已经很熟悉这套插件，否则先 A 后 B。

1. 创建私有配置（做法 A：用虚构示例）

前提：在仓库根目录；`claude` 命令可用。下面的复制命令不会覆盖已存在的文件。

```sh
mkdir -p "$HOME/.config/claude-my-privacy"
chmod 700 "$HOME/.config/claude-my-privacy"
if [ ! -e "$HOME/.config/claude-my-privacy/mappings.json" ]; then
  cp -n examples/mappings.example.json "$HOME/.config/claude-my-privacy/mappings.json"
fi
chmod 600 "$HOME/.config/claude-my-privacy/mappings.json"
```

预期结果：仓库外生成 `mappings.json`，目录权限 `700`、文件权限 `600`。示例配置使用的虚构映射为：陈星河 → 陈瑞恩，`chenxinghe` → `ryanchen`，云杉智科 → 海岚数科，`cedarbyte` → `harborwave`。格式、大小写处理与别名选择见 `docs/user/configuration.md`。

2. 安装插件

前提：仍在仓库根目录，`claude` 命令可用。

```sh
claude plugin marketplace add "$PWD" --scope user
claude plugin install my-privacy@my-privacy-marketplace --scope user
```

预期结果：插件以 `--scope user` 用户级安装。注意：`install.py` 会额外改动插件顺序、禁用指定的 compaction 插件、写入遥测相关设置；日常安装请用上面的 CLI 命令。

3. 确认配置生效

在 Claude Code 会话里依次执行：

```text
/reload-plugins
/my-privacy-status
```

判定标准：

- 配置非空且加载成功时，状态里出现 `Configuration: loaded`，且 `mappings` 计数大于 0；
- `loaded; mappings: 0` 表示词条列表为空（等于没保护）；
- `unavailable` 或 `invalid` 表示替换未生效。

各状态的处理步骤见 `docs/user/troubleshooting.md`。注意：状态命令不显示词条列表，插件也没有常驻状态栏。

4. 用虚构邮箱做端到端验证

前提：已按第 1–3 步完成配置和加载。

做法：发一条含虚构邮箱 `staff42@cedarbyte.example` 的请求，让模型回显它，再让 Write/Bash 用它落一个文件，观察两侧显示的差异。

预期结果：模型侧看到的是 `staff42@harborwave.example`，而真正执行工具时被还原为 `staff42@cedarbyte.example`。插件还会尝试还原 Write、Edit、Bash 写文件时用到的执行参数；支持的助手回复显示会尝试展示原文，但不修改已存储的会话文本或模型上下文。

5. 换成真实信息（做法 B）

前提：第 4 步端到端验证通过。

做法：把真实信息写进 `$HOME/.config/claude-my-privacy/mappings.json`（仓库外），然后重新执行 `/reload-plugins` 和 `/my-privacy-status`。

预期结果：状态仍为 `loaded` 且 `mappings` 计数大于 0。注意：插件每次加载只读一次配置，所以每次修改私有配置后都要重新执行 `/reload-plugins`，再用 `/my-privacy-status` 检查。

6. 日常使用与诊断

照常输入请求、照常使用工具即可。诊断用 `/my-privacy-audit`，它只保留结构性元数据，不含命令或正文文本。

7. 更新

前提：更新源码并递增插件版本后。

```sh
claude plugin update my-privacy@my-privacy-marketplace --scope user
```

然后在活动会话里再次执行 `/reload-plugins` 和 `/my-privacy-status`。注意：源码目录即 marketplace 安装源，运行副本在 Claude 插件缓存中；如果移动了源码目录，需要重新注册 marketplace 路径。

## 怎么判断变好了

- 正向指标：`/my-privacy-status` 显示 `Configuration: loaded` 且 `mappings` 计数 > 0；模型侧看到的是别名，工具实际执行/落盘的是原名；`/my-privacy-audit` 里只有结构元数据、看不到命令与正文。
- 负向指标（视为未生效）：状态为 `unavailable` / `invalid`，或 `loaded; mappings: 0`；把未配置的真实敏感词丢进请求，模型输入里仍然原样出现（这正是它声明不覆盖的范围，用来确认边界而不是当成 bug）。
- 成本侧：配置改一次就要 `/reload-plugins` 一次的额外操作次数；以及因 best-effort 漏替换而需要人工复核的次数。
- 最小试用：原文给出的建议顺序是——先不要写真实姓名/公司，直接用示例里的虚构映射（陈星河 → 陈瑞恩、`cedarbyte` → `harborwave` 等）跑通全流程；按第 1–3 步建配置、装插件、`/reload-plugins` + `/my-privacy-status`；发一条含虚构邮箱 `staff42@cedarbyte.example` 的请求，让模型回显它，再让 Write/Bash 用它落一个文件，观察两侧显示的差异；确认行为后再把真实信息写进 `$HOME/.config/claude-my-privacy/mappings.json`（仓库外），重跑 `/reload-plugins` + `/my-privacy-status`。
- 试多久：原文未给出固定时长；可参照的最小验证单位是上述一条“配置→加载→模型侧回显→工具侧落盘”的完整链路，外加一次 `/my-privacy-status` 和一次 `/my-privacy-audit`。

## 常见坑

- 改完配置忘记 `/reload-plugins`：插件每次加载只读一次配置，不重载就还是旧的。
- 把 `loaded; mappings: 0` 当成已保护：这表示词条列表为空，等于没保护。
- 把它当通用 PII 检测器：它只处理配置过的词条，未配置的信息和未支持的内容可能保持不变。
- 用 `install.py` 做日常安装：它会额外改动插件顺序、禁用指定的 compaction 插件、写入遥测相关设置。
- 把真实信息写进仓库：真实信息只能写在仓库之外。
- 换平台或换版本不重新验证：仅在 macOS + Claude Code 2.1.290 验证过，见 `verification/README.md`。
- 指望它锁定会话或做兜底：替换是 best-effort、无白名单、失败不锁会话；它不调用模型、不走网络检测。
- 忽略许可证状态：项目尚无开源许可证，插件清单标注 `UNLICENSED`，长期使用与二次分发的合规性不明。

## 证据与来源

- 本次合并的调研报告：`jinrunsen/claude-my-privacy`。原文给出的数据/事实：插件版本 0.5.0；仓库 35 stars（来自抓取指标）；在 macOS + Claude Code 2.1.290 上，离线工具与终端显示检查已通过；示例配置含 4 组虚构映射，可据此复现行为；明确的命令与状态返回值（`loaded; mappings: 0` / `unavailable` / `invalid`）；项目尚无开源许可证，插件清单标注 `UNLICENSED`。
- 与已有做法的关系：清单中有 Claude Code（kind: tool，status: adopt）。本条目是 Claude Code 的一个插件，属于在已采用的宿主上补“条件供给／隐私边界”的一层，不替代 Claude Code，而是叠加在它的模型输入与工具执行链路上。
- 只是作者主张、原文自己也弱化的部分：替换是 best-effort，不做保证；没有命令或邮箱白名单；替换失败时不锁定会话；对助手回复显示的还原用的是 “attempts to restore”，且不改动已存储的会话文本或模型上下文。
- 适用条件与风险：只保护配置过的词条，未配置信息和未支持内容可能原样进入模型上下文；不调用模型、不做网络检测，所以它不是兜底防线；仅在 macOS + Claude Code 2.1.290 验证过，换版本或换平台需重新验证（见 `verification/README.md`）；无开源许可证，长期使用与二次分发的合规性不明；`install.py` 有额外副作用（改插件顺序、禁用 compaction 插件、写遥测设置），不要拿它当常规安装脚本。

## 依据的调研

- [jinrunsen/claude-my-privacy](../research/radar/2026-10-07/1687-jinrunsen-claude-my-privacy.md)：值得一试，值得在 Claude Code 上小范围试用：它给出了可直接照抄的配置目录、安装、状态校验和更新命令，能在把私有名称/公司信息交给模型前替换为别名、本地执行前还原，从而降低上下文泄露面；但替换是 best-effort、无白名单、失败不锁会话，且仅在 macOS + Claude Code 2.1.290 验证过、无开源许可证，所以先按虚构示例跑通再换真实信息。
