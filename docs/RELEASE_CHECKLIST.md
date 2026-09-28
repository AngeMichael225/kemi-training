# KEMI Training — Release checklist

> **PREFLIGHT ONLY — PRODUCTION NOT AUTHORIZED**
>
> Production needs a later **explicit human GO**. Do not deploy Production, promote
> Preview, mutate Production env vars, or change Supabase Auth URLs from this
> checklist alone. Full runbook: [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md).

## Mode

| Item | Value |
| --- | --- |
| Wave | 08 preflight |
| Status | `WAVE08_PREFLIGHT_READY` |
| Production | **NOT AUTHORIZED** |
| Device plan | `PREPARED_NOT_RUN` |

## A. Pre-release baseline

- [x] Document architecture: local Supabase Docker + one hosted project `kemi-training`
- [x] Do not create staging / preview / extra Supabase projects
- [x] `release/candidate` docs-only on pre-Wave 07 baseline
- [ ] After Wave 07 merges: rebase/update candidate onto `main` (human-gated finalization)
- [ ] Full CI green on final candidate

## B. Preview (final candidate only)

- [ ] Preview Ready (not Production)
- [ ] No Production Supabase credentials on Preview
- [ ] Mobile smoke OK
- [ ] Do not promote to Production

Initial preflight: Preview **not required** (docs-only).

## C. Production env (after human GO)

Configure **names only** until GO; then set Production values privately:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL` (= canonical origin)

Never on Vercel:

- [ ] Confirm absent: `SUPABASE_SECRET_KEY`
- [ ] Confirm absent: `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Confirm absent: database password / access token

Preflight audit: **NOT YET CONFIGURED** (zero env vars). Do not fix during preflight.

`NEXT_PUBLIC_*` are browser-visible by design.

## D. Canonical URL

- Primary Vercel production origin: `https://kemi-training.vercel.app`
- Custom domain: none
- [ ] Human confirms this origin (or a future custom domain) before Auth cutover

## E. Supabase Auth (after human GO)

- [ ] Site URL = canonical origin
- [ ] Redirect allow-list includes `{origin}/auth/confirm`
- [ ] Local Auth remains `http://localhost:3000`
- [ ] Do not commit the real production login email
- [ ] Magic-link confirm succeeds on canonical origin

## F. Production deploy (human GO required)

- [ ] Explicit human GO recorded
- [ ] Rollback procedure reviewed first (`DEPLOYMENT.md` §8)
- [ ] Deploy Production from approved `main` SHA only
- [ ] No `vercel --prod` / promote without GO
- [ ] No `supabase db reset --linked`

## G. Real iPhone 14 Pro Max (`PREPARED_NOT_RUN`)

Safari: first load → Auth → Today → start/resume → set log → reload → media → Progress (Estimated 1RM wording).

PWA: Add to Home Screen → standalone → safe areas → navigation → workout → rest timer → media → offline known-session reload → online → sync state.

Also: no horizontal overflow, no 500, no runtime errors, no stale chunks, no blank session.

- [ ] Executed
- [ ] PASS / FAIL recorded

## H. Post-deploy smoke

- [ ] Origin 200 / shell
- [ ] Login + Today + session log + Progress
- [ ] No secret keys in client network/bundle

## I. Rollback (documented, not executed in preflight)

- [ ] Instant Rollback / prior Production deployment identified
- [ ] Auth revert plan if URL cutover failed
- [ ] Forward-fix migrations only (never linked reset)

## J. Stop conditions

Stop if: no human GO; Wave 07 conflict; CI red; forbidden secrets on Vercel; Auth mismatch; destructive migration dry-run; device blockers; pressure to skip rollback or force-push `main`.
