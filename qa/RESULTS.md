# KEMI Training - QA Results

Date de la passe : 2026-09-23.

## Resultats executes dans cet environnement

| Controle | Statut | Resultat |
| --- | --- | --- |
| Import Excel reproductible | PASS | Deux executions successives produisent des fichiers JSON et rapport byte-for-byte identiques. |
| Compilation Python importeur | PASS | `scripts/import_training_xlsx.py` et le validateur QA compilent sans erreur. |
| Integrite du seed | PASS | 18/18 controles : 4 semaines, 12 seances, 140 items, 33 exercices, 27 medias, 3 tests, IDs/provenance/references valides. |
| Syntaxe TypeScript / TSX | PASS | 61 fichiers transpilent via l'API TypeScript sans erreur syntaxique. |
| Contournements `any` explicites | PASS | Aucun `any` explicite dans le code applicatif; les occurrences restantes sont les valeurs `purpose: "any"` du manifeste PWA. |
| QA visuelle 430 x 932 | PASS (miroir statique) | Pas d'overflow horizontal; cibles tactiles du miroir >= 44 px de large. Today et Workout inspectes manuellement. |
| QA visuelle 375 x 667 | PASS (miroir statique) | Pas d'overflow horizontal; bottom navigation et CTA restent utilisables. |
| QA visuelle 412 x 915 | PASS (miroir statique) | Pas d'overflow horizontal. |
| QA visuelle 768 x 1024 | PASS (miroir statique) | Pas d'overflow horizontal. |
| QA visuelle 1440 x 900 | PASS (miroir statique) | Layout centre et lisible; navigation conserve une largeur maitrisee. |
| PWA assets | PASS statique | Manifest, service worker, icones 192/512, Apple icon, offline page presents. |
| Migrations / RLS presentes | PASS statique | 2 migrations versionnees couvrant schema/RLS et Storage prive. |

Le miroir visuel de `qa/preview/` reutilise les tokens, composants visuels et CSS de l'application afin de permettre la verification responsive sans `next dev`. Les captures sont conservees dans `qa/screenshots/`.

## Tests livres mais non executables dans ce container

Les suites Vitest et Playwright sont presentes dans `tests/`. Elles couvrent les conversions kg/lbs, Brzycki, integrite du seed, login/mode local, Home, demarrage et reprise d'une seance, timer de repos, test de force, bascule d'unite et absence d'overflow sur les routes principales.

Le container de generation ne peut pas joindre `registry.npmjs.org`. `corepack prepare pnpm@10.17.1 --activate` echoue sur le telechargement du package pnpm, et `npm view next version` expire. En consequence, les controles qui necessitent les dependances npm sont **BLOCKED dans cet environnement**, et non declares comme passes :

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck` semantique complet avec les types React/Next/Supabase
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm test:e2e:webkit`

Le detail du blocage reseau est conserve dans `qa/dependency-network.txt`.

## A verifier dans l'environnement de deploiement

1. Executer `pnpm install` avec acces au registre npm.
2. Executer lint, typecheck, Vitest et `pnpm build`.
3. Executer Playwright sur les cinq projets declares dans `playwright.config.ts`, notamment WebKit.
4. Appliquer les migrations dans un projet Supabase, creer l'utilisateur KEMI, puis executer `pnpm seed`.
5. Tester magic link, Storage prive, signed URLs media et synchronisation `/api/sync` avec de vrais identifiants.
6. Effectuer une passe finale sur un iPhone 14 Pro Max reel en mode Safari puis PWA standalone afin de valider Dynamic Island, safe areas, notifications et reprise apres mise en arriere-plan.

## Anomalies source conservees

Le produit ne corrige pas silencieusement le workbook. Le rapport `seed/import-report.json` conserve notamment : titre 12 semaines vs phases jusqu'a 13, seules les semaines 1 a 4 presentes, texte mathematiquement incoherent du Back Squat set 2, poids manquants du Deadlift test, charges Week 2 majoritairement vides et unite ambiguë Week 4 E17.
