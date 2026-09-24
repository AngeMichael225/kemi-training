# KEMI Training - Technical Requirements Document

## Architecture
Next.js App Router + React + TypeScript + Tailwind CSS provide the UI. Supabase provides PostgreSQL, Auth, Storage and RLS. Vercel is the target host. The application is local-first for active workout state and cloud-synchronized when Supabase is configured.

## Next.js boundaries
Server Components are the default for route composition and seed-data selection. Client Components are limited to browser-dependent behavior: IndexedDB, workout interaction, timers, PWA install, media upload, unit preferences and offline sync.

Next.js 16 uses `proxy.ts` for auth cookie refresh/protection. Supabase SSR clients are separated into browser/server helpers using `@supabase/ssr` and cookies.

## Routing
- `/` redirects to `/today`.
- `/today` is the primary home.
- `/plan` and `/plan/week/[weekNumber]` expose the imported program.
- `/workout/[workoutId]` previews a workout.
- `/session/[sessionId]?workout=<uuid>` runs an active session.
- `/exercises` and `/exercise/[slug]` provide the library/details.
- `/progress` shows local history/progression.
- `/tests` runs strength tests.
- `/profile`, `/settings`, `/auth/login` provide preferences/auth.

## Data source strategy
`seed/kemi-training-program.json` is the normalized, auditable snapshot generated from the workbook. UI code never depends on Excel layout coordinates directly. Source coordinates and URLs remain attached to imported records.

## Offline architecture
IndexedDB stores:
- active/completed session snapshots;
- pending mutation queue;
- preferences;
- owned exercise-media blobs for local fallback;
- strength-test results.

Every session write is local-first. The queue uses idempotent IDs and posts snapshots to `/api/sync`. The sync route authenticates the user, writes normalized Supabase session rows and returns success before the local queue item is removed.

## Service worker
A small custom service worker caches static Next assets, icons, visited same-origin navigations and direct exercise media. API/auth requests are excluded from caching. Navigation uses network-first with cached-page/offline fallback. This keeps previously opened session pages reloadable when connectivity disappears.

## Rest timer
The source of truth is `targetEndTime` (epoch milliseconds), not tick count. Rendering uses `Date.now()` against the target, so Safari background throttling does not accumulate timer drift.

## Media pipeline
Media records distinguish `image`, `animated_image`, `video`, `poster`, and `external_reference`.
- Direct media from the workbook is displayed remotely when technically permitted.
- Exercise-page links remain external references and are not scraped.
- User-owned media can be stored in IndexedDB and optionally Supabase Storage.
- Only current-exercise media is rendered in the runner; lists avoid loading many animated/video assets.

## Authentication
Supabase Auth magic-link/OTP-compatible login is implemented with cookie-based SSR helpers. In an environment without Supabase variables, a local review mode remains available so the application can still be evaluated.

## Security
- No service-role key is referenced by browser code.
- RLS is enabled on all athlete/private tables.
- Storage paths are user-ID-prefixed and protected by Storage policies.
- Authenticated session sync derives `athlete_id` from the validated Supabase user, never the client payload.
- Basic security headers are set in `next.config.ts`.

## Performance
- Mobile-first rendering and minimal dependencies.
- No chart library; small SVG progress chart.
- Exercise list uses static images only where available and lazy loading by default.
- Videos are only mounted for the current detail/runner context.
- Server Components avoid unnecessary browser bundles for program pages.

## Observability
V1 relies on Vercel request/runtime logs and Supabase database/auth logs. A future release can add structured error reporting and client telemetry after a privacy review.

## Testing
Vitest covers pure conversion/Brzycki logic. Playwright acceptance specs cover the major route/workout flows and responsive overflow. WebKit is explicitly configured to approximate iOS Safari.
