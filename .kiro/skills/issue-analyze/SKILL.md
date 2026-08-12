---
name: issue-analyze
description: Structured requirement analysis for a GitHub issue, POSTED as a comment on the issue via gh. This is the contract implementation must satisfy, mapped to FocusFlow's domain/routes/schemas/repositories layers and EARS acceptance criteria. Invoke with /issue-analyze.
---

# issue-analyze — Structured Requirement Analysis

Analyze a GitHub issue, produce a structured breakdown, **and post it as a comment on the issue** (`gh issue comment`). Posting is Kiro's job and is mandatory — never leave the analysis only in chat. This posted analysis becomes the contract for implementation (`/issue-impl` must satisfy both the issue body AND this analysis, and refuses to start until this comment exists).

## When to Use

- When the user shares a GitHub issue (by number, URL, or pasted content) and asks for analysis
- Before implementation begins on any new issue
- Default depth for most issues; escalate to a full `design.md` update only for large/cross-cutting issues (a new resource spanning domain + routes + persistence, a change to the error envelope, or a change to the injectable `Clock`)

## Inputs to Gather

1. **Issue content** — body text, the EARS acceptance-criteria IDs it references (e.g. `4.4`), and validation bullets
2. **Spec references** — read the relevant sections of `.kiro/specs/<feature>/requirements.md` and `design.md` for the requirement IDs the issue covers; check `tasks.md` for the task this issue came from
3. **Steering** — `.kiro/steering/` (tech: stack/commands/DoD/error codes; structure: layers/golden rule; product: scope) for the conventions the analysis must respect
4. **Codebase state** — scan the current code (`src/`) to understand what exists, what this issue depends on, and what it will touch

## Output Format

Produce the following structured analysis:

```markdown
# Issue Analysis: #{number} — {title}

## Classification
- **Milestone / Phase:** {e.g. Phase 1: Core API}
- **Type:** feat / fix / refactor / chore
- **Complexity:** Low / Medium / High
- **Dependencies:** {list issue numbers this depends on}
- **Blocks:** {list issue numbers blocked by this}

## Acceptance Criteria
{Expand the issue's validation bullets and the referenced EARS criteria (requirements.md) into precise, testable acceptance criteria. Each should be pass/fail verifiable.}

1. ...
2. ...

## Affected Areas
| Area | Impact | Files |
|------|--------|-------|
| {area} | {what changes} | {file paths} |

## Assumptions
{List what you're assuming to be true that isn't explicitly stated. These need user confirmation.}

1. ...

## Ambiguities & Open Questions
{Things that are unclear or have multiple valid interpretations. Ask the user to resolve before implementation.}

1. ...

## Risks
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| {risk} | Low/Med/High | {how to mitigate} |

## Suggested Approach
{Brief implementation plan — what to build, in what order, in which files. Reference the FocusFlow layers. DI wiring always lands in app.ts.}

### Domain (src/domain)
- ... {pure business logic + types; no Fastify/HTTP/IO}

### HTTP (src/routes + src/schemas)
- ... {Zod schemas as the source of truth for shapes; Fastify route plugin validating input and throwing AppError}

### Persistence (src/repositories)
- ... {interface + in-memory impl; node:sqlite impl only if the feature needs durable state}

### Tests (test/)
- ... {domain unit tests + app.inject() integration tests, incl. error paths; fixed clock for time-based behavior}
```

## Final Step — POST the analysis (mandatory)

Producing the analysis is not enough — post it to the issue so it becomes the on-record contract:

```powershell
# Write the analysis to a temp file, then post it (avoids shell-escaping issues with long/multiline bodies)
gh issue comment <n> --body-file <path-to-analysis.md>
```

- `gh` infers the repo from `origin` — never pass `--repo`.
- Post the SAME structured breakdown shown above — no separate short version.
- Then report the comment URL in chat and, in **step-by-step mode, STOP** — wait for the user to review (they can edit the comment on GitHub), create the branch, and give the go-ahead before `/issue-impl`. In **autonomous mode (`/auto-issue`)**, continue.
- Clean up the temp file afterward.
- If posting fails (auth/network), say so explicitly and do NOT proceed to implementation — a missing comment blocks `/issue-impl` by rule.

## Rules

- **Posting the comment is mandatory and is Kiro's job** — never leave the analysis only in chat (this is the analysis-only-in-chat regression this skill exists to prevent)
- The sources of truth are `.kiro/specs/<feature>/{requirements,design,tasks}.md` + `.kiro/steering/` — read them, don't guess
- Identify ALL EARS acceptance-criteria IDs the issue covers and verify each against `requirements.md`
- Flag any requirement that seems contradicted by the design or steering conventions
- If the issue depends on unmerged work, note it clearly
- Keep the analysis concise — bullets over paragraphs
- Write it so the user can edit it on GitHub after posting (it's a starting contract, not final word)
