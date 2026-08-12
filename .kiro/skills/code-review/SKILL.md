---
name: code-review
description: Multi-angle code review of the branch diff vs main. Surfaces correctness bugs, security defects, and convention violations for the FocusFlow TypeScript/Fastify/Zod API. Every finding is file:line anchored.
---

# code-review — Multi-Angle Diff Review

Review the current branch diff against `main` for correctness bugs, security defects, and convention violations. Read changed files in full (not just hunks) — context is where the real bugs hide.

## When to Use

- As part of pre-handoff (phase 2)
- When the user asks for a code review mid-implementation
- After completing implementation, before committing
- Standalone review of any diff

## Inputs to Gather

```bash
git diff main --stat          # Files changed summary
git diff main                 # Full diff
git status --short             # Untracked/unstaged files
```

## Review Depth Selection

- **Full multi-agent:** For diffs with non-trivial logic, new routes, domain functions, repositories, or tests. Run all 8 angles.
- **Focused pass:** For verbatim lifts, config-only changes, or pure formatting. Run angles A + C + Conventions only.

Choose based on the diff content, not size.

## Review Angles (8 independent passes)

### Angle A — Line-by-line diff scan
Read every hunk line by line. Then read the enclosing function for each hunk. For every changed line ask: what input, state, or timing makes this line wrong? Look for:
- Inverted/wrong conditions, off-by-one
- Null/undefined deref, missing `await`, unhandled rejection
- Wrong-variable copy-paste
- Error swallowed in a catch
- Race conditions over shared repo/clock state

### Angle B — Removed-behavior auditor
For every deleted/replaced line, name the invariant it enforced. Search the new code for where that invariant is re-established. If missing → candidate finding.

### Angle C — Cross-file tracer
For each changed function, find its callers (grep the symbol). Check whether the change breaks any call site: new precondition, changed return shape, new thrown `AppError`, timing dependency.

### Angle D — Reuse check
Flag new code that re-implements something the codebase already has. Name the existing helper (`lib/clock.ts`, `lib/id.ts`, `lib/errors.ts`, an existing Zod schema, or a domain function).

### Angle E — Simplification
Flag unnecessary complexity: redundant state, copy-paste with variation, deep nesting, dead code. Name the simpler form.

### Angle F — Efficiency
Flag wasted work: redundant computation, sequential independent operations, blocking on hot paths. Name the cheaper alternative.

### Angle G — Altitude check
Check each change is at the right depth. Special cases layered on shared infrastructure signal the fix isn't deep enough.

### Angle H — Conventions (project rules)
Check against the steering files (`.kiro/steering/`) and project conventions:
- Layering respected — `domain/` stays pure (no Fastify/HTTP/I/O); `routes/` may use `domain/`, `repositories/`, `schemas/`?
- No `any`; `unknown` narrowed at boundaries?
- Route plugin AND its repositories wired in `app.ts` (the single dependency-injection point)?
- Zod schema is the single source of truth for any new request/response shape?
- Error envelope `{ error: { code, message, details? } }` returned on every path, with a code from the catalog (`VALIDATION_ERROR` 400 / `NOT_FOUND` 404 / `SESSION_ACTIVE` 409 / `NO_ACTIVE_SESSION` 409 / `INTERNAL_ERROR` 500)?
- Relative imports carry explicit `.js` extensions (NodeNext)?
- Timestamps ISO-8601 UTC, "now" read only via the injectable `Clock`?
- No new native build dependency introduced without calling it out?

### Angle I — HTTP API contract (when the diff touches `routes/`, `schemas/`, or a repository interface + its implementations)
The class of defect a correctness pass structurally misses on a headless REST API. Applied automatically inside `/pre-handoff` (Phase 2a); apply it here too when reviewing an HTTP-surface diff standalone:
- **Error-envelope completeness** — every path returns `{ error: { code, message, details? } }`, INCLUDING 404 (unknown id/route) and 500; no bare strings, no framework-default error bodies.
- **Correct status codes per the spec** — the right code for each outcome (e.g. `409 SESSION_ACTIVE` vs `409 NO_ACTIVE_SESSION`, `404 NOT_FOUND` for a missing task); no misleading catch-all.
- **Zod validation at every boundary** — body, params, AND query are parsed; malformed input yields `400 VALIDATION_ERROR`, never an unhandled throw or a `500`.
- **No stack-trace leakage** — 500 responses expose only `{ code: "INTERNAL_ERROR", message }`; no internal detail or stack in the body.
- **Time correctness** — timestamps are ISO-8601 UTC and derived from the injectable `Clock`, so route behavior stays deterministic under a fixed clock in tests.
- **Idempotency where the spec requires it** — e.g. completing an already-completed task behaves as specified rather than erroring or double-counting.
- **Security note** — FocusFlow has NO auth yet; flag any new network-exposed surface and confirm it is intended and specced.
- **API test-gap sweep** — for each new/changed route, integration tests via `buildApp({ clock: fixedClock(...) })` + `app.inject()` covering the success path AND each error code; a fresh app per test (no shared repo/clock state); pure branches covered by domain unit tests.

## Output Format

```markdown
## Code Review: {branch name}

**Diff:** {N} files changed, {N} insertions, {N} deletions
**Depth:** Full multi-agent / Focused pass
**Changed files read in full:** Yes

### Critical Issues (block merge)
| # | File:Line | Summary | Failure Scenario |
|---|-----------|---------|-----------------|
(Only confirmed correctness/security defects. "None." if clean.)

### Warnings (should fix)
| # | File:Line | Summary | Impact |
|---|-----------|---------|--------|
(Non-blocking issues. Include a "Considered and intentionally left:" sub-section for reviewed-but-not-changed items with the why.)

### Positives
- {What the change does well: correct patterns, clean error handling, good comments}
```

## Rules

- **Read changed files IN FULL** — not just the diff hunks. Context bugs (a missing `await`, an unhandled rejection, a route not wired in `app.ts`) are invisible in hunks alone.
- **Every finding must be `file:line`-anchored** — no vague "somewhere in the code" findings.
- **Severity honesty** — Critical only for real correctness/security defects that block merge. Cosmetic items are Warnings at most.
- **"Considered and intentionally left" is required** when something was noticed and deliberately not changed — name it and say why.
- **Do not invent findings** to fill a quota. If the code is clean, say so.
- **Correctness bugs outrank cleanup/style** — if the output cap forces a cut, keep the correctness findings.
