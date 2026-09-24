---
name: ai-tool-radar
description: "Scan and verify noteworthy AI and Agent tools across developer communities. Use only when the user explicitly invokes $ai-tool-radar; never activate it implicitly for ordinary AI, tool, or research questions."
---

# AI Tool Radar

Discover AI and Agent tools that are newly gaining adoption or were previously
missed, then separate useful projects from marketing spikes and risky installs.
This skill is research-only unless the user separately asks to install or modify
something.

## Scope

Infer the topic, time range, and desired depth from the request. When a value is
missing, state a practical assumption and continue. Use exact calendar dates in
the result.

Run two complementary passes:

1. **Current signals:** find projects gaining attention now.
2. **Historical recovery:** search the requested period for projects that
   launched or broke out earlier but no longer appear on daily rankings.

Do not equate repository creation time with breakout time. Include older
repositories when releases or community adoption occurred inside the requested
window.

## Research

When browser access is needed, use the available browser skill and keep one
browser task space for the whole scan.

Build candidates from several of these surfaces as available:

- GitHub repository search, Trending, topics, releases, commit activity, and
  issue/discussion evidence
- Trendshift or comparable repository-growth views
- skills.sh and relevant skill/plugin directories
- Hacker News, including low-scoring Show HN submissions
- Reddit communities with hands-on user discussion
- V2EX and other relevant Chinese developer communities
- X reply/quote networks and project Discord channels when accessible

Search both project announcements and comparison language such as alternatives,
versus, daily driver, stopped using, migration, failure, and security concerns.
Do not rely on AI news aggregators as the primary discovery source.

For each serious candidate, verify as much of the following as the evidence
allows:

- canonical repository or product page
- creation date, meaningful release or breakout date, and recent activity
- actual product shape, supported environments, and installation boundary
- independent discussion, comparison, or usage evidence
- license and maturity labels such as alpha or beta
- credential, browser-session, network, telemetry, and supply-chain risks

Prefer one primary source plus one independent adoption source. When only a
project-authored source exists, label the finding as unverified rather than
discarding or overstating it. Treat star counts as a discovery signal, not proof
of quality or adoption.

## Classification

Deduplicate renamed, migrated, and closely related projects. Classify the final
shortlist by decision value:

- **Try now:** mature enough and supported by credible usage evidence
- **Study:** useful architecture or product ideas, but not necessarily ready
- **Watch:** early, weakly validated, or still changing quickly
- **Avoid for now:** abandoned, credential-sensitive, unsafe, or primarily
  dependent on bypassing another service's controls

Explain why each project is in its group. Preserve uncertainty and identify
channels that could not be checked. Never claim the scan is exhaustive.

## Output

Lead with the strongest findings, not the search diary. Include:

- the exact scan window and topic
- a concise ranked shortlist with canonical links
- the evidence that materially supports each ranking
- security or trust-boundary concerns
- what the scan reveals about where future discoveries are likely to surface

Keep discovery separate from installation. Do not clone repositories, install
packages or skills, authenticate services, or change subscriptions unless the
user explicitly requests that additional action.
