# k8s-servant/k8s-skills

- 结论：**值得一试**。建议先在非生产 kind 集群小范围试用：按 README 安装 k8s-skills，给 agent 只读 kubeconfig，并用“只读自由执行、变更先问、破坏性只建议”的三级流程排障；理由是它给出了可照做的安装、权限和验证方法，但本次只有 README，未核验各 SKILL.md 与完整测试记录，不宜直接全量推广。
- 原文：https://github.com/k8s-servant/k8s-skills
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T06:46:35.088Z

## 是什么
k8s-skills 是一组面向 AI agent 的 Kubernetes 排障 Agent Skills。它把 SRE 的排障顺序、证据判断和修复建议写成 SKILL.md，要求 agent 先只读调查、变更前询问、破坏性操作只建议不执行。README 声称包含 26 个 skill、79 个场景，支持 Claude Code、Codex、Gemini CLI、GitHub Copilot 等能读取 SKILL.md 并执行 kubectl 的 agent。

## 具体做法
1. **准备非生产验证环境。** 前提：有一个可丢弃的 kind 集群或非生产集群、可用的 kubectl context，以及能读取 SKILL.md 并执行 kubectl 的 agent。首次不要直接对生产集群使用。
2. **安装 skills。** 前提：有 Node/npx，或可 git clone。README 推荐全量安装，因为 skill 之间按名称交接；只装一个也能工作，但交接会退化为提示。Claude Code 全量安装：
```bash
npx skills add k8s-servant/k8s-skills -a claude-code
```
只装一个：
```bash
npx skills add k8s-servant/k8s-skills -s k8s-triage -a claude-code
```
Gemini CLI：
```bash
gemini extensions install https://github.com/k8s-servant/k8s-skills
```
也可 clone 后复制：
```bash
git clone https://github.com/k8s-servant/k8s-skills.git ~/k8s-skills
mkdir -p ~/.claude/skills && cp -R ~/k8s-skills/skills/* ~/.claude/skills/
```
项目内安装：
```bash
mkdir -p .claude/skills && cp -R ~/k8s-skills/skills/* .claude/skills/
```
3. **给 agent 只读身份。** 前提：有创建 ServiceAccount/RBAC 的权限。使用仓库的 docs/read-only-agent.yaml（README 说明可直接 apply），它绑定内置 view ClusterRole；再用该 ServiceAccount 的 kubeconfig 运行 agent。若要让 k8s-triage 看全集群、node/storage skill 工作，额外允许对 nodes、persistentvolumes，以及 storage.k8s.io 下 storageclasses、csidrivers、csinodes、volumeattachments 的 get/list/watch；k8s-rbac-troubleshooting 额外允许 roles、rolebindings、clusterroles、clusterrolebindings 的 get/list；k8s-api-troubleshooting 额外允许 validatingwebhookconfigurations、mutatingwebhookconfigurations、validatingadmissionpolicies、apiservices、customresourcedefinitions、flowschemas、prioritylevelconfigurations 的 get/list；AKS skill 给 agent 的 Azure 身份 Reader 角色。任何层级都不读 Secrets。
4. **描述问题让 agent 开始。** 示例：
```text
my-app in my-namespace keeps restarting. Find out why.
```
5. **要求 agent 按三级权限输出。** 只读命令（get、describe、logs、events、top 等）可自由执行；可逆变更（set image、set resources、rollout undo、scale、patch、cordon、uncordon 等）和容器内只读 exec 必须先问，输出 `> Ask first: the agent runs this only after the user approves it.`；破坏性或难撤销操作（delete、drain、replace、apply 等）只给建议，输出 `> Proposed fix: review before running. The agent does not run this.`。每个变更都要有 `# Undo:` 行。
6. **按 triage 到专用 skill 的顺序排障。** 问题不清楚时先用 k8s-triage 做节点、pod、事件和资源使用的排序首查；再交给 workload、network、DNS、storage、autoscaling、RBAC、API、node 或具体生态 skill。全量安装时交接最顺；缺目标 skill 时，README 说 agent 会继续用已有步骤并指出缺少哪个 skill。
7. **用场景验证 agent 行为。** 前提：仓库 tests 和测试工具可用。用 tests/<skill>/<case>/expected.md 作为评分卡：fresh agent 只拿到 skill、prompt 和 view-only kubeconfig，必须说出原因、指出证据、提出可接受修复，且不做任何变更。README 指向 CONTRIBUTING 的 “Scenarios and the test kit” 说明如何自己跑；本次材料未给出具体运行命令，不要臆造。
8. **记录每次试用结果。** 至少记录场景是否通过、是否出现未授权变更、是否读取 Secrets、是否给出 Undo 行、诊断耗时和人工对修复建议的接受度。

