# KEMI Training - Backend Schema

## Environments

```text
LOCAL SUPABASE
= development + integration testing

ONE HOSTED SUPABASE PROJECT
= application cloud database
```

Local Docker Supabase is where schema changes are written and tested. One hosted project, suggested name `KEMI Training`, is production. Do not create a development project, a staging project, or a Supabase preview branch.

A separate hosted staging environment is intentionally omitted because KEMI is a small application. Local Supabase is the integration environment. Production schema changes are migration-driven and must pass local database/security tests before deployment.

The path is a git feature branch, a migration file, local Supabase, `db reset`, pgTAP, integration tests, PR / CI, `main`, then `supabase db push` to production. `db reset` is local only. Never run `supabase db reset --linked`. The production Dashboard is for operations, inspection, Auth administration, Storage inspection, and advisors.

Migration files:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_exercise_media_storage.sql`
- `supabase/migrations/0003_rls_fk_guards.sql`
- `supabase/migrations/20260925185536_function_execute_guards.sql`

## Ownership model
`profiles.id` equals the Supabase Auth user ID. Private program/session/test rows are owned through `athlete_id` or through a relationship to an owned program/session. Global imported exercise definitions have `owner_id = null`; user-created exercise/media rows can be owner-specific.

## Program hierarchy
`training_programs` owns `program_phases` and `program_weeks`. A week may optionally point at a phase. From a week, the tree is `workout_days -> workout_sections -> workout_items -> exercises`.

`workout_items` preserves normalized values and raw source strings together, including `target_raw`, `load_raw`, `rest_raw`, `source_sheet`, `source_cell`, `source_url` and `source_location`.

## Media
`exercise_media` stores media type, optional Storage path, external/source URLs, attribution, alt text, primary flag, sort order, status and provenance.

## Session hierarchy
`workout_sessions -> session_exercises -> session_sets`.

Session sets store target/actual repetitions, target/actual weights, explicit actual weight unit, duration, RPE and completion timestamp.

## Strength
`strength_test_templates` and `strength_test_template_sets` preserve source protocols. `strength_tests` stores performed results and estimated 1RM. `personal_records` supports future derived records.

## RLS
RLS is enabled across all public data tables. Athlete rows check `(select auth.uid())`. Child program tables are readable only through the owning program. Session, strength-test, personal-record, and owned-media writes also require every foreign key to be a row the caller can already read. A session day must belong to the caller. A session item must belong to that same day. A strength test or personal record may reference a catalog exercise or the caller's own exercise, not another athlete's private exercise.

GLOBAL CATALOG — INTENTIONAL. Imported exercises and media keep `owner_id` null. Every authenticated user can read those rows. Authenticated users cannot insert, update, or delete them.

`/api/sync` checks the same ownership before it writes. The three writes (session, session exercises, session sets) are still separate PostgREST calls. A later failure can leave the caller's own earlier rows; the offline queue retries the same ids. A transactional RPC is deferred because the cross-tenant hole is an authorization check, not atomicity.

## Storage
Private bucket `exercise-media` accepts JPEG, PNG, WebP, GIF and MP4 up to 24 MiB. Object names must begin with the authenticated user ID; Storage RLS enforces that prefix.
