# KEMI Training - Backend Schema

## Ownership model
`profiles.id` equals the Supabase Auth user ID. Private program/session/test rows are owned through `athlete_id` or through a relationship to an owned program/session. Global imported exercise definitions have `owner_id = null`; user-created exercise/media rows can be owner-specific.

## Program hierarchy
`training_programs -> program_phases -> program_weeks -> workout_days -> workout_sections -> workout_items -> exercises`.

`workout_items` preserves normalized values and raw source strings together, including `target_raw`, `load_raw`, `rest_raw`, `source_sheet`, `source_cell`, `source_url` and `source_location`.

## Media
`exercise_media` stores media type, optional Storage path, external/source URLs, attribution, alt text, primary flag, sort order, status and provenance.

## Session hierarchy
`workout_sessions -> session_exercises -> session_sets`.

Session sets store target/actual repetitions, target/actual weights, explicit actual weight unit, duration, RPE and completion timestamp.

## Strength
`strength_test_templates` and `strength_test_template_sets` preserve source protocols. `strength_tests` stores performed results and estimated 1RM. `personal_records` supports future derived records.

## RLS
RLS is enabled across all public data tables. Athlete rows check `auth.uid()`. Child program/session tables use relationship-based `exists` checks. Global exercises/media are readable by authenticated users; only owner-specific rows can be written by normal clients.

## Storage
Private bucket `exercise-media` accepts JPEG, PNG, WebP, GIF and MP4 up to 24 MiB. Object names must begin with the authenticated user ID; Storage RLS enforces that prefix.
