---
name: workflow-learning
description: Review completed non-trivial work for reusable workflows, corrections, or proven techniques; track recurrence and propose creating or updating a skill. Do not use for routine one-step tasks or unresolved attempts.
---

# Workflow Learning

Turn verified experience into durable procedural guidance without turning every
session into a new skill. Run at a natural task boundary after the requested
work and verification are complete; never interrupt the primary task.

## Qualifying Signals

Assess the completed work when at least one signal exists:

- The user corrected a reusable workflow, decision rule, or sequence.
- A non-trivial, verified technique or workaround is likely to recur.
- The same class of workflow has appeared in a distinct task before.
- A loaded or clearly relevant skill proved incomplete or outdated.
- The user explicitly asks to remember, standardize, or turn work into a skill.

Do not capture routine commands, one-off facts, transient environment failures,
unresolved attempts, speculative solutions, or a narrative that only makes
sense for the current incident.

## Review Procedure

1. Distill the reusable outcome in one sentence. Separate the general method
   from current names, dates, paths, IDs, and incidental failures.
2. Confirm the method actually worked. Cite verification or a user-confirmed
   correction; do not promote an untested proposal.
3. Inspect the available skill catalog. Prefer a narrow update to an existing
   relevant skill over creating a near-duplicate.
4. Propose promotion only when one of these is true:
   - the user explicitly requested durable capture;
   - a confirmed user correction materially changes future workflow; or
   - the candidate has verified observations from at least two distinct tasks.
5. Determine the skill scope:
   - **Project-level** (`<project>/.claude/skills/`): the workflow is tied to
     this project's specific tech stack, conventions, deploy process, or domain
     logic, and would not apply elsewhere.
   - **Global** (`~/skills/`): the workflow is general-purpose or has been
     verified across multiple projects.
   When uncertain, default to project-level — it is easy to promote later.
6. Before any skill creation or edit, show the proposed target, scope, and
   concise change, then obtain user confirmation.
7. After confirmation, follow the `skill-management` skill to create or update
   the target skill. Keep the skill class-level, preserve existing ownership
   and invocation policy.

## User-Facing Output

Stay silent when a first observation is merely recorded. When promotion is
warranted, state only:

- the reusable learning;
- the evidence or recurrence count;
- whether to update an existing skill or create a new one;
- the proposed scope;
- a request for confirmation before writing.

If no qualifying signal exists, do nothing and do not mention this review.
