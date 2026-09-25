# KEMI Training

Mobile-first training PWA for the KEMI coach workbook. The app tracks sessions locally, optionally syncs to Supabase, and must not invent program data.

## Stack

- Next.js 16 App Router, React 19, TypeScript strict
- Tailwind CSS 4 (`@import "tailwindcss"`)
- Supabase Auth, Postgres, Storage, RLS
- IndexedDB (`idb`) and `public/sw.js`
- pnpm 10.17.1, Node 24
- Vitest and Playwright (Chromium + WebKit)

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm test:e2e:webkit
pnpm supabase:bootstrap
pnpm supabase:test
```

Workbook import (Python):

```bash
python -m pip install -r requirements-dev.txt
python -m compileall scripts
pnpm import:training
```

## Structure

- `src/app` — App Router. `src/proxy.ts` refreshes the Supabase session.
- `src/components` — UI. Client components own timers, IndexedDB, and navigation state.
- `src/lib` — training seed access, units, strength, offline DB, sync.
- `seed/` — normalized program JSON. Do not hand-edit prescriptions.
- `data/source/` — coach workbook.
- `supabase/migrations/` — schema source of truth.
- `tests/unit` — Vitest. `tests/e2e` — Playwright against `pnpm dev`.

## Tests

`pnpm typecheck` runs `tsc --noEmit`. `qa/preview` is a static mirror and is not a Playwright result. WebKit is the `webkit-compact-iphone` project.

## Workflow

Work on a wave branch, not `main`. Open a pull request. CI must pass before merge. Preview deploys are allowed. Production deploys are not, unless explicitly requested.

## Domain constraints

Preserve sessions, exercises, loads, sets, reps, phases, Coach Tips, and strength tests from the workbook. Keep documented anomalies in `seed/import-report.json`. No service-role key in the browser. RLS stays on.

## Cursor Cloud specific instructions

- Install dependencies with `pnpm install --frozen-lockfile` after Node 24 and pnpm 10.17.1 are available. `.cursor/environment.json` runs that install.
- Python: `python3 -m pip install -r requirements-dev.txt`, then `python3 -m compileall scripts`. The importer needs `data/source/Training Routine - KEMI S.xlsx`.
- Playwright: `pnpm exec playwright install chromium webkit`, then `pnpm test:e2e`.
- Supabase: the app runs in local review mode when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are absent. Do not invent those secrets. Local `supabase start` needs Docker and must not target a linked remote.
- Validation: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Secrets belong in Cursor Cloud Secrets, not in this file or `.cursor/environment.json`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
