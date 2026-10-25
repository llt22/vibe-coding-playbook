# 让 AI agent 抓你的站点时，拿到干净、可引用的版本

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：站点只发 HTML 时，AI 抓取方拿到的是带噪声的页面、找不到该读哪几篇、也不知道该怎么引用你；这篇手册给出一层机器可读入口的铺法，并要求你先小范围试点、用日志判断，而不是默认它有效。
> 先试这一步：挑 3–5 篇最常被问起或被引用的文档，构建期生成 .md 副本，加一个根目录 llms.txt，再照抄文中的 nginx 配置补上 Vary / Link / X-Robots-Tag 三个响应头，跑两周看日志。
> 最近修订：2026-10-26

## 解决什么问题

你的站点或文档库现在只有 HTML 一种出口：AI 抓取方拿到的是带导航、模板和噪声的页面，找不到该读哪几篇、也不知道该怎么引用你。这篇手册给出一层「给自动抓取方准备上下文」的机器可读改造——构建期生成 markdown 副本、用 Accept 头做内容协商、根目录放 llms.txt 索引、补齐 canonical 与结构化元数据——并且要求你先小范围试点、用日志判断，而不是默认它有效。

## 适用与不适用

**适用**：静态站点或文档库，由 nginx 提供服务，构建期能生成文件。博客、产品文档、知识库这类「希望被引用」的内容都符合。

**部分适用**：动态渲染的站点。做法本身不依赖框架，但需要另找生成 `.md` 与注入响应头的落点。

**不适用 / 不要照抄**：

- 产品站、商业站的 robots 与内容用途信号策略。原文的 robots 是「博客」的选择——作者想被引用；产品站应另作判断。
- 把它当成已验证的收益项。原文只有作者主张，没有任何抓取量、引用率或来源流量的前后对比。更准确的定位是「低成本保险」：一次性铺好，别指望带来可测量的增长。

## 前置条件

- 静态站点，由 nginx 提供服务，构建期能生成文件；
- 有权修改并 reload nginx 配置；
- 能读 nginx 访问日志，并能取到改动前同样长度的日志窗口作为基线；
- 做法 B 才需要的：能改 robots.txt 与 feed 模板；能写发布钩子脚本（IndexNow）。

## 操作步骤

先做**做法 A（最小闭环）**：只覆盖 3–5 篇最常被引用或最常被问起的文档，跑两周。只有日志里确实看到抓取或引用来源的变化，再上**做法 B**。材料里的最小试用建议就是先跳过 IndexNow 和完整 JSON-LD，先把最小闭环验证掉。

### 做法 A：最小闭环（先做这个）

1. **圈定试点范围。** 前提：能列出最常被引用或最常被问起的文档。选 3–5 篇，不要全站铺。预期结果：范围小到能在两周内把日志看完。

2. **为每篇文章生成 markdown 副本**，URL 为原 URL 加 `.md`。前提：文章源是 markdown，或能从渲染结果取正文。文件头加 YAML frontmatter：title、canonical URL、author、日期、简短 description，后面接正文；老文章构建时只做清洗，并把图片指向自托管副本。预期结果与验证：

   ```shell
   curl https://<你的站点>/posts/<slug>.md
   ```

   返回纯 markdown 正文。

3. **用 Accept 头做内容协商**，同一个 URL 对 agent 返回 markdown、对浏览器返回 HTML。前提：能改 nginx 配置。`http` 上下文加映射，`server` 块加一条 location：

   ```nginx
   # http context
   map $http_accept $deallocated_md {
       default "";
       "~*text/markdown" ".md";
   }

   # server block
   location ~ ^/posts/[^/.]+$ {
       if ($deallocated_md) { rewrite ^ $uri.md last; }
       try_files $uri.html =404;
   }
   ```

   变量名 `$deallocated_md` 是原文随手取的，可以改成自解释的名字。预期结果与验证：

   ```shell
   curl -H "Accept: text/markdown" https://<你的站点>/posts/<slug>
   ```

   带这个头拿到 markdown，不带拿到 HTML。

