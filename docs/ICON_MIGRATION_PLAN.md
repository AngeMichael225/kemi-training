# Icon migration plan

Status: inventory only. Wave 01 implements this. Foundation does not swap icons.

## Style

One family: **Flaticon UIcons, Rounded, Regular** (`fi-rr-*`).

Same weight everywhere. No mix of filled Lucide `Play` and stroked Lucide `Play`. No second family for empty states.

Preferred delivery: `@flaticon/flaticon-uicons` behind a small `Icon` wrapper, importing only the icons this map uses. If the package pulls the whole font, switch to checked-in SVGs under `public/icons/uicons/` and record each file in `docs/ASSET_LICENSES.md`.

Motion, local files only, with `prefers-reduced-motion`:

| Moment | Animation |
| --- | --- |
| Workout completed | short success |
| Rest completed | short completion |
| Syncing | loop, static icon when idle |
| Empty progress | only if it stays quiet |

## Counts

- 24 files import `lucide-react`
- 54 distinct Lucide components
- Package today: `lucide-react` (ISC)

Proposed Flaticon names below are **unverified** against the current catalog. Wave 01 must confirm the glyph and the license before use.

| Current icon | Semantic role | Proposed Flaticon | Style | Source | License |
| --- | --- | --- | --- | --- | --- |
| House | Today tab | fi-rr-home | Rounded Regular | UIcons | Confirm |
| Dumbbell | Program tab, brand, exercise | Split: fi-rr-calendar for Program, fi-rr-dumbbell for lifts | Rounded Regular | UIcons | Confirm |
| TrendingUp | Progress tab | fi-rr-chart-line-up | Rounded Regular | UIcons | Confirm |
| LibraryBig | Exercises tab | fi-rr-list | Rounded Regular | UIcons | Confirm |
| UserRound | Profile tab | fi-rr-user | Rounded Regular | UIcons | Confirm |
| Play / Pause | Start, cardio, media | fi-rr-play / fi-rr-pause | Rounded Regular | UIcons | Confirm |
| Check / CheckCircle2 | Set done, workout done | fi-rr-check / fi-rr-check-circle | Rounded Regular | UIcons | Confirm |
| Minus / Plus | Steppers, +15s rest | fi-rr-minus / fi-rr-plus | Rounded Regular | UIcons | Confirm |
| RotateCcw | Reset. Today resume card is the wrong metaphor | fi-rr-rotate-left for reset, fi-rr-play for resume | Rounded Regular | UIcons | Confirm |
| ArrowLeft / ArrowRight / Chevron* | Navigation | fi-rr-arrow-left, fi-rr-arrow-right, fi-rr-angle-small-right | Rounded Regular | UIcons | Confirm |
| Flag | Finish workout | fi-rr-flag | Rounded Regular | UIcons | Confirm |
| Timer / TimerReset / Clock3 | Time pills | fi-rr-stopwatch | Rounded Regular | UIcons | Confirm |
| Cloud / CloudOff / LoaderCircle | Sync | fi-rr-cloud, fi-rr-cloud-disabled, Lottie while syncing | Rounded Regular | UIcons + local Lottie | Confirm |
| Award / Trophy / Gauge | Strength and empty 1RM | fi-rr-trophy / fi-rr-dashboard | Rounded Regular | UIcons | Confirm |
| Search / SlidersHorizontal | Exercise filter | fi-rr-search / fi-rr-settings-sliders | Rounded Regular | UIcons | Confirm |
| Sparkles | Coach tip | fi-rr-comment-alt | Rounded Regular | UIcons | Confirm |
| Bell / Volume2 / Ruler / Moon | Preferences | fi-rr-bell, fi-rr-volume, fi-rr-ruler, drop Moon while theme is locked dark | Rounded Regular | UIcons | Confirm |
| Download / Share2 / Smartphone | Install | fi-rr-download, fi-rr-share, fi-rr-mobile | Rounded Regular | UIcons | Confirm |
| ExternalLink / MapPinned | Exercise source | fi-rr-arrow-up-right-from-square, fi-rr-marker | Rounded Regular | UIcons | Confirm |
| FileSpreadsheet / Layers3 / TriangleAlert / ShieldCheck | Plan and profile meta | fi-rr-document, fi-rr-layers, fi-rr-exclamation, fi-rr-shield-check | Rounded Regular | UIcons | Confirm |
| ImagePlus / UploadCloud | Media upload | fi-rr-picture, fi-rr-cloud-upload | Rounded Regular | UIcons | Confirm |
| Mail / WifiOff | Login | fi-rr-envelope, fi-rr-wifi-slash | Rounded Regular | UIcons | Confirm |
| CalendarDays / CalendarCheck2 / History / Flame | Today and progress stats | fi-rr-calendar, fi-rr-calendar-check, fi-rr-time-past | Rounded Regular | UIcons | Confirm |
| Forward | Skip rest | fi-rr-forward | Rounded Regular | UIcons | Confirm |
| ClipboardCheck / Settings2 | Profile rows | fi-rr-clipboard-list-check, fi-rr-settings | Rounded Regular | UIcons | Confirm |

PWA marks stay the custom K icons. They are not part of the UIcons set.
