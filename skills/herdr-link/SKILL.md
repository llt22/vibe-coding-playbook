---
name: herdr-link
description: Agent-to-agent messaging protocol over Herdr. Use when two or more agents running in Herdr panes need to exchange work, ask questions, or hand off results without polling or watching each other's terminals. Covers the single pane-ID addressing rule and failure diagnosis.
---

# Herdr Link

Agent-to-agent messaging over Herdr. Every agent in a Herdr workspace can send
messages to any other recognized agent. The protocol is event-driven: sender
fires and walks away; recipient wakes, does the work, fires back. No polling,
no output watching, no polling, no output watching.

## Applicability

Any agent pane managed by Herdr: `codex`, `omp`, `claude`, `gemini`, etc.
Check you are inside Herdr first: `test "${HERDR_ENV:-}" = 1`, otherwise stop
and say you are not running inside Herdr.

## Addressing — pane ID is the only address

Agents are addressed **only by pane ID**: `herdr agent prompt w3:p2 "…"`.

Pane IDs are workspace-qualified (`w3:p1`, `w3:p2`, …), always unique among
live panes, and resolve to the agent occupying that pane — even when several
agents share the same kind label (`omp` on every omp pane, `codex` on every
codex pane). Agent **names collide** across same-kind agents, so they are never
used to address. Nothing else works either: no `Main`, no "the other pane", no
terminal IDs, no kind labels.

- Your own pane ID: `$HERDR_PANE_ID` (plus `$HERDR_WORKSPACE_ID`,
  `$HERDR_TAB_ID`).
- Every peer's pane ID: `herdr agent list` → the `pane_id` field of each row.

Pane IDs are not guaranteed stable across a session — a pane can be moved or
recreated and its ID changes. Treat any `agent_not_found` as a stale address:
re-run `herdr agent list` and use the current `pane_id` of that row. If your
own pane ID changes mid-relay, broadcast your new ID to every peer you are
exchanging with, so their replies keep landing.

On first contact, state only your own pane ID — the unique address the peer
should reply to — and have the peer list the pane IDs itself:

> 我是 w3:p2。用 `herdr agent list` 确认我的 pane_id，回复一句确认，然后
> 用 `herdr agent prompt w3:p2 "<你的回复>"` 回发给我。

## The single rule

Sending a message:

```bash
herdr agent prompt <peer-pane-id> "message"
```

- `herdr agent prompt` delivers the text into the peer's input stream and wakes
  it. Success returns JSON with `"type":"agent_prompted"` immediately.
- **Always sign your own pane ID in the message.** The prompt delivers only
  your text — no sender metadata — so the peer's only way to reply is the pane
  ID you wrote. Restate your ID in every message: agent context resets on
  session restart, so the peer cannot be assumed to still know it. A one-word
  omission turns a fire-and-forget send into a dead end.
- **Never** add `--wait`, `--until`, or `--timeout` to a prompt. `--wait` blocks
  on the peer's lifecycle state and turns the sender into a watcher. Fire and
  forget.
- If the result is long (a report, a diff, a spec), keep the prompt short and
  tell the peer to read your session output: `已完成，读我的会话看结果，回复到 w3:p2`.

Receiving a message:

- A prompt addressed to your pane ID appears in your input stream. Do the work,
  then reply with the same one-liner:
  `herdr agent prompt <sender-pane-id> "<result summary>"`.
- Keep replies short; long content留在会话中，让对方自行读取。

Concurrency and duplicates:

- Messages may arrive while you are mid-turn; they queue in your input stream
  and are processed in order. Do not drop a queued message because a newer one
  arrived — handle each, or explicitly tell the sender you are deferring.
- A sender may resend (e.g. after a timeout guess). If you already answered the
  same request, reply once more with the same result — idempotent replies are
  cheap; a lost reply is not.
- If two peers ask you for the same work, do it once and send the result to
  both, noting it is shared.

## Prohibited

- Addressing by agent name — names collide across same-kind agents; pane IDs
  do not.
- `herdr agent read <peer>` — watching the peer's output. The peer will tell
  you when it is done.
- `herdr agent wait <peer>` / `prompt ... --wait` — blocking on the peer's
  lifecycle. Same reason.
- File-based handoffs — agents can read each other's session,不需要写文件中转。

## Failure diagnosis

- `"code":"agent_not_found"` — the pane ID is stale (the pane moved) or
  mistyped. Re-run `herdr agent list`, take the current `pane_id` of the target
  row, and resend.
- `"type":"agent_prompted"` without error — delivery succeeded. Do not resend.
- Sent, then the peer's reply never arrives — the peer may still be busy with
  its current turn, or your pane moved and the reply went to the old ID.
  Re-check your own `$HERDR_PANE_ID`; if it changed, broadcast the new ID to
  every peer and resend once.
- `agent_blocked` — the peer is paused at an approval/question UI. Ask the
  human before answering for it; do not auto-send into a blocked dialog.

## Workflow shape

```
A (w3:p2): herdr agent prompt w3:p3 "do X; reply 'B done: <X结果>' to w3:p2"
           → agent_prompted, walk away
B (w3:p3, woken): does X
B: herdr agent prompt w3:p2 "B done: <X结果>"
   → agent_prompted, walk away
A (woken): continues with the result
```

Multi-round relays chain the same step. The human never polls; agents never
watch each other.
