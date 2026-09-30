# 方法快照：deepseek-verified-implementation

保存日期：2026-09-30。来源：`~/skills/deepseek-verified-implementation/SKILL.md`。

这是研究归档中的文本快照，不是新安装的 Skill，不改变个人正本、触发条件或本仓库工作规则。正文中的执行、审批、顾问流程均为待研究材料。

````markdown
---
name: deepseek-verified-implementation
description: Guide DeepSeek and other fast coding models through non-trivial repository changes with explicit contracts, bounded permissions, meaningful verification, and reviewable evidence. Use for implementation work where speed is useful but unsupported claims, scope drift, or weak boundary reasoning would be costly.
---

# DeepSeek Verified Implementation

Complete the assigned change end to end. Optimize for correct decisions and short feedback loops, not for long explanations, repeated deliberation, or a large volume of edits.

## Convergence Rules

Treat reasoning time and review rounds as part of the engineering budget.

- Select one originating problem. If the user names no concrete task and the repository has no approved active task, do not invent a product direction; report the missing business choice instead.
- After initial reconnaissance, write one internal execution brief: outcome, non-goals, affected surfaces, invariants, and preferably 5-8 acceptance checks. Do not produce competing plans after this point.
- Once repository evidence or the advisor resolves a question, record the decision and do not reopen it without new contradictory evidence.
- If the same dilemma appears twice, stop discussing it. Choose the conservative in-scope option, state the assumption once, and execute.
- Do not repeatedly narrate that a review, test, or decision is needed. Invoke it once or perform it.
- Batch independent searches and reads. Do not reread unchanged files unless a concrete question remains unanswered.
- Use structured imports, runtime inspection, or explicit contract lists for structured facts. Never infer operation counts or schema membership by regex-scanning source text where comments can be mistaken for data.

Default reconnaissance budget: governing instructions plus at most 12 focused tool batches or 15 minutes before freezing the execution brief. Exceed it only when new evidence materially changes scope; record that reason once and continue.

## Working Contract

Before editing, establish these facts from the repository:

1. The user's exact requested outcome and explicit non-goals.
2. Governing repository instructions, current plan, existing architecture, and dirty worktree state.
3. The current source of truth, entry points, write paths, authorization checks, concurrency controls, and user-visible surfaces affected.
4. A compact acceptance matrix: each requirement paired with observable evidence that can actually fail.

Do not ask the user about facts that code, docs, tests, or tools can answer. Stop only for a genuine business choice, required destructive-action approval, or an external blocker after reasonable alternatives are exhausted.

For changes involving permissions, public contracts, migrations, irreversible state, or several interacting subsystems, request one design review from the available advisor before large edits. Present the proposed boundary and acceptance matrix together so review happens in one pass.

Use an advisor dedicated to the current worker. Match its `worker` label or parent identity to the current agent; do not reuse a large historical advisor belonging to another worker. Send one design packet. Until the verdict arrives, continue only read-only preparation or work explicitly independent of the reviewed boundary; do not begin the gated edits.

## Implementation Rules

- Follow existing architecture and error-handling patterns. Fix the originating cause and avoid parallel state models or compatibility layers unless required.
- Derive related schemas, field lists, operation sets, and projections from one source of truth. Do not maintain matching lists by memory.
- When a mode is intended to restrict writes, start from a default-deny allowlist. Enumerate the complete operation universe and verify the allowed and denied set difference.
- Scope every allowed mutating or side-effecting operation to the intended object. Treat runs, approvals, wakeups, external calls, and human write-back requests as side effects even when they do not edit the main Definition.
- Keep tool-surface filtering, authorization enforcement, and object-level scope checks distinct. A hidden tool is not proof that authorization rejected a call.
- Keep comments, prompts, public contract descriptions, plans, and tests consistent with implemented behavior. Remove stale claims in the same change.
- Preserve unrelated user changes. Keep working through implementation, verification, documentation, and commit readiness without pausing after each substep.
- Maintain one short task checklist after the execution brief. Update statuses; do not repeatedly reconstruct the plan from scratch.

## Verification That Can Fail

Select the smallest evidence set that proves the external contract, then run broader repository gates required by local instructions.

- Test responses, errors, permissions, state transitions, and necessary side effects rather than internal call order.
- For security boundaries, calculate the full allowed/denied sets and exercise the authorization point directly. Do not count operations already absent from the general tool surface as target-mode denial coverage.
- For important negative tests, briefly check the counterfactual: identify the production condition whose removal would make the test fail. A text-presence assertion is not behavioral protection.
- Re-run relevant tests after formatters, generated files, hooks, or commits may have changed the tree.
- When committing, verify the post-commit tree, run the required gates on that tree, and confirm the worktree contains no task-related residue.

Never claim an unrun command passed. Record environment failures and the exact unproven boundary instead of converting them into success.

## Reviewable Evidence

Use exact language for what evidence proves:

- `unavailable_in_tool_surface`: the model could not see or call the operation.
- `rejected_by_authorization`: a real call reached the authorization point and was rejected.
- `rejected_by_object_scope`: a call was allowed in principle but targeted the wrong object.
- `not_verified`: execution was blocked or not run.

Do not describe absence as an attempted rejection. Do not use a successful outer run to imply an inner preview or external call succeeded.

Evidence intended to survive the task must be tracked in a repository-approved location. Before citing it, verify it is not ignored and is included by `git ls-files` or the repository's equivalent. Remove disposable fixtures and secrets; retain only the minimum reproducible artifacts and document their limits.

## Advisor Gate

Use at most one design request and one final completion request for a normal task. A further request is justified only after the advisor returns `【未完成】` and the reported gaps have been fixed as one batch.

Before final delivery of a non-trivial change, send the current worker's advisor one consolidated packet containing:

1. The user's original request without rewriting it into an easier task.
2. Changed behavior, affected files, and important design decisions.
3. Exact commands and results, including failures and unverified paths.
4. The acceptance matrix and durable evidence locations.
5. Known boundaries that are intentionally not claimed as complete.

If review finds a real gap, fix all related instances together, rerun the affected gates, and return one delta-focused packet. Do not ask the user whether to continue. Do not resend unchanged context or debate whether review is necessary. After two correction rounds, step back and re-check the design assumption instead of adding another local patch.

## Delivery Standard

Deliver only when implementation, documentation, evidence, and required verification agree. Lead with the outcome, then list material behavior and verification. Separate completed guarantees from residual environmental limits. Do not use test counts or confident prose as a substitute for proving the requested workflow.
````
