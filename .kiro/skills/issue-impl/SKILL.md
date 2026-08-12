---
name: issue-impl
description: Implement a GitHub issue against its body AND the posted analysis comment. Covers Zod schemas, pure domain, repositories, Fastify routes, app.ts wiring, Vitest tests, and the lint+build+test verification gate. Invoke with /issue-impl.
---

# issue-impl — Implement Against Issue + Analysis

Implement the current GitHub issue, satisfying both the issue body AND the posted analysis comment. Follow FocusFlow's layered architecture (domain → repositories → schemas → routes, wired in `app.ts`) and conventions.

## When to Use

- After `/issue-analyze` has posted the analysis as a comment on the issue
- When the user says "implement this issue", "start implementation", or shares the enriched issue (body + analysis comment)

## Gate 0 — Analysis comment MUST exist (hard precondition)

**Before anything else, verify a requirement-analysis comment exists on the issue:**

```powershell
gh issue view <n> --json comments
```

- **No analysis comment?** STOP. Run `/issue-analyze` first (it posts one). Do not write a single line of code until the analysis is on the issue — this holds even when the branch already exists or the user said "just tackle it." (This gate guards the regression where implementation once started with no posted analysis.)
- **Comment exists?** Read it in full — it (plus the issue body) is the contract.

Also confirm you are **on a feature branch, not `main`** (`git rev-parse --abbrev-ref HEAD`). If on `main`, that's the user's branch-creation step — pause and ask, don't implement on `main`.

## Pre-Implementation Checklist

After Gate 0 passes, before writing any code:

1. **Re-read the issue** — body + all comments (especially the posted analysis)
2. **Check dependencies** — verify prerequisite issues are merged into `main`
3. **Read affected files** — understand the current state of files you'll modify
4. **Read the spec + steering** — `.kiro/specs/<feature>/{requirements,design}.md` for the referenced EARS criteria, `.kiro/steering/` for conventions (error codes, layers, DoD)
5. **Identify the acceptance criteria** — the EARS criteria IDs are your DoD checkboxes
6. **Check for early delivery** — if the scope is already on `main` (delivered by an earlier PR), don't re-implement: report it and propose closing-as-delivered or narrowing to a real gap (e.g. a missing regression test)

## Implementation Order

Follow this sequence for each issue. Skip a step only when the feature genuinely doesn't touch that layer.

### 1. Zod schemas (src/schemas)
- Define request/response shapes in `src/schemas/` — Zod is the single source of truth for shapes
- Routes and tests import these; never hand-roll a parallel shape

### 2. Pure domain (src/domain)
- Business logic + types in `src/domain/` — no Fastify, no HTTP, no I/O
- Read "now" only through the injectable `Clock`; timestamps are ISO-8601 UTC
- Keep it trivially unit-testable

### 3. Repositories (src/repositories)
- Add/extend the `TaskRepository` / `SessionRepository` interface as needed
- Implement the **in-memory** repository (the default, used by every test)
- Add the **node:sqlite** implementation **only if the feature needs durable state** — keep the runtime sqlite import isolated in `repositories/sqlite.ts`; repo modules import `DatabaseSync` as a type only

### 4. Fastify route plugin (src/routes)
- One plugin per resource in `src/routes/`
- Validate input with the Zod schema; on failure and on domain errors, throw `AppError` so the error envelope `{ error: { code, message, details? } }` and the right status code are produced (`VALIDATION_ERROR` 400, `NOT_FOUND` 404, `SESSION_ACTIVE` 409, `NO_ACTIVE_SESSION` 409, `INTERNAL_ERROR` 500)
- Never leak stack traces on 500

### 5. Wire it in app.ts
- `app.ts` is the SINGLE dependency-injection point — register the route plugin and pass its dependencies (repositories, clock) there
- Nothing else wires concrete implementations; this keeps every other layer testable

### 6. Tests (test/)
- Domain: fast, isolated unit tests mirroring `src/domain/`
- Routes: integration tests via `buildApp({ clock: fixedClock(...) })` + `app.inject(...)` — no port opened, deterministic time
- Cover the acceptance criteria AND the error paths (validation, not-found, conflict)

### 7. Verify the Definition of Done
- `npm run lint` — `tsc --noEmit`, **0 errors**
- `npm run build` — `tsc -p tsconfig.build.json`, compiles
- `npm test` — `vitest run`, **0 failures**
- All three fresh, in the same turn. A clean `tsc --noEmit` plus green Vitest **is** the bar — TypeScript has no compiler-warning stream to grep.

## Rules

- **Gate 0 is absolute** — never implement without a posted analysis comment on the issue; run `/issue-analyze` first if it's missing
- **Never implement on `main`** — a feature branch must exist; if on `main`, pause and ask
- **Domain purity is sacred** — no Fastify/HTTP/I/O in `src/domain`; no business logic in routes
- **No `any`** — prefer precise types; narrow `unknown` at boundaries
- **Zod is the single source of truth** for request/response shapes
- **Consistent errors** — every route returns the `{ error: { code, message, details? } }` envelope with the right code; never leak stack traces on 500
- **Time** — ISO-8601 UTC; read "now" only through the injectable `Clock`
- **NodeNext imports** — relative imports carry explicit `.js` extensions; introduce no native build dependency without calling it out first
- **Wire in `app.ts`** — new routes and their dependencies are registered there and nowhere else
- **DoD must pass** (`npm run lint` + `npm run build` + `npm test`, fresh) before declaring implementation complete
- Present a summary of what was implemented, what files changed, and the lint/build/test results when done
