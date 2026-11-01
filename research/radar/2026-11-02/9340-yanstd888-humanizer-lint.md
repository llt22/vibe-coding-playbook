# yanstd888/humanizer-lint

- 结论：**值得一试**。可以把 humanizer-lint 小范围试成“AI 出稿之后的确定性文风验证环节”：装好后跑 `npx humanizer-lint --file draft.md --lang auto --json`，只修改被明确指出位置的句子，最多迭代三轮，再看 exit code。理由是原文给出了完整命令、参数、退出码、评分规则和 CI 配方，可按原样执行；但基准只有 20 条合成样本，作者本人声明它不衡量真实准确率，也不判定作者身份，所以只能先作为验证关卡试用，不宜当作硬性标准。
- 原文：https://github.com/yanstd888/humanizer-lint
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-01T18:27:32.011Z

## 是什么

humanizer-lint 是一个本地运行的确定性（deterministic）文风检查器，专门检查“像 AI 写出来的”文档特征：套话堆砌（如 `delve`、`tapestry`、`testament` 及其它语种的对应词）、句长方差过低、相邻句长度几乎不变、段落结构对称、句首重复、词汇多样性低（MATTR）、压缩比过低（重复度高）等。

关键属性（均出自 README）：

- Node.js >= 18.3，**零运行时依赖**，生产代码不含 `fetch`/`child_process`/`eval`，文本不上传到外部服务。
- 8 个语种的词表与形态规则包（`en`、`id`、`es`、`ms`、`fr`、`de`、`pt`、`zh`），其余语言走 `universal` 通用节奏分析（借助原生 `Intl.Segmenter`，覆盖 100+ 语言）。
- 输出 0–100 分、违规类型与位置、一条可直接照着改的 `fixInstruction`；支持纯 JSON 输出和标准退出码，可当 CI 验证关卡。
- **不改写文本**：只报问题，不动源文件，避免静默改动事实。
- 明确**不是** AI 内容检测器，不估 perplexity、不判作者身份、不扫目录、无 SARIF 输出。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**1. 前置条件确认**
需要 Node.js >= 18.3（原文徽章声明）。零依赖、无需构建、无需联网（只有安装阶段需要网络）。

**2. 选择安装方式（三选一）**

一次性跑，不安装：
```sh
npx humanizer-lint --file draft.md --lang auto
```

全局安装：
```sh
npm install -g humanizer-lint
```

从源码开发（需要 `git clone` 权限）：
```sh
git clone https://github.com/yanstd888/humanizer-lint.git
cd humanizer-lint
npm test
npm link
humanizer-lint --help
humanizer-fingerprint --help
```

**3. 用对语言参数**
`--lang auto` 自动判定；`--lang universal` 强制走通用韵律分析；也可直接给 ISO 639-1 代码。
```sh
humanizer-lint --file draft.md --lang es
```
前提提醒：只有 8 个语种有词表包，其它语言只做节奏/重复度这类统计，阈值未经校准。

**4. 读退出码做自动化判断**
| 退出码 | 含义 |
|---|---|
| `0` | `PASS`，或文本太短返回 `SKIP` |
| `1` | 分析完成且结果为 `FAIL` |
| `2` | 参数非法、文件不可读、profile 损坏 |

**5. 取机器可读结果**
```sh
humanizer-lint --file draft.md --lang id --json
```
```sh
cat draft.md | humanizer-lint --stdin --lang auto --json
```
JSON 结构（原文示例）：
```json
{
  "status": "FAIL",
  "score": 39,
  "language": "en",
  "metrics": {
    "wordCount": 29,
    "sentenceCount": 3,
    "burstinessCV": 0.0488,
    "adjacentDelta": 0.5,
    "mattr": 1
  },
  "violations": [
    {
      "type": "LOW_BURSTINESS",
      "location": "Whole text",
      "actual": 0.0488,
      "target": 0.4,
      "fixInstruction": "Vary sentence lengths by splitting one uniform sentence and merging another where the meaning supports it."
    }
  ]
}
```
`sourceScope` 为 `sentence-range` / `document-excerpt` 时表示诊断上下文，**不是**要机械替换的文本。

**6. 设成 CI 判定条件**
```sh
humanizer-lint --file draft.md --lang auto --min-score 80
```
低于阈值或 `FAIL` 即退出 1。其它可用参数：`--domain auto|prose|copywriting|code|ui`（按扩展名路由）、`--no-domain-lint`、`--allow "短语1,短语2"`（大小写不敏感的精确豁免）。

**7. 对确有必要的句子加忽略指令**
单独一行的指令抑制下一非空行，文件级用 `<!-- humanizer-ignore-file -->`：
```text
<!-- humanizer-ignore -->
// humanizer-ignore
/* humanizer-ignore */
```
注意：围栏代码块内的指令不生效；含反引号的 JS/TS 文件里指令会被保守禁用（有 warning）。

