# KEMI Training — Release checklist

**PREFLIGHT ONLY — PRODUCTION NOT AUTHORIZED.**

Production needs a later explicit human GO. Merging the Wave 08 preflight pull request is not that GO. Do not deploy Production, promote a Preview, change DNS, change Supabase Auth URLs, or set Vercel environment variables from this checklist's preflight pass.

Status: `WAVE08_PREFLIGHT_READY`.

Companion runbook: `docs/DEPLOYMENT.md`.

## Preflight result

- [x] Work is docs only on `release/candidate`.
- [x] Baseline before this docs commit: `8b9e5b890f62ecc0068272f0b434076ca52f8f98`.
- [x] Local Supabase Docker remains the development and integration environment.
- [x] One hosted Supabase production project remains the only hosted database. Recorded project: `kemi-training` (`pripmaupaqorphvmkprl`). Not re-queried. Not recreated.
- [x] Vercel auth blocker recorded. No Production deployment created.
- [x] `PRODUCTION_ENV_CONTRACT`: **NOT YET CONFIGURED**.
- [x] Canonical URL: **CANONICAL_PRODUCTION_URL_PENDING**.
- [x] Rollback procedure documented in `docs/DEPLOYMENT.md` section 8. Not executed.
- [x] Real-device plan below: **PREPARED_NOT_RUN**.

## Human GO gate

Leave these unchecked until a person explicitly authorizes production.

- [ ] Explicit human GO names the production SHA.
- [ ] Wave 07 is already merged to `main` by a human. Do not ship the pre-Wave 07 baseline as production.
- [ ] Canonical production origin is known. It is written here only after that happens: `________________`
- [ ] Vercel Production has only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL`. Values stay out of git and chat. `NEXT_PUBLIC_*` is browser-visible by design.
- [ ] Vercel does not have `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, the database password, or a Supabase access token.
- [ ] Supabase Auth Site URL is that canonical origin. Redirect allow-list includes `https://<canonical-origin>/auth/confirm`. Local Auth stays on `http://localhost:3000`.
- [ ] The real production login email is not in any committed file.
- [ ] Dry-run of `pnpm supabase db push --dry-run` shows no unexpected destructive migration.
- [ ] CI is green. Rollback section has been read. Previous Production deployment id is known, or the first-deploy gap is recorded.
- [ ] Production deploy completed by the human owner. Smoke test in `docs/DEPLOYMENT.md` section 7 passed.

## Real iPhone 14 Pro Max script

Status: **PREPARED_NOT_RUN**.

Device: iPhone 14 Pro Max. Run only against the canonical HTTPS origin after the GO gate. Do not guess a URL.

Both surfaces must show: no horizontal overflow, no HTTP 500, no visible runtime error, no stale chunk, no blank session, and **Estimated 1RM** wording.

### Safari

- [ ] First load of the canonical origin paints. Not HTTP 500. Not blank.
- [ ] Auth: `/auth/login` magic link opens `/auth/confirm` on this origin and reaches `/today`.
- [ ] Today shows the workbook session.
- [ ] Workout start, leave, resume the same session.
- [ ] Log one prescribed set. Values stay the workbook values.
- [ ] Reload. Session and set remain.
- [ ] Exercise media renders in the viewport.
- [ ] `/progress` says **Estimated 1RM**.

### PWA standalone

- [ ] Safari → Add to Home Screen.
- [ ] Launch from the icon in standalone display.
- [ ] Top and bottom safe areas clear the status area and the home indicator. Bottom navigation is tappable.
- [ ] Navigation across Today, plan, workout, Progress, and profile.
- [ ] Workout and set logging inside standalone.
- [ ] Rest timer still matches its end timestamp after a brief background.
- [ ] Media inside standalone.
- [ ] Airplane Mode reload of an already opened session still shows that session.
- [ ] Online again: sync returns to confirmed or idle, and a pending mutation clears only after server acceptance.

Do not check these boxes during preflight. The status remains `PREPARED_NOT_RUN` until a person runs the device.
