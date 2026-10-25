# Making My Blog Readable by AI Agents

- 结论：**值得一试**。可以把这套「给 AI 抓取方准备机器可读版本」的做法直接搬到自己的站点或文档库上小范围试点：构建期生成 .md 副本、用 Accept 头做内容协商、根目录放 llms.txt 索引、补齐 canonical 与结构化元数据，配置可照抄；但原文只有作者主张、没有任何抓取量或引用效果的前后对比，所以先试再定，别当成已验证的收益项。
- 原文：https://deallocatedobjects.com/posts/making-my-blog-readable-by-ai-agents
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-25T18:41:13.078Z

## 是什么

作者把自己维护的静态博客改造成「对 AI 智能体友好」的形态：每篇文章额外提供纯 markdown 版本，通过 `Accept` 头做内容协商；站点根目录放 `llms.txt` / `llms-full.txt` / `index.md` 说明文件；`robots.txt` 显式允许各家 AI 抓取并声明内容用途；feed 与 JSON-LD 补齐摘要和结构化信息；发布时用 IndexNow 推送 Bing。

整套东西本质是一份「给自动抓取方准备上下文」的模板：不依赖框架，构建期生成文件 + 几行 nginx 配置。作者的原话是「大部分就是一堆文件」。

## 具体做法

**前提**：静态站点、由 nginx 提供服务、构建期能生成文件。动态渲染的站点需要另找落点。

1. **为每篇文章生成 markdown 副本**，URL 为原 URL 加 `.md`。文件头加 YAML frontmatter：title、canonical URL、author、日期、简短 description，后面接正文。作者的老文章本来就是 markdown，构建时只做清洗，并把图片指向自托管副本。

   验证：
   ```shell
   curl https://<你的站点>/posts/<slug>.md
   ```

2. **用 Accept 头做内容协商**，同一个 URL 对 agent 返回 markdown、对浏览器返回 HTML。nginx `http` 上下文加映射，`server` 块加一条 location：

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

   验证：
   ```shell
   curl -H "Accept: text/markdown" https://<你的站点>/posts/<slug>
   ```

3. **每个响应都加 `Vary: Accept`**，否则中间的缓存可能把 HTML 发给 agent、或把 markdown 发给浏览器。

4. **给 `.md` 响应加两个头**：`Link: <HTML页URL>; rel="canonical"` 指回 HTML 页面，`X-Robots-Tag: noindex` 避免被搜索引擎当成每篇文章的重复副本。

5. **站点根目录放 `/llms.txt`**：一行站点简介 + 如何获取 markdown + feed 地址 + 希望被如何引用 + 全部文章清单（每篇带 markdown 链接和一行摘要）。再补 `/llms-full.txt`（全站正文合并成一个文件，作者站点约 225 KB）和 `/index.md`（首页的 markdown 版）。其中「希望被如何引用」这一条是关键：它把引用规范写进了供给材料。

6. **所有响应带 `Link` 头指向 `llms.txt`**，让 agent 不用猜位置。

7. **`robots.txt` 显式表态**：默认允许，并逐个点名主要爬虫（GPTBot、ClaudeBot、PerplexityBot、Google-Extended 等十余个），再加一行内容用途信号：

   ```
   User-agent: *
   Allow: /
   Content-Signal: search=yes, ai-input=yes, ai-train=yes
   ```

   作者明确说明这是「博客」的选择——他想被引用；产品站点应另作判断。

8. **Feed 补齐**：保留原有 Atom `/feed`，每条 entry 加 summary 和 `text/markdown` alternate link；另加 JSON Feed，每项用自定义键 `_markdown_url` 指向 markdown 版（JSON Feed 允许以下划线开头的自定义键）。

9. **每页补齐元数据**：真实 meta description、canonical URL、robots 标记、`lang="en"`；Open Graph 与 Twitter card，含 `article:published_time` / `article:modified_time`；JSON-LD 结构化数据——文章页 `BlogPosting` + `breadcrumb`，索引页 `WebSite` + `Blog` + `Person`。注意作者踩过的坑：旧数据库里的预制摘要把段落粘在一起（`…your app.The RevealWhat do I mean…`），还有几条混着原始 `<img>` HTML；现在改为从渲染后的正文生成摘要。

