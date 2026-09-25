# KEMI Training — current-state audit

Date: 2026-09-24. Coordinator pass after read-only audits.

## Git

The workspace was not a git repository. `origin` `https://github.com/AngeMichael225/kemi-training` existed and was empty (`size: 0`). No local uncommitted work had to be discarded.

| Item | Value |
| --- | --- |
| BASE_SHA | `7e84fd857836b57cb16fecea434a48c57c32737f` |
| Baseline commit | `chore: import local KEMI training baseline` on `main` |
| Working branch | `chore/audit-foundation` |
| Remote | `https://github.com/AngeMichael225/kemi-training.git` |

## Stack detected

| Tool | Version |
| --- | --- |
| OS | Windows 10.0.22000 |
| Node | 24.20.0 |
| npm | 11.19.0 |
| pnpm | 10.17.1 (packageManager). A global pnpm 11 shim warns that `package.json#pnpm` is ignored; `pnpm-workspace.yaml` `allowBuilds` is also set. |
| Python | 3.14.7 |
| Docker CLI | 29.8.0. Daemon was not running. |
| Git | 2.55.0 |
| GitHub CLI | 2.98.0, logged in |
| Vercel CLI | not installed globally |
| Next.js | 16.3.6 |
| React | 19.3.0 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.3.3 with `@tailwindcss/postcss` and `@import "tailwindcss"` |
| ESLint | 9.39.5 |
| Vitest | 3.2.7 |
| Supabase CLI | 2.117.0 (devDependency) |

`pnpm-lock.yaml` was absent before this wave and is generated here. `supabase/config.toml` was absent and is created by `supabase init` without rewriting the two SQL migrations.

## Architecture

Next.js 16 App Router under `src/app`. `src/proxy.ts` is the request gate. There is no `middleware.ts`. Dynamic routes await `params` and `searchParams`. Pages are Server Components. Client components own IndexedDB, timers, and sync. The program is loaded from `seed/kemi-training-program.json`. Sessions persist in IndexedDB and POST to `/api/sync`.

## Data

Counted from `seed/kemi-training-program.json`: 4 weeks, 12 workout days, 140 items, 33 exercises, 27 media references, 3 strength tests. The workbook is at `data/source/Training Routine - KEMI S.xlsx`.

A rerun with OpenPyXL 3.1.5 matches the committed JSON byte-for-byte when the importer writes LF newlines. Windows `Path.write_text` previously emitted CRLF, so a raw hash differed while the JSON values did not. The importer now writes `newline="\n"` and reconfigures stdout to UTF-8. Anomalies in `seed/import-report.json` are unchanged (12-week title vs weeks 1–4, Back Squat set 2 text, missing deadlift loads, blank Week 2 loads, ambiguous Week 4 E17).

## Security

RLS is enabled on all 17 public tables. Policies are `TO authenticated` and scoped with `auth.uid()` / `athlete_id`. Storage bucket `exercise-media` is private and path-prefixed by user id. `SUPABASE_SERVICE_ROLE_KEY` appears only in `.env.example` (empty), docs, and `scripts/seed-supabase.ts`. No service-role use under `src/`.

`/api/*` is no longer redirected to the login HTML page, so `/api/sync` can return JSON 401. Local mode (no public Supabase env) no longer leaves the sync chip on “En attente”.

Shared catalog rows with `owner_id IS NULL` remain readable by any authenticated user. That is an explicit policy, not an accidental leak.

## PWA

`public/sw.js` is registered from the root layout. Manifest PNGs exist (`kemi-icon-192.png`, `kemi-icon-512.png`) plus `src/app/icon.png` and `src/app/apple-icon.png`. An early file search missed those binaries. Safe areas and `viewportFit: cover` are set. The service worker still caches successful navigations without a build id. That stays open for Wave 05.

## UI

Dark mobile shell, bottom navigation, lime accent `#d8ff57`. 24 `lucide-react` import sites. Icon replacement is Wave 01. See `docs/ICON_MIGRATION_PLAN.md`.

## Tests and DevOps

Historical `qa/RESULTS.md` (2026-09-23) marked a static HTML mirror and a TypeScript transpile as passes, and recorded npm install, lint, typecheck, Vitest, build, and Playwright as blocked. The 2026-09-24 foundation pass ran the real commands: lint, typecheck, Vitest 7/7, production build, and Playwright 60/60 including WebKit. See `qa/RESULTS.md`.

No GitHub Action existed. `.github/workflows/ci.yml` is added and does not deploy production.

## Coordinator corrections

| Audit claim | Correction |
| --- | --- |
| PNG icons and `qa/screenshots` missing | Present on disk. Binary search missed them. |
| `data/source` missing | Workbook is present. |
| `set.répétitions` | Seed and types use `repetitions`. The screen was reading a property that does not exist. Fixed. |

## Findings

### P0

| ID | Evidence | Correction |
| --- | --- | --- |
| PWA-001 | `public/sw.js` caches same-origin HTML with no build id | Left for Wave 05. Changing the cache strategy is not a low-risk foundation edit. |
| QA-001 | No CI | Fixed: `.github/workflows/ci.yml` |
| QA-002 | QA report treated a static mirror as an app pass | Historical report kept. New section records what this environment actually ran. |

No P0 security defect and no program-data corruption.

### P1

