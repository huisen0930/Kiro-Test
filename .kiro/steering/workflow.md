# Workflow — Roles & Tracks

FocusFlow runs a two-track team workflow. Know which role you're in before acting; most work
happens on Track B.

## Track A — Lead / spec-author (once per phase)
The lead turns a user requirement into a specced, planned, assigned phase:
1. Receive the requirement from the user / stakeholder.
2. Author the tech spec — copy `.kiro/specs/_TEMPLATE/` to `.kiro/specs/<feature>/` and write
   `requirements.md` (EARS) → `design.md` (incl. wireframes for UI features) → `tasks.md`.
   Use the `/spec-authoring` skill.
3. Plan the timeline as **milestones** (one milestone per phase / sprint).
4. Create issues from the tasks:
   `npm run sync:issues -- --spec <feature> --milestone "<phase>" --create`
   (add `--assignee <login>` to assign at creation, or assign later on GitHub).
5. Assign members / take volunteers.

Lead-only skill: **`/spec-authoring`**. Members do not run it.

## Track B — Member / implementer (per issue, many people in parallel)
Members do NOT author specs. The spec is their input, already committed in the repo:
1. **Sync** the repo (`git pull`) so you have the current spec + steering.
2. Pick your assigned issue (or volunteer).
3. Branch off `main`: `type/short-description` (e.g. `feat/daily-goals`). Never work on `main`.
4. **`/issue-analyze`** — post the structured analysis as an issue comment. This is the contract;
   `/issue-impl` Gate 0 requires it. Run it before writing any code.
5. **`/issue-impl`** — implement in layer order (schemas → domain → repositories → routes →
   wire in `app.ts` → tests). Reach for `/test-driven-development` and `/systematic-debugging`.
6. **`/verification-before-completion`** — the DoD gate: `npm run lint` + `npm run build` + `npm test`.
7. **`/pre-handoff`** — runs `/code-review` + `/design-vs-req` + the confidence gate, then
   `/prepare-pr` to emit the PR description + Self Assessment Review + `pr-drafts/<branch>.md`.
8. Commit, push the branch, open the PR. CODEOWNERS review + CI gate it before merge to `main`.

**`/auto-issue <n>`** runs the whole member track for one issue and stops at a ready branch
(it never commits, pushes, or opens the PR — you do that).

## The rule that ties both tracks together
Spec-first is a **team guarantee**, upheld by the lead. As a member you never invent scope in
code: the spec is the source of truth **and** your input. If you find it wrong, ambiguous, or
missing something, **escalate to update the spec first** (raise it with the lead / open a spec
change) — do not silently diverge in the implementation.

## Applies to everyone, every role
The Definition of Done — `npm run lint` (0 errors) + `npm run build` (compiles) + `npm test`
(0 failures), run fresh — gates every task and every PR.

## Definition of Ready (before a member picks up an issue)
An issue is *ready* to start only when:
- It links to a spec + the requirement IDs, and its acceptance criteria are clear.
- Prerequisite issues are merged into `main` (or the dependency is explicitly noted).
- It is assigned and sized (S / M / L).
- The plan is to run `/issue-analyze` first (post the analysis contract before coding).

If an issue isn't ready, raise it with the lead rather than starting on guesswork.

## Right-size the process to the change (change-size lanes)
Match ceremony to risk — don't over-process a typo, don't under-process a new endpoint:
- **Trivial** (docs, comment, config one-liner): branch → change → `npm run lint`+`npm test` → PR. A focused `/code-review` pass is enough; skip the full `/pre-handoff` orchestration.
- **Standard** (a bug fix or a small feature touching one layer): the full member track, `/pre-handoff` with a focused review depth.
- **Complex** (new endpoint/resource, new domain rules, persistence changes): the full member track with `/pre-handoff` at full multi-agent depth + the HTTP API contract lens.
