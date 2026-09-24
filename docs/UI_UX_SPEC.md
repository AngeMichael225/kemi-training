# KEMI Training - UI/UX Specification

## Direction
The visual reference was used for composition cues rather than copied: large visual workout cards, strong type, rounded media surfaces, compact pills and a persistent bottom navigation. KEMI Training applies those ideas to a dark premium fitness direction with near-black surfaces and an energetic lime accent.

## Primary viewport
Baseline is iPhone 14 Pro Max portrait at approximately 430 x 932 CSS pixels. Layout uses `viewport-fit=cover`, `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.

## Interaction principles
- Primary controls are at least 44 x 44 CSS pixels.
- No primary action depends on hover.
- The workout runner removes the persistent bottom navigation.
- Prescribed values are prefilled so a standard set can be recorded with one tap.
- Rest starts automatically after a set when a source rest period exists.
- Coach tips are visually distinct but not modal.
- Cardio never uses the weight/reps interface.

## Today
The top hierarchy is greeting -> source/current week context -> immersive recommended-workout hero -> weekly progress -> compact workout preview. If imported weeks are exhausted, the source limitation is shown clearly.

## Workout runner
The runner contains:
1. safe-area header and progress;
2. current exercise title;
3. one primary media surface;
4. target/load/rest pills;
5. coach tip;
6. interactive set/cardio/test control;
7. previous/next controls;
8. finish action only when all imported items are complete.

## Rest timer
The timer opens as a high-contrast full-screen sheet with a distance-readable clock, next action, +15 seconds and Skip.

## Exercise library
Search by name is immediate. Section-derived filters are offered because equipment/muscle metadata is not consistently present in the source workbook. No invented muscle/equipment labels are added.

## Copy style
French is the default. Copy is short and supportive, not exaggerated. Examples: `Commencer la seance`, `Serie terminee`, `Repos`, `Belle seance`.

## Accessibility
Semantic buttons/links, visible focus, high contrast, text alternatives, safe tap sizes and reduced-motion support are required. Color is never the only signal for important status.
