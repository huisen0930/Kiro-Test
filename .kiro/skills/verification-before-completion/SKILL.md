---
name: verification-before-completion
description: Build and test verification pass before declaring any implementation complete. Ensures npm run lint (0 errors) + npm run build (compiles) + npm test (0 failures) all pass on fresh evidence.
---

# verification-before-completion — Lint + Build + Test Verification

Run the full verification suite before declaring any implementation work complete. This is the Definition of Done gate.

## When to Use

- After completing implementation of an issue (`/issue-impl` step 9)
- Before running `/pre-handoff`
- When the user asks "is it ready?" or "does it build?"
- After any significant refactoring

## Verification Steps (run in this order)

### 1. Type-check / Correctness Gate

```bash
npm run lint    # tsc --noEmit
```

**Expected:** 0 errors. This is the fast correctness gate — TypeScript has no compiler-warning stream to grep, so a clean `tsc --noEmit` IS the bar.

If it fails:
- Read the error output carefully (note the exact `file:line` and `TS####` code)
- Fix the root cause in the source (see `/systematic-debugging`)
- Re-run until clean

### 2. Build

```bash
npm run build   # tsc -p tsconfig.build.json
```

**Expected:** Compiles and emits to `dist/` with 0 errors.

If it fails:
- Read the error output
- Fix compilation errors
- Re-run until green

### 3. Tests

```bash
npm test        # vitest run
```

**Expected:** All tests pass (0 failures). Report the count (e.g., "132 tests passed").

If tests fail:
- Read the failure output
- Fix the issue in the source code (not the test, unless the test is wrong)
- Re-run until green

### 4. (Optional) Clean Rebuild

If the issue touched project structure, the dependency-injection wiring in `app.ts`, or shared infrastructure, clear stale build output first so nothing hides behind a cached artifact:

```bash
rm -rf dist && npm run build
```

## Verification Report

After all steps pass, report:

```
## Verification Results

| Check | Result | Detail |
|-------|--------|--------|
| Lint (tsc --noEmit) | PASS | 0 errors |
| Build (tsc -p tsconfig.build.json) | PASS | compiles, emitted to dist/ |
| Tests (vitest run) | PASS | {N} tests passed, 0 failed |

All verification checks passed. Ready for pre-handoff.
```

## Rules

- **Never declare "done" without running all three checks** in the same turn, on fresh evidence — never claim completion from a stale run
- **Report the exact test count.** TypeScript has no compiler-warning stream: a clean `tsc --noEmit` plus green Vitest is the whole bar
- If a failure is a pre-existing issue (not caused by this branch), note it but still fix it if possible
- If tests were added this session, call out the before/after count
- A clean `dist/` rebuild is worth it before the final adversarial round in `/pre-handoff` (ensures no stale build output)
- CI runs the same lint/build/test on Node 22 + 24 with `NODE_OPTIONS=--experimental-sqlite`; green locally should mean green in CI
