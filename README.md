# KEMI Training

KEMI Training transforme le classeur `Training Routine - KEMI S.xlsx` en une PWA mobile-first de suivi d'entrainement. La V1 est concue en priorite pour un iPhone 14 Pro Max (430 x 932 CSS px), avec mode sombre, suivi de seance local-first, timers fiables, historique, tests de force, conversions kg/lbs, medias d'exercices et synchronisation Supabase optionnelle.

## Stack

- Next.js 16 App Router + React 19 + TypeScript strict
- Tailwind CSS 4
- Supabase Auth, PostgreSQL, Storage et RLS
- IndexedDB (`idb`) pour la persistence locale et la file de synchronisation
- Service worker + manifest PWA
- Vitest + Playwright, y compris WebKit et viewports mobiles
- Vercel pour l'hebergement

## Donnees importees

Le classeur source est conserve dans `data/source/`. Le script `scripts/import-training-xlsx` produit :

- `seed/kemi-training-program.json` : snapshot normalise reproductible
- `seed/import-report.json` : metriques d'import et anomalies conservees

Le snapshot actuel contient 4 semaines, 12 seances, 140 items, 33 exercices, 27 references media et 3 tests de force. L'application ne fabrique pas les semaines manquantes : le classeur indique 12 semaines dans son titre, des phases jusqu'a la semaine 13, mais ne fournit que les feuilles Week 1 a Week 4.

## Installation

Prérequis : Node.js 24, pnpm 10.17.1, Docker Desktop, Python 3.11+ pour l'import du classeur.

```bash
pnpm install --frozen-lockfile
pnpm supabase:bootstrap
pnpm dev
```

Ouvrir `http://localhost:3000`. Sans Docker, `pnpm dev` seul reste en mode local de revue. Le détail est dans `docs/DEPLOYMENT.md`.

## Variables d'environnement

Voir `.env.example`.

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
KEMI_USER_ID=
```

`SUPABASE_SECRET_KEY` est la cle de seed preferee. `SUPABASE_SERVICE_ROLE_KEY` reste un repli temporaire. Les deux restent hors du navigateur, de `src/` et de Vercel.

## Supabase

```bash
pnpm supabase:bootstrap
```

La commande locale applique les migrations, crée `kemi.local@example.test`, charge le programme KEMI et génère les types. Les migrations `0001` et `0002` restent inchangées. Le bucket privé `exercise-media` range les médias personnels sous le préfixe de l'utilisateur.

## Authentification

La V1 utilise Supabase Auth avec lien magique par courriel. `src/proxy.ts` rafraichit la session SSR et protege les routes lorsque Supabase est configure. Aucun secret serveur n'est livre au client.

## Architecture applicative

Routes principales :

- `/today` : seance recommandee et reprise d'une seance active
- `/plan` et `/plan/week/[weekNumber]` : programme importe
- `/workout/[workoutId]` : apercu d'une seance
- `/session/[sessionId]` : runner de seance sans distraction
- `/exercise/[slug]` et `/exercises` : bibliotheque et medias
- `/progress` : historique, volume et Estimated 1RM
- `/tests` : protocoles de force
- `/profile` et `/settings` : preferences
- `/auth/login` : lien magique ou mode local de revue

La logique serveur reste dans les Server Components/Route Handlers lorsque possible. Les composants client sont limites aux interactions, IndexedDB, timers, media local et navigation dynamique.

## Offline et synchronisation

Une seance active est enregistree dans IndexedDB apres chaque mutation. Elle survit a un refresh, a une fermeture accidentelle ou a une perte reseau. Chaque snapshot est egalement place dans `pendingMutations`.

Quand le reseau revient, `src/lib/sync.ts` envoie la file vers `/api/sync`. Une mutation n'est retiree qu'apres confirmation serveur. Le timer de repos stocke un timestamp de fin et recalcule le temps restant avec `Date.now()` : il ne derive pas si Safari suspend l'application.

Le service worker met en cache le shell, les assets statiques, les medias deja utilises et les navigations same-origin visitees. Une page offline minimale reste disponible en dernier recours.

## Medias d'exercices

L'import distingue :

- medias directs (`webp`, `gif`, `jpg`, `png`, `mp4`) : affichables dans l'application lorsque permis ;
- pages tierces : conservees comme `external_reference`, sans scraping ni re-hebergement automatique.

La page d'un exercice permet d'ajouter une photo, un GIF, un WebP ou un MP4 personnel. Le media est prioritaire localement et est envoye dans Supabase Storage si le backend est configure.

## Tests de force

Les protocoles BACK SQUAT, HIP THRUST et DEADLIFT sont importes depuis la feuille `TESTS`. L'estimation Brzycki utilise la formule source :

```text
1RM = weight / (1.0278 - 0.0278 x reps)
```

L'interface affiche toujours **Estimated 1RM** pour eviter de le confondre avec un 1RM mesure.

## Unites

La valeur et l'unite source sont conservees. L'affichage peut etre bascule entre kg et lbs avec `1 kg = 2.2046 lbs`, puis arrondi a des increments de salle realistes (1.25 kg ou 5 lb par defaut).

## QA

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm test:e2e:webkit
pnpm supabase:lint
pnpm supabase:test
```

Les projets Playwright couvrent : 430 x 932, 375 x 667 sous WebKit (`webkit-compact-iphone`), 412 x 915 Android, 768 x 1024 tablette et 1440 x 900 desktop. `pnpm test:e2e:webkit` lance ce projet WebKit.

Le rapport de la passe effectuee dans l'environnement de generation se trouve dans `qa/RESULTS.md`. Cet environnement n'autorisait pas l'acces au registre npm, donc l'installation des dependances et, par consequent, le vrai `next build` et Playwright n'ont pas pu y etre executes. Les scripts sont prets a etre lances dans un environnement disposant du registre npm.

## PWA

`src/app/manifest.ts`, les icones 192/512, l'icone Apple, `public/sw.js` et l'enregistrement du service worker sont inclus. Le manifeste utilise `display: standalone`, orientation portrait, theme sombre et safe areas iOS via CSS `env(safe-area-inset-*)`.

## Deploiement Vercel

La Wave 02 ne deploie pas l'application.

Apres la fusion de la Wave 02 : creer ou lier le projet Vercel, connecter GitHub, et activer les Preview Deployments pour les futures branches. La Wave 08 configure les variables de production, l'URL Auth Supabase finale, puis le deploiement de production.

Les previews ne recoivent pas les identifiants Supabase de production. Ne pas placer `SUPABASE_SECRET_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` sur Vercel. Les details sont dans `docs/DEPLOYMENT.md`.

## Documentation

Le dossier `docs/` contient : PRD, TRD, specification UI/UX, design system, app flow, schema backend, specification d'import, plan d'implementation, plan QA et guide de deploiement.

## Principes V1

Le programme du coach est la source de verite. L'application n'ajoute pas de recommandations medicales, n'invente pas de calories brulees, ne modifie pas silencieusement les charges et conserve la provenance Excel des donnees lorsque disponible.