## 对应的研究问题
- **能力发现：** 原文显示 AI 可承担 K8s 首轮排障、证据收集和修复建议，覆盖 Pending、CrashLoopBackOff、镜像拉取、OOMKilled、探针失败、Service/DNS/NetworkPolicy、PVC、HPA/KEDA、cert-manager、Flux/Argo CD、Helm、Kyverno/Gatekeeper、Prometheus/Grafana、Istio/Envoy、RBAC、API server、节点和 AKS 等。原文用 26 个 skill、79 个场景说明范围。
- **任务匹配：** 适合能读取 SKILL.md 且能执行 kubectl 的 agent；README 点名 Claude Code、Codex、Gemini CLI、GitHub Copilot。只读调查和“先问再改”的可逆修复适合交给 agent；破坏性操作只适合让 agent 提建议。全量安装优于单装，因为 skill 之间会按名称交接。
- **条件供给：** 需要提供 skill 文件、kubectl 访问、按 skill 收窄的 RBAC、只读 kubeconfig、明确的审批边界、Undo 行要求和测试场景。Secrets 不提供、不读取。agent 的 auto-approve 模式不能替代 RBAC 限制。
- **主动推进：** 原文没有给出由时间、事件或状态触发并持续运行的机制；主要是用户描述问题后由 agent 调查。CI 检查是仓库维护自动化，不是业务排障的持续触发。
- **效果验证：** 原文给出场景化验证：在 kind 上故意破坏，expected.md 写明原因、证据、可接受修复和错误答案；fresh agent 用只读 kubeconfig 通过才算成功。CI 还检查命令层级、ask-first/fix 块、Undo 行和禁止读 Secrets。原文未给通过率等量化结果。

## 与已有做法的关系
- **Claude Code（清单状态 adopt）：** 直接相关。README 给出 `-a claude-code` 安装方式和 `~/.claude/skills` 复制方式，可作为 Claude Code 的 K8s 排障 skill 套件试用。
- **GitHub Copilot（清单状态 drop）：** README 声称支持 GitHub Copilot，并说项目内可读 `.agents/skills` 或 `.github/skills`；但这只是兼容性声明，未见实际验证。按清单状态，不把它作为采用依据。
- **Agent skills（清单状态 adopt）：** 高度相关。k8s-skills 就是 Agent Skills 的具体实现，使用 SKILL.md、progressive disclosure 和 skill 间交接，可作为“如何写可验证 skill”的案例。

## 证据与局限
- 原文给出的证据：26 个 skill、79 个场景；每个场景在 kind 上故意破坏；错误信息、日志行在固定版本 kind 上复现；CI 用 skillcheck 检查命令层级、ask-first/fix 块、Undo 行和禁止读 Secrets；每个 skill 列出 verified-with/verified-on 版本。
- 原文只是作者主张、未给量化数据：没有场景通过率、误报率、平均诊断耗时、人工采纳率，也没有独立第三方评测。
- 适用条件：kind 不能复现云负载均衡、云存储、托管节点池等云专属行为；云 skill 的场景在真实托管测试集群的单 namespace 运行，且需显式指定 context，其余内容按 provider 文档检查。版本固定，其他版本消息和默认值可能变化。
- 安全边界：README 明确说 ask-first 是 agent 遵循的指令，不是锁；auto-approve 模式可能不询问。真正的限制来自给 agent 的 Kubernetes RBAC。
- 本次只读到 README，未核验各 SKILL.md 的具体步骤和测试日志，因此不建议直接全量 adopt，先 try。

## 怎么试、怎么验证
- **最小试用：** 在一个非生产 kind 集群安装全部 skill，创建只读 ServiceAccount/kubeconfig，先跑 3 到 5 个场景，例如 oom-killed、image-pull-wrong-tag、selector-mismatch、missing-storageclass、node-not-ready。每个场景用 fresh agent，只给 skill、prompt 和只读 kubeconfig。
- **判断改善的指标：** 场景通过率（是否说出原因、指出证据、提出可接受修复）；未授权变更次数应为 0；读取 Secrets 次数应为 0；每个变更建议是否带 `# Undo:`；诊断耗时相对人工基线是否下降；人工对修复建议的接受率是否上升。任一安全指标不达标就停止扩大试用。
