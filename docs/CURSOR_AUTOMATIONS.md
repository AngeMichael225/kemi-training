# Cursor Automations — drafts

These are prepared drafts. They are not enabled. Creating them in the Automations editor needs one human confirmation. Do not create a paid automation per commit.

## PR Quality Review

- Trigger: pull request opened or pushed on `AngeMichael225/kemi-training`.
- Actions: read the diff, run or read CI for lint, typecheck, unit tests, and build. Comment only when a concrete bug or a missing test is visible.

## CI Failure Investigator

- Trigger: CI completed with failure on that repository.
- Actions: read the failed job log, name the cause, and propose a fix on the same branch when the failure is a clear repository defect.

## Security Review

- Trigger: pull request that touches `supabase/`, `src/lib/supabase/`, `src/app/api/`, `src/app/auth/`, or `.env.example`.
- Actions: check RLS, service-role exposure, storage policies, and secrets in the diff. Comment only on a real isolation or secret issue.

Secrets for these automations belong in Cursor Cloud Secrets, not in the repository.
