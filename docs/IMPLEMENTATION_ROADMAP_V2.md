# KEMI Training — implementation roadmap v2

Date: 2026-09-24. Base: `7e84fd857836b57cb16fecea434a48c57c32737f` on `main` after the local import commit. Foundation work lives on `chore/audit-foundation`.

Each wave uses its own branch, a pull request into `main`, CI, and a Vercel preview. Do not deploy the production application before Wave 08.

Database environments are local Supabase for development and integration testing, and one hosted Supabase project for the application cloud database. A separate hosted staging environment is intentionally omitted because KEMI is a small application. Local Supabase is the integration environment. Production schema changes are migration-driven and must pass local database/security tests before deployment. Do not create a development Supabase project, a staging Supabase project, or a Supabase preview branch.

## Wave 00 — Audit and foundation

- Branch: `chore/audit-foundation`
- Agent: release-engineer, qa-verifier
- Scope: lockfile, Node 24, Python importer pin, Supabase CLI and `config.toml`, Cursor rules/agents, CI, quality gates
- Acceptance: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, Playwright Chromium and WebKit on the five viewports
- Tests: existing unit and e2e suites
- PR gate: CI green, no production deploy

## Wave 01 — Premium visual system

- Branch: `feat/visual-system`
- Agent: ui-ux-engineer
- Scope: replace primary Lucide icons with Flaticon UIcons Rounded Regular, add the four local Lottie moments, keep layout and tokens stable
- Acceptance: one icon family, license recorded, no horizontal overflow on the five viewports, `prefers-reduced-motion` respected
- Tests: Playwright screenshots compared by eye on 430×932 and 375×667 WebKit
- PR gate: CI plus visual check. Do not start until `docs/ASSET_LICENSES.md` names the Flaticon license

## Wave 02 — Supabase production-quality integration

- Branch: `feat/supabase-integration`
- Agent: supabase-engineer
- Scope: local stack, generated `src/lib/supabase/database.types.ts`, auth redirect check, RLS and sync isolation, then one hosted production project. Link that project, dry-run, and push migrations only after local gates pass. Create the real production Auth user and run the idempotent seed against that UUID. Vercel Preview stays disconnected from production Supabase.
- Acceptance: RLS still on, service role stays out of the client and out of Vercel, migrations apply on a local `db reset` without `--linked`, and the linked remote is never reset
- Tests: local pgTAP, local `/api/sync` isolation, generated-types comparison after the production push
- PR gate: security-reviewer on the diff. Do not merge automatically. Do not start Wave 03 from this wave.

## Wave 03 — Workout runner hardening

- Branch: `feat/workout-runner`
- Agent: nextjs-engineer
- Scope: session persistence ordering, one active session, missing-session error instead of a blank session, note save before blur loss
- Acceptance: rapid set logging cannot overwrite a newer snapshot
- Tests: unit tests around the persist queue, e2e set completion and reload
- PR gate: CI

## Wave 04 — Exercise media manager

- Branch: `feat/exercise-media`
- Agent: ui-ux-engineer
- Scope: offline coach media, signed Storage URLs, upload quota errors
- Acceptance: a personal media file survives reload and is not readable by another user
- Tests: component or e2e upload in local mode, storage policy review
- PR gate: security-reviewer

## Wave 05 — Offline, PWA, and sync

- Branch: `feat/offline-sync`
- Agent: nextjs-engineer
- Scope: stop long-caching HTML navigations, sort the sync queue, keep `/api/sync` on JSON 401, offline session resume
- Acceptance: a new deploy does not serve a document that points at deleted chunks; offline reload of a known session still shows sets
- Tests: Playwright offline route plus a unit test for queue order
- PR gate: CI

## Wave 06 — Progress, history, records, tests

- Branch: `feat/progress-history`
- Agent: nextjs-engineer
- Scope: history, records, and strength tests against stored sessions
- Acceptance: completing a workout is visible in progress; Estimated 1RM stays labeled as estimated
- Tests: e2e completion to progress, existing Brzycki unit test
- PR gate: CI

## Wave 07 — Accessibility, performance, iOS polish

- Branch: `feat/ios-polish`
- Agent: ui-ux-engineer
- Scope: 44×44 sync control, safe areas, reduced motion, bundle size of the training seed on the client
- Acceptance: no horizontal overflow, primary controls meet 44×44, iPhone standalone safe areas hold
- Tests: five Playwright projects
- PR gate: CI

## Wave 08 — Release candidate and production

- Branch: `release/candidate`
- Agent: release-engineer
- Scope: Vercel production env for the existing hosted project, canonical Auth site URL, real-device pass. Do not create a second Supabase project.
- Acceptance: preview and production checklists in `docs/DEPLOYMENT.md`, human approval before the production deploy
- Tests: full CI plus the manual iPhone 14 Pro Max pass
- PR gate: explicit human approval. This wave is the only one allowed to deploy production
