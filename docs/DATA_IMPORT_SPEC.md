# KEMI Training - Data Import Specification

## Command
`pnpm import:training`

The package script runs `scripts/import_training_xlsx.py`, reading `data/source/Training Routine - KEMI S.xlsx` and writing `seed/kemi-training-program.json` plus `seed/import-report.json`.

## Workbook interpretation
The importer reads both formula and cached-value views with openpyxl.

### Dashboard
Profile/start-date/level/source calorie context, source 1RM input formulas and program phase text are preserved.

### Week sheets
`Jour N` begins a workout. Non-empty column A values inside a day start a section. Column B contains exercises; C prescription; D rest/effort; E athlete load/allure; F coach instructions; G athlete comments. Hyperlinks on exercise cells are preserved.

### Tests
Back Squat, Hip Thrust and Deadlift protocols are extracted set-by-set. Source formula/cached estimate are preserved where present.

### Conversions
The workbook's kg/lbs relationship is preserved in normalized behavior. The app conversion constant is 1 kg = 2.2046 lbs.

## Media rules
Direct `.webp`, `.gif`, `.jpg`, `.jpeg`, `.png`, `.mp4` URLs become renderable media records. Other URLs become `external_reference`. No page scraping or automatic rehosting is performed.

## Parsing strategy
Raw strings are never discarded. When parsing is safe, normalized fields are added for sets, reps, duration, rest, weight, unit, quantity and cardio speed/incline/level. Ambiguous values remain raw and are reported.

## Current import report
- 7 sheets
- 4 week sheets
- 12 workout days
- 140 workout items
- 33 exercises
- 27 media records
- 10 direct media records
- 17 external references
- 3 strength-test templates

## Audited anomalies
See `seed/import-report.json`. High-severity contradictions are program length (12 vs 13 weeks) and missing week sheets after Week 4. Medium issues include Week 2 blank loads, Deadlift test blank loads, the Back Squat set-2 text/math contradiction and Week 4 Lunges missing an explicit unit.
