# KEMI Training - Deployment

**PREFLIGHT ONLY — PRODUCTION NOT AUTHORIZED.**

Wave 08 status: `WAVE08_PREFLIGHT_READY`. This runbook records the release audit and the later human steps. It does not authorize a production deploy, a Vercel Production deployment, a Preview promotion, a DNS change, or a Supabase Auth change.

`NEXT_PUBLIC_*` values are browser-visible by design. Anyone who can load the app can read them. They are still not service-role credentials.

## Local Supabase Quickstart

Docker Desktop must be running (`docker info` succeeds). From a clean checkout:

```bash
pnpm install --frozen-lockfile
pnpm supabase:bootstrap
pnpm dev
```

Open `http://localhost:3000`. The bootstrap command starts the local stack, writes `.env.local` (never commit it), creates `kemi.local@example.test`, seeds the KEMI program, and generates `src/lib/supabase/database.types.ts`. Run it again to confirm it does not duplicate rows.

Useful commands:

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:reset
pnpm supabase:lint
pnpm supabase:test
pnpm supabase:types
pnpm test:supabase
```

`pnpm supabase:reset` runs `supabase db reset --local` only. Never run `supabase db reset --linked` or any other destructive command against the linked remote. Magic links for local Auth testing are captured by the local mail UI at `http://127.0.0.1:54324`. The app origin stays `http://localhost:3000`. The local API stays on `http://127.0.0.1:54321`.

## Environments

```text
LOCAL
development / test

HOSTED SUPABASE
production
```

Local Docker Supabase is the development and integration-testing environment. There is one hosted Supabase project, suggested name `KEMI Training`, classified `PRODUCTION`. That project is the only hosted database for this application.

A separate hosted staging environment is intentionally omitted because KEMI is a small application. Local Supabase is the integration environment. Production schema changes are migration-driven and must pass local database/security tests before deployment.

Do not create a development Supabase project, a staging Supabase project, a second hosted project, or a Supabase preview branch.

Wave 02 recorded the existing hosted project as name `kemi-training`, ref `pripmaupaqorphvmkprl`. This preflight did not re-query that project. See the audit below. Do not create a replacement project.

## Production schema

All schema work follows:

```text
Git feature branch
→ migration file
→ Supabase local
→ db reset
→ pgTAP
→ integration tests
→ PR / CI
→ main
→ production migration
```

Before `pnpm supabase db push`:

```bash
pnpm supabase migration list
pnpm supabase db push --dry-run
```

