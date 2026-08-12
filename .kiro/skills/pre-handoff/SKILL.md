---
name: pre-handoff
description: One-shot pre-handoff bundle for a FocusFlow branch. Orchestrates code-review (+ HTTP API contract lens) + design-vs-req + confidence gate + adversarial round + fix-forward left-item routing + prepare-pr before the user commits. Run when implementation + tests + build are done. Invoke with /pre-handoff.
---

# pre-handoff — Full Pre-Handoff Bundle

Orchestrates the whole pre-commit handoff for one issue/branch, in order. It CALLS the existing skills (`/code-review`, `/design-vs-req`, `/prepare-pr`) — they stay usable on their own; this sequences them and adds the confidence gate, the adversarial round, and the fix-forward left-item routing.

Run after: implementation covers the issue + the posted analysis, `npm test` passes, and `npm run build` compiles clean. It reads `git diff main`, so it works BEFORE the commit (commit hashes fill in afterward).

## When to Use

- When implementation is complete and verified (lint clean, build compiles, tests green)
- Before the user commits and pushes
- When the user says "pre-handoff", "ready for PR", or "wrap it up"

## Prerequisites

1. `npm test` passes (0 failures)
2. `npm run lint` clean (`tsc --noEmit`, 0 errors)
3. `npm run build` compiles
4. All acceptance criteria from the issue + posted analysis are addressed

## Phases (execute in this exact order)

### Phase 1 — Gather & Pick Depth

```powershell
git diff main --stat
git diff main
git status --short
```

Choose review depth — scale the effort to the diff, don't over-spend on a config/docs PR:
- **Full multi-agent:** new domain logic, new routes/schemas, repositories, tests
- **Focused pass:** config/docs only, or a mechanical lift

**HTTP API contract trigger:** when the diff **adds or changes a route, a Zod schema, or an error path**, ADD the Phase 2a lens to the review. A correctness-only pass structurally misses that whole class of contract defect (wrong status code, an error path that skips the envelope, an unvalidated boundary).

### Phase 2 — Code Review

Run the `/code-review` skill against the branch diff.
- **Read changed files IN FULL, not just the hunks** — surrounding context is where the real bugs hide
- Every Critical/Warning is file:line anchored
- Produce the Critical Issues + Warnings lists

### Phase 2a — HTTP API contract lens

Run this as a distinct pass (a sub-agent is the ideal mechanism) whenever the Phase-1 HTTP API contract trigger fires. It is **additive** to the correctness pass, not a substitute — it reads the changed route/schema/domain files in full and checks the dimensions a correctness pass misses:

- **Error-envelope consistency** — EVERY failure path, including 404 and 500, returns `{ error: { code, message, details? } }`. No route returns a bare string, a Fastify default error, or a differently-shaped body. Errors are raised as `AppError` and mapped centrally, not hand-assembled per route.
- **Status codes per the spec** — the code matches the criteria in `requirements.md`/`design.md`: `VALIDATION_ERROR` 400, `NOT_FOUND` 404, `SESSION_ACTIVE` 409, `NO_ACTIVE_SESSION` 409, `INTERNAL_ERROR` 500. A wrong code (e.g. 400 where the spec says 409) is a defect.
- **Validation at every boundary** — each request is parsed through its Zod schema before it reaches the domain; `unknown` is narrowed at the edge; no `any` leaks in. Zod remains the single source of truth for the shape (no parallel hand-rolled type).
- **No stack-trace leakage** — a 500 never returns an internal message, stack, or SQLite detail to the client; the envelope carries only `INTERNAL_ERROR` + a safe message.
- **Time correctness** — timestamps are ISO-8601 UTC and "now" is read only through the injectable `Clock`, so time-based behavior stays deterministic under a fixed clock in tests.
- **Idempotency where required** — operations the spec marks idempotent behave so; repeated calls don't double-apply state.
- **Security note** — FocusFlow has **no auth yet** (out of scope). If the diff adds a new network-exposed surface, flag it explicitly — a new unauthenticated endpoint is a fact the reviewer must see, even though auth is deferred.
- **API test-gap sweep** — an `app.inject()` integration test per new/changed route INCLUDING its error paths (validation, not-found, conflict), plus domain unit tests for new logic, run under a fixed clock. Fold any gap into the Self Assessment Review's checklist, not just prose.

### Phase 3 — Design vs Requirements

Run the `/design-vs-req` skill.
- Coverage matrix of impl vs issue body + posted analysis + the referenced EARS criteria in `requirements.md` — one status per requirement (Met / Partial / Not met / Deferred) with file:line evidence

### Phase 4 — Confidence Gate

Score confidence 0-100% based on: code-review findings (Critical count must be 0), requirements coverage (all Met or Deferred-with-justification), test coverage for new logic, and the DoD status (lint + build + test).

**If < 90%, do not finalize:**
1. Name what's uncertain
2. Re-read the relevant files IN FULL
3. Re-verify (a finder/adversarial sub-agent is the preferred mechanism)
4. Rewrite the findings
5. Re-score (loop up to 3x)
6. If still < 90%, finalize but populate Uncertainties

