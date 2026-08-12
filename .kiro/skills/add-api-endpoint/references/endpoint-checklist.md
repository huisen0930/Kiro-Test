# New endpoint checklist

Copy this into your PR description and tick as you go.

- [ ] Endpoint is described in the feature's spec with acceptance criteria (ids noted)
- [ ] Zod schema(s) added in `src/schemas/` (body / params / query as needed)
- [ ] Inferred types exported via `z.infer`
- [ ] Pure domain function(s) added/updated in `src/domain/` (no HTTP, no I/O)
- [ ] Repository interface method added + implemented in the in-memory repository (if new state)
- [ ] Route handler validates input, calls domain, throws `AppError` for failures
- [ ] Plugin registered and dependencies injected in `src/app.ts`
- [ ] Domain unit tests cover the rules
- [ ] Integration tests via `app.inject()` cover happy path + each error case
- [ ] Error responses use the standard envelope `{ error: { code, message, details? } }`
- [ ] Timestamps are ISO-8601 UTC and read via the injected clock
- [ ] `npm run lint` clean, `npm test` green
- [ ] `design.md` API table and `tasks.md` checkbox updated

## Error code → status reference
| Code | Status |
|---|---|
| `VALIDATION_ERROR` | 400 |
| `NOT_FOUND` | 404 |
| `SESSION_ACTIVE` | 409 |
| `NO_ACTIVE_SESSION` | 409 |
| `INTERNAL_ERROR` | 500 |