Current migration files:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_exercise_media_storage.sql`
- `supabase/migrations/0003_rls_fk_guards.sql`
- `supabase/migrations/20260925185536_function_execute_guards.sql`

Stop if a dry-run shows an unexpected destructive migration. The production Dashboard is for operations, inspection, Auth administration, Storage inspection, and advisors. Schema stays in migrations. If an emergency Dashboard change happens, capture it back into a migration immediately.

Link the production project only:

```bash
pnpm supabase projects list
pnpm supabase link --project-ref <PRODUCTION_PROJECT_REF>
```

Record the project ref. Never commit the database password, access token, or secret/service-role key.

Create the production Auth user in the Supabase Auth UI. Do not use `kemi.local@example.test` in production, and do not put the real login email in committed fixtures. Seed only after the target URL is the production project, the Auth UUID is that user, and migration history is current. The seed stays idempotent. Expected imported counts: 4 weeks, 12 workout days, 140 workout items, 33 exercises, 27 media records, 3 strength test templates.

The production seed prefers `SUPABASE_SECRET_KEY` (`sb_secret_...`) and falls back to `SUPABASE_SERVICE_ROLE_KEY` when the secret key is unset. Either value may exist only in a local shell or a temporary seed environment. It must not appear in `NEXT_PUBLIC_*`, `src/`, the browser bundle, git, a PR body, logs, or screenshots. Leave `.env.local` pointed at the local Docker stack. `scripts/seed-supabase.ts` refuses any host other than `127.0.0.1:54321`, `localhost:54321`, or `<linked-ref>.supabase.co`.

Production Auth `Site URL` is the canonical production KEMI URL once that domain is known. Prefer an exact redirect URL. Keep local Auth testing on the local stack. During this preflight the canonical URL is `CANONICAL_PRODUCTION_URL_PENDING`, so hosted Auth URLs stay unchanged.

## Vercel build contract

`vercel.json` sets `framework` to `nextjs` and a no-cache header on `/sw.js`. It does not set the install command, the build command, the Node version, or a domain.

Repository contract, which Production and Preview builds must match:

| Setting | Required value | Repository evidence |
| --- | --- | --- |
| Framework | Next.js | `vercel.json` `framework: nextjs` |
| Node | 24 | `package.json` `engines.node` `24.x`; CI `node-version: 24` |
| Install | `pnpm install --frozen-lockfile` | `.github/workflows/ci.yml`; pnpm `10.17.1` |
| Build | `pnpm build` | `package.json` script `next build` |
| Production branch | `main` | GitHub default branch `main` |

Live Vercel project settings were not readable in this preflight. See section 1.

Preview deployments stay without production Supabase credentials. Local Supabase covers authenticated integration testing. Vercel Preview covers UI and build validation. When a production application deploy is explicitly authorized by a human, Production receives only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL`. Do not add `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to Vercel. The Next.js runtime does not use them. `pnpm-lock.yaml` is committed.

This docs-only preflight does not mirror `release/candidate` to Vercel and does not create a Preview or Production deployment. Application code on this branch is still the pre-Wave 07 baseline.

## 1. PRE-RELEASE BASELINE

Official baseline:

- Branch: `release/candidate`, tracking `origin/release/candidate`
- Baseline SHA before this docs commit: `8b9e5b890f62ecc0068272f0b434076ca52f8f98`
- Remote: `https://github.com/AngeMichael225/kemi-training.git`
- GitHub default branch: `main`
- Wave 07 is not merged. Do not rebase this preflight onto Wave 07. Finalization happens only after a human merges Wave 07.

Architecture this preflight confirmed from the repository:

- Development and integration: local Supabase Docker (`pnpm supabase:start`, `supabase db reset --local` only).
- Hosted database: one existing Supabase production project. Wave 02 recorded `kemi-training` / `pripmaupaqorphvmkprl`. No second project, staging project, or preview branch is allowed. None was created here.
- Application hosting target: one Vercel project, Production branch `main`, after a later human GO. Not deployed in this wave.

Read-only CLI audit on 2026-09-28:

- Vercel CLI `48.2.9`, invoked outside the repo so dependencies stayed unchanged: `Error: No existing credentials found. Please run vercel login or pass --token` (`https://err.sh/vercel/no-credentials-found`). No `VERCEL_TOKEN`, no linked `.vercel/` directory, and `vercel login` was not run.
- Supabase CLI `2.117.0`: `supabase projects list` returned `LegacyPlatformAuthRequiredError` — `Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.` No `SUPABASE_ACCESS_TOKEN`. `supabase login` was not run.
- GitHub: repository homepage is empty, the deployments list is empty, and there are zero GitHub environments. That is not a canonical production URL.

Because the CLIs were unauthenticated, project name, team, live Production branch, live framework, live Node version, live install command, live build command, domains, deployment protection, and environment-variable names on Vercel were not inspected. Hosted Auth Site URL and redirect URLs were not inspected and were not modified.

`PRODUCTION_ENV_CONTRACT`: **NOT YET CONFIGURED**. The required names are specified in section 3. They were not written to Vercel.

`CANONICAL_PRODUCTION_URL`: **CANONICAL_PRODUCTION_URL_PENDING**.

Real-device plan: **PREPARED_NOT_RUN**.

Production mutations this wave: none. Production deployment: not deployed.

## 2. PREVIEW CHECKLIST

Use this when an application branch needs a Preview. Skip it for this docs-only preflight. A Vercel Preview is not required while application code is still the pre-Wave 07 baseline, and `release/candidate` must not be mirrored to Vercel for that reason.

