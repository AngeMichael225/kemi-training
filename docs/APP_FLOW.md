# KEMI Training - App Flow

## First launch
Splash/browser launch -> Authentication -> Home (`/today`).

If Supabase is not configured, review mode can continue locally. In production with Supabase variables present, authenticated routes are protected by `proxy.ts`.

## Daily workout
Home -> recommended workout -> Start -> session runner -> warm-up -> main workout -> rest timer between prescribed sets -> finisher -> cardio -> Finish -> in-run summary -> Progress.

## Exercise details
Workout/Library -> Exercise -> media -> coach technique -> program usage -> optional owned-media upload -> close/back -> resume workout.

## Strength test
Tests -> select Back Squat / Hip Thrust / Deadlift -> prescribed set -> record actual load/reps -> rest -> next set -> finish -> Estimated 1RM -> Progress.

## Offline
Workout opened online -> network lost -> every set writes to IndexedDB -> runner continues -> pending sync status appears -> network returns -> `/api/sync` writes normalized Supabase rows -> local mutation is removed.

A visited session navigation response and static assets are cached by the service worker so reload can recover the already-opened runner when offline.

## Resume
Home reads IndexedDB for the most recent active session. If one exists, a `Reprendre` card links directly back to its runner URL.
