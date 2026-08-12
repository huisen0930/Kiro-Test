---
name: prepare-pr
description: Generate PR description + Self Assessment Review artifacts for a FocusFlow branch. Produces two paste-ready markdown blocks and saves to pr-drafts. Invoke with /prepare-pr.
---

# prepare-pr — PR Description + Self Assessment Review

Generate the copy-paste-ready Markdown for the user to paste into GitHub, and **always save it to one `.md` file per issue** (`pr-drafts/<branch>.md`). The user opens the PR and pastes; this skill produces the text AND writes the file automatically (no "want me to save?").

**Two paste artifacts** go into GitHub, both assembled from the branch diff + the `/code-review` and `/design-vs-req` findings that ran just before:
1. **PR Description** — the PR body (what changed and how to verify it).
2. **Self Assessment Review** — the first PR comment. ONE consolidated review: the `/design-vs-req` coverage matrix IS the Requirements Checklist, and the `/code-review` findings populate Critical Issues / Warnings. There are NO separate "Code Review" or "Design vs Requirements" sections in the PR — the Self Assessment Review is the single merge of all three.

## When to Use

- As the final step of the `/pre-handoff` bundle (the normal case)
- When the user says "prepare the PR" or "write the PR description"
- After `/code-review` and `/design-vs-req` have run (reuse their output, don't re-derive)

## Inputs to Gather (read-only git)

```powershell
git rev-parse --abbrev-ref HEAD               # Current branch name
git diff main --stat                          # Files changed summary (primary source)
git diff main                                 # Full diff for detail
git status --short                            # Untracked/new files
git log main..HEAD --pretty=format:'%h %s'    # Commits (may be empty pre-commit — that's fine)
```

Infer the issue number/title from the branch name and the spec task it implements (e.g. `feat/daily-stats` → the daily-stats task, Issue #{n}). If it can't be inferred, ask before writing.

## Output — Block 1: PR Description

```markdown
## Issue
- <ref + what the issue asked for, e.g. "#12 — GET /stats daily rollup">

## Root Cause
- <brief; "N/A — new feature/setup work" for a feature/scaffold with no defect>

## Implementation
- <one bullet per key change, grouped by layer (domain / routes+schemas / repositories / app.ts wiring / tests)>

## Validation
- <commands a reviewer runs to confirm, with expected results: `npm run lint` (0 errors), `npm run build` (compiles), `npm test` (0 failures)>

## Impacted Areas
- <other features this PR could affect; "None — additive/isolated" is valid>
```

## Output — Block 2: Self Assessment Review

The single consolidated review (Self-Assessment + code-review + design-vs-req merged). Six sections in this exact order (the old `Commit Summary`, `Completeness Assessment`, standalone `Positives`, and standalone `Suggestions` sections were dropped: files-changed lives in the pr-draft record, completeness is now the one-line `Verdict`, and any positive/follow-up worth stating folds into `Verdict`):

```markdown
# Self Assessment Review

## Issue
<issue ref + title; if the body was thin, one line on how scope was inferred>

## Confidence: <NN>%
<one line: how it was reached; if it took re-review passes, how many and what changed. Must be >= 90% to finalize without an Uncertainties section.>

## Requirements Checklist
<the design-vs-req coverage AS this checklist — one box per requirement / EARS criterion, EACH with a short "— how addressed" clause + file:line evidence. Use tick=met, empty=not-yet/partial, pause=deferred-by-decision (say why).>

## Critical Issues (must fix)
<the code-review findings that block merge (confirmed correctness/security defects), EACH anchored path/to/file.ts:line; "None." if clean. If multi-agent, note depth + what was verified (incl. full-file reads) in one line.>

## Warnings (should fix)
<non-blocking code-review findings, EACH file:line-anchored; then a "considered and intentionally left:" sub-list — things reviewed and deliberately NOT changed, each with the why (incl. deferred items + cross-refs). "None." if none.>

## Verdict
<one line: Fully Implemented / Implemented with gaps / Not yet — merging the design-vs-req verdict + code-review outcome. Optionally one short clause on the strongest positive and/or one out-of-scope follow-up. Keep it to a line or two.>

## Uncertainties
<ONLY when confidence < 90% after the re-review loop: what stayed unverified and why. Omit this heading entirely when confidence >= 90%.>
```

## File Output

Auto-save to `pr-drafts/<branch>.md` (repo root; a slash in the branch name becomes a subpath, that's fine) with three sections in this order:
1. `## PR Description` — Block 1 (in a fenced markdown block)
2. `## Self Assessment Review` — Block 2 (in a fenced markdown block)
3. `## Analysis detail (record)` — the RAW design-vs-req coverage matrix (line-by-line) + per-finding code-review verdicts + review-depth rationale + branch & files-changed list. NOT pasted into the PR — this is the audit record so nothing the engines produced is lost.

One file per issue. Overwrite on re-run (never split into `_review.md` etc.).

## Rules

- **Concise** — bullets, not paragraphs; plain language over deep technical detail
- **Base on actual diff** + the code-review/design-vs-req output — don't invent changes or findings
- **Root Cause** is "N/A — new feature/setup work" for features/scaffolding
- **Severity honesty** — Critical only for real correctness/security defects that block merge; cosmetic/intentional-tradeoff items go under Warnings, "considered and intentionally left", never Critical
- **Confidence gate required** — emit `## Confidence: NN%`; must be >= 90% to finalize without an Uncertainties section. Below 90%: re-read changed files in full, re-verify, rewrite findings, re-score (<=3 passes)
- **Every Critical/Warning is file:line anchored**
- **"Considered and intentionally left" is required** whenever the review noticed something and chose not to act (with the why); "None." if genuinely nothing
- **Positives/follow-ups are optional and compressed** — fold into the one-line `Verdict`; do not pad with standalone sections
- **Files-changed lives in the record, not the pasted review**
- Present both blocks inline in chat AND confirm the saved file path
- **Do NOT commit/push/open the PR** — the user does that