| ID | Evidence | Status |
| --- | --- | --- |
| ENV-001 | No `pnpm-lock.yaml` | Fixed |
| ENV-002 | No Node engine pin | Fixed: `.nvmrc` `24`, `engines.node` `24.x` |
| SEC-003 / QA-008 | No `supabase/config.toml` | Fixed. Migrations unchanged. |
| QA-003 | `test:e2e:webkit` targeted a missing project name `webkit` | Fixed: `webkit-compact-iphone` |
| QA-005 / QA-010 | Vitest would collect Playwright specs and could not resolve `@/` | Fixed |
| SEC-005 | Proxy redirected `/api/sync` | Fixed |
| ARCH-003 | Local mode stuck on pending sync | Fixed |
| DATA-001 | Importer stdout crashed on cp1252 and wrote CRLF | Fixed. Seed bytes match. |
| UI-001 | Today resume card uses a reset icon | Wave 01 |
| TYPE-001 | Strength test screen used `répétitions` | Fixed to `repetitions` |

### P2

| ID | Notes |
| --- | --- |
| SEC-001 | Null `owner_id` catalog is readable by every authenticated user. Decide in Wave 02. |
| SEC-004 | `/api/sync` does not check that `workout_day_id` belongs to the caller’s program |
| PWA-003 | App Router RSC payloads are not an offline shell |
| PWA-006 | Sync queue order and fail-stop |
| PWA-009 | Overlapping session writes |
| ARCH-002 | Full seed JSON can enter the client bundle |
| QA-007 | QA plan listed flows the e2e suite does not cover. Plan updated. |

### P3

Touch-target polish, duplicate preferences UI, unused testing-library surface, slug uniqueness, explicit SQL grants. Wave 07 or 02.

## Documentation drift

README asked for Node 22+ and `pnpm install` without a lockfile. It now says Node 24 and `--frozen-lockfile`. `docs/DEPLOYMENT.md` matches the committed lockfile. `docs/QA_PLAN.md` no longer implies every listed flow is automated.

## Blockers

- Docker Desktop daemon is stopped, so local `supabase start` / `db reset` / generated types did not run.
- No Supabase cloud project is linked. MCP is configured read-only and still needs a browser OAuth.
- Vercel CLI is not logged in from this machine.
- Flaticon and Lottie are not installed. Licenses are not yet acceptable for shipping.

## Addenda from late reports

The workbook import audit confirmed the same counts (4 weeks, 12 sessions, 140 items, 33 exercises, 27 media, 3 tests) and did not re-run the importer. These parser gaps stay in the seed. They are not foundation fixes and they are not Wave 01.

| ID | Evidence | Later wave |
| --- | --- | --- |
| DATA-004 | Week 4 lunges `E17` is unitless `20.0`; the logger can show the preferred unit | Wave 03, after the coach names kg or lbs |
| DATA-005 | Hip thrust is three slugs: machine, Smith, and the test | Coach confirmation, then Wave 04 |
| DATA-006 | `8 par côté` never becomes reps | Wave 03 |
| DATA-007 | Section title `3 rounds` is not applied to set counts | Wave 03 |
| DATA-008 | Dashboard 1RM inputs are null and unused by the app | Wave 06 |
| DATA-009 | Some LiftManual URLs do not match the printed exercise name | Wave 04, workbook edit first |
| DATA-012 | Tests UI always stores Brzycki; only back squat has that formula in the seed | Wave 06 |

`DATA-001` in the findings table above is the importer newline fix. It is not the program-length anomaly. That anomaly remains `PROGRAM_LENGTH_CONTRADICTION` in `seed/import-report.json`.

The environment audit ran after the lockfile existed. Two residuals stay open. CI uses Python 3.12 while this machine uses 3.14.7, and there is no `.python-version`. `@types/node` is still the Node 22 types while the runtime is Node 24. The `package.json` `pnpm.onlyBuiltDependencies` entry stays on purpose: pnpm 10.17.1 in CI reads it, and `pnpm-workspace.yaml` `allowBuilds` covers the local pnpm 11 shim.

## Recommendation

Merge foundation only after CI is green. Next build wave is Wave 01, after the Flaticon license is confirmed. Do not rewrite the service worker or the training seed in that wave.

## Wave 02 addendum

Date: 2026-09-24. Read-only audits on `45f64a0` confirmed SEC-004: an authenticated athlete can store `workout_sessions.workout_day_id` and `session_exercises.workout_item_id` that belong to another athlete, because those policies checked `athlete_id` only. The same class applies to private `exercise_id` on strength tests, personal records, and exercise media. GLOBAL CATALOG — INTENTIONAL: `owner_id is null` stays readable by every authenticated user.

`supabase/config.toml` enabled a missing `supabase/seed.sql`, so `db reset` could not finish. Wave 02 turns SQL seeding off and loads the existing TypeScript seed after creating `kemi.local@example.test`. Migration `0003_rls_fk_guards.sql` adds the foreign-key guards and the missing indexes. `0001` and `0002` stay unchanged.

Local Docker and the hosted project `pripmaupaqorphvmkprl` are both current through `20260925185536_function_execute_guards.sql`. That migration pins `set_updated_at` and stops anonymous or signed-in clients from calling `handle_new_user`. RLS remains enabled on all 17 public tables. `0001` and `0002` stay unchanged.
