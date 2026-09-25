# Wave 02 — Supabase plan

Base: `45f64a0b83828e6a4253a31ea6a3dcd800725480` on `feat/supabase-integration`.

Audits: schema, RLS, sync, and developer experience were read-only. Auth was read from the current route, proxy, and client files before any edit.

## Current architecture

Next.js 16 uses `@supabase/ssr` in the browser, the server (`await cookies()`), and `src/proxy.ts`. `/api/*` is not redirected by the proxy. `/api/sync` returns 401 when `getUser()` fails. Missing public env vars keep the app in local review mode.

Postgres is migration `0001` (17 public tables, RLS, triggers) plus `0002` (private `exercise-media` bucket, 24 MiB, jpeg/png/webp/gif/mp4). The program seed is `scripts/seed-supabase.ts` plus `seed/kemi-training-program.json`. It is not a SQL seed.

## Schema findings

P1. `[db.seed] enabled = true` pointed at a missing `supabase/seed.sql`, so `db reset` failed.

P1. Foreign keys do not keep a row inside one athlete. `NO ACTION` on session day, session item, and private exercise references can pin another athlete's delete.

P2. Several foreign-key columns had no index.

P2. `docs/BACKEND_SCHEMA.md` drew weeks as children of phases. Weeks belong to the program; `phase_id` is optional.

Out of scope: rewriting `0001` or `0002`, slug uniqueness, status check constraints, and a sync `updated_at` trigger change.

## RLS findings

Ownership policies already stop one user from reading or updating another user's rows. They did not stop storing a foreign key the caller cannot see. Postgres checks foreign keys as the table owner.

GLOBAL CATALOG — INTENTIONAL. `owner_id is null` exercises and media stay readable by every authenticated user. Writes still require `owner_id = auth.uid()`.

## Auth findings

Cookie refresh and `getUser()` match the Next.js 16 server pattern. Redirect responses from the proxy keep the cookies written during that refresh, so a rotated refresh token is not dropped on the way to `/today` or `/auth/login`. `/auth/confirm` accepts `token_hash` and PKCE `code`. `safeInternalPath` rejects absolute URLs, protocol-relative URLs, backslashes, and control characters. The magic link returns to `window.location.origin`, so the PKCE cookie and the confirm host stay on the same origin. The canonical local site URL is `http://localhost:3000`. The local API stays on `127.0.0.1:54321`.

## Sync findings

`/api/sync` forces `athlete_id` from the session, but it forwarded client `workoutDayId` and `workoutItemId`. User A could reference user B's day or item. Strength tests could reference a private exercise. Three PostgREST writes can leave the caller's own session if a later write fails. A transactional RPC is deferred: the fix is the authorization check, and an invoker RPC would be a larger API than this wave needs. The offline queue is unchanged.

## Dev environment findings

P0 for a new machine: no env writer, no local Auth user, no generated `database.types.ts`, no Supabase CI job.

## Migration plan

- Disable SQL seeding.
- Add `0003_rls_fk_guards.sql` only. Policies use `(select auth.uid())` and an `EXISTS` against rows the caller can read. No security-definer helper.
- Index the unindexed foreign keys.
- Bootstrap creates `kemi.local@example.test`, seeds, and generates types.

## Testing plan

pgTAP covers two users, anonymous denial, catalog reads, private exercise denial, storage prefix isolation, and the cross-tenant inserts. `/api/sync` rejects a foreign day or item before the first upsert. `pnpm test:e2e` stays independent of Docker. `pnpm test:supabase` runs the local magic link and sync round-trip.

## Verified local gates

Recorded from the completed local runs. Do not rerun them for documentation unless a later migration changes their behavior.

```text
SUPA02-AUTH code review: PASS
SUPA02-AUTH redirect tests: 5/5 PASS
SUPA02-AUTH real local integration: PASS — 4/4

SUPA02-RLS pgTAP: PASS — 30/30
SUPA02-SYNC HTTP: PASS
pnpm test:supabase: PASS — 4 tests
```

Cross-tenant protections demonstrated:

```text
Database:
User A → User B workout_day_id = BLOCKED
User A → retarget User B workout_day_id = BLOCKED
User A → User B workout_item_id = BLOCKED

HTTP:
/api/sync own workout = 200
/api/sync User B workout_day = 403 workout_day_forbidden
/api/sync User B workout_item = 403 workout_item_forbidden
anonymous /api/sync = JSON 401
```

## Cloud strategy

```text
LOCAL
development / test

HOSTED SUPABASE
production
```

One hosted project, suggested name `KEMI Training`, classified `PRODUCTION`. Local Docker is the pre-production validation environment. Do not create a development Supabase project, a staging Supabase project, or a Supabase preview branch.

A separate hosted staging environment is intentionally omitted because KEMI is a small application. Local Supabase is the integration environment. Production schema changes are migration-driven and must pass local database/security tests before deployment.

If `supabase projects list` has no access token, stop at `HUMAN GATE — SUPABASE OAUTH` and use the browser login. Do not paste an access token into chat or the repository. If project creation needs account or billing confirmation, stop at `HUMAN GATE — CREATE KEMI SUPABASE PROJECT`. One project only.

After the project exists, link that ref only. Never run `supabase db reset --linked` or another destructive command against the linked remote. Dry-run `pnpm supabase db push --dry-run` and inspect every migration before a production push. Applied files are `0001_initial_schema.sql`, `0002_exercise_media_storage.sql`, `0003_rls_fk_guards.sql`, and `20260925185536_function_execute_guards.sql`.

The production Auth user is the real login, created in the Auth UI. `kemi.local@example.test` stays local. Seed only after the URL, Auth UUID, and migration history match production. Service role stays in the local seed shell. Vercel Preview does not receive production Supabase credentials. Vercel Production, when a later wave explicitly deploys the app, receives only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL`.

## Cloud production status

```text
CLOUD PRODUCTION
----------------
Architecture:
LOCAL + SINGLE PRODUCTION PROJECT

Supabase OAuth:
CONNECTED

Production project:
CONNECTED

Migration dry-run:
PASS

Production migrations:
PASS

Production Auth user:
PASS

Production seed:
PASS

Production seed idempotence:
PASS

Remote/local schema parity:
PASS

Remote/local types:
PASS

Security advisors:
PASS with one accepted Auth warning

Performance advisors:
FINDINGS accepted as P3
```

Do not merge the PR automatically. Do not start Wave 03. The hosted project `kemi-training` (`pripmaupaqorphvmkprl`) is the only application cloud database. Local Docker Supabase remains development and integration testing.

## Out of scope

Workbook parsing, program prescriptions, IndexedDB, the service worker, progress, 1RM, icon and Lottie work, and Waves 03–08. Partial sync writes stay documented. `handle_new_user` remains a security-definer trigger with a pinned search path. `20260925185536_function_execute_guards.sql` also pins `set_updated_at` search_path and revokes direct execute from `public`, `anon`, and `authenticated`. Auth leaked-password protection stays a dashboard setting because sign-in is the magic link. Performance Advisor warnings about `auth.uid()` initplans and the catalog's two permissive policies stay accepted for this small program.
