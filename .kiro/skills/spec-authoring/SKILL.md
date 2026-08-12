---
name: spec-authoring
description: Author or update a Kiro spec (requirements.md, design.md, tasks.md) for a new or changed capability in this repo. Use when starting a new feature, writing acceptance criteria, drafting a design, or breaking work into implementation tasks. Enforces the spec-first golden rule from CONTRIBUTING.md and steering.
---

# Authoring a FocusFlow spec

The golden rule of this repo: **update the spec first, then implement the task.** The spec
is the source of truth; code follows it. Use this skill whenever a capability is added or
changed.

## Steps

1. **Create the spec folder.** Copy `.kiro/specs/_TEMPLATE/` to `.kiro/specs/<feature>/`
   (kebab-case name, e.g. `focus-sessions`). Never edit the template in place.

2. **Write `requirements.md` first.** For each requirement:
   - A user story: *As a `<role>`, I want `<capability>`, so that `<benefit>`.*
   - Numbered acceptance criteria in **EARS** form. See `references/ears-guide.md`.
   - Give every criterion a stable id (`3.2`) so it can be traced downstream.
   - Include a "Non-functional requirements" and a "Traceability" section.

3. **Then `design.md`.** Cover: overview, architecture (respect the inward-pointing
   dependency rule in `structure.md`), data model, the API surface as a table, and a
   **decisions table** where each row cites the requirement id it satisfies. List anything
   deferred under "Future work" so nothing is silently dropped.

4. **Then `tasks.md`.** Break the design into small, independently verifiable tasks. Each
   task cites the requirement ids it satisfies (`_Requirements: 4.1, 4.4_`). Order them so
   each builds on the last. Leave boxes unchecked until implemented **and** tested.

5. **Keep it traceable.** A reader must be able to follow: requirement id → design decision
   → task → test name. If a link is missing, the spec is incomplete.

## Conventions to honor
- Reuse the error-code catalog and error envelope defined in `design.md` / `tech.md`.
- Time-dependent behavior must go through the injectable clock (deterministic tests).
- Prefer a small, sharp surface over many half-defined endpoints (see `product.md`).

## After the spec is approved
Turn tasks into GitHub issues with `npm run sync:issues -- --spec <feature> --milestone "<phase>"`
(see CONTRIBUTING.md), then implement one task at a time.
