# Product — FocusFlow

## What it is
FocusFlow is a small REST API for tracking tasks and focus sessions (Pomodoro-style
deep-work blocks). It exists as a reference project that demonstrates how Kiro's
spec-driven workflow, steering, and hooks come together on a real, runnable codebase.

## Who it's for
- Solo developers and small teams who want a lightweight, self-hostable way to log
  what they worked on and how long they stayed focused.
- Anyone evaluating Kiro who wants to see the end-to-end workflow, not a toy snippet.

## Core value
- **Capture intent, then focus.** Create tasks, then run timed focus sessions against
  them and see where your attention actually went.
- **Honest daily stats.** Roll up completed tasks and focused minutes per day.
- **API-first.** No UI required; every capability is a clean HTTP endpoint that could
  back a CLI, a web app, or a mobile client later.

## Product principles
- Small surface area, sharp behavior. Prefer a few well-specified endpoints over many
  half-defined ones.
- Every feature is specified before it is built (see `.kiro/specs/focusflow`).
- Validation and error handling are features, not afterthoughts.

## Out of scope (for now)
- Authentication / multi-tenant accounts.
- A frontend UI.
- Real-time collaboration.

These are intentionally deferred and tracked as future spec work, not silently ignored.
