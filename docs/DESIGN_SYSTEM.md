# KEMI Training - Design System

## Colors
- `--background`: `#090a0b`
- `--surface`: `#111315`
- `--surface-elevated`: `#181b1d`
- `--surface-soft`: `#202426`
- `--text-primary`: `#f5f6ef`
- `--text-secondary`: `#9fa5a1`
- `--accent`: `#d8ff57`
- `--success`: `#7ee8a0`
- `--warning`: `#ffca69`
- `--danger`: `#ff7b7b`
- `--divider`: translucent white at 9 percent

## Radius
14 / 20 / 28 / 36 px tiers. Controls can use pill geometry only for compact tags/segmented status, not for every surface.

## Typography
Manrope is the display face; Inter is the body face through `next/font`. Metrics use tabular numerals and strong weight. Display headings intentionally use tight tracking and short line lengths.

## Spacing
Primary mobile gutters are 18 px. Card internal padding is typically 18-24 px. Vertical rhythm uses 10/12/18/24/32 px clusters.

## Components
`card`, `hero-card`, `button`, `pill`, `progress-track`, `workout-row`, `media-frame`, `coach-tip`, `counter-control`, `rest-panel`, `bottom-nav` and `stat-strip` are the principal visual primitives.

## Motion
150-300 ms transitions for presses, progress changes and sheets. `prefers-reduced-motion` collapses transition/animation duration.

## Icons
Lucide icons only. Icons supplement labels rather than replacing critical text.