4. **每个响应都加 `Vary: Accept`。** 前提：上一步已生效。预期结果：中间的缓存不会把 HTML 发给 agent、或把 markdown 发给浏览器。

5. **给 `.md` 响应加两个头。** `Link: <HTML页URL>; rel="canonical"` 指回 HTML 页面；`X-Robots-Tag: noindex` 避免被搜索引擎当成每篇文章的重复副本。预期结果：搜索引擎只索引一份，agent 拿到的是 markdown。

6. **站点根目录放 `/llms.txt`。** 内容：一行站点简介 + 如何获取 markdown + feed 地址 + 希望被如何引用 + 全部文章清单（每篇带 markdown 链接和一行摘要）。其中「希望被如何引用」是关键——它把引用规范写进了供给材料。同时让所有响应带 `Link` 头指向 `/llms.txt`，让 agent 不用猜位置。预期结果：`curl https://<你的站点>/llms.txt` 能看到完整的入口说明和文章清单。

7. **先停在这里，跑两周。** 预期结果：拿到一组可对比的日志数据，再按下一节判断要不要继续。

### 做法 B：铺满其余层（做法 A 跑出信号后再做）

8. **补 `/llms-full.txt` 与 `/index.md`。** `/llms-full.txt` 把全站正文合并成一个文件（原文站点约 225 KB），`/index.md` 是首页的 markdown 版。前提：做法 A 的 `llms.txt` 已经在跑。预期结果：想一次性读全站的 agent 不用逐篇抓。

9. **`robots.txt` 显式表态。** 默认允许，并逐个点名主要爬虫（GPTBot、ClaudeBot、PerplexityBot、Google-Extended 等十余个），再加一行内容用途信号：

   ```
   User-agent: *
   Allow: /
   Content-Signal: search=yes, ai-input=yes, ai-train=yes
   ```

   前提：这是「博客想被引用」的选择，产品站要单独判断。预期结果：抓取方看到明确的许可与用途声明。注意 `Content-Signal` 是新兴的非标准约定，别处的爬虫未必认。

10. **feed 补齐。** 保留原有 Atom `/feed`，每条 entry 加 summary 和 `text/markdown` alternate link；另加 JSON Feed，每项用自定义键 `_markdown_url` 指向 markdown 版（JSON Feed 允许以下划线开头的自定义键）。预期结果：订阅方也能拿到 markdown 备用链接与摘要。

11. **每页补齐元数据。** 真实 meta description、canonical URL、robots 标记、`lang="en"`；Open Graph 与 Twitter card，含 `article:published_time` / `article:modified_time`；JSON-LD 结构化数据——文章页 `BlogPosting` + `breadcrumb`，索引页 `WebSite` + `Blog` + `Person`。注意作者的教训：旧数据库里的预制摘要把段落粘在一起（`… your app.The RevealWhat do I mean…`），还有几条混着原始 `<img>` HTML；改为从渲染后的正文生成摘要。预期结果：抽一篇文章看源码，summary 是干净的一句话，JSON-LD 能通过校验。

12. **顺手修掉旧标记。** 去掉 viewport 里的 `maximum-scale=1`（它禁止手机上双指缩放）；补上 1200x630 的 `og:image` 预览卡（此前在 X / Threads 分享时抓的是页面顶部 banner）。预期结果：分享出去有正确的预览卡，手机可以双指缩放。

13. **发布时自动推送 IndexNow。** 申请 key，写一个约 30 行的脚本，文章发布时 ping Bing 等（Google 不参与，但 Bing 索引喂给不少 AI 搜索工具）。前提：有发布事件可以挂钩子。预期结果：新文章发布后自动提交，不需要手动操作。

## 怎么判断变好了

