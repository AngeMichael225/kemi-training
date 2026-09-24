# KEMI Training - QA Plan

## Automated checks

`pnpm typecheck` is `tsc --noEmit`. The static mirror in `qa/preview` is not a Playwright run. Current e2e specs cover route overflow, local login, session start/reload, rest timer, strength test, and the kg/lbs toggle. "Program week opens" and "completed workout appears in progress history" are still manual until a later wave.

## Automated checks (detail)
### Unit
- kg/lbs conversion
- gym increment rounding
- Brzycki estimate
- null/invalid strength inputs

### E2E
- local-mode login entry
- Today renders without horizontal overflow
- program week opens
- workout preview starts a session
- a standard set can be completed
- rest timer appears for prescribed rest
- active session survives page reload
- workout can be completed and appears in progress history
- strength test produces Estimated 1RM
- unit preference toggles kg/lbs

## Responsive matrix
- 430 x 932 iPhone 14 Pro Max baseline
- 375 x 667 compact iPhone
- 412 x 915 Android
- 768 x 1024 tablet
- 1440 x 900 desktop

## Visual review checklist
- safe-area spacing at top and bottom
- bottom navigation clears home indicator
- no clipped headings/timers
- 44 px minimum primary targets
- runner media crop remains usable
- no horizontal overflow
- lime text/surfaces preserve contrast
- timer remains readable at distance
- offline/sync state has text, not color alone

## Offline verification
Open a session, complete a set, disable network, reload visited session, record another set, restore network and verify pending mutation removal after successful API response.

## Security verification
Attempt cross-user reads/writes with two Supabase users. Verify all private program/session/test records are blocked by RLS. Verify exercise-media Storage objects cannot be read/written outside the authenticated user's prefix.
