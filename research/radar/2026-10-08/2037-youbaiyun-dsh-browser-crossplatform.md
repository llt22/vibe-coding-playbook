# youbaiyun/dsh-browser-crossplatform

- 结论：**值得一试**。若团队已在用 dsh 桌面端、又需要让模型真的去读和操作浏览器，可以按仓库给出的安装/配置命令小范围试装，并优先复刻它的权限与反馈设计（敏感字段打码、动手前批准开关、回环 id 白名单）和成对基准方法；理由是安装命令、配置片段、工具面与验证指标都能直接照抄，但 README 通篇没有给出基准实测结果，且方案完全绑定 dsh 生态，不宜直接全量采用。
- 原文：https://github.com/youbaiyun/dsh-browser-crossplatform
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-08T10:53:32.582Z

## 是什么

dsh-browser-crossplatform 是一个 MV3 浏览器扩展 + dsh 桥接插件（bridge plugin），让 dsh 桌面端读取并操作浏览器标签页：页面以**文本**形式交给模型（带编号的可操作控件），图像查看是单独的可选通道，默认关闭。它是 Lum1104/dsh-browser 的衍生重写，围绕「高兼容性 + 精简体积」重构；仓库内五个包共用同一版本号 0.38.5（protocol / bridge / extension 等）。

关键设计：
- **文本快照 + 动作执行**：不做截图、不做识别步骤（协议层 `textOnly: true`）。页面渲染为标题/URL/正文 + 编号交互清单（含 ARIA role 控件）+ 表单字段（含 masked/checked/required），支持 delta 增量与 region 局部快照。
- **安全不变量**：`type=password`、`autocomplete=credit-card|cc-*`，以及 id/name/aria-label 命中 `password|passwd|credit|card|cvv|cvc|secret|pwd` 的字段值始终打码为 `••••`；可访问名称绝不使用输入框当前值（只有 submit/button/reset 的 value 才算名字），有单元测试强制这一点。
- **工具面 17 个**：`browser_snapshot` / `click` / `type` / `press` / `scroll` / `navigate` / `open_tab` / `list_tabs` / `follow_tab` / `close_tab` / `back` / `forward` / `reload` / `get_text` / `wait` / `launch` / `describe_image`。
- **批准确认**：`unrestrictedBrowserAccess` 开关**出厂为开**（新装不做询问）；关掉才恢复动手前的提示，并支持 trusted origins、allow-once。
- **标签页绑定**：`follow`（默认，跟着你手动切换）/ `ask`（阻塞询问）/ `keep`（不动）。

## 具体做法

前提：dsh 桌面端、Node ≥ 20；桌面版 Chrome/Chromium/Edge ≥ 116 或 Firefox ≥ 140.0；手机与平板不支持。

1. 装桥接插件（插件路线一条命令）：
```sh
# 从 npm 仓库（已发布 dsh-browser-crossplatform@0.38.5）
dsh plugin --profile desktop add dsh-browser-crossplatform   # dsh web 用 --profile web

# 或直接从仓库，不经 npm
git clone https://github.com/youbaiyun/dsh-browser-crossplatform
dsh plugin --profile desktop add link:<clone>/packages/bridge
```
前提：有 `dsh` 命令行；`dsh web` 场景把 profile 换成 `web`。是否装好请按仓库 `docs/INSTALL.md` 的逐步说明确认；插件设置页在 dsh 内，标题为「dsh 浏览器扩展（全端）的桌面端一半」。

2. 装浏览器扩展：从扩展商店安装（README 标注 Chrome / Firefox 均 not yet listed），或加载未打包构建。注意**插件无法替你装扩展**：命令行加载只维持一个会话、关掉浏览器就没了；Chrome 137+ 的品牌版 Chrome/Edge 已忽略 `--load-extension`（Chromium 与 Chrome-for-Testing 仍认）。所以要在 profile 里装一次（商店安装，或在扩展页「加载已解压的扩展程序」），之后正常启动会自动重连。

3. 从源码构建（开发用）：
```sh
pnpm install
pnpm -r run typecheck
pnpm -r run test
pnpm --filter dsh-browser-extension run build               # Chrome → extension/dist
pnpm --filter dsh-browser-extension run build:firefox       # Firefox → extension/dist-firefox
pnpm --filter dsh-browser-extension run build:store         # Chrome，无 manifest key
pnpm --filter dsh-browser-extension run build:store:firefox # Firefox，无 key
pnpm --filter dsh-browser-extension run package             # 出全部归档
pnpm --filter dsh-browser-crossplatform run build           # 桥接插件 → packages/bridge/lib
```
前提：开发构建用 Node 22 + pnpm 11。上架要传 `-store` 包：普通构建带 manifest `key`（用于开发时钉住扩展 id），Chrome Web Store 会拒收。

