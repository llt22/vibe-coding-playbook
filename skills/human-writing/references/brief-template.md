# 写作简报模板

长文、观点、实测和调研在动笔前填写。短消息和 500 字以内速记可以跳过。

把模板复制到临时文件，例如 `/tmp/article-brief.yaml`，不要提交进文章仓库。

```yaml
mode: 观点 # 教程 | 实测 | 观点 | 调研 | 随笔
reader: 已经使用编码 Agent，但没有系统管理工具环境的开发者
outcome: 读完后能重新划分人和 Agent 各自负责的工作
scope: 只讨论开发工作，不讨论组织人事管理

claim: 开发者最稀缺的能力正在从手写代码转向识别模型边界和配置工具环境
evidence:
  - 本地 Agent 通过 SSH 直接排查服务器，替代本地与远端之间的人肉复制
  - 旧视频工程依赖大量模板，新模型可以直接生成可用代码
reasoning: 两个案例分别说明工具组合和模型升级会改变可委派边界
counterargument: 高风险生产操作仍需权限隔离与人工确认
limitations: 案例来自个人工作流，不能直接代表所有团队
sources:
  - https://example.com/source

# 以下字段按文体使用
prerequisites: []       # 教程
completion_test: ""     # 教程
failed_attempts: []      # 实测
criteria: []             # 实测
source_conflicts: []     # 调研
uncertainties: []        # 调研
event: ""               # 随笔
concrete_details: []     # 随笔
voice_samples: []        # 随笔，作者真实说过的词句
```

字段必须写具体内容。`待补充`、`暂无`、`TBD` 和空数组不算完成。