**8.（可选）生成个人文风 profile，再拿它比对**
```sh
humanizer-fingerprint \
  --input writing-samples \
  --output profiles/custom-voice.json \
  --name editorial-voice \
  --lang en
```
```sh
humanizer-lint --file draft.md --lang en --profile profiles/custom-voice.json --json
```
前提：`--input` 指向一个文件或一个目录里最多 5 个 `.md`/`.txt` 样本；profile 记录平均句长、标准差、burstiness、adjacent delta、MATTR、平均段落句数、标点率。平均句长偏离超过 30% 触发 5 分扣分（在 10 分的词汇+熵上限内）。

**9. 装成 agent skill，跑闭环（原文推荐流程）**
```sh
npx skills add yanstd888/humanizer-lint
```
原文给出的五步闭环，可逐字照做：
1. 在支持的语言里起草或编辑，**不改动事实**。
2. 对完整成稿跑分析器。
3. 逐条读违规，只改被点名的散文或整篇检查项。
4. 重跑，**三次迭代后停止**。
5. 只有 `PASS`，或如实标注的短文本 `SKIP`（且无未决词汇违规）才算过。

原文同时给了硬性约束：保留功能性代码、标识符、命令、结构化数据、法律条款、引文、事实与数字；若继续修改会扭曲含义或语域，就停下来说明这条未解决的诊断。

**10. 接进 GitHub Actions（原文 YAML 原样）**
```yaml
name: prose-check

on:
  pull_request:
    paths:
      - "**/*.md"
      - "**/*.txt"

jobs:
  lint-readme:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: yanstd888/humanizer-lint
          path: .humanizer-lint
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: node .humanizer-lint/scripts/analyze.mjs --file README.md --lang auto --json
```
注意：一次只接受一个文件，多文档要循环调用。

**11. 知道什么情况下它会“跳过”**
- 文档 < 20 词或 < 3 句：返回 `SKIP`（词汇违规仍报告）。
- 少于 8 句：统计节奏门被跳过，只跑词汇与领域检查。
- 分数规则：从 100 起扣，节奏/句长范围最多 −25，单调节奏窗 −20，词汇与结构套话 −30，印尼语形态 −15，词汇多样性+熵+profile 偏差合计 −10。正常长度文档需同时满足：分数 ≥ 80、无 `SLOP_PHRASE`/`DEFINITIONAL_OPENING`、burstiness 与 adjacent-delta 门通过、句长范围达标。

**12. 了解 Markdown 预处理范围**
分析前会去掉 YAML frontmatter、围栏代码块、标题、表格；保留链接锚文本去掉 URL；行内代码与裸 URL 替换为 `TOKEN_ENTITY`；去掉块引用符号但保留引文正文。这是确定性清洗，不是完整 Markdown/MDX 语法树，HTML 块与任意 MDX 组件不特殊处理——所以把文档写成“代码块里放代码”能天然避免误判。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 已能做哪些还没想到交给它的工作）**
- 把“文字读起来像不像机翻/像不像 AI 套话”从人肉通读变成可自动判定的检查：句长方差（CV）、相邻句长度差、短句/长句占比、自适应 MATTR、压缩比、段落对称性、句首重复，这些是人工校对通常不会逐项量化的维度。
- 原文明确点出的新任务：给 agent 工作流加“确定性文风检查环节”，以及把散文检查接进 PR 流程。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
- 适合放在**生成之后**的验证位，而不是生成位：工具只诊断、不改写，由人或 coding agent 做“最小必要修改”。
- 明确列出的可协作环境：Claude Code、Cursor、Windsurf、Cline、Codex、Gemini CLI（通过 skills 安装）。
- 适合文体：文案、博客、SEO 文章、技术文档、Markdown 校对、学术散文、翻译润色。
- 不适合：判断作者身份、需要语义正确性判断的编辑决策（原文反复声明边界）。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 需要的输入：**完整成稿**（不是片段），因为短文本会 SKIP 或跳过节奏门。
- 需要的参数：语言（`--lang`）、领域（`--domain`）、阈值（`--min-score`）、白名单（`--allow`）。
- 可选增强：1–5 篇本人写作样本生成的 voice profile，作为“风格漂移”的参照。
- 需要的工具能力：agent 要能执行本地命令并读 exit code / JSON；不需要网络权限，不需要把文本传出。
- 需要的反馈闭环：违规条目里带 `fixInstruction`（如“拆一句、合一句来改变句长”），这就是给修改者的反馈信号。

**4. 主动推进（哪些工作可由时间、事件或状态触发并持续完成）**
- 事件触发：`pull_request` 且路径命中 `**/*.md`、`**/*.txt` 时自动跑（原文给了完整 workflow）。
- 状态触发：agent 闭环里“跑→改被点名处→重跑”，最多三轮后停止，是一个有终止条件的自循环。
- 退出码 0/1/2 可直接作为流程分支条件，接入脚本或 CI 判定。

