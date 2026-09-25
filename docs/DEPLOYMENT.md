# KEMI Training - Deployment

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

Wave 02 does not deploy the application.

After Wave 02 merges:

- create or link the Vercel project
- connect GitHub
- enable Preview Deployments for future feature branches

Wave 08:

- configure Vercel Production runtime variables
- configure the final Supabase Auth Site URL and redirect URLs
- deploy production

Preview deployments stay without production Supabase credentials. Local Supabase covers authenticated integration testing. Vercel Preview covers UI and build validation. When a production application deploy is explicitly authorized, Production receives only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL`. Do not add `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to Vercel. The Next.js runtime does not use them. Build command: `pnpm build`. Install command: `pnpm install --frozen-lockfile`. Node 24. `pnpm-lock.yaml` is committed.

## PWA validation
After deployment over HTTPS, open Safari on iPhone, add the site to the Home Screen, launch standalone, then validate manifest theme, safe areas, media playback and offline reload of a previously opened session.

## External blockers
This repository can run in local fallback mode without Supabase. The hosted production project is created through Supabase browser login. Do not paste an access token or service-role key into chat or the repository. The production Vercel application is not deployed from Wave 02.
