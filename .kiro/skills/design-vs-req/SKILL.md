---
name: design-vs-req
description: Cross-check the FocusFlow implementation against the issue requirements + posted analysis and the spec's acceptance criteria. Produces a coverage matrix showing Met/Partial/Not met/Deferred status for each requirement with file:line evidence.
---

# design-vs-req — Requirements Coverage Matrix

Validate that the implementation fully satisfies the issue requirements AND the posted analysis. Produces a coverage matrix with file:line evidence for each requirement.

## When to Use

- As part of pre-handoff (phase 3)
- Mid-implementation to check coverage progress
- When the user asks "does this cover all requirements?"
- Standalone review of implementation vs spec

## Inputs

1. **Requirements source** — the GitHub issue body + posted analysis comment (acceptance criteria)
2. **Implementation source** — the current branch diff (`git diff main`) + the actual files
3. **Spec references** — the relevant sections of `.kiro/specs/<feature>/requirements.md` and `design.md` for the requirement IDs, plus `.kiro/steering/` for the conventions those requirements assume

## Process

### Step 1 — Extract All Requirements

From the issue body + posted analysis, extract every discrete requirement and acceptance criterion. Include:
- Explicit validation bullets from the issue
- Acceptance criteria from the posted analysis
- EARS-style requirement IDs (e.g., 1.1, 2.3) and their definitions from `.kiro/specs/<feature>/requirements.md`
- Any clarifications or corrections from the spec's `design.md`

### Step 2 — Check Implementation

For each requirement, search the implementation for evidence it's satisfied:
- Read the relevant source files (`domain/`, `routes/`, `schemas/`, `repositories/`)
- Check test coverage (domain unit tests and route integration tests)
- Verify the behavior matches the requirement (not just that code exists) — including the error envelope and status code where the requirement defines an error case
- Note the file:line where the requirement is addressed

### Step 3 — Build Coverage Matrix

Assign a status to each requirement:
- **Met** — fully implemented with evidence
- **Partial** — addressed but with gaps
- **Not met** — no implementation found
- **Deferred** — intentionally skipped with justification (e.g., dependency not ready, explicitly out of scope for this issue)

### Step 4 — Self-Verification

Re-read each "Met" finding to confirm it's truly met (not just "code exists" but "behavior is correct", incl. the right status code and error envelope). Re-read each "Not met" to confirm it's truly missing (not implemented elsewhere). Adjust statuses.

## Output Format

```markdown
## Design vs Requirements: {issue id} — {title}

**Requirements source:** Issue #{N} + posted analysis
**Implementation:** Branch `{branch name}` diff vs `main`
**Date:** {today}

### Summary
{2-3 sentences: does the implementation meet the requirements? Overall verdict.}

### Coverage Matrix
| # | Requirement | Status | Evidence (file:line) | Notes |
|---|-------------|--------|---------------------|-------|
| 1 | {requirement text} | Met/Partial/Not met/Deferred | `src/routes/task-routes.ts:42` | {brief note} |
| 2 | ... | ... | ... | ... |

### Gaps (Partial / Not Met)
{Detail each gap: what's missing, what needs to be done to close it.}

### Deferred Items
{Items intentionally skipped with justification and cross-reference to future spec work / issue.}

### Overall Assessment
**Verdict:** Fully implemented / Implemented with gaps / Not yet
**Coverage:** {N}/{M} requirements met ({percentage}%)
**Recommendation:** {Ready for PR / Needs work on X / Blocked by Y}
```

## Rules

- **Evidence must be file:line specific** — not "it's in the route somewhere"
- **Check tests too** — a requirement isn't fully "Met" if there's no test coverage for the behavior (domain unit test for pure logic, route integration test for the HTTP contract)
- **The spec wins over stale wording** — if a requirement's phrasing lags the spec's `design.md`, the design is authoritative; mark the requirement "Met" against the design and note the correction
- **Deferred is acceptable** when there's a documented reason (dependency not merged, explicitly out of scope for this issue, tracked as future spec work)
- **Be honest about Partial** — if the implementation covers the happy path but misses an error case or edge (e.g. an unvalidated query param, a missing `409`), it's Partial not Met
