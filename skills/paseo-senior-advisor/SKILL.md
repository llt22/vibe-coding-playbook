---
name: paseo-senior-advisor
description: Consult a stronger Paseo advisor before stopping, narrowing scope, or handing an unfinished engineering decision to the user. The explicit user phrase "咨询继续" means consult the advisor about the current state and then resume the task. Ask the user directly only for intent, information, or approval that only they can provide.
---

# Paseo Senior Advisor

Keep unfinished work moving instead of returning ordinary engineering uncertainty to the user.
When the user says `咨询继续`, treat it as an explicit invocation: consult about the current task state, verify the advice, and continue the original task without asking what the phrase means.

## Decision Gate

Before asking the user a question or ending an unfinished task:

1. Continue yourself when investigation or a reversible engineering choice can resolve it.
2. Ask the user directly when only they can supply intent, business meaning, credentials, external material, authorization, or high-impact approval.
3. Otherwise, if you are about to stop, report a block, narrow scope, abandon the plan, or ask the user to choose the engineering direction, consult the advisor first.

Do not consult merely because the task is difficult, and do not consult after the task is genuinely complete. Repository, safety, permission, and approval rules still apply.

## Consult

Require `paseo`, `jq`, and a Worker ID, then stop immediately if the current Worker is already an advisor:

```bash
command -v paseo >/dev/null && command -v jq >/dev/null && [ -n "${PASEO_AGENT_ID:-}" ]
if paseo agent ls --label role=senior-advisor --json \
  | jq -e --arg id "$PASEO_AGENT_ID" 'any(.[]; .id == $id)' >/dev/null; then
  exit 0
fi
```

If a prerequisite is unavailable, continue with normal judgment and report any CLI failure honestly. Never recurse from a Worker labeled `role=senior-advisor`.

Rediscover the advisor each time in the current Paseo scope:

```bash
paseo agent ls \
  --label role=senior-advisor \
  --label worker="$PASEO_AGENT_ID" \
  --json
```

Reuse exactly one match. Never select across Workers or send one consultation to multiple advisors. If none exists, create it synchronously with the first consultation:

```bash
paseo agent run --json \
  --title "Senior Advisor: <short task name>" \
  --provider claude/claude-opus-5 \
  --thinking high \
  --mode bypassPermissions \
  --wait-timeout 15m \
  --label role=senior-advisor \
  --label worker="$PASEO_AGENT_ID" \
  "<advisor role and consultation handoff>"
```

Use another configured stronger model if the default is unavailable. The consultation handoff must compactly include:

- the task, decision boundary, and acceptance target;
- completed work and evidence, clearly separated from the Worker's interpretation;
- the obstacle, current interpretation, and viable next actions;
- an analysis-only role: no edits, Git changes, deployments, deletion, or external mutations;
- permission to inspect any code, documents, history, or runtime evidence necessary to independently verify the decision;
- a prohibition on unrelated repository audits, adjacent product expansion, or investigation beyond the current decision boundary;
- a request for an evidence-backed recommendation, material uncertainty, and concrete next action.

Do not optimize the consultation for speed at the expense of independent judgment. The advisor may challenge the Worker's assumptions and gather additional evidence when needed, but must stop once the current decision is adequately supported.

`bypassPermissions` is intentional so evidence gathering cannot stall on approvals. Keep the advisor analysis-only in the handoff.

For an existing advisor, start the consultation and wait for it in the same turn with a fifteen-minute bound:

```bash
paseo send --json --no-wait <advisor-agent-id> "<consultation>"
paseo agent wait --json --timeout 900 <advisor-agent-id>
paseo agent logs --tail 20 --filter text <advisor-agent-id>
```

`--no-wait` only separates submission from the bounded wait; do not continue the original decision until the advisor replies or the wait times out. On timeout or CLI failure, do not claim that cross-model review completed; preserve the advisor session, finish only work that does not depend on its opinion, and report the missing consultation honestly.

Treat the response as advice. Verify material claims, then continue or replan. Report completion only after independently checking the acceptance criteria. Ask the user only when the response identifies input or approval that only the user can provide.

Do not open another consultation for the same unchanged question. Re-consult only when new evidence materially changes the decision. If a verified advisor recommendation still fails, continue with another viable approach; when only user-supplied intent, information, or approval can resolve the remaining issue, present the evidence and ask the user directly.