- [ ] The branch is not `main`, and the commit does not contain `.env.local`, tokens, service-role keys, or the real production login email.
- [ ] CI on the pull request runs install (`pnpm install --frozen-lockfile`), lint, typecheck, unit tests, `pnpm build`, then Playwright. The Supabase CI job stays on local Docker and does not receive production credentials.
- [ ] Vercel install command is `pnpm install --frozen-lockfile`. Build command is `pnpm build`. Node is 24. Framework is Next.js.
- [ ] Preview environment variables do not include production Supabase credentials.
- [ ] Preview does not include `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, the database password, or a Supabase access token.
- [ ] Preview is not promoted to Production.
- [ ] `vercel --prod` and `vercel promote` are not run.

## 3. PRODUCTION ENV CHECKLIST

`PRODUCTION_ENV_CONTRACT`: **NOT YET CONFIGURED**.

Do not set these during preflight. A later human configures Production only after the canonical URL exists and after an explicit GO. Read names only. Never print or commit values.

Required Production runtime variables:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — `https://<production-ref>.supabase.co` for the single existing project. Browser-visible.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the publishable client key only. Browser-visible.
- [ ] `NEXT_PUBLIC_APP_URL` — the canonical production origin, once it exists (`https://…`, no path). Browser-visible.

On this baseline the magic link uses `window.location.origin + /auth/confirm` (`src/components/LoginForm.tsx`). `NEXT_PUBLIC_APP_URL` remains a required Production variable so the deployed origin is explicit. `.env.example` and `scripts/sync-supabase-env.ts` already list it. Local bootstrap may keep `http://localhost:3000`.

Vercel must never receive:

- `SUPABASE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- the database password
- a Supabase access token
- any service-role key under a `NEXT_PUBLIC_*` name

`KEMI_USER_ID` is a seed input for `scripts/seed-supabase.ts`. It is not a Vercel runtime variable.

Scope the three public variables to Vercel Production. Leave Preview without production Supabase credentials. Do not edit Production environment variables until the human GO. If a dashboard export is reviewed, redact every value before it reaches chat, git, or this file.

## 4. SUPABASE AUTH CHECKLIST

Do not modify hosted Auth during preflight.

Current state, local and inspectable:

- `supabase/config.toml`: `site_url = "http://localhost:3000"`.
- `additional_redirect_urls`: `http://localhost:3000` and `http://localhost:3000/auth/confirm`.
- Local mailbox: `http://127.0.0.1:54324`. Local API: `http://127.0.0.1:54321`.
- Local Auth user: `kemi.local@example.test`. That address stays local.
- The app sends `emailRedirectTo` to `${window.location.origin}/auth/confirm`.
- `src/app/auth/confirm/route.ts` accepts `token_hash` plus `type`, or a PKCE `code`, then redirects to a safe internal path (default `/today`).

Current state, hosted:

- Not inspectable in this preflight (Supabase access token absent).
- Wave 02 recorded a production Auth user as created. This wave did not re-read that user and does not record the email.
- Site URL and redirect URLs on the hosted project were left untouched.

Desired production state, after the canonical origin exists:

- Site URL is the canonical production origin exactly (`https` origin, no path).
- The redirect allow-list includes the exact URL `https://<canonical-origin>/auth/confirm`.
- The magic-link template lands on `/auth/confirm` so the route can read `token_hash` or `code`.
- Local `config.toml` stays on `http://localhost:3000`. Local Auth is not pointed at production, and production Auth is not pointed at localhost or a Preview host.

Post-approval operation, human only, after `CANONICAL_PRODUCTION_URL` is a real origin and after an explicit GO:

1. Open the existing project only (`kemi-training`, ref `pripmaupaqorphvmkprl`). Do not create a project, a branch, or a staging project.
2. In the Supabase Dashboard, open Authentication → URL Configuration.
3. Set Site URL to the canonical production origin.
4. Add the exact redirect URL `https://<canonical-origin>/auth/confirm`.
5. In Authentication → Email templates, confirm the magic link targets `/auth/confirm` on that same origin.
6. Leave `supabase/config.toml` on the local URLs. Prefer the Dashboard change so a local config push cannot overwrite production with `http://localhost:3000`.
7. Do not write the production login email into git, docs, or the PR.

## 5. PRODUCTION DEPLOY CHECKLIST

Production is not authorized. Every box below stays open until a human gives an explicit GO in the release thread. Merging this preflight PR is not that GO. Wave 07 must already be on `main` by a human merge before any production deploy. This preflight does not perform that merge.

