# KEMI Training - Deployment

## Supabase
1. Create a Supabase project.
2. Run `supabase/migrations/0001_initial_schema.sql` then `0002_exercise_media_storage.sql` through Supabase CLI/migrations.
3. Create/sign in the KEMI Auth user so an `auth.users` row exists.
4. Copy that user's UUID to `KEMI_USER_ID` in a local seed environment.
5. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY` and run `pnpm seed`.
6. Configure the Supabase Auth email template to redirect token hashes/codes to `/auth/confirm` on the deployed site.

The service-role key is seed-only and must never be exposed as a Vercel `NEXT_PUBLIC_*` variable.

## Vercel
1. Import the repository into Vercel.
2. Add only the runtime public variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL`.
3. Do not add `SUPABASE_SERVICE_ROLE_KEY` unless a protected server-only deployment workflow explicitly requires it; the running app does not need it.
4. Build command: `pnpm build`.
5. Install command: `pnpm install --frozen-lockfile`. Node 24. `pnpm-lock.yaml` is committed.

## PWA validation
After deployment over HTTPS, open Safari on iPhone, add the site to the Home Screen, launch standalone, then validate manifest theme, safe areas, media playback and offline reload of a previously opened session.

## External blockers
This repository can run in local fallback mode without Supabase. Production Auth/cloud synchronization and real Vercel deployment cannot be validated without user-provided external project credentials.
