# Requirements — <Feature Name>

> Copy this folder to `.kiro/specs/<feature>/` and fill it in. Write requirements FIRST,
> then design, then tasks. Delete these quote blocks as you go.

## Introduction
<!-- One paragraph: what this capability is and why it exists. Link to product.md context. -->

Acceptance criteria use EARS (see `.kiro/skills/spec-authoring/references/ears-guide.md`):
- **WHEN** `<trigger>` **THE SYSTEM SHALL** `<response>`
- **IF** `<condition>` **THEN THE SYSTEM SHALL** `<response>`
- **WHILE** `<state>` **THE SYSTEM SHALL** `<response>`
- **WHERE** `<optional feature>` **THE SYSTEM SHALL** `<response>`
- **THE SYSTEM SHALL** `<response>` (always-true)

---

## Requirement 1 — <short title>
**User story:** As a `<role>`, I want `<capability>`, so that `<benefit>`.

#### Acceptance criteria
1.1. WHEN ... THE SYSTEM SHALL ...
1.2. IF ... THEN THE SYSTEM SHALL ... (status + error code)
1.3. ...

## Requirement 2 — <short title>
**User story:** As a `<role>`, I want `<capability>`, so that `<benefit>`.

#### Acceptance criteria
2.1. ...
2.2. ...

---

## Non-functional requirements
- <!-- performance, determinism, no native deps, coverage, security, etc. -->

## Traceability
Each acceptance criterion id (e.g. `2.1`) is referenced in `design.md` and `tasks.md`, so
every change traces requirement → design → task → test.