**最小试用方式**：只做做法 A，3–5 篇文档，其余先不碰。

**基线**：改动前同样长度的日志窗口。

**指标**：

1. nginx 日志里 AI 爬虫 UA（GPTBot / ClaudeBot / PerplexityBot）的请求数与被请求路径；
2. `.md` 端点的 200 比例，以及 `Accept: text/markdown` 协商的实际命中次数——如果几乎没人带这个头，说明收益主要来自 `.md` 直链，而不是内容协商；
3. `llms.txt` / `llms-full.txt` 的请求量；
4. referrer 中来自 chatgpt.com / perplexity.ai 等的会话数；
5. 抽查 agent 回答中的引用是否带上了 canonical URL——即第 6 步写下的引用约定有没有被遵守。

**试多久**：两周。

**结论怎么下**：若爬虫抓取和引用来源都没有变化，说明这套东西是「低成本保险」而非改善项，归入「一次性铺好、不用再管」类，不要当成有验证收益的做法写进汇报。

## 常见坑

- **加了内容协商却不加 `Vary: Accept`。** 中间缓存会把 HTML 发给 agent、或把 markdown 发给浏览器。
- **`.md` 与 HTML 的重复内容。** 靠 `canonical` + `X-Robots-Tag: noindex` 缓解，这属于最佳实践而非硬保证。
- **用旧数据库里的预制摘要。** 段落会粘在一起，还可能混进原始 `<img>` HTML；改为从渲染后的正文生成摘要。
- **在 nginx `location` 内用 `if`。** 这是公认容易踩坑的写法，`rewrite ^ $uri.md last;` 依赖变量拼接，必须在自己环境里实测。
- **把 `Content-Signal` 当标准。** 它是新兴的非标准约定，别处的爬虫未必认。
- **把博客的 robots 策略照抄到产品站。** 作者是因为自己想被引用才全量允许，产品站应另作判断。
- **一次全站铺开。** 材料明确建议先 3–5 篇、跑两周，把最小闭环验证掉再扩量。

## 证据与来源

- **整套做法、nginx 配置、两条 `curl`、`llms.txt` 结构、`robots.txt` 写法、feed 与 JSON-LD 清单、IndexNow 脚本**：来自调研报告《Making My Blog Readable by AI Agents》，是该作者在自己静态博客上的实际配置，配置可照抄。
- **可直接复核的数字与产物**：`llms-full.txt` 约 225 KB；`og:image` 卡片 1200x630；IndexNow 脚本约 30 行；两条可直接执行的 `curl` 命令；完整的 nginx 配置片段。
- **只是作者主张、没有数据支撑的部分**：「现在读这个博客的很多人不是人，而是 agent」——没有 UA 统计或流量数据；「这样能让 AI 更准确地抓取和引用」——没有任何前后对比；「这对博客是正确选择」——是价值判断，不是测量结果。因此「怎么判断变好了」一节的指标必须自己测，不能引用原文结论。
- **属于调研报告的技术分析（非原文实测）**：`Content-Signal` 是非标准约定；nginx `location` 内用 `if` 容易踩坑；`canonical` + `noindex` 属最佳实践而非硬保证。
- **适用条件**：静态站点 + nginx + 构建期可控；产品站/商业站的 robots 与内容用途信号不能照抄——这一点原文作者自己就提示了。

## 依据的调研

- [Making My Blog Readable by AI Agents](../research/radar/2026-10-26/7023-making-my-blog-readable-by-ai-agents.md)：值得一试，可以把这套「给 AI 抓取方准备机器可读版本」的做法直接搬到自己的站点或文档库上小范围试点：构建期生成 .md 副本、用 Accept 头做内容协商、根目录放 llms.txt 索引、补齐 canonical 与结构化元数据，配置可照抄；但原文只有作者主张、没有任何抓取量或引用效果的前后对比，所以先试再定，别当成已验证的收益项。