4. 配置图像识别（默认关；一旦开启，你询问的那张图会离开本机交给所配模型）。推荐走桌面中转，在桌面 profile 的 `cordis.patch.yml` 里给桥接插件加配置：
```yaml
- id: bridge-browser
  disabled: false
  config:
    visionApiKey: <key>
    # 可选；必须是 API id 而不是显示名 —— 写 deepseek-flash，别写 DeepSeek-V4.1-Flash（API 会 400）
    visionModel: deepseek-flash
```
地址与模型已有默认值（`https://api.deepseek.com/v1` / `deepseek-flash`），thinking 默认关。

5. 或者走扩展直连（面板没有入口，直接写扩展存储；manifest 的 `connect-src` 已允许任意 `https:`/`http:` 主机，不用改 manifest）：
```js
chrome.storage.local.set({ dshSettings: { visionEndpoint: 'https://…/v1', visionModel: '…', visionApiKey: '…' } })
```
前提：这是部署方配置；面板只显示图像查看档位（off / low / standard / enhanced），不显示 endpoint、模型、密钥。

6. 控制动手前是否询问：关掉 `unrestrictedBrowserAccess` 就恢复批准提示。注意该开关打开时还会覆盖「读页面前先问」的选择。

7. 收紧回环免鉴权（可选）：桥接默认用 bearer token 鉴权，但来自扩展自身的回环连接可跳过以便零配置发现；豁免不是「任何 `chrome-extension://` 来源」，而是与 `extensionId`（逗号分隔白名单）精确匹配。自建构建要把自己的 id 加进去，或设 `extensionId: ''` 让所有连接（含回环）都要求 token。

8. 跑成对基准（把「高效」变成数字）：
```sh
pnpm --dir benchmark install-browser          # 下载与 lockfile 里 playwright-core 匹配的 Chrome for Testing
node benchmark/run.mjs --dry-run --smoke      # 基础设施检查，不调模型
node benchmark/run.mjs --smoke                # 一次真实模型调用（消耗额度）
node benchmark/run.mjs                        # 正式：6 任务 × 5 种子 × 2 后端 = 60 次
node benchmark/run.mjs --tasks order_lookup,contact_form --seeds 1-5 --trials 2
```
三个前提：① 有一个接受 `--profile web --patch … -- --no-open --port N` 的 dsh 命令行（本仓库是独立 workspace、不依赖 `@deepseek-ai/dsh`，所以要自己指路：`BENCHMARK_DSH_COMMAND="node D:/path/to/dsh.mjs"`）；② Windows 上用 `pnpm.cmd`；③ 用 Chrome for Testing 或 Chromium。

9. 跑桥接插件的 e2e：需要一个仍认 `--load-extension` 的浏览器，先 `node benchmark/lib/browser-install.mjs chromium`，再把 `PLAYWRIGHT_CHROMIUM_PATH` 设成 `node benchmark/lib/chromium-path.mjs` 打印的路径。

## 对应的研究问题

