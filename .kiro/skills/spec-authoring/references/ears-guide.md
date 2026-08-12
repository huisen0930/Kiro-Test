# EARS quick reference

EARS (Easy Approach to Requirements Syntax) keeps acceptance criteria testable and
unambiguous. Use the smallest pattern that fits; combine only when necessary.

| Pattern | Template | When to use |
|---|---|---|
| Ubiquitous | THE SYSTEM SHALL `<response>` | Always-true behavior / invariants |
| Event-driven | WHEN `<trigger>` THE SYSTEM SHALL `<response>` | A request or event happens |
| Unwanted behavior | IF `<condition>` THEN THE SYSTEM SHALL `<response>` | Errors, edge cases, invalid input |
| State-driven | WHILE `<state>` THE SYSTEM SHALL `<response>` | Behavior that depends on a mode/state |
| Optional feature | WHERE `<feature>` THE SYSTEM SHALL `<response>` | Behavior gated by an optional input/config |

## Good vs weak criteria

- Weak: "The API should validate input."
- Good: "IF the request body has a missing or empty `title` THEN THE SYSTEM SHALL reject it
  with `400` and error code `VALIDATION_ERROR`."

## Rules of thumb
- One observable behavior per criterion. If it needs an "and", consider splitting it.
- State the exact status code and error code for failure paths.
- Make every criterion checkable by an automated test.
- Number them (`1.1`, `1.2`, ...) so `design.md` and `tasks.md` can reference them.
- Prefer concrete, boundary-precise language ("at most 200 characters", "UTC date window").
