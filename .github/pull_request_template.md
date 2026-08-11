<!--
  FocusFlow PR template. Keep PRs small and tied to a single spec task where possible.
  The golden rule: spec first, then implement. If this PR changes behavior, the spec
  under .kiro/specs/<feature>/ should already describe it.
-->

## Summary

<!-- What does this PR do, and why? One or two sentences. -->

## Linked issue

<!-- Use a closing keyword so the issue auto-closes and the Kanban card moves to Done. -->
Closes #

## Spec traceability

- Spec: `.kiro/specs/<feature>/`
- Requirement IDs covered:  <!-- e.g. 4.1-4.5, 6.1 -->

## Type of change

- [ ] Feature (new capability described in a spec)
- [ ] Fix / hardening
- [ ] Refactor (no behavior change)
- [ ] Chore / tooling / docs

## Checklist

- [ ] `npm run lint` passes (type-check)
- [ ] `npm run build` passes
- [ ] `npm test` passes, and I added/updated tests for the change
- [ ] The spec (`requirements.md` / `design.md` / `tasks.md`) reflects this change
- [ ] No secrets, tokens, or `.kiro/settings/mcp.json` committed
- [ ] Branch name follows `type/short-description` (e.g. `feat/daily-stats`)

## Notes for reviewers

<!-- Anything worth calling out: tradeoffs, follow-ups, deliberately deferred work. -->