- [ ] Human GO recorded. The words authorize production for a named SHA.
- [ ] Wave 07 is on `main`. The SHA to deploy includes that merge, not only `8b9e5b890f62ecc0068272f0b434076ca52f8f98`.
- [ ] `CANONICAL_PRODUCTION_URL` is established. DNS was changed only by the human owner, outside this preflight.
- [ ] Section 3 variables exist on Vercel Production, names verified, values not pasted into git or chat.
- [ ] Section 4 Auth Site URL and `/auth/confirm` redirect match that canonical origin.
- [ ] Rollback in section 8 has been read, and the previous Production deployment id is known. For the first production deploy, the operator records that no previous production deployment exists.
- [ ] `pnpm supabase db push --dry-run` was reviewed. No unexpected destructive migration.
- [ ] CI is green on the SHA: install, lint, typecheck, unit tests, build, Playwright.
- [ ] Vercel project settings match the build contract: Next.js, Node 24, `pnpm install --frozen-lockfile`, `pnpm build`, Production branch `main`.
- [ ] Deploy only that SHA to Production, from `main`, by the human owner.
- [ ] Run section 7, then section 6 on a real iPhone 14 Pro Max. Section 6 stays `PREPARED_NOT_RUN` until that device pass happens.

Commands this preflight does not run: `vercel --prod`, `vercel promote`, `vercel rollback`, `supabase db push` against the linked project, `supabase db reset --linked`.

## 6. REAL IPHONE VALIDATION

Status: **PREPARED_NOT_RUN**. Do not mark this PASS from documentation, CI, or a desktop browser.

Device: iPhone 14 Pro Max. Primary layout reference is 430×932 CSS px. Use the canonical HTTPS origin after a human-authorized production deploy. Until that origin exists, do not invent a URL and do not run this script against a guessed host.

Pass conditions for both Safari and standalone: no horizontal overflow, no HTTP 500, no visible runtime error, no stale chunk (`ChunkLoadError` or a failed dynamic import), no blank session, and strength copy says **Estimated 1RM**.

### Safari

1. First load. Open the canonical origin. The app paints. The response is not HTTP 500. There is no blank screen and no error overlay.
2. Auth. Open `/auth/login`. Request a magic link for the production Auth user. Open the message on this phone. The link hits `/auth/confirm` on the same origin and continues to `/today`. Do not copy that email into notes that will be committed.
3. Today. `/today` shows the workbook session for the current day. The session is not blank.
4. Workout start and resume. Start that workout. Leave the screen. Return and resume the same active session.
5. Set logging. Log one prescribed set. The load, sets, and reps stay the workbook values.
6. Reload. Reload Safari. The active session and the logged set are still there.
7. Media. Open an exercise that has imported media. The image or video renders inside the viewport.
8. Progress. Open `/progress`. Estimates are labeled **Estimated 1RM**.

### PWA standalone

1. In Safari, use Share → Add to Home Screen.
2. Launch from the Home Screen icon. The app is standalone, without Safari chrome.
3. Safe areas. Content clears the top inset and the home indicator. Bottom navigation is visible and tappable.
4. Navigation. Move across Today, the plan, a workout, Progress, and profile. No route sticks on a blank page.
5. Workout. Start or resume, then log a set.
6. Rest timer. Start the prescribed rest, switch away briefly, and return. Remaining time follows the stored end timestamp.
7. Media. Open exercise media inside the standalone app.
8. Offline known-session reload. Open a session while online, then enable Airplane Mode and reload that same session. The known session still renders.
9. Restore online. Disable Airplane Mode. Sync state returns to confirmed or idle. A pending mutation disappears only after the server accepts it.

Record the date, iOS version, the deployment SHA, and PASS or the failing step. Leave this wave's status at `PREPARED_NOT_RUN`.

## 7. POST-DEPLOY SMOKE TEST

Run this only after a human-authorized Production deploy. Do not run it against a guessed URL. This preflight did not run it.

