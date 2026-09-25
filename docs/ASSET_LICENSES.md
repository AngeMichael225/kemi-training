# Asset licenses

Recorded 2026-09-24. Do not remove a required attribution.

| Asset | Provider | Author | License | Attribution | Source | Date | Usage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lucide-react` icons | Lucide | Lucide contributors | ISC | Not required by ISC | https://lucide.dev | 2026-09-24 | Removed in Wave 01. No longer imported. |
| `public/icons/kemi-icon.svg`, `kemi-maskable.svg`, `kemi-icon-192.png`, `kemi-icon-512.png`, `src/app/icon.png`, `src/app/apple-icon.png` | KEMI project | Project | Project-owned | None | In-repo | 2026-09-24 | PWA and app icons |
| `data/source/Training Routine - KEMI S.xlsx` | Coach workbook | Coach | Not a software license. Program content stays the coach's. | Do not republish the workbook as a third-party asset pack. | `data/source/` | 2026-09-24 | Import source only |
| Flaticon UIcons Regular Rounded | Flaticon / Freepik Company | Flaticon | Free Flaticon license. Commercial UI use is allowed when the icons are not the product being resold. Attribution is required unless a Premium subscription covers the download. | Required. Profile shows “Uicons by Flaticon” linking to https://www.flaticon.com/uicons | `@flaticon/flaticon-uicons@3.3.1`, file `css/uicons-regular-rounded-J3WOUERV.woff2`, class prefix `fi-rr-`. License text: https://github.com/freepik-company/flaticon-uicons/blob/main/LICENSE | 2026-09-24 | Checked-in subset only: `public/icons/uicons/fi-rr-*.svg` and `src/components/icons/uicon-paths.ts`. The full webfont package is not a runtime dependency. |
| KEMI motion moments | KEMI project | Project | Project-owned | None | `src/components/motion/moments.ts` | 2026-09-24 | Original local Lottie data for workout complete, rest complete, syncing, and empty progress. No LottieFiles download. `prefers-reduced-motion` shows the static icon. |
| `lottie-react` | LottieFiles community / airbnb lottie-web | Package authors | MIT | Not required by MIT | https://www.npmjs.com/package/lottie-react | 2026-09-24 | Player only. Animation data is project-owned. |

`fi-rr-dumbbell` and `fi-rr-ruler` are not in UIcons 3.3.1. The verified substitutes are `fi-rr-dumbbell-fitness` and `fi-rr-ruler-horizontal`. The streak stat uses `fi-rr-flame`, which exists in the same family.