**5. 效果验证（怎样判断确实改善了结果）**
- 直接指标：`score`（0–100）、`status`（PASS/FAIL/SKIP）、`violations` 列表与位置、退出码。
- 分项诊断指标：`burstinessCV`、`adjacentDelta`、`mattr`、`compressionRatio`、`shortSentenceRatio`、`longSentenceRatio`、`voiceProfileDeviation`。
- 原文自带的判定线：≥ 80 分且无套话/定义式开头、节奏门通过、句长范围达标才算过。
- 原文警告：这些值是**指标不是机械配额**，`voiceProfileDeviation` 不是作者概率。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：原文把“装成 agent skill + 闭环校验”列为推荐用法，`npx skills add yanstd888/humanizer-lint` 后即可在 Claude Code 中作为出稿后的验证步骤，与本项目已有的 Claude Code 采用状态直接对接。
- **Cursor（watch）/ Cline（watch）**：原文的兼容列表里点名 Cursor、Cline（以及 Windsurf、Codex、Gemini CLI），说明这是“编辑器内 agent + 本地 CLI”的通用接法，可在这两个条目升级评估时作为具体验证手段。
- **skills.sh（try）**：本工具的 agent skill 就发布在 skills.sh 上，原文引用了该平台的 Snyk 安全审计通过状态。使用 skills.sh 的流程时，这是一条可复用的样例。
- **与“静态 SKILL.md 提示词”的差别**（原文给的对比，可直接抄进手册）：静态提示词只能“要求模型变化句式”，无法检查成稿；本工具检查的是**成稿的确切文本**，给出 CV / adjacent delta / 短长句分布 / MATTR / 规则 ID 与位置，原文不改，可离线，出 JSON 与退出码。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的可核查材料**
- `npm run benchmark` 可复现 **20 条合成 fixture**（16 条多语言 + 4 条领域检查）与一个探索性源语料。
- 三组终端示例：AI 味样例 `FAIL`/score 70（en）、通过样例 `PASS`/score 100；印尼语 Before/After 对照（After 保留原主张、不新增门店/应用/数字）。
- JSON 输出示例（score 39，`LOW_BURSTINESS` actual 0.0488 / target 0.4）。
- 明确的评分上限表和 PASS 条件、SKIP 条件、8 句节奏门门槛。
- 安全检查：生产脚本只用 Node 内建模块，测试禁止 `child_process`/`eval`/`Function`/`fetch`；技能页通过 Snyk / Socket / Agent Trust Hub 审计。

**作者自己承认的局限（原文原话要点）**
- 基准是合成 fixture，“fixture 通过率与运行时不衡量真实世界准确率或作者身份”；源语料小且非随机，被假定为“干净”的标签未经独立裁决。
- 不估 perplexity、不判断谁写的、不自动改写、不扫目录、无 SARIF 输出；一次一个文件。
- 通用（Tier 2）语言的词汇与 MATTR 阈值**未校准**；8 个语种包中，公开的规则编号只列出 EN/ID（`EN001-EN040`、`ID001-ID042`），中文虽在 Tier 1 名单内，但原文未给出中文词表规模与具体规则编号。
- Markdown 清洗是确定性启发式，不是完整解析器；含反引号的 JS/TS 里忽略指令被保守禁用。

**适用条件**
- 文档需 ≥ 8 句才有节奏判定；≥ 20 词且 ≥ 3 句才不 SKIP。
- 分数代表“与所检查的风格信号吻合度”，越高表示违规越少，**不是**“人写概率”。
- 项目体量小（32 stars），规则阈值是作者经验设定，跨语种、跨文体迁移前需自行校准。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天内可完成）**
1. 取 3 篇**你自己写的**既有 Markdown 文档（各 ≥ 8 句、≥ 200 词），跑 `humanizer-lint --file X.md --lang auto --json`，记录 score 与 violations。这是假阳性基线。
2. 取 3 篇让模型直接生成的同题材文档，跑同一条命令，记录 score 与 violations 类型。这是命中基线。
3. 对模型稿只做“被点名的修改”（照着 `fixInstruction`），重跑，最多 3 轮，记录轮次与最终 score。
4. 在仓库里加第 10 步的 workflow，对一次真实 PR 观察是否按预期在 md 变更时触发。
5. （可选）用自己的 3–5 篇样本跑 `humanizer-fingerprint` 生成 profile，再带 `--profile` 复跑第 1 步，看人写文档的 `voiceProfileDeviation` 是否明显小于模型稿。

**判断有没有改善的指标**
- **假阳性率**：人写文档被判 `FAIL` 的比例。高于约 1/3 说明该规则包与你的文体不匹配，应先调 `--allow` 或降级为只读参考。
- **命中率**：模型稿被判 `FAIL` 且违规里至少一条与你人工判断一致的比例。
- **可执行率**：`fixInstruction` 能直接落地、且改完不改变原意的比例。
- **迭代成本**：达到 PASS 所需轮次（原文上限 3 轮；若普遍需要 3 轮以上，说明信号与你的写作流程不合）。
- **语义安全**：改动前后事实、数字、代码、引文是否完全一致（原文明确要求保留这些，出现任何事实漂移即视为负面）。
- **人工盲评**：改前/改后两份随机排序，请同事二选一“更像人写的、更愿意读完”，作为对外部效度的兜底——因为原文自己说不衡量真实准确率，这个盲评是唯一能验证“确实改善结果”的外部证据。
