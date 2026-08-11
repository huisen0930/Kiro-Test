# Contributing to FocusFlow

This repo pairs **Kiro's spec-driven workflow** with a standard **GitHub team flow**.
The short version: the spec is the source of truth, GitHub is how we coordinate and
prove the work. This guide explains how the two fit together.

## The golden rule

> When adding a capability, update the spec first (`.kiro/specs/<feature>`), then
> implement the corresponding task. The spec is the source of truth; the code follows it.

## How the pieces map

| Kiro concept | Lives in | GitHub counterpart |
|---|---|---|
| Steering (team conventions) | `.kiro/steering/` | Committed; applies to everyone automatically |
| Spec (a designed capability) | `.kiro/specs/<feature>/` | One feature = one spec, referenced from issues |
| Task (a slice of a spec) | `tasks.md` checkboxes | One task = one GitHub **issue** |
| Phase / release | — | A GitHub **milestone** (e.g. "Phase 1: Core API") |
| Local verification | `.kiro/hooks/` | The **CI workflow** in `.github/workflows/ci.yml` |

The mental model in one line: **spec = designed capability, issue = a pickable slice of
it, milestone = the phase it ships in.**

## What is (and isn't) committed

Everything under `.kiro/` is committed on purpose — that is how the whole team stays in
sync on conventions, specs, and automation. The **one exception** is local MCP config:

- `.kiro/settings/mcp.json` is **git-ignored** because it can hold tokens.
- Copy [`mcp.example.json`](./mcp.example.json) to `.kiro/settings/mcp.json` and supply
  secrets through your environment (e.g. `GITHUB_TOKEN`). Never paste raw tokens into a
  committed file.

## Everyday workflow

1. **Pick an issue.** Grab any open issue that isn't assigned. Assign yourself so others
   know it's taken. Issues come from spec tasks (see the "Spec task" issue template).
2. **Branch off `main`.** Use `type/short-description`:
   - `feat/daily-stats`, `fix/stats-utc-boundary`, `chore/ci-node-22`, `refactor/session-repo`
3. **Read the spec.** Open `.kiro/specs/<feature>/` for the full requirements and design
   behind your task. The issue links the requirement IDs.
4. **Implement with Kiro.** Use *Start task* on the spec task, or work in a Vibe session.
   Keep pure domain logic free of HTTP concerns (see `structure.md`).
5. **Verify locally.** The `verify-after-task` hook runs lint + tests for you. You can also
   run them by hand:
   ```bash
   npm run lint    # tsc --noEmit
   npm run build   # tsc -p tsconfig.build.json
   npm test        # vitest run
   ```
6. **Open a PR.** Push your branch and open a PR. Fill in the template, and use a closing
   keyword (`Closes #12`) so the issue closes and its Kanban card moves to Done on merge.
7. **Green CI + review.** CI (`.github/workflows/ci.yml`) runs lint/build/test on Node 20
   and 22. A CODEOWNER reviews. Merge once green and approved.
8. **Never push straight to `main`.** All changes land through a PR.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): subject`, e.g. `feat(stats): add GET /stats daily rollup`.
Common types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`.

## Starting a new feature

1. Copy the template: `.kiro/specs/_TEMPLATE/` → `.kiro/specs/<your-feature>/`.
2. Fill in `requirements.md` (EARS-style acceptance criteria), then `design.md`, then
   break the work into `tasks.md`.
3. Turn those tasks into issues (see below) under the right milestone.

## Phases and releases

Each phase (Phase 1/2/3, UAT remediation, ...) is a **milestone**. Create the milestone,
then file the phase's issues against it. This gives every phase a progress bar and keeps
requirement → task → issue → PR traceable end to end.

## Turning spec tasks into issues

Use the helper script to create GitHub issues from a spec's `tasks.md` in one shot:

```bash
# Preview what would be created (no writes):
npm run sync:issues -- --spec focusflow --milestone "Phase 1: Core API"

# Actually create the issues:
npm run sync:issues -- --spec focusflow --milestone "Phase 1: Core API" --create
```

It is idempotent by issue title, so re-running it won't create duplicates. Requires the
GitHub CLI (`gh`) authenticated with repo access. See `scripts/sync-spec-issues.mjs`.

## A note on the GitHub Projects (Kanban) board

Adding issues to the Projects board and moving cards needs the `project` scope on your
`gh` token, which the default login does not include. Grant it once with:

```bash
gh auth refresh -s project -h github.com
```
