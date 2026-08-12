# Structure — Layout & Patterns

## Directory layout
```
focusflow/
├── .kiro/
│   ├── steering/        # Always-on project context (this folder)
│   ├── specs/           # <feature>/requirements.md → design.md → tasks.md (+ _TEMPLATE)
│   ├── skills/          # Model-invoked skills (each <name>/SKILL.md)
│   ├── hooks/           # Event-driven automation (JSON)
│   └── settings/        # mcp.json and other Kiro settings (git-ignored)
├── .github/             # CI workflow, issue/PR templates, CODEOWNERS
├── src/
│   ├── domain/          # Pure business logic + types (no HTTP, no I/O)
│   ├── repositories/    # Interfaces + in-memory AND node:sqlite implementations
│   ├── routes/          # Fastify route plugins (one file per resource)
│   ├── schemas/         # Zod schemas shared by routes and tests
│   ├── lib/             # Small cross-cutting helpers (ids, clock, errors)
│   ├── app.ts           # Builds and wires the Fastify instance (no listen())
│   └── server.ts        # Entry point: opens SQLite, builds app + app.listen()
├── test/                # Vitest specs mirroring src/ structure
├── scripts/             # sync-spec-issues.mjs (spec tasks → GitHub issues)
├── pr-drafts/           # Generated PR description + self-assessment artifacts
└── (config files)
```

## Layering rules (dependencies point inward)
- `domain/` depends on nothing in the app. It is pure and framework-free.
- `repositories/` may depend on `domain/` types only. Two implementations sit behind each
  interface — in-memory (default, used in tests) and `node:sqlite`; the runtime sqlite import
  is isolated in `repositories/sqlite.ts` so importing a repo never loads the native module.
- `routes/` may depend on `domain/`, `repositories/`, and `schemas/`.
- `app.ts` is the only place that wires concrete implementations to routes
  (dependency injection happens here), which keeps everything else testable.

## Naming
- Files: `kebab-case.ts` (`task-routes.ts`, `in-memory-task-repository.ts`).
- Types/interfaces: `PascalCase`. Functions/variables: `camelCase`.
- Test files: `<subject>.test.ts`, colocated conceptually under `test/`.

## Testing pattern
- Domain logic: fast, isolated unit tests.
- Routes: integration tests via `buildApp()` + `app.inject(...)` so no port is opened.
- Inject a fixed `clock` into the app in tests to make time-based stats deterministic.

## The golden rule for this repo
Every capability is specified before it is implemented — spec-first is a team guarantee upheld
by the lead (see `workflow.md`). As an **implementer** you don't author specs: sync the spec,
run `/issue-analyze` against your assigned issue, then implement the task. The spec is both the
source of truth and your input. If you find it wrong, ambiguous, or missing, **escalate to
update the spec first** — never silently diverge in code.
