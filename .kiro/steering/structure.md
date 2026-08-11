# Structure — Layout & Patterns

## Directory layout
```
focusflow/
├── .kiro/
│   ├── steering/        # Always-on project context (this folder)
│   ├── specs/focusflow/ # requirements.md → design.md → tasks.md
│   ├── hooks/           # Event-driven automation (JSON)
│   └── settings/        # mcp.json and other Kiro settings
├── src/
│   ├── domain/          # Pure business logic + types (no HTTP, no I/O)
│   ├── repositories/    # Data-access interfaces + in-memory implementations
│   ├── routes/          # Fastify route plugins (one file per resource)
│   ├── schemas/         # Zod schemas shared by routes and tests
│   ├── lib/             # Small cross-cutting helpers (ids, clock, errors)
│   ├── app.ts           # Builds and wires the Fastify instance (no listen())
│   └── server.ts        # Entry point: builds app + app.listen()
├── test/                # Vitest specs mirroring src/ structure
└── (config files)
```

## Layering rules (dependencies point inward)
- `domain/` depends on nothing in the app. It is pure and framework-free.
- `repositories/` may depend on `domain/` types only.
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
When adding a capability, update the spec first (`.kiro/specs/focusflow`), then implement
the corresponding task. The spec is the source of truth; the code follows it.
