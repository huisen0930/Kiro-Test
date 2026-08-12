---
name: Spec task
about: A single implementation task derived from a Kiro spec (tasks.md)
title: "[spec] <short task title>"
labels: ["spec-task"]
---

## Definition of Ready (check before starting)
- [ ] Linked to a spec + requirement IDs; acceptance criteria are clear and unambiguous
- [ ] Prerequisite issues merged into `main` (or explicitly noted)
- [ ] Assigned to someone and sized (S / M / L)
- [ ] `/issue-analyze` will be run to post the analysis contract before any code

## Spec
<!-- Which spec is this task from? -->
Spec: `.kiro/specs/<feature>`

## Task
<!-- Paste the task text from tasks.md, including its number, e.g. "7. Focus session domain + repository" -->

## Requirement IDs
<!-- The acceptance-criteria ids this task satisfies, e.g. 4.1, 4.3, 4.4 -->

## Definition of done
- [ ] Implemented per `structure.md` (pure domain logic, thin routes)
- [ ] Unit + integration tests added and passing
- [ ] `npm run lint`, `npm run build`, and `npm test` all green
- [ ] The matching checkbox in `tasks.md` is ticked in the PR

## Milestone / phase
<!-- e.g. Phase 1: Core API -->
