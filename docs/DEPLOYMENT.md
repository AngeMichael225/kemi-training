# KEMI Training - Deployment

> **PREFLIGHT ONLY — PRODUCTION NOT AUTHORIZED**
>
> Wave 08 documentation and audit. Do not deploy Production, promote a Preview, run
> `vercel --prod`, or change Supabase Auth Site URL / redirect URLs until a human
> issues an explicit production GO after Wave 07 merges and the final candidate is
> rebased onto `main`.

Operator-facing short checklist: [`docs/RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).

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

Do not create a development Supabase project, a staging Supabase project, or a Supabase preview branch.

Wave 08 preflight audit (read-only): the hosted application database remains the existing project `kemi-training` (`pripmaupaqorphvmkprl`). No additional Supabase project was created.

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

The production seed prefers `SUPABASE_SECRET_KEY` (`sb_secret_...`) and falls back to `SUPABASE_SERVICE_ROLE_KEY` when the secret key is unset. Either value may exist only in a local shell or a temporary seed environment. It must not appear in `NEXT_PUBLIC_*`, `src/`, the browser bundle, git, a PR body, logs, or screenshots. Leave `.env.local` pointed at the local Docker stack.

Production Auth `Site URL` is the canonical production KEMI URL once that domain is known. Prefer an exact redirect URL. Keep local Auth testing on the local stack.

## Vercel

Wave 02 does not deploy the application as the release gate. A Vercel project may already exist for Preview and historical Production aliases; Wave 08 still requires an explicit human GO before any new Production deploy or Auth cutover.

After Wave 02 merges:

- create or link the Vercel project
- connect GitHub
- enable Preview Deployments for future feature branches

Wave 08:

- configure Vercel Production runtime variables (names only below; values only after human GO)
- configure the final Supabase Auth Site URL and redirect URLs (after human GO)
- deploy production only after human GO

Preview deployments stay without production Supabase credentials. Local Supabase covers authenticated integration testing. Vercel Preview covers UI and build validation. When a production application deploy is explicitly authorized, Production receives only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL`. Do not add `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to Vercel. The Next.js runtime does not use them. Build command: `pnpm build`. Install command: `pnpm install --frozen-lockfile`. Node 24. `pnpm-lock.yaml` is committed.

### Wave 08 preflight — Vercel project audit (read-only)

Inspected with Vercel CLI as account `kmgod2021` (no Production mutations).

| Setting | Observed |
| --- | --- |
| Project name | `kemi-training` |
| Account / team | `kmgod2021` (personal projects) |
| Framework | Next.js (`nextjs`) |
| Node.js | `24.x` |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Production branch (inferred) | `main` (production aliases include `kemi-training-git-main-kmgod2021.vercel.app`) |
| Custom domains | none registered under the account |
| Production aliases | `https://kemi-training.vercel.app`, `https://kemi-training-kmgod2021.vercel.app`, `https://kemi-training-git-main-kmgod2021.vercel.app` |
| Deployment protection | Vercel Authentication / SSO protection: `all_except_custom_domains`; git fork protection: enabled |
| Environment variable names | **none configured** (Production / Preview / Development) |

Expected build contract match: Framework Next.js, Node 24, install `pnpm install --frozen-lockfile`, build `pnpm build`, Production branch `main`.

Do not commit the local `.vercel/` link directory or any `.env.local` created by `vercel link` / `vercel env pull`.

## PWA validation
After deployment over HTTPS, open Safari on iPhone, add the site to the Home Screen, launch standalone, then validate manifest theme, safe areas, media playback and offline reload of a previously opened session. The full Wave 08 device script is in section **6. REAL IPHONE VALIDATION**.

## External blockers
This repository can run in local fallback mode without Supabase. The hosted production project is created through Supabase browser login. Do not paste an access token or service-role key into chat or the repository. The production Vercel application is not authorized from Wave 08 preflight documentation alone.

---

## 1. PRE-RELEASE BASELINE

```text
STATUS: WAVE08_PREFLIGHT_READY (documentation only)
NOT: WAVE08_READY_FOR_PRODUCTION
```

Baseline for this preflight PR:

- Branch: `release/candidate`
- Base commit at branch cut: `8b9e5b890f62ecc0068272f0b434076ca52f8f98` (post–Wave 06 merge; pre–Wave 07 application work)
- Wave 07 (`feat/ios-polish` and related application edits) proceeds in parallel and must **not** be rebased into `release/candidate` during preflight
- Architecture: local Docker Supabase for development/integration; **one** hosted Supabase project (`kemi-training` / `pripmaupaqorphvmkprl`) for production data
- Vercel project `kemi-training` already linked to GitHub for Previews; Production env vars are **not** configured yet
- A Vercel Preview of `release/candidate` is **not** required during initial preflight (docs-only on the pre-Wave 07 baseline)
- Finalization after a human merges Wave 07: rebase/update the candidate onto the new `main`, run full CI, open/refresh Preview of the final app candidate, then seek an explicit production GO

Stop and report `PARALLEL_CONFLICT` if a release blocker requires changing application code while Wave 07 is still active. Do not edit `src/**` from the Wave 08 release lane during preflight.

## 2. PREVIEW CHECKLIST

Use only after the final application candidate (post–Wave 07 merge) is on a PR into `main`, or when a human explicitly asks for a Preview.

- [ ] PR targets `main`; CI Quality / Playwright / Supabase jobs are green (or failures understood)
- [ ] Vercel Preview deployment is Ready (not Production)
- [ ] Preview does **not** receive Production Supabase credentials
- [ ] Preview may run in local-review / unconfigured-Supabase mode for UI and build validation
- [ ] Smoke Preview in a mobile viewport (430×932): Today, session shell, Progress shell load without HTTP 500
- [ ] Do not promote Preview to Production
- [ ] Do not run `vercel --prod` from a Preview workflow

Initial Wave 08 preflight: **Preview not required** (docs-only on pre-Wave 07 baseline).

## 3. PRODUCTION ENV CHECKLIST

Allowed Production runtime variables (names only; values never in git, chat, or PR bodies):

| Name | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Browser-visible by design (`NEXT_PUBLIC_*`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Browser-visible by design (`NEXT_PUBLIC_*`) |
| `NEXT_PUBLIC_APP_URL` | yes | Must equal the canonical production origin (no trailing slash preference: keep consistent with Auth Site URL) |

Vercel must **never** receive:

- `SUPABASE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- database password
- Supabase access token

```text
PRODUCTION_ENV_CONTRACT (Wave 08 preflight audit)
-------------------------------------------------
Required names present on Vercel Production: NO (zero env vars configured)
Forbidden secret names present: NO
Status: GAPS — NOT YET CONFIGURED
Action during preflight: document only. Do not add values yet.
```

After human GO (not during preflight):

1. In Vercel → Project `kemi-training` → Settings → Environment Variables → **Production** only for the three allowed names
2. Confirm Preview/Development do not hold Production Supabase credentials
3. Redeploy Production only after Auth checklist is ready

## 4. SUPABASE AUTH CHECKLIST

Local Auth remains on the local stack (`supabase/config.toml`: `site_url = "http://localhost:3000"`, redirects for `http://localhost:3000` and `/auth/confirm`). Do not point local Docker Auth at the production origin.

### Current state (safely inspectable)

- Hosted project: `kemi-training` (`pripmaupaqorphvmkprl`), `ACTIVE_HEALTHY` (Wave 02 plan: Auth user + seed already completed historically)
- Hosted Auth Site URL / redirect URL values: **not modified and not printed here** during preflight (Dashboard inspection by a human at GO time)
- Production login email: **do not** put the real address in committed files

### Desired production state (after human GO)

When the canonical origin is confirmed as `https://kemi-training.vercel.app` (or a later custom domain the human chooses):

- Auth **Site URL** = that exact origin (HTTPS)
- Permitted redirect URLs include at least:
  - `{CANONICAL_ORIGIN}/auth/confirm`
  - optionally `{CANONICAL_ORIGIN}` if required by the Auth provider settings
- Prefer exact URLs over wildcards
- Magic-link / OTP `emailRedirectTo` continues to use `window.location.origin` in the app; Site URL and allow-list must match that origin

If a custom domain replaces `kemi-training.vercel.app` later, update Auth **before** or **atomically with** the domain cutover. Until a human confirms the final origin for Auth, treat Auth cutover as blocked even if the Vercel alias already exists.

### Post-approval operation (human, later)

1. Confirm canonical production origin (see section 1 / Canonical URL below)
2. Set Vercel Production `NEXT_PUBLIC_APP_URL` to that origin
3. In Supabase Dashboard → Authentication → URL configuration: set Site URL and redirect allow-list to that origin
4. Send a magic link to the production Auth user and confirm `/auth/confirm` lands on the same origin
5. Do not change local Docker Auth URLs

## Canonical production URL

```text
Vercel production aliases established:
  https://kemi-training.vercel.app
  https://kemi-training-kmgod2021.vercel.app
  https://kemi-training-git-main-kmgod2021.vercel.app

Custom domain: none

Primary documented Vercel production origin:
  https://kemi-training.vercel.app
```

No custom DNS was changed during preflight. If product later requires a branded custom domain, status becomes a new cutover; until then Auth and `NEXT_PUBLIC_APP_URL` should target `https://kemi-training.vercel.app` after human GO.

## 5. PRODUCTION DEPLOY CHECKLIST

**HUMAN APPROVAL REQUIRED.** No agent or automation may deploy Production without an explicit human GO in chat or an approved release ticket.

Before asking for GO:

- [ ] Wave 07 merged; final candidate rebased/updated onto `main`
- [ ] CI green on the final candidate
- [ ] Preview checklist complete for the final candidate
- [ ] Production env checklist: three allowed names configured; zero forbidden secrets
- [ ] Supabase Auth checklist prepared (Site URL / redirects match canonical origin)
- [ ] Rollback procedure reviewed (section 8) **before** deploy
- [ ] Real-device plan prepared (section 6)

After explicit human GO only:

- [ ] Deploy Production from `main` (Vercel Production deployment for the approved SHA)
- [ ] Confirm deployment Ready on `https://kemi-training.vercel.app`
- [ ] Run post-deploy smoke (section 7)
- [ ] Run real iPhone validation (section 6) and record PASS/FAIL (not during preflight)

Forbidden without GO: `vercel --prod`, `vercel promote`, Production promote UI, Production env mutation, Auth Site URL mutation, `supabase db reset --linked`.

## 6. REAL IPHONE VALIDATION

Device: **iPhone 14 Pro Max** (430×932). Status for Wave 08 preflight: **PREPARED_NOT_RUN**. Do not mark PASS until executed after Production (or final Preview-with-auth) is authorized.

### Safari (in-browser)

1. First load of the production (or authorized) origin over HTTPS — no blank shell, no HTTP 500
2. Auth flow (magic link / OTP) for the production user — do not commit the email
3. Today — program day visible; no horizontal overflow
4. Workout start / resume
5. Set logging (complete at least one set)
6. Reload mid-session — active session survives
7. Media — exercise media renders / plays without breaking layout
8. Progress — history / records; confirm **Estimated 1RM** wording (not invented labels)

### PWA standalone

1. Share → Add to Home Screen
2. Launch from Home Screen (standalone)
3. Safe areas — top notch / Dynamic Island and bottom home indicator; bottom nav clears home indicator
4. Navigation — Today / Plan / Exercises / Progress / Profile
5. Workout — start or resume; log a set
6. Rest timer — appears for prescribed rest; readable
7. Media — usable in runner
8. Offline known-session reload — open a session, go offline, reload that session, confirm it restores
9. Restore online — pending sync clears / sync state honest
10. Sync state — text status visible (not color alone)

### Cross-cutting checks

- No horizontal overflow
- No HTTP 500
- No visible runtime errors
- No stale chunks after deploy (hard refresh if needed; reinstall Home Screen shortcut if SW stuck)
- No blank session after reload
- Estimated 1RM wording correct

## 7. POST-DEPLOY SMOKE TEST

Run immediately after an authorized Production deploy (not during preflight):

1. `GET https://kemi-training.vercel.app` → 200, app shell
2. `/auth/login` renders
3. Authenticated: `/today` renders
4. Start or resume a session; log one set; reload
5. `/progress` renders without 500
6. Vercel runtime logs: no flood of 5xx
7. Supabase Auth log: magic-link confirm succeeds on canonical origin
8. Confirm no service-role / secret key appears in browser Network responses or client bundle

## 8. ROLLBACK PROCEDURE

Documented **before** Production. Do **not** execute during preflight.

1. In Vercel → Project `kemi-training` → Deployments: Instant Rollback (or promote the previous Ready Production deployment) to the last known-good Production SHA
2. Confirm `https://kemi-training.vercel.app` serves the rolled-back deployment
3. If Auth URL changes were part of a failed cutover, restore Auth Site URL / redirects to the previous working origin **before** telling users to retry login
4. If a bad migration was applied (should be rare; dry-run first): do **not** run `supabase db reset --linked`. Fix forward with a new migration after local validation
5. Announce: users may need to close the PWA and reopen; clear site data only if stale chunks persist
6. File the incident: bad SHA, symptom, rollback target SHA, Auth changes yes/no

## 9. STOP CONDITIONS

Stop the release immediately if any of the following is true:

- Human GO has not been given for Production
- Wave 07 (or any required app wave) is not merged and the candidate still needs application changes → `PARALLEL_CONFLICT`
- CI red on the final candidate
- Production env shows forbidden secret names
- Auth Site URL / redirects do not match the canonical origin after cutover attempt
- Dry-run migration shows unexpected destructive SQL
- Real-device validation finds blank session, persistent 500s, or PWA offline break on a known session
- Pressure to skip rollback documentation or to force-push `main`

## 10. SECRET HANDLING

- Never commit `.env.local`, service-role keys, database passwords, or Supabase access tokens
- Never put secret/service-role keys in Vercel
- Never paste secrets into chat, PR bodies, docs, screenshots, or logs
- `NEXT_PUBLIC_*` values are **browser-visible by design**; treat them as public client config, not as server secrets
- Production Auth user email stays out of the repository
- Seed secrets stay in a local shell only; `.env.local` remains pointed at local Docker for day-to-day work
- Do not create extra Supabase projects or preview branches to “hold” secrets
