---
name: systematic-debugging
description: Structured debugging for TypeScript/Fastify/Zod/Vitest failures — type-check errors, build breaks, failing tests, or runtime issues. Diagnose the root cause before attempting fixes.
---

# systematic-debugging — Structured Debugging

Apply a systematic approach to diagnose and fix type-check errors, build failures, test failures, or runtime issues. Diagnose the root cause BEFORE attempting fixes — no shotgun debugging.

## When to Use

- `npm run lint` or `npm run build` fails during verification
- Tests fail unexpectedly
- Runtime behavior doesn't match expectations
- The user reports a bug or unexpected behavior
- An approach has failed twice (per the system rules, step back and reconsider)

## Debugging Process

### Phase 1 — Observe & Gather

1. **Read the full error output** — not just the first line; look for the root cause (often buried deeper)
2. **Identify the error type:**
   - Type error (`TS####`) → wrong/mismatched type (`TS2345`/`TS2322`), or cannot-find-module (`TS2307`) from a missing `.js` extension on a NodeNext relative import or a missing dependency
   - Zod failure → input doesn't match the schema; should surface as `400 VALIDATION_ERROR`, not an unhandled throw
   - Test failure → assertion mismatch, thrown error, async/await not awaited, or timeout (Vitest)
   - Runtime error → unhandled rejection, wrong HTTP status/error envelope, or `node:sqlite` import failure
3. **Note the exact file and line** where the error occurs
4. **Read the surrounding context** — open the file, read the full function/module

### Phase 2 — Hypothesize

Form 2-3 hypotheses about the root cause, ranked by likelihood:

```
Hypothesis 1 (most likely): {description} — because {evidence}
Hypothesis 2: {description} — because {evidence}
Hypothesis 3: {description} — because {evidence}
```

### Phase 3 — Verify

Test hypotheses in order:
- Read the relevant code paths
- Check the dependency-injection wiring in `app.ts` (is the route plugin registered? are the repositories injected? is a fixed `clock` passed in tests?)
- Check the route plugin is registered in `app.ts` (a route that returns 404 for a known path is usually unregistered)
- Check repository implementations (do BOTH the in-memory and `node:sqlite` impls satisfy the interface?)
- Check imports (relative imports carry the `.js` extension; the module path is correct)
- Check layering (nothing in `domain/` imports Fastify/HTTP/I/O — that breaks its purity and its unit tests)

### Phase 4 — Fix

Apply the fix for the confirmed hypothesis:
- Make the minimal change that fixes the root cause
- Don't mask the symptom — fix the underlying issue
- If the fix touches multiple files, explain why each change is needed

### Phase 5 — Verify Fix

- Re-run the failing check
- Run the full Definition of Done, in the same turn, with fresh evidence: `npm run lint` (0 errors), `npm run build` (compiles), `npm test` (0 failures)
- Run ALL tests, not just the one that failed — check for regressions

## Common Issues in This Project

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `TS2307` "cannot find module" | Missing `.js` extension on a NodeNext relative import, or a missing dependency | Add the `.js` extension / install the dep |
| `TS2345` / `TS2322` type mismatch | Wrong argument or assignment type; an `any` leaking across a boundary | Narrow the `unknown`, fix the type; never reach for `any` |
| Zod parse/validation failure | Request body/params/query don't match the schema | Fix the schema or the caller; ensure the route maps it to `400 VALIDATION_ERROR` |
| Vitest assertion/async failure | Wrong expected value, or a promise not awaited | Fix the code (or the test if the test is wrong); `await` the async call |
| Route returns 404 for a known path | Route plugin not registered in `app.ts` | Register the plugin in `app.ts` |
| Unhandled error returns 500 | Missing `AppError` mapping in the error handler | Throw a typed `AppError` and map it to the right code/status |
| `node:sqlite` import fails | Running on Node < 22, or missing `--experimental-sqlite` on Node 22 | Use Node 22+; set `NODE_OPTIONS=--experimental-sqlite` |
| Test passes alone, fails in the suite | Shared repo/clock state between tests | Build a fresh app per test via `buildApp({ clock: fixedClock(...) })` |

## Rules

- **Never guess-and-check repeatedly** — if an approach failed twice, step back and analyze why
- **Read the full file, not just the error line** — context reveals the real issue
- **Check the wiring** — most "it doesn't work" issues trace back to the dependency-injection in `app.ts`
- **Check the layering** — Fastify/HTTP/I/O types leaking into `domain/` break its purity and its unit tests
- **One fix at a time** — make one change, verify, then proceed to the next
- **Document what was wrong** — when reporting the fix, explain what caused it and why the fix is correct
