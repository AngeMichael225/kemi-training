# Icon migration plan

Status: implemented on `feat/visual-system`. One family, Regular Rounded, subset of 48 glyphs. The full webfont is not shipped.

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

Wave 01 result: no `lucide-react` import remains. 48 verified `fi-rr-*` glyphs are checked in. Names that were missing in UIcons 3.3.1 are called out in the table.

| Current icon | Semantic role | Proposed Flaticon | Style | Source | License |
| --- | --- | --- | --- | --- | --- |
| House | Today tab | fi-rr-home | Rounded Regular | UIcons | Free, attribution |
| Dumbbell | Program tab, brand, exercise | Split: fi-rr-calendar for Program, fi-rr-dumbbell-fitness for lifts. `fi-rr-dumbbell` is absent in 3.3.1 | Rounded Regular | UIcons | Free, attribution |
| TrendingUp | Progress tab | fi-rr-chart-line-up | Rounded Regular | UIcons | Free, attribution |
| LibraryBig | Exercises tab | fi-rr-list | Rounded Regular | UIcons | Free, attribution |
| UserRound | Profile tab | fi-rr-user | Rounded Regular | UIcons | Free, attribution |
| Play / Pause | Start, cardio, media | fi-rr-play / fi-rr-pause | Rounded Regular | UIcons | Free, attribution |
| Check / CheckCircle2 | Set done, workout done | fi-rr-check / fi-rr-check-circle | Rounded Regular | UIcons | Free, attribution |
| Minus / Plus | Steppers, +15s rest | fi-rr-minus / fi-rr-plus | Rounded Regular | UIcons | Free, attribution |
| RotateCcw | Reset. Today resume card is the wrong metaphor | fi-rr-rotate-left for reset, fi-rr-play for resume | Rounded Regular | UIcons | Free, attribution |
| ArrowLeft / ArrowRight / Chevron* | Navigation | fi-rr-arrow-left, fi-rr-arrow-right, fi-rr-angle-small-right | Rounded Regular | UIcons | Free, attribution |
| Flag | Finish workout | fi-rr-flag | Rounded Regular | UIcons | Free, attribution |
| Timer / TimerReset / Clock3 | Time pills | fi-rr-stopwatch | Rounded Regular | UIcons | Free, attribution |
| Cloud / CloudOff / LoaderCircle | Sync | fi-rr-cloud, fi-rr-cloud-disabled, Lottie while syncing | Rounded Regular | UIcons + local Lottie | Free, attribution |
| Award / Trophy / Gauge | Strength and empty 1RM | fi-rr-trophy / fi-rr-dashboard | Rounded Regular | UIcons | Free, attribution |
| Search / SlidersHorizontal | Exercise filter | fi-rr-search / fi-rr-settings-sliders | Rounded Regular | UIcons | Free, attribution |
| Sparkles | Coach tip | fi-rr-comment-alt | Rounded Regular | UIcons | Free, attribution |
| Bell / Volume2 / Ruler / Moon | Preferences | fi-rr-bell, fi-rr-volume, fi-rr-ruler-horizontal. Moon removed while theme stays dark | Rounded Regular | UIcons | Free, attribution |
| Download / Share2 / Smartphone | Install | fi-rr-download, fi-rr-share, fi-rr-mobile | Rounded Regular | UIcons | Free, attribution |
| ExternalLink / MapPinned | Exercise source | fi-rr-arrow-up-right-from-square, fi-rr-marker | Rounded Regular | UIcons | Free, attribution |
| FileSpreadsheet / Layers3 / TriangleAlert / ShieldCheck | Plan and profile meta | fi-rr-document, fi-rr-layers, fi-rr-exclamation, fi-rr-shield-check | Rounded Regular | UIcons | Free, attribution |
| ImagePlus / UploadCloud | Media upload | fi-rr-picture, fi-rr-cloud-upload | Rounded Regular | UIcons | Free, attribution |
| Mail / WifiOff | Login | fi-rr-envelope, fi-rr-wifi-slash | Rounded Regular | UIcons | Free, attribution |
| CalendarDays / CalendarCheck2 / History / Flame | Today and progress stats | fi-rr-calendar, fi-rr-calendar-check, fi-rr-time-past, fi-rr-flame for the streak | Rounded Regular | UIcons | Free, attribution |
| Forward | Skip rest | fi-rr-forward | Rounded Regular | UIcons | Free, attribution |
| ClipboardCheck / Settings2 | Profile rows | fi-rr-clipboard-list-check, fi-rr-settings | Rounded Regular | UIcons | Free, attribution |

PWA marks stay the custom K icons. They are not part of the UIcons set.