- [ ] `GET /` responds with a redirect to `/today`.
- [ ] `GET /today`, `GET /auth/login`, `GET /plan`, and `GET /progress` are not HTTP 500.
- [ ] `GET /sw.js` is HTTP 200 and `Cache-Control` is `public, max-age=0, must-revalidate` (`vercel.json`).
- [ ] The manifest loads and `display` is `standalone`.
- [ ] A logged-in reload still shows the active session.
- [ ] Progress copy says **Estimated 1RM**.
- [ ] The browser console shows no uncaught runtime error and no stale-chunk failure.
- [ ] If Auth was exercised, the magic link used the canonical origin `/auth/confirm` and did not land on localhost.

Failure of any item stops the release and starts section 8.

## 8. ROLLBACK PROCEDURE

Documented before Production. **Not executed.** This preflight has no Production deployment to roll back.

When a future Production deploy is bad:

1. Stop. Do not ship a second Production deploy as an unreviewed fix.
2. In the Vercel dashboard, open the existing project, Deployments, Production.
3. Select the last known-good Production deployment, the one immediately before the bad deploy.
4. Use Instant Rollback onto that deployment. Do not promote a Preview to Production to undo a bad Production deploy.
5. Confirm the production alias serves the previous deployment id.
6. Repeat section 7. If the failure was visible on device, repeat section 6.
7. Schema stays forward-only. Do not run `supabase db reset --linked`. Do not delete or recreate the Supabase project. A bad migration is corrected with a new migration that has passed local reset, pgTAP, and the dry-run.
8. If a Production variable change caused the failure, restore the previous values in the Vercel dashboard. Do not paste the values into git, chat, or docs.
9. If this was the first Production deployment and no previous Production deployment exists, take the alias off that deployment only with the same human owner, and record that rollback had no prior artifact.

`vercel rollback`, `vercel promote`, and `vercel --prod` are not part of this preflight.

## 9. STOP CONDITIONS

Stop and leave Production untouched when any of these are true:

- There is no explicit human GO for production.
- The status sought is `WAVE08_READY_FOR_PRODUCTION`. This wave stops at `WAVE08_PREFLIGHT_READY`.
- `CANONICAL_PRODUCTION_URL` is still `CANONICAL_PRODUCTION_URL_PENDING`.
- Production env is `NOT YET CONFIGURED`, or a forbidden secret is about to be added to Vercel.
- Hosted Auth would be pointed at localhost, a Preview URL, or an origin that is not the canonical production origin.
- Wave 07 is not on `main`, and the deploy would ship this pre-Wave 07 baseline as production.
- A cross-wave application change looks required. Report `PARALLEL_CONFLICT` and do not edit application code from this wave.
- `pnpm supabase db push --dry-run` shows an unexpected destructive migration.
- Anyone proposes `supabase db reset --linked`, a second Supabase project, a staging project, a development hosted project, or a Supabase preview branch.
- CI is red on the SHA to deploy.
- The iPhone script has not been run, and someone wants to mark it PASS.
- A command would print a service-role key, database password, access token, or the real production login email.

## 10. SECRET HANDLING

- Never commit `.env.local`.
- Never commit tokens, the database password, `SUPABASE_SECRET_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`.
- Vercel receives only the three `NEXT_PUBLIC_*` Production names in section 3, and only after a human GO. Those values are browser-visible by design.
- Seed keys live in a local shell or a temporary seed environment, then they are removed. They are not Preview vars, Production vars, client bundles, PR text, logs, or screenshots.
- Do not paste a Supabase access token into the repo or into chat. CLI login stays on the human's machine.
- Do not put the real production login email in committed files. `kemi.local@example.test` is the local user only.
- Redact environment values before writing docs or a report. Names may be listed. Values may not.
- GitHub Actions for Supabase uses the local Docker stack and does not receive production credentials.

## External blockers

The app runs in local review mode when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are absent. Do not invent those values.

Hosted inspection is blocked until a human runs `vercel login` or provides `VERCEL_TOKEN`, and runs `supabase login` or provides `SUPABASE_ACCESS_TOKEN`, outside this repository. Do not paste either token into git or chat.

The production Vercel application is not deployed from this preflight. Wave 02 also did not deploy it. The next production action waits for a human GO after Wave 07 is merged, the canonical URL exists, section 3 is configured, and section 4 is applied.
