# KEMI Training - Product Requirements Document

## Vision
KEMI Training replaces the athlete's coaching workbook with a premium, mobile-first training experience that is fast enough to use between sets. The workbook remains the initial functional source of truth; the product improves access, tracking, resilience and media handling without rewriting the coach's program.

## Problem
The source workbook contains a useful program but is difficult to operate during a gym session: prescriptions are distributed across sheets, media often opens on third-party pages, rest timing is manual, history is not session-centric, and an unstable network can interrupt access.

## Primary user
KEMI S. is the primary V1 athlete. The data model is intentionally multi-athlete capable so a later coach/athlete model does not require a rebuild.

## Goals
- Open the app and immediately understand the next training session.
- Record a normal set with a single completion action when prescribed values are accepted.
- Keep coach instructions and original load/repetition text visible.
- Display direct exercise media in-app when the workbook provides a direct media URL.
- Allow the athlete to upload owned exercise media.
- Start an accurate timestamp-based rest timer after a completed set.
- Persist active session state through reload, backgrounding and temporary network loss.
- Track completed sessions, load, volume where units allow it, strength tests and estimated 1RM.
- Install as a standalone PWA on iPhone.

## Non-goals for V1
Social networking, messaging, marketplace, nutrition planning, AI coaching, subscriptions, payments, medical recommendations, automatic modification of the coach program and advanced coach administration are explicitly out of scope.

## Source workbook facts
The importer currently normalizes 7 worksheets, 4 available weeks, 12 workout days, 140 workout items, 33 exercises, 27 media references and 3 strength-test protocols.

The importer preserves these source contradictions rather than silently changing them:
- The Dashboard title says 12 weeks.
- Program phases extend through week 13.
- Only Week 1 through Week 4 worksheets are currently present.
- Week 2 contains the workout structure but most load cells are blank.
- Back Squat test set 2 says 30 kg while its plate description mathematically implies 40 kg.
- Deadlift test repetitions/rest are present but prescribed test loads are blank.
- Week 4 Lunges contains a numeric load without an explicit unit.

## Core use cases
1. Athlete sees today's recommended next uncompleted workout.
2. Athlete starts the workout and follows sections sequentially.
3. Athlete views media and coach tips without leaving the runner when direct media is available.
4. Athlete records a prescribed set, optionally adjusts reps/weight, then receives the rest timer.
5. Athlete performs cardio with a dedicated timer UI.
6. Athlete performs a strength test with its own set progression and Brzycki estimate.
7. Athlete resumes a session after refresh/background/network loss.
8. Athlete reviews recent sessions and progression.
9. Athlete switches display units without mutating source values.
10. Athlete uploads owned exercise media locally and, when configured, to Supabase Storage.

## User stories and acceptance criteria
### Today
As KEMI, I can see the current available week, recommended next session, weekly completion, workout type and a prominent start action. If calendar time advances beyond the imported sheets, the app clearly states that later source weeks are missing instead of inventing them.

### Workout runner
As KEMI, I see one current exercise at a time with progress, media, target, load, rest, coach tip and previous result. Completing a standard set uses the prescribed values by default and therefore requires one tap unless the athlete edits them.

### Offline
As KEMI, a session already opened remains usable if connectivity drops. Set mutations are written to IndexedDB first. A pending mutation queue retries server synchronization when the browser returns online.

### Media
Direct WebP/GIF/image/video URLs are rendered in the application. Exercise-page URLs remain external references. The app never scrapes/rehosts third-party pages automatically. Owned uploads are supported.

### Strength tests
Each test is rendered as a set-by-set flow. Estimated 1RM is labeled as estimated. Brzycki is calculated only when usable weight and repetition values exist.

## MVP success criteria
- Production build passes with configured dependencies.
- All 4 imported weeks and all 12 workout days are navigable.
- Workout runner records sets and cardio duration.
- Timestamp-based rest timer works after backgrounding.
- Active sessions survive reload via IndexedDB.
- Progress history appears after completing a workout.
- Strength-test results persist locally and queue for cloud sync.
- kg/lbs conversion works without overwriting source prescriptions.
- PWA manifest/service worker are present and standalone install is supported.
- iPhone 14 Pro Max portrait is the visual QA baseline.

## Risks
- Third-party exercise media may disappear or change CORS/hotlink behavior.
- The workbook contains missing/inconsistent future-week and load data.
- iOS notification behavior varies by installed-PWA state and permission.
- Production cloud behavior cannot be fully validated without a Supabase project and Auth user.

## Future improvements
Coach authoring, additional athlete programs, server-side progression analytics, program versioning/diff, media moderation, background sync APIs where supported, richer offline media pinning and localized English UI.
