---
name: auto-issue
description: Run the whole development cycle end-to-end for a shared GitHub issue — analyze, branch, implement, test, build, review, and self-fix — with no per-step hand-off, stopping only when the branch is ready for the user to commit and open the PR. Invoke with #auto-issue <n>.
---

# auto-issue — one-command issue-to-ready-branch cycle

Runs the full per-issue workflow autonomously, from a shared GitHub issue to a review-clean branch that the user only has to **commit + open a PR** on. Collapses the human-in-the-loop round-trip (author analysis → user posts → user branches → re-share) into a single unattended run, and adds a **bounded self-fix loop** so Criticals / Warnings / conflicts surfaced by the review are fixed automatically instead of handed back.

It CALLS the existing skills — `issue-analyze`, `issue-impl`, `test-driven-development`, `systematic-debugging`, `pre-handoff` (which itself runs `code-review`, `design-vs-req`, the confidence gate, the adversarial round, and `prepare-pr`). Those stay individually invocable; this skill sequences them and owns the loop.

## When to Use

- The user shares a GitHub issue (URL or number) and wants the whole cycle run end-to-end without stopping at each phase
- Invoked as `#auto-issue <n>` (e.g. `#auto-issue 37`)

## The Hard Boundary (never cross without the user asking)

- **Never** `git commit` the feature work, `git push`, open/merge a PR, or `git merge/rebase --continue` a feature commit. Those are the user's (workflow step 10). The run ENDS by presenting the artifacts.
- **The branch is normally the user's** — they create it and hand over. **Only create it yourself if the user forgot** (still on `develop`): then `git checkout develop && git pull --ff-only` and `git checkout -b …` off latest `develop`. If already on a feature branch, use it untouched (never rename/recreate).
- **Allowed git housekeeping:** the fallback branch creation above; and, only to resolve a conflict, merge `develop` into the branch and fix conflicts (Phase 7). Report every git action taken.
- **Allowed GitHub write:** post the Phase-1 analysis as a comment on the shared issue (`gh issue comment`). This is explicitly delegated and is NOT a commit/push/PR.
- **Bounded loop:** at most **3** fix rounds. Never loop forever; escalate instead.
- **Autonomous decisions get recorded, not hidden:** every ambiguity resolved by best-practice goes in the analysis's `Ambiguities & Resolutions` section so the user can veto in review.

## Phases

1. **Analyze** (`issue-analyze` on the issue number/URL). Resolve every ambiguity with the recommended default + one-line rationale and record it under `Ambiguities & Resolutions` — do NOT stop to ask. Escalate to the user ONLY for a genuinely irreversible / high-cost / externally-visible fork (destructive data change, public API contract, an expensive-to-undo architectural split) — those are rare. **Then post the analysis as a comment on the shared issue** (`gh issue comment <n> --body-file …`) so it's on the record before implementation.

2. **Branch.** Check the current branch. **If already on a feature branch** (not `develop`), the user created it — use it untouched. **If still on `develop`** (the user forgot), create it from latest: `git checkout develop && git pull --ff-only`, then `git checkout -b <type>_<slug>_issue_<n>` (match the repo's branch naming, e.g. `login_mfa_challenge_issue_36`). Local only — no push.

3. **Implement** (`issue-impl`). Cover the issue body AND the Phase-1 analysis (its acceptance criteria + recorded resolutions). TDD for new logic (`test-driven-development`): red → green → refactor.

4. **Verify.** Core tests (`dotnet test …Core.Tests`) + both heads Release (`dotnet build …App -f net10.0-android -c Release` and `-f net10.0-windows10.0.19041.0`). **Grep the full log for `warning CS`** — never trust the "Build succeeded" summary or a self-reported "0 warnings".

5. **Debug** (`systematic-debugging`) if tests are red, the build fails, or any `warning CS` appears — root-fix, never disable/drop a Must feature to dodge a failure. Re-verify.

6. **Pre-handoff** (`pre-handoff`): code-review (+ Phase 2a UI/platform/localization/observability lens when the diff touches `Pages/`/`*.xaml`/`Converters/`/`Platforms/`/a Core-interface+adapter) → design-vs-req → confidence gate (>=90%) → adversarial round (incl. conflict check: behind-count + marker scan) → **Phase 5.5 fix-forward** (classify + route every would-be-"left" item) → `prepare-pr`.

7. **Self-fix loop** (bounded, see flowchart). If pre-handoff surfaces a **Critical**, a **Warning worth fixing**, a **conflict** (branch behind `develop` / merge markers), or a **Phase-5.5 category-1/2 left-item** (cheap-in-scope or out-of-scope-but-real):
   - Fix it at the root. For a Critical/Warning/left-item fix, add or extend a test so the fix is **regression-guarded** — reverting the fix must fail a test (mutation check). (Category-2 items that would change a public/wire contract or need their own design are **filed as a follow-up issue** and linked instead of forced into this PR.)
   - For a conflict: merge `develop` into the branch, resolve, re-verify.
   - Re-run Phase 4 verify + the relevant pre-handoff checks. Increment the round counter.
   - **Do NOT "fix" a by-design (cat 3) or upstream (cat 4) item** — that is a regression or impossible; those stay documented.
   - If a Critical survives 3 rounds → STOP and escalate to the user with the specific surviving finding, what was tried, and why it resists. (That is success, not failure, of the loop.)

8. **Finish.** When the gate is clean (0 Critical, no conflict, builds green, `warning CS` = none, every Phase-5.5 category-1/2 item fixed or filed), the run stops at the ready branch. Present: the branch name, the two paste artifacts (`prepare-pr` already wrote `pr-drafts/<branch>.md`), every git action taken, every recorded decision, every left-item fixed or filed (with issue links), and any residual **category-3/4** documented item. Then hand off — the user commits + opens the PR.

## Loop Control

```
pre-handoff clean?
  (0 Critical, no conflict, builds green, no warning CS, no cat-1/2 left-item)
  |- yes -> STOP: present artifacts, hand off to user
  |- no  -> fix rounds used < 3?
             |- yes -> fix at root + add regression guard (or file cat-2 follow-up),
             |          re-verify, round++ -> re-gate
             |- no  -> STOP: escalate to user (the specific surviving finding, what was tried, why it resists)
```

## Rules

- **Right-form for decisions:** when unsure, pick the recommendation / established best practice and record it — do not block the run with a question. Reserve questions for the rare irreversible/high-cost fork.
- **Sources of truth win:** derive behavior/strings/values from UserRequirements → TechnicalSpecification → wireframes → the web app → DeliveryReconciliation. Never lift `backup/v1-prototype` content verbatim.
- **No completion claim without fresh evidence:** state test/build results from a run in the same turn, with the `warning CS` grep result.
- **Fix-forward, don't park:** Phase 5.5 routes every would-be-"left" item — cat 1 (cheap+in-scope) and cat 2 (out-of-scope-but-real) are fixed in-PR with a regression guard, or (cat 2 needing a contract change / own design) filed as a linked follow-up. Only cat 3 (by-design) and cat 4 (upstream) stay documented — never "fixed".
- **Report, don't hide:** list every autonomous decision, every git action, every Phase-5.5 left-item (fixed in-PR or filed with a link), and every residual cat-3/4 documented item in the final hand-off so the user can veto.
- **Escalate, don't spin:** a Critical surviving 3 rounds stops the run with specifics.
- **The hard boundary is absolute:** never commit/push/PR/merge feature work — the run ends at the ready branch.