- **能力发现**：把「读网页」从截图识别换成文本快照（编号交互清单 + 表单字段 + ARIA role + delta/region），能交给模型的粒度更细也更省。即使图像识别关闭，快照末尾仍有 `Images:` 清单，按最近标题分组、按文档顺序，每行形如 `[N] kind WxH "label" near="…" text-described [unavailable] → src ⟦iN img:state⟧`；`N` 就是交互清单里用来 `browser_click` 的编号，位置信息来自 DOM 所以模型不需要坐标。覆盖 `<img>`（含 `currentSrc`，`srcset` 候选会被如实报告）、`<video poster>`、内联 `<svg>`、CSS background-image（内联声明精确收集，类声明的走有界 computed-style 扫描，上限 1500 个元素或 20 张背景图）；`<canvas>` 明确不收集。另外 `browser_type` 能填 `<select>`（按 option value → 可见标签 → 1-based 序号依次匹配，失败时列出可选项）和设置 checkbox/radio；`browser_wait` 支持 `selector` / `text` 等待条件（等不到报 `timeout` 错误码），不再只是固定延时。
- **任务匹配**：文本快照路线不含截图与识别步骤；需要看图再开可选通道，且分「桌面中转（只要桌面广播了就优先）」与「扩展直连」两种传输，两条路径共用同一 prompt 与解析器（`protocol/src/vision-contract.ts`），换哪边调模型都不改变提问与有效答案判定。基准里拿 `playwright`（基线，只暴露任务真正需要的 8 个工具：snapshot/click/type/press/scroll/navigate/get_text/wait）对比 `extension`（本产品 17 个工具），比的是同一批任务而不是同一工具面。
- **条件供给**：权限与凭据是最关键的条件。扩展上下文持有 host permissions，能在 service worker 里直接读跨域图片字节（content script 的 canvas 会被污染），请求带 `credentials:'include'` 覆盖登录后媒体，且不解码/缩放/重编码，超过 `MAX_IMAGE_BYTES`（4 MB，因为 base64 膨胀三分之一且要过 WebSocket）就不内联、退回把 URL 交给桌面端（桌面端网络栈不受 CSP / host permission / 企业策略约束——这是桌面中转的真正价值）。凭据留在桌面端：`hello.ok` 在无法构建视觉客户端时上报 `imageRecognition: false`。特权网关方法（`host.pickDirectory`、`host.openPath`、`settings.*`、`credentials.*`）对非回环远端一律拒绝；开发场景提供 `browserUserDataDir` + `extensionPath`。图像失败被分类而非抛出（`too-large` / `unsupported-url` / `fetch-failed` / `empty`，带 `permanent` 标志），让模型知道「这里有图但读不了」，而不是什么都看不到；缓存按图像 URL 身份持久化到 `chrome.storage.local`，24 小时、保留最近 200 条、瞬时失败最多重试两次（首要目的是同一个 logo 出现三十次不要给出三十种不同描述，其次才是省成本）。
- **主动推进**：导航类动作（navigate/back/forward/reload）后由 content script 宣告新文档就绪、后台完成握手并自动快照推给面板，模型不需要再多一次往返。浏览器没开时，任何工具调用会先尝试启动浏览器、再报告实际发生了什么（以前只会以裸的 `bridge-closed` 失败）；`browser_launch` 是唯一跑在桌面端的工具，因为它要能在没有浏览器运行时工作。启动用的是「你本来就在用的浏览器」（Windows 的 UserChoice 注册表项 / macOS LaunchServices，失败再退回探测），且不加额外 flag（不加 `--user-data-dir`，那等于开一个没有你标签和登录的第二个浏览器，也不加 `--load-extension`）；若该浏览器已有窗口就什么都不启动，只回答该在哪个浏览器里启用扩展。
- **效果验证**：`benchmark/` 用同一模型、同一 profile、同一组任务、同一台机器，成对比较两个浏览器执行后端；六个任务覆盖浏览器 agent 的基本模式（读 / 单步 / 表单 / 搜索 / 多步 / 动态加载），变体由 seed 选择以防过拟合，跑在 `benchmark/site/` 的 fixture 站上。每个任务记四个数：成功率（120 秒超时算失败）、完成时间 p50/p90/mean、平均工具调用数、平均 prompt tokens。为什么必须成对：绝对时间被模型主导（生成约占一半），只有对比才能分离后端自身的贡献。

## 与已有做法的关系

- **DeepSeek（清单状态 try）**：材料直接相关。默认视觉模型 `deepseek-flash`、默认端点 `https://api.deepseek.com/v1`，可复用桌面端已有的 `DEEPSEEK_API_KEY` 凭据；运行期依赖含 `@deepseek-ai/schemastery`，桥接把全部 dsh 声明为 peerDependencies。可以把它看作在 dsh/DeepSeek 生态里给模型补上「浏览器的手和眼」的一条具体落地路径。
- **Semble（清单状态 try）**：给出的 README 材料中没有任何与 Semble 相关的内容，本报告无法对二者关系下判断。
- 其它参照：README 自述是 Lum1104/dsh-browser 的衍生重写，并给出与上游的逐项差异——版本号从各自漂移（root 0.2.1 / extension 0.3.1 / bridge 0.0.7）统一为 0.38.5；Node 从 `^22.19 || >=24` 降到 `>=20`；根包 dsh 依赖从 35 个（RC 版 `@deepseek-ai/*`，node_modules 约 600 MB）降到 0，bridge 只带 `ws` + `@deepseek-ai/schemastery`；桥接协议从各自的 `protocol.ts` 改为共享 `@dsh-browser/protocol`；删除 web 侧 `client.js` 与 React peer、`dsh-client-ui-*`、`locale` 等注入块；manifest 的全局 `content_scripts` 注入保持不变，但用「广注入、窄授权」约束另一端（只有你绑定过的标签页会被读或操作，`chrome.scripting` 对早于安装打开的标签页按需补注入）。

