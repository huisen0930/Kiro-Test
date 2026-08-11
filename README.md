# FocusFlow — a guided tour of what makes Kiro different

FocusFlow is a small, **fully runnable** REST API for tracking tasks and timed focus
sessions. But the app is just the vehicle. The real point of this repo is to show how
[Kiro](https://kiro.dev) turns "vibe coding" into an engineering workflow you can trust:
specs before code, persistent project context, and automation that keeps you honest.

If you've used a chat-style coding assistant, you've felt the failure mode: it writes a
lot of code fast, but you lose the thread — no shared source of truth, no record of *why*,
and no guardrails. Kiro is built to fix exactly that.

---

## TL;DR — run it

```bash
npm install
npm test        # 18 tests, all green
npm run lint    # strict type-check (tsc --noEmit)
npm run dev     # start the API on http://127.0.0.1:3000  (run in your own terminal)
```

```bash
# smoke test once it's running
curl http://127.0.0.1:3000/health
curl -X POST http://127.0.0.1:3000/tasks -H "content-type: application/json" -d "{\"title\":\"Write the launch post\",\"tags\":[\"work\"]}"
curl http://127.0.0.1:3000/tasks
```

---

## The four things Kiro does that a chat assistant doesn't

| Kiro capability | Where to look in this repo | What it buys you |
|---|---|---|
| **Spec-driven development** | `.kiro/specs/focusflow/` | Requirements → design → tasks, each reviewable and traceable. No more "it built the wrong thing." |
| **Steering** | `.kiro/steering/` | Project context (product, stack, conventions) auto-injected into *every* prompt. Stop re-explaining yourself. |
| **Agent hooks** | `.kiro/hooks/` | Event-driven automation: tests run on save, the suite runs after each finished task. |
| **MCP** | see [MCP section](#mcp--connect-external-tools) | Connect external tools/data sources through a standard protocol. |

---

## 1. Specs — the headline feature

Instead of prompting an entire app into existence and hoping, Kiro splits every feature
into three documents you review in order. They live in
[`.kiro/specs/focusflow/`](.kiro/specs/focusflow/):

- **[`requirements.md`](.kiro/specs/focusflow/requirements.md)** — user stories with
  **EARS**-style acceptance criteria (`WHEN … THE SYSTEM SHALL …`). Every criterion has an
  id like `4.4`, so it can be traced everywhere.
- **[`design.md`](.kiro/specs/focusflow/design.md)** — architecture, data model, the full
  API contract, and a decisions table. Each decision cites the requirement id it serves.
- **[`tasks.md`](.kiro/specs/focusflow/tasks.md)** — an incremental, checkbox build plan.
  Each task is small, cites its requirements, and is verified before the next begins.

### Why this is better than one big prompt
- **You steer before code exists.** Catching a wrong assumption in `requirements.md` costs
  a sentence; catching it after 2,000 lines costs a weekend.
- **Traceability.** Requirement `3.3` → a decision in `design.md` → task 3 → a named test
  (`completing a done task leaves it unchanged`). Nothing is orphaned.
- **Nothing gets silently dropped.** Deferred work (auth, SQLite, pagination) is written
  down as future tasks, not forgotten.

### Try the incremental flow yourself
Tasks **1–6 are already implemented and tested** (task CRUD, health, error handling).
Tasks **7–11 are specified and waiting** (focus sessions, daily stats, hardening, a durable
SQLite store). To feel the workflow:

1. Open [`.kiro/specs/focusflow/tasks.md`](.kiro/specs/focusflow/tasks.md).
2. Click **Start task** above task 7 ("Focus session domain + repository").
3. Watch Kiro implement just that slice against the spec, then review and continue.

That's the loop: small task → implementation → verification → next task.

---

## 2. Steering — context that travels with you

The files in [`.kiro/steering/`](.kiro/steering/) are injected into every interaction
automatically:

- **[`product.md`](.kiro/steering/product.md)** — what FocusFlow is, who it's for, what's out of scope.
- **[`tech.md`](.kiro/steering/tech.md)** — the stack, the commands, and hard conventions (no `any`, consistent error envelope, injectable clock).
- **[`structure.md`](.kiro/steering/structure.md)** — folder layout and the inward-pointing dependency rule.

Because of steering, you never have to say "remember, we use Fastify and Zod and no `any`"
again. It's always known. Add your own steering files anytime, and set them to load
always, on file-match, or manually.

---

## 3. Hooks — automation that keeps the repo green

Defined in [`.kiro/hooks/`](.kiro/hooks/) (they activate on the next session):

- **`test-on-save.json`** — `PostFileSave` on any `.ts` file → runs `npm test`. Instant
  feedback that nothing regressed the moment you hit save.
- **`verify-after-task.json`** — `PostTaskExec` → runs `npm run lint` then `npm test` after
  a spec task is marked complete, so every finished task leaves the build green.

Hooks can trigger on saves, creates, deletes, session start, prompt submit, and around
tool/task execution. Create more from the **Agent Hooks** panel or the command palette
("Open Kiro Hook UI").

---

## MCP — connect external tools

MCP (Model Context Protocol) lets Kiro talk to external tools and data sources. The config
lives at `.kiro/settings/mcp.json`. This repo intentionally does **not** commit that file
(it's user/workspace-owned, and this environment blocks writing it), so add it yourself:

- Open the command palette and search **"MCP"**, or open the **MCP Server** panel and add a
  server, or create `.kiro/settings/mcp.json` with:

```json
{
  "mcpServers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"],
      "env": {},
      "disabled": false,
      "autoApprove": ["fetch"]
    },
    "aws-docs": {
      "command": "uvx",
      "args": ["awslabs.aws-documentation-mcp-server@latest"],
      "env": { "FASTMCP_LOG_LEVEL": "ERROR" },
      "disabled": true,
      "autoApprove": []
    }
  }
}
```

These example servers use `uvx`, which comes with [`uv`](https://docs.astral.sh/uv/getting-started/installation/).
Set `"disabled": false` on a server to enable it; servers reconnect automatically on config
changes.

---

## Project structure

```
.
├── .kiro/
│   ├── steering/         # Always-on context: product.md, tech.md, structure.md
│   ├── specs/focusflow/  # requirements.md → design.md → tasks.md
│   └── hooks/            # test-on-save, verify-after-task
├── src/
│   ├── domain/           # Pure business logic (no HTTP, no I/O) — trivially testable
│   ├── repositories/     # Storage behind an interface (in-memory now, SQLite later)
│   ├── schemas/          # Zod schemas: one source of truth for shapes + validation
│   ├── routes/           # Fastify plugins, one per resource
│   ├── lib/              # clock, id, errors
│   ├── app.ts            # buildApp(deps): the single DI wiring point (no listen())
│   └── server.ts         # entry point: builds app + listens
└── test/                 # Vitest: domain unit tests + app.inject() integration tests
```

The architecture is deliberate: `domain/` is pure so rules are unit-testable, and `app.ts`
is the *only* place concrete dependencies are wired — which is what lets tests run the whole
API in-process via `app.inject()` without opening a port.

---

## API reference (implemented so far)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check → `{ "status": "ok" }` |
| `POST` | `/tasks` | Create a task (`title` required, optional `tags`) |
| `GET` | `/tasks` | List tasks, newest first; filter with `?status=open|done` and `?tag=` |
| `GET` | `/tasks/:id` | Fetch one task |
| `PATCH` | `/tasks/:id` | Update `title` and/or `tags` |
| `POST` | `/tasks/:id/complete` | Mark done (idempotent) |
| `DELETE` | `/tasks/:id` | Delete a task |

Focus sessions (`/tasks/:id/sessions`, `/sessions/active/stop`) and `/stats` are specified
in the spec and are the next tasks to build.

**Errors** are always the same shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "title must not be empty", "details": [] } }
```

Codes: `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `SESSION_ACTIVE` (409),
`NO_ACTIVE_SESSION` (409), `INTERNAL_ERROR` (500).

---

## A note on security
FocusFlow has **no authentication** yet — it's out of scope for this reference project, and
the server binds to `127.0.0.1` for that reason. Do not expose it on a public interface
without adding an auth layer first (a good candidate for a future spec).

---

## Where to go next
1. Run task 7 in [`tasks.md`](.kiro/specs/focusflow/tasks.md) and watch a spec slice get built.
2. Edit a steering file (e.g. change a convention in `tech.md`) and see it shape the next change.
3. Save a `.ts` file and watch the test-on-save hook fire.
4. Add an MCP server and let Kiro pull in external context.

That's Kiro: the speed of AI coding, with the structure of real engineering.
```
