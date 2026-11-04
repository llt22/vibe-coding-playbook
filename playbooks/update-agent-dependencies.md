# 让智能体配置的依赖更新自动进入 PR 审阅

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：如何把 agent skills、prompts、instructions 的版本更新纳入定期依赖更新和代码审阅，而不是靠手工维护。
> 先试这一步：先确认一个已使用 APM 的仓库里有 `apm.yml`，再在 `.github/dependabot.yml` 中增加指向该目录的 apm 条目并设保守更新计划，只观察一个周期。
> 最近修订：2026-11-04

## 解决什么问题

智能体配置（agent skills、prompts、instructions）常靠手工更新，容易漏版本、缺审阅。调研报告显示，可以在仓库的 `.github/dependabot.yml` 中增加 apm 条目，让 Dependabot 针对 `apm.yml` 中声明的受支持 git 依赖创建版本更新 PR，并在存在 `apm.lock.yaml` 时重新生成锁文件。本篇手册把这个能力落成一个小范围试用流程：先确认 APM 依赖，再配置定期 PR，最后用审阅成本和 PR 质量决定是否推广。

## 适用与不适用

适用：

- 使用 GitHub，已启用或准备启用 Dependabot version updates。
- 仓库已使用 APM，存在 `apm.yml`，其中声明了受支持的 git 依赖。
- 希望把 agent skills、prompts、instructions 的版本更新纳入 PR 审阅，而不是手工追版本。
- github.com 全计划可用；GitHub Enterprise Server 3.24 将提供。

不适用：

- 需要安全更新。该支持只覆盖版本更新，不覆盖安全更新。
- 没有 APM 或没有 `apm.yml` 的仓库。
- 需要原文未给出的完整配置样例、受支持依赖清单或更新质量说明时，先不要大规模推广。
- 团队没有人审阅 PR，或审阅成本不可接受。

## 前置条件

- 一个 GitHub 仓库，且已启用/准备启用 Dependabot version updates。
- 仓库已使用 APM，并存在 `apm.yml`；其中声明的是受支持的 git 依赖。原文只说明支持 “supported git dependencies”，未展开支持范围。
- 可编辑 `.github/dependabot.yml`。
- 能指定包含 `apm.yml` 的目录，并选择一个更新计划（update schedule）。
- 若仓库存在 `apm.lock.yaml`，要接受 Dependabot 在更新时重新生成该锁文件。
- 有明确的 PR 审阅人。

## 操作步骤

先选做法：

- 做法 A：单仓库小范围试用（推荐）。适合第一次验证，风险小。
- 做法 B：先在测试仓库验证 APM 依赖兼容性和 PR 质量，再迁到正式仓库。适合正式仓库关键、APM 依赖较多或团队没有经验的情况。

怎么选：正式仓库不能出错、依赖关系不清楚、或团队第一次接触 APM + Dependabot 时选 B；否则选 A。以下步骤以做法 A 写；选 B 时把第 1 步的仓库换成测试仓库，通过后再在正式仓库重复。

1. 确认仓库已使用 APM，并存在 `apm.yml`，其中声明了受支持的 git 依赖。
前提：仓库确实是 APM 管理的项目。
预期：能找到 `apm.yml`；如果找不到，停止，不要继续加 Dependabot 条目。
注意：不确定某个依赖是否属于受支持范围时，先不要把它当作已支持。

2. 打开或创建 `.github/dependabot.yml`。
前提：仓库使用 GitHub，且已启用/准备启用 Dependabot version updates。
预期：文件可编辑，后续能提交配置。

3. 在该文件中增加一个 apm 条目，指定包含 `apm.yml` 的目录，并选择一个更新计划。
前提：已对照 GitHub 的 Dependabot 配置文档确认字段写法。
预期：配置能提交，Dependabot 能识别该条目。
注意：原文没有给出字段名和完整 YAML 样例，不要照抄不存在的示例；必须按官方 Dependabot 配置文档补全。可以先在团队内部记录一份“配置动作清单”，不要把它当成可运行 YAML：

```
文件：.github/dependabot.yml
新增：apm 条目
必须指定：包含 apm.yml 的目录
必须选择：更新计划（update schedule）
注意：原文未给出字段名和完整 YAML 样例，字段写法需对照 GitHub 的 Dependabot 配置文档补全
```