### Phase 5 — Final Adversarial Round

**(a) Conflict check** — branch vs `main`:
```powershell
git rev-list --count HEAD..main   # behind-count
```
Plus a conflict-marker scan of the changed files; confirm mergeable.

**(b) Adversarial refuters** — try to break the "zero criticals/warnings" claim across distinct lenses (they read files in full):
- Runtime/logic: can any input cause a crash or wrong behavior?
- Cross-cutting regression: does this break existing functionality?
- Conflict/spec-consistency: does the implementation match all spec requirements?
- **When Phase 1's HTTP API contract trigger fired:** an error-envelope + status-code + Zod-validation + no-auth-surface lens (per Phase 2a).

Fold any surviving finding back into the Phase-2 output and re-run the gate.

**(c) Fresh verify:**
```powershell
npm run lint    # tsc --noEmit — 0 errors
npm run build   # tsc -p tsconfig.build.json — compiles
npm test        # vitest run — 0 failures
```
Re-run lint + build + test **fresh** in this turn. A clean `tsc --noEmit` plus green Vitest **is** the bar — TypeScript has no compiler-warning stream to grep, so never rely on a stale run or a self-reported result. State results with evidence.

### Phase 5.5 — Resolve Left-Items (fix-forward)

Before ANYTHING may be written under "considered and intentionally left", route **every** such item — nothing is silently parked. Classify each into exactly one category, then act:

- **(1) Cheap & in-scope** — a small change in files this PR already touches, low regression risk (a dead branch, a missing null-guard, a one-line defensive fix, a missing characterization test). → **Fix in this PR now**: root fix + a **regression guard** (a test that fails if the fix is reverted — mutation-check it). Re-verify.
- **(2) Out-of-scope but real** — a genuine defect/gap whose home is different code or a sibling issue. → **Fix in this PR too** (fix-forward is the chosen policy): root fix + regression guard. **Exception → file instead of fix:** when the fix would change a public/wire contract (the error envelope, a route's response shape), needs its own design, or is genuinely cross-cutting, **auto-file a follow-up issue** (`gh issue create`) and link it — do not force a risky change into this PR.
- **(3) By-design / correct** — the current behavior is intentional and correct; changing it is a **regression**. → **Keep documented** with the rationale. NEVER "fix" it.
- **(4) Upstream / external** — not fixable in this repo (third-party lib, Node/SQLite runtime). → **Keep documented**; optionally file upstream.

After the category-1/2 fixes, **re-run Phase 4 (confidence gate) + Phase 5c (fresh verify)** so the artifacts reflect the fixed tree. Report each routed item and its category in the hand-off.

**The only legitimate residents of "considered and intentionally left" are categories 3 and 4.** A category-1 or -2 item appearing there is a bundle failure — it was fixed (or filed with a link), so it is no longer "left". **Red flag — STOP:** you are about to "fix" a by-design (cat 3) or upstream (cat 4) item → don't; that is a regression or impossible.

### Phase 6 — Emit Artifacts

Run the `/prepare-pr` skill to produce:
1. PR Description (paste into PR body)
2. Self Assessment Review (paste as first PR comment) — the SINGLE consolidated review; the `/design-vs-req` matrix IS the Requirements Checklist, `/code-review` findings populate Critical/Warnings; no separate Code-Review / Design-vs-Req sections in the PR. The "considered and intentionally left" sub-list holds **only category-3/4 items** (Phase 5.5); every category-1/2 item is either fixed here or listed with its filed follow-up issue link.
3. Auto-save to `pr-drafts/<branch>.md` (three sections: PR Description, Self Assessment Review, Analysis detail record)

## Rules

- **Does NOT commit / push / open the PR** — the user does that. This produces the two paste artifacts + the pr-draft only.
- **Orchestrates, does not replace** — `/code-review`, `/design-vs-req`, `/prepare-pr` remain individually invocable
- **Severity honesty** — Critical only for a real correctness/security defect that blocks merge; everything else routes through Phase 5.5 (fix-forward): cat 1 & 2 are fixed in-PR (or filed with a link), only cat 3 (by-design) & 4 (upstream) remain "considered and intentionally left"
- **Full-file reads required** — context bugs are invisible in hunks alone
- **HTTP API contract lens is mandatory when triggered** — a correctness-only pass on a diff that adds/changes a route, schema, or error path is incomplete (Phase 2a)
- **Confidence gate is mandatory** — no finalization without scoring
- **Fresh verify is mandatory** — re-run `npm run lint` + `npm run build` + `npm test` in the same turn; a clean `tsc --noEmit` + green Vitest is the bar (no compiler-warning stream to grep)
- **Inside `/auto-issue`** — a surviving Critical / fixable Warning / conflict / **Phase-5.5 cat-1-or-2 left-item** is NOT handed back: it feeds that skill's bounded self-fix loop (fix at root + regression guard → re-verify → re-gate, <=3 rounds). Run standalone (the normal case), Phase 5.5 still fixes cat 1 & 2 in-line before the artifacts are emitted.
