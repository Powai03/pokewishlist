# PokéWishlist — IIM A4 · CI/CD

Correspondance entre les **étapes du cours** (PDF « IIM A4 — CI/CD ») et les **PR** / **exécutions du pipeline** qui les réalisent et les prouvent.
Pipeline : `.github/workflows/ci.yml` (onglet [Actions](https://github.com/Powai03/pokewishlist/actions)). Sites en ligne : [SSR Vercel](https://pokewishlist-nu.vercel.app) · [SSG CloudFront](https://d7gp7a220g21z.cloudfront.net) · [API AWS](https://r3as2k0zxl.execute-api.eu-west-1.amazonaws.com/health).

### TP CI (étapes 1 à 11)

| Étape                                                           | PR                                                                                                                                                                                                                    | Preuve (pipeline)                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1 · Setup (Nuxt, dépôt, `ci.yml`)                               | [#1](https://github.com/Powai03/pokewishlist/pull/1)                                                                                                                                                                  | [merge #1](https://github.com/Powai03/pokewishlist/actions/runs/41429218237) |
| 2 · App (wishlist PokéAPI, localStorage)                        | [#1](https://github.com/Powai03/pokewishlist/pull/1), [#2](https://github.com/Powai03/pokewishlist/pull/2)                                                                                                            | [merge #2](https://github.com/Powai03/pokewishlist/actions/runs/41434144171) |
| 3 · Lint (ESLint, `console.log` interdit)                       | [#2](https://github.com/Powai03/pokewishlist/pull/2) (commit « console.log volontaire », puis retrait)                                                                                                                | checks rouge puis vert sur la PR                                             |
| 4 · Format (Prettier)                                           | [#3](https://github.com/Powai03/pokewishlist/pull/3)                                                                                                                                                                  | [merge #3](https://github.com/Powai03/pokewishlist/actions/runs/41435570194) |
| 5 · Types (`Pokemon`, `WishlistItem`)                           | [#4](https://github.com/Powai03/pokewishlist/pull/4)                                                                                                                                                                  | [merge #4](https://github.com/Powai03/pokewishlist/actions/runs/41436445453) |
| 6 · Unitaires (règle des 6)                                     | [#5](https://github.com/Powai03/pokewishlist/pull/5)                                                                                                                                                                  | [merge #5](https://github.com/Powai03/pokewishlist/actions/runs/41445918505) |
| 7 · API PokéAPI mockée (200, 404)                               | [#6](https://github.com/Powai03/pokewishlist/pull/6)                                                                                                                                                                  | [merge #6](https://github.com/Powai03/pokewishlist/actions/runs/41452579096) |
| 8 · Stockage localStorage                                       | [#7](https://github.com/Powai03/pokewishlist/pull/7)                                                                                                                                                                  | [merge #7](https://github.com/Powai03/pokewishlist/actions/runs/41454979205) |
| 9 · Build Nuxt                                                  | [#8](https://github.com/Powai03/pokewishlist/pull/8)                                                                                                                                                                  | [merge #8](https://github.com/Powai03/pokewishlist/actions/runs/41456727828) |
| 10 · Actions (npm ci, lint, Prettier, typecheck, Vitest, build) | [#9](https://github.com/Powai03/pokewishlist/pull/9)                                                                                                                                                                  | [merge #9](https://github.com/Powai03/pokewishlist/actions/runs/41461729341) |
| 11 · Validation (casser puis corriger)                          | [#1](https://github.com/Powai03/pokewishlist/pull/1) (échec volontaire puis correction), [#9](https://github.com/Powai03/pokewishlist/pull/9) (« tour des contrôles » : chaque contrôle cassé puis réparé, 7 commits) | checks de la PR #9, commit par commit                                        |

Préparation de l'API (entre le TP CI et le TP CD) : Hono [#10](https://github.com/Powai03/pokewishlist/pull/10), routes wishlist [#11](https://github.com/Powai03/pokewishlist/pull/11), qualité API [#12](https://github.com/Powai03/pokewishlist/pull/12), front branché sur l'API [#13](https://github.com/Powai03/pokewishlist/pull/13), E2E full-stack [#14](https://github.com/Powai03/pokewishlist/pull/14), serveurs explicites en CI [#15](https://github.com/Powai03/pokewishlist/pull/15).

### TP CD (étapes 1 à 19)

| Étape                                                      | PR                                                                                                                                                                     | Preuve (pipeline)                                                                                                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 · BDD `init.sql` (Supabase)                              | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | `supabase/init.sql`                                                                                                                              |
| 2 · Hono → PostgreSQL                                      | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | `api/src/postgres-store.ts`                                                                                                                      |
| 3 · Tests sur BDD isolée                                   | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | job « API · Tests BDD (Postgres) »                                                                                                               |
| 4 · Route `/pokemon/[name]` + 404                          | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | `app/pages/pokemon/[id].vue` (accepte nom ou numéro)                                                                                             |
| 5 · i18n (4 langues : en, fr, es, ja)                      | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | E2E `e2e/i18n.spec.ts`                                                                                                                           |
| 6 · CI traductions (clé manquante = CI rouge)              | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | [run rouge (clé retirée, branche de démo)](https://github.com/Powai03/pokewishlist/actions/runs/41645009963)                                     |
| 7 · Hono sur Lambda + API Gateway + Supabase/CORS          | [#16](https://github.com/Powai03/pokewishlist/pull/16), [#17](https://github.com/Powai03/pokewishlist/pull/17), [#18](https://github.com/Powai03/pokewishlist/pull/18) | [déploiement via API Gateway](https://github.com/Powai03/pokewishlist/actions/runs/41652732318)                                                  |
| 8 · CD back (merge → Lambda, OIDC sans clé)                | [#16](https://github.com/Powai03/pokewishlist/pull/16), [#17](https://github.com/Powai03/pokewishlist/pull/17)                                                         | [merge #17 → Lambda à jour](https://github.com/Powai03/pokewishlist/actions/runs/41650694022)                                                    |
| 9 · Vercel SSR                                             | [#19](https://github.com/Powai03/pokewishlist/pull/19), [#20](https://github.com/Powai03/pokewishlist/pull/20), [#21](https://github.com/Powai03/pokewishlist/pull/21) | [site SSR](https://pokewishlist-nu.vercel.app/pokemon/snivy)                                                                                     |
| 10 · CD SSR (merge → Vercel)                               | [#19](https://github.com/Powai03/pokewishlist/pull/19), [#20](https://github.com/Powai03/pokewishlist/pull/20), [#21](https://github.com/Powai03/pokewishlist/pull/21) | [merge #21 → Vercel à jour](https://github.com/Powai03/pokewishlist/actions/runs/41658533324) (runs précédents rouges : corrigés par #20 et #21) |
| 11 · Pré-génération des routes (156 fiches)                | [#22](https://github.com/Powai03/pokewishlist/pull/22)                                                                                                                 | [merge #22](https://github.com/Powai03/pokewishlist/actions/runs/41659653832)                                                                    |
| 12 · SSG sur S3 + CloudFront                               | PR « version statique » (S3 + CloudFront)                                                                                                                              | [site SSG](https://d7gp7a220g21z.cloudfront.net)                                                                                                 |
| 13 · CD SSG (generate, sync S3, invalidation)              | même PR                                                                                                                                                                | job « Deploy SSG (S3 + CloudFront) »                                                                                                             |
| 14 · Migrations (`schema_migrations`, runner, `001_likes`) | [#24](https://github.com/Powai03/pokewishlist/pull/24), [#26](https://github.com/Powai03/pokewishlist/pull/26) (lancées par le pipeline)                               | [merge #26 : job Migrate DB](https://github.com/Powai03/pokewishlist/actions/runs/41687466354)                                                   |
| 15 · E2E étendu (fiche, langues, persistance, likes)       | [#25](https://github.com/Powai03/pokewishlist/pull/25)                                                                                                                 | [merge #25 : 36 tests E2E](https://github.com/Powai03/pokewishlist/actions/runs/41686353671)                                                     |
| 16 · Smoke tests après déploiement                         | en partie : chaque job de déploiement vérifie /health, une page SSR, une page SSG et les codes HTTP                                                                    | jobs « Deploy … »                                                                                                                                |
| 17 · SEO (HTML sans JavaScript)                            | à faire                                                                                                                                                                | —                                                                                                                                                |
| 18 · Rollback                                              | à faire                                                                                                                                                                | —                                                                                                                                                |
| 19 · Couverture des tests (badge)                          | à faire                                                                                                                                                                | —                                                                                                                                                |

# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Pipeline GitHub Actions (CI/CD)

Un seul workflow, `.github/workflows/ci.yml`, en étapes reliées par `needs:` (graphe visible dans l'onglet Actions) :

```
i18n ───────────┬──────────────────────────────────────────────┐
API · Install ──┼─▶ API · Prettier/ESLint/Typecheck/Vitest ──┬─▶ API · Build + /health ─┐
                └─▶ API · Tests BDD (Postgres) ──────────────┘                         ├─▶ E2E
Install ──────────▶ Prettier/ESLint/Typecheck/Vitest ───────────▶ Build ───────────────┘

puis, sur main uniquement :  E2E ─▶ Migrate DB ─▶ Deploy API ─┬─▶ Deploy (Vercel, SSR)
                                                              └─▶ Deploy SSG (S3 + CloudFront)
```

Tests de bout en bout en local :

```bash
npm run build:e2e && npm --prefix api run build && npm run e2e
```

`build:e2e` construit le site avec l'adresse de l'API de test (port 3101) : les fiches pré-rendues la figent au build. Les parcours (`e2e/parcours.spec.ts`) vont du navigateur jusqu'à l'API : fiche, langues, persistance sur un 2e appareil, likes (2 visiteurs, fiche pré-rendue).

Les jobs « Install » mettent `node_modules` en cache pour les suivants ; le Build transmet le site compilé à l'E2E (artefact). Les déploiements ne tournent que sur un push dans `main`, quand tout le reste est vert.

## API (Hono + TypeScript)

L'API est dans le dossier `api/`, avec ses propres dépendances.

```bash
cd api
npm install
npm run dev        # http://localhost:3002/health (rechargement automatique)
npm run test       # tests Vitest
npm run test:db    # tests sur une vraie base PostgreSQL de test (PGlite en local, TEST_DATABASE_URL en CI)
npm run lint       # ESLint
npm run format     # Prettier (corrige) — format:check pour vérifier seulement
npm run typecheck  # TypeScript
npm run build      # compile src/ → dist/
npm start          # lance dist/index.js
```

`GET /health` renvoie l'état, la version (lue dans `api/package.json`) et l'environnement (`NODE_ENV`) :

```json
{
  "status": "ok",
  "version": "0.1.0",
  "env": "production",
  "storage": "postgres",
  "uptime": 12,
  "timestamp": "…"
}
```

Variables d'environnement : `PORT` (3002 par défaut), `NODE_ENV` (`development`, `test` ou `production`).

### Routes

| Méthode  | Route                | Succès                                         | Erreurs                                             |
| -------- | -------------------- | ---------------------------------------------- | --------------------------------------------------- |
| `GET`    | `/health`            | `200` état, version, environnement             |                                                     |
| `GET`    | `/wishlist`          | `200` liste des Pokémon                        |                                                     |
| `POST`   | `/wishlist`          | `201` Pokémon créé (+ en-tête `Location`)      | `400` corps invalide, `409` doublon ou liste pleine |
| `PATCH`  | `/wishlist/:id`      | `200` Pokémon modifié (`{ "captured": true }`) | `400` corps invalide, `404` absent de la liste      |
| `DELETE` | `/wishlist/:id`      | `200` Pokémon retiré                           | `400` id invalide, `404` absent de la liste         |
| `GET`    | `/pokemon/:id/likes` | `200` `{ id, likes }`                          | `400` hors 5e génération                            |
| `POST`   | `/pokemon/:id/likes` | `200` `{ id, likes }` (un like de plus)        | `400` hors 5e génération                            |

Corps de `POST /wishlist` : `{ "id": 495, "name": "Vipélierre" }` (5e génération : 494 à 649, 6 Pokémon maximum).

### Base de données (Supabase)

La wishlist est enregistrée dans une base PostgreSQL hébergée par Supabase quand `DATABASE_URL` est définie ; sinon elle reste **en mémoire** (vidée à chaque redémarrage : c'est le cas des tests et de la CI). `GET /health` indique lequel (`"storage": "postgres"` ou `"memory"`).

1. Créer un projet sur supabase.com, puis exécuter `supabase/init.sql` dans **SQL Editor** (table `wishlist`, règles 5G / doublon / 6 maximum, RLS).
2. Copier `api/.env.example` en `api/.env` et y mettre la chaîne de connexion (**Connect → Direct → Session pooler**).
3. `npm run dev` lit `api/.env` automatiquement.

Une donnée refusée par une contrainte de la base (ex. type inconnu) renvoie `400`.

Variables de l'API : `CORS_ORIGIN` (origines autorisées, séparées par des virgules ; défaut : `http://localhost:3000,http://localhost:3001`).

### Migrations SQL

`supabase/init.sql` crée le schéma de départ ; les évolutions sont dans `supabase/migrations/NNN_nom.sql` (ex. `001_likes.sql`). Le runner maison (`api/src/migrations.ts`) les applique dans l'ordre, **une seule fois** chacune, et les note dans la table `schema_migrations` (version, empreinte SHA-256, date) :

Le pipeline les applique automatiquement après chaque merge dans `main` (job **Migrate DB**, avant le déploiement de l'API ; secret `DATABASE_URL` de l'environnement `production`). À la main :

```bash
cd api && npm run migrate   # base de DATABASE_URL (api/.env) ; sans risque à relancer
```

Chaque migration et sa ligne du journal sont dans la même transaction (tout ou rien) ; un verrou PostgreSQL empêche deux exécutions simultanées ; une migration modifiée après application est refusée.

## Fiche d'un Pokémon

`/pokemon/495` ou `/pokemon/snivy` : fiche rendue par le serveur à partir de PokéAPI (nom, catégorie, types, taille, poids, texte du Pokédex, statistiques). Un Pokémon inconnu ou hors 5e génération renvoie une page **404**. Adresse de PokéAPI : `NUXT_PUBLIC_POKEAPI_BASE` (défaut `https://pokeapi.co/api/v2` ; un faux serveur, `e2e/pokeapi-mock.mjs`, la remplace pendant les tests E2E).

### Pré-rendu des 156 fiches (5e génération)

`npm run fetch:pokemon` (`scripts/fetch-gen5-pokemon.mjs`) récupère dans PokéAPI les 156 Pokémon d'Unys et écrit `data/gen5-pokemon.json` (versionné). Au build, `nuxt.config.ts` en fait les routes de pré-rendu de Nitro : `/pokemon/victini` … `/pokemon/genesect` sont générées en HTML statique (`.output/public/pokemon/<nom>/index.html`). Les autres adresses (`/pokemon/495`…) restent rendues à la demande.

## Langues (i18n)

Interface en **anglais par défaut**, traduite en français, espagnol et japonais (sélecteur en haut de page ; choix mémorisé dans le cookie `lang`).

- Front : `i18n/locales/{en,fr,es,jp}.json` (module `@nuxtjs/i18n`). La fiche affiche aussi le nom, la catégorie et le texte du Pokédex dans la langue choisie (PokéAPI les fournit).
- API : `api/src/locales/{en,fr,es,jp}.json`. Langue de chaque réponse : `?lang=fr`, sinon l'en-tête `Accept-Language` (envoyé par le front), sinon l'anglais. Les erreurs ont la forme `{ "error": "<message traduit>", "code": "<code stable>" }`.

Vérifier que chaque fichier a exactement les clés de `en.json` (front et API ; code 1 sinon, lancé en CI) :

```bash
npm run check:locales
```

```bash
curl -X DELETE http://localhost:3002/wishlist/495 -H "Accept-Language: fr"
# {"error":"Le Pokémon #495 n'est pas dans la wishlist","code":"notInList"}
```

## Déploiement continu (CD) de l'API sur AWS Lambda

Après chaque merge dans `main`, si **toute la CI est verte**, les derniers jobs du pipeline `.github/workflows/ci.yml` (« Deploy API », puis « Deploy (Vercel) », qui dépendent de tous les autres par `needs:`) construisent l'API en un seul fichier (`npm --prefix api run build:lambda`), l'envoient sur la fonction Lambda, puis vérifient en ligne, via l'API Gateway, que `GET /health` renvoie le commit déployé, que `GET /wishlist` répond et que le CORS est accepté.

Adresse publique : **API Gateway (HTTP API)** `https://r3as2k0zxl.execute-api.eu-west-1.amazonaws.com` (`/health`, `/wishlist`), limitée à 10 requêtes/s (pics à 20). Supabase y est joint par son pooler en mode transaction (port 6543) ; CORS géré par Hono (`CORS_ORIGIN`).

- Connexion à AWS par **OIDC** : aucune clé AWS dans GitHub, seulement l'identifiant d'un rôle (secret `AWS_ROLE_ARN`) qui ne peut que mettre à jour le code de cette fonction, et seulement depuis l'environnement GitHub `production`.
- `DATABASE_URL` reste côté AWS (configuration de la fonction), jamais dans GitHub.
- Mise en place, une seule fois : `bash infra/aws-setup.sh` (AWS CLI connecté), puis créer l'environnement `production` dans GitHub avec les valeurs affichées par le script (`AWS_ROLE_ARN` ; variables `AWS_REGION`, `LAMBDA_FUNCTION_NAME`, `API_URL`).
- Relance : onglet **Actions → CI/CD → Re-run failed jobs** sur l'exécution de `main`.

## Déploiement continu du front (Nuxt SSR) sur Vercel

Site en ligne : **https://pokewishlist-nu.vercel.app** (rendu serveur, régions `dub1`).

Après chaque merge dans `main` et une CI verte, le pipeline déploie d'abord l'API (AWS), puis le front : `vercel build --prod` dans GitHub Actions (preset Nitro `vercel`, adresse de l'API gravée au build), `vercel deploy --prebuilt --prod`, puis vérification que le HTML rendu par le serveur porte le commit déployé (`<meta name="app-commit">`, aussi affiché en bas de page).

- `.vercelignore` exclut `api/`, `infra/`, tests… : sinon Vercel prendrait chaque fichier de `api/` pour une fonction serverless (limite de 12 sur l'offre gratuite).
- Le déploiement automatique de Vercel est coupé (`vercel.json` : `git.deploymentEnabled: false`) : seul GitHub Actions déploie, après la CI.
- Environnement GitHub `production` : secret `VERCEL_TOKEN` ; variables `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `FRONT_URL`.
- L'adresse du site est dans le CORS de l'API (`CORS_ORIGIN`, `infra/aws-setup.sh`).

## Version statique (SSG) sur S3 + CloudFront

Site statique : **https://d7gp7a220g21z.cloudfront.net** — même contenu que le site Vercel, mais entièrement pré-généré (`nuxt generate` : accueil + 156 fiches), servi par le CDN CloudFront depuis un bucket S3 privé, et branché sur la **même API AWS**.

- Après chaque merge dans `main` et une CI verte, le job **Deploy SSG** du pipeline : `nuxt generate` → `aws s3 sync` (JS/CSS en cache 1 an, HTML toujours revalidé) → invalidation CloudFront → vérification en ligne (commit dans le HTML, fiche générée, API utilisée, 404).
- Mise en place, une seule fois : `bash infra/aws-ssg-setup.sh` (bucket privé, accès réservé à CloudFront, fonction d'index, droits de déploiement limités) ; variables `SSG_BUCKET`, `SSG_DISTRIBUTION_ID`, `SSG_URL` de l'environnement `production`.

## Lancer le front avec l'API

Le front lit et enregistre la wishlist via l'API (plus de localStorage). Dans deux terminaux :

```bash
cd api && npm run dev     # API sur http://localhost:3002
npm run dev               # front sur http://localhost:3000
```

Adresse de l'API côté front : `NUXT_PUBLIC_API_BASE` (défaut `http://localhost:3002`).

```bash
curl -X POST localhost:3002/wishlist -H 'content-type: application/json' -d '{"id":495,"name":"Vipélierre"}'
curl localhost:3002/wishlist
curl -X DELETE localhost:3002/wishlist/495
```