4. 提交配置后，先只观察一个更新周期。
前提：更新计划已设置，团队有人负责看 PR。
预期：Dependabot 按计划为 `apm.yml` 中声明的受支持 git 依赖创建版本更新 PR。

5. 检查 PR 内容和锁文件。
前提：已经收到 Dependabot 的 PR。
预期：PR 针对的是 `apm.yml` 中声明的受支持 git 依赖；若仓库存在 `apm.lock.yaml`，检查它是否随更新被重新生成。
注意：该支持只覆盖版本更新，不覆盖安全更新。

6. 按正常代码审阅流程处理 PR，并记录成本。
前提：团队有审阅人。
预期：能记录每个 PR 的审阅时间、合并/关闭比例；如果审阅成本不可接受，暂停推广。

7. 根据一个更新周期的结果决定是否扩大范围。
前提：至少走完一个更新周期。
预期：形成结论——继续在更多仓库启用、保持单仓库、或停用并回到手工维护。

## 怎么判断变好了

最小试用方式：选一个已使用 APM 的仓库，在 `.github/dependabot.yml` 中增加 apm 条目，指向 `apm.yml` 所在目录，设置一个较保守的更新计划，先只观察一个更新周期。

可观察指标：

- Dependabot 是否按计划创建版本更新 PR。
- PR 是否只针对 `apm.yml` 中声明的受支持 git 依赖。
- 存在 `apm.lock.yaml` 时，是否被重新生成。
- 每个 PR 的人工审阅时间是否可接受。
- PR 的合并/关闭比例是否可接受。
- 与试用前的手工维护成本相比，是否减少了漏版本和手工追版本。

试多久：先观察一个更新周期；原文没有给出具体天数，按你设置的更新计划走完一个周期为准。原文也没有提供基准数据，需以试用前的手工维护成本作对照。

## 常见坑

- 把“支持版本更新”误当成“支持安全更新”。该支持只覆盖版本更新，不覆盖安全更新。
- 在没有 APM 或没有 `apm.yml` 的仓库里加条目，配置了也不会达到目的。
- 照抄网上或本文不存在的完整 YAML。原文没有给出字段名和完整样例，必须对照 GitHub 的 Dependabot 配置文档补全。
- 目录指错。必须指向包含 `apm.yml` 的目录，而不是想当然的仓库根目录。
- 忽略 `apm.lock.yaml`。存在锁文件时，要检查它是否随更新被重新生成。
- 一次在全组织推广。原文只有入口级说明，缺少受支持依赖清单和更新质量说明，应先小范围验证。
- 只看 PR 数量，不看审阅成本。要记录审阅时间和合并/关闭比例。
- 认为 GitHub Enterprise Server 立刻可用。原文写的是 3.24 将提供；github.com 为全计划可用。

## 证据与来源

- 配置动作“在 `.github/dependabot.yml` 增加 apm 条目、指定包含 `apm.yml` 的目录、设置更新计划”来自本次调研报告《Dependabot version updates support Agent Package Manager》对 GitHub Changelog 产品公告的转述。公告明确：支持 Dependabot version updates；针对 `apm.yml` 中声明的受支持 git 依赖创建 PR；存在 `apm.lock.yaml` 时重新生成；只覆盖版本更新，不覆盖安全更新；github.com 全计划可用；GitHub Enterprise Server 3.24 将提供。
- “先单仓库小范围试用、设保守更新计划、观察一个更新周期、记录审阅时间和合并/关闭比例”是调研报告的建议和本手册的操作化建议，不是公告给出的数据或案例。
- 公告没有给出使用数据、客户案例、效果对比、完整配置示例、受支持依赖清单和更新质量说明。因此本流程只能作为小范围验证，不能直接视为成熟最佳实践。
- “把 agent skills、prompts、instructions 纳入依赖更新流程”来自调研报告对公告的解读；公告本身是产品公告，未提供效果数据。

## 依据的调研

- [Dependabot version updates support Agent Package Manager](../research/radar/2026-11-04/10092-dependabot-version-updates-support-agent-package-m.md)：值得一试，建议小范围试用：在已有 APM 的仓库中给 .github/dependabot.yml 增加 apm 条目，指定 apm.yml 所在目录并设置更新计划，让 Dependabot 定期提 PR 维护 agent skills、prompts 和 instructions；理由是它把智能体配置纳入依赖更新流程，但原文只有入口级说明，需先验证 APM 依赖兼容性和 PR 质量。