## 证据与局限

具体、可核验的证据：
- 兼容性写成可检查的数字与出处：操作系统全覆盖（平台相关代码只在一处 `packages/bridge/src/browser-launch.ts`，构建/基准工具另加 Windows `.cmd` shim），Node ≥ 20，Chrome/Chromium/Edge 116（`minimum_chrome_version`），Firefox 140.0（`gecko.strict_min_version`），开发构建 Node 22 + pnpm 11（`.github/workflows/check.yml`）。
- 安全不变量有单元测试强制（可访问名称不使用输入框当前值）。
- CI 在 `ubuntu-latest` 上每次提交跑全链，构建两个浏览器目标并跑完整测试；端到端用 Playwright 加载已构建扩展 + 真实 BridgeServer，走零配置发现 → caps 协商 → `session.create`/`prompt`。该 e2e 在找不到可用浏览器时会自我跳过，所以要看日志而不是退出码。
- 明确写了「不能做什么」并给原因：不能安装扩展；手机/平板不支持（Android Chrome/Edge 不支持第三方扩展、Firefox for Android 没有侧栏 UI、回环绑定的限制）。
- 有配套文档：`docs/INSTALL.md`（含「如何确认已安装」）、`docs/TRUST-MODEL.md`（宽注入、窄授权）、`docs/STORE.md`（上架路径，含商店分配的 id 对桥接意味着什么）。

只是作者主张、本材料无法核验的部分：
- 全篇没有给出基准的实测结果，只给了设计与复现命令，所以「高效」这类结论读不出来。
- 「高兼容性」「精简体积」等定性说法没有横向对比数据。
- 商店上架状态自述为 not yet listed；macOS 未被 CI 覆盖（作者称它与 Linux 同为 POSIX，且平台相关面只有那一个模块）；Windows 仅本地验证。
- 测试数量作者明确不再硬编码（「以前的数字已经漂移两次」），所以没有可引用的固定覆盖数。
- 材料在最后被截断，停在「branded Chrome/Edge 137+ remove」的半句上，后半内容缺失。

适用条件：强依赖 dsh 桌面端生态（桥接装进 desktop profile、设置页在 dsh 内），不是通用浏览器自动化工具；自动化基准需要仍认 `--load-extension` 的浏览器；手机/平板场景不适用；开启图像识别意味着被问到的图像会离开本机交给所配模型；扩展直连路线需要在扩展存储里写 endpoint/模型/密钥。

## 怎么试、怎么验证

最小试用（一次会话内可完成）：
1. 在桌面 profile 装桥接插件、在浏览器里装好扩展，打开一个你日常真会用的标签页。
2. 只验证两件事：让模型 `browser_snapshot` 读当前页；再让它对页面上一个表单做一次 `browser_type` 加一次提交类点击。
3. 安全验证：找一个带密码框的页面，确认快照里该字段值是 `••••`；把 `unrestrictedBrowserAccess` 关掉后再做一次改状态动作，确认出现批准提示。
4. 推进性验证：让它 `browser_navigate`，确认返回的结果是导航后自动生成的快照（不需要额外一次往返）。
5. 需要看图时先把图像查看开到 low、走桌面中转，只对一项任务开，观察图片是否真的离开了本机。

判断有没有改善的指标（直接沿用基准的四个数）：
- 任务成功率（并设超时阈值，基准用 120 秒算失败）
- 完成时间 p50 / p90 / mean
- 平均工具调用数
- 平均 prompt tokens

对照方式：先小规模跑 `node benchmark/run.mjs --tasks order_lookup,contact_form --seeds 1-5 --trials 2`，与 Playwright 基线成对比较，不要看绝对耗时（模型生成本身约占一半）。要长期跟踪再跑完整的 `node benchmark/run.mjs`（60 次）。跑之前先满足三个前提：自备 `BENCHMARK_DSH_COMMAND`、Windows 用 `pnpm.cmd`、用 Chrome for Testing 或 Chromium。
