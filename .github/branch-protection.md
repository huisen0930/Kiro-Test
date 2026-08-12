# Branch protection for `main`

These rules make the PR → review → CI gate **mandatory** (today it is advisory). They could
not be applied automatically because `huisen0930/Kiro-Test` is a **private repo on a plan that
doesn't include protected branches** (GitHub returned HTTP 403: "Upgrade to GitHub Pro or make
this repository public to enable this feature").

## To enable
Do one of:
- Make the repo **public** (branch protection is free for public repos), or
- Upgrade to **GitHub Pro / Team** (protected branches on private repos).

Then run (with `gh` authenticated):

```bash
gh api -X PUT "repos/huisen0930/Kiro-Test/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Lint, build & test (22)", "Lint, build & test (24)"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": true,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

## What each rule does
- **required_status_checks** — the CI matrix (`Lint, build & test (22)` and `(24)`) must pass,
  and the branch must be up to date (`strict`) before merge. Verify the check names match after
  the first CI run.
- **required_pull_request_reviews** — 1 approving review, a CODEOWNER review required, and stale
  reviews dismissed on new commits.
- **required_linear_history / no force-push / no deletion** — keep `main` clean and auditable.
- **required_conversation_resolution** — all review threads resolved before merge.
- **enforce_admins: false** — admins can bypass. For a solo repo this lets the owner still merge
  (GitHub blocks self-approval). Flip to `true` for a real multi-person team.