10. **顺手修掉旧标记**：去掉 viewport 里的 `maximum-scale=1`（它禁止手机上双指缩放）；补上 1200x630 的 `og:image` 预览卡（此前在 X / Threads 分享时抓的是页面顶部 banner）。

11. **发布时自动推送 IndexNow**：申请 key，写一个约 30 行的脚本，文章发布时 ping Bing 等（Google 不参与，但 Bing 索引喂给不少 AI 搜索工具）。

## 对应的研究问题

- **能力发现**：间接相关。原文没有讨论「AI 还能做什么没想到的事」，但它示范了一件容易被忽略的无形工作——为自己的内容准备机器可读的入口、索引和引用规范，这本身可以整体交给构建脚本自动完成。
- **任务匹配**：相关且有依据。同一份内容按请求方分流：agent 拿纯 markdown（减少 HTML 噪声），浏览器拿 HTML；在 robots.txt 里对不同抓取方（GPTBot / ClaudeBot / PerplexityBot / Google-Extended）分别表态；用 IndexNow 走 Bing 这条对 AI 搜索影响更大的索引通道。属于「什么任务走什么格式、什么通道」。
- **条件供给**：这是全文最厚的部分。提供的信息包括：markdown 全文、`llms.txt` 的站点说明与文章清单、每篇的 frontmatter 与一行摘要、canonical 指路、feed 里的 markdown 备用链接、JSON-LD 结构化数据，以及「希望被如何引用」的显式约定。对应研究问题里的「信息 + 反馈」维度。
- **主动推进**：相关。`.md` 文件、摘要、JSON-LD、`llms.txt` 清单都在构建期自动生成，无需人工；IndexNow 脚本由「发布」这个事件触发，自动 ping 搜索引擎。属于事件驱动的自动化，但原文没有涉及按时间或状态持续轮询的部分。
- **效果验证**：原文完全缺失，这是最大空白。作者没有给出任何抓取量、引用率或来源流量的前后对比。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

**原文给出的具体数字与可复核物**：`llms-full.txt` 约 225 KB；og:image 卡片 1200x630；IndexNow 脚本约 30 行；两条可直接执行的 `curl` 命令用于自测；完整的 nginx 配置片段。

**只是作者主张的部分**：「现在读这个博客的很多人不是人，而是 agent」——没有任何 UA 统计或流量数据支撑；「这样能让 AI 更准确地抓取和引用」——没有任何前后对比；「这对博客是正确选择」——是价值判断，不是测量结果。

**技术上的注意点**：`Content-Signal` 是新兴的非标准约定，别处的爬虫未必认；在 nginx `location` 内使用 `if` 是公认容易踩坑的写法，`rewrite ^ $uri.md last;` 依赖变量拼接，需要在自己环境里实测；`.md` 与 HTML 的重复内容问题靠 `canonical` + `noindex` 缓解，属于最佳实践而非硬保证。

**适用条件**：静态站点 + nginx + 构建期可控。产品站 / 商业站的 robots 与内容用途信号策略不能照抄——作者自己就提示了这一点。

## 怎么试、怎么验证

**最小试用**：只挑 3–5 篇最常被引用或最常被问起的文档，做 `.md` 版本 + 一个 `llms.txt` + `Vary` / `Link` / `X-Robots-Tag` 三个响应头，nginx 配置照抄，跑两周。暂不做 IndexNow 和完整 JSON-LD，先验证最小闭环。

**判断有没有改善的指标**（基线取改动前同样长度的日志窗口）：

1. nginx 日志里 AI 爬虫 UA（GPTBot / ClaudeBot / PerplexityBot）的请求数与被请求路径；
2. `.md` 端点的 200 比例，以及 `Accept: text/markdown` 协商的实际命中次数（如果几乎没人带这个头，说明收益主要来自 `.md` 直链，而不是内容协商）；
3. `llms.txt` / `llms-full.txt` 的请求量；
4. referrer 中来自 chatgpt.com / perplexity.ai 等的会话数；
5. 抽查 agent 回答中的引用是否带上了 canonical URL——即原文第 5 步写下的引用约定有没有被遵守。

若爬虫抓取和引用来源都没有变化，说明这套东西是「低成本保险」而非改善项，写进手册时应归入「一次性铺好、不用再管」类，不要当成有验证收益的做法。
