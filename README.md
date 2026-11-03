# PokéWishlist — IIM A4 · CI/CD

[![Couverture front](https://img.shields.io/endpoint?url=https://d7gp7a220g21z.cloudfront.net/coverage/front-badge.json)](https://d7gp7a220g21z.cloudfront.net/coverage/front/) [![Couverture API](https://img.shields.io/endpoint?url=https://d7gp7a220g21z.cloudfront.net/coverage/api-badge.json)](https://d7gp7a220g21z.cloudfront.net/coverage/api/) [![CI/CD](https://github.com/Powai03/pokewishlist/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Powai03/pokewishlist/actions/workflows/ci.yml)

Correspondance entre les **étapes du cours** (PDF « IIM A4 — CI/CD ») et les **PR** / **exécutions du pipeline** qui les réalisent et les prouvent.
Pipeline : `.github/workflows/ci.yml` (onglet [Actions](https://github.com/Powai03/pokewishlist/actions)). Sites en ligne : [SSR Vercel](https://pokewishlist-nu.vercel.app) · [SSG CloudFront](https://d7gp7a220g21z.cloudfront.net) · [API AWS](https://r3as2k0zxl.execute-api.eu-west-1.amazonaws.com/health).

### TP CI (étapes 1 à 11)

🔴 = exécution rouge (échec volontaire, demandé par le cours) · 🟢 = la même vérification au vert. Chaque pastille ouvre l'exécution GitHub Actions.

| Étape                                                                  | PR                                                   | 🔴 rouge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 🟢 vert                                                                                                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Fil rouge · une PR avec un échec volontaire puis tout vert             | [#1](https://github.com/Powai03/pokewishlist/pull/1) | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41427053021)                                                                                                                                                                                                                                                                                                                                                                                                                             | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41427297573)                                                                        |
| 1 · Setup (Nuxt, dépôt, `ci.yml` dans Actions)                         | [#1](https://github.com/Powai03/pokewishlist/pull/1) | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41429218237)                                                                        |
| 2 · App (wishlist PokéAPI, localStorage)                               | [#2](https://github.com/Powai03/pokewishlist/pull/2) | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41431933020)                                                                        |
| 3 · Lint (`console.log` poussé : rouge, puis vert)                     | [#2](https://github.com/Powai03/pokewishlist/pull/2) | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41432191568)                                                                                                                                                                                                                                                                                                                                                                                                                             | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41432353181)                                                                        |
| 4 · Format (format cassé : `prettier --check` échoue, puis passe)      | [#3](https://github.com/Powai03/pokewishlist/pull/3) | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41434227195)                                                                                                                                                                                                                                                                                                                                                                                                                             | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41434401888)                                                                        |
| 5 · Types (erreur de type : `nuxt typecheck` échoue)                   | [#4](https://github.com/Powai03/pokewishlist/pull/4) | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41436001213)                                                                                                                                                                                                                                                                                                                                                                                                                             | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41436169805)                                                                        |
| 6 · Unitaires (règle des 6 cassée : Vitest rouge)                      | [#5](https://github.com/Powai03/pokewishlist/pull/5) | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41437064603) [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41445147218)                                                                                                                                                                                                                                                                                                                                                      | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41437176566) [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41445398212) |
| 7 · API PokéAPI mockée (passe sans réseau)                             | [#6](https://github.com/Powai03/pokewishlist/pull/6) | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41447270707)                                                                        |
| 8 · Stockage localStorage (JSON corrompu sans plantage)                | [#7](https://github.com/Powai03/pokewishlist/pull/7) | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41452600225)                                                                        |
| 9 · Build (import inexistant : build cassé, puis corrigé)              | [#8](https://github.com/Powai03/pokewishlist/pull/8) | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41455044167)                                                                                                                                                                                                                                                                                                                                                                                                                             | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41456196329)                                                                        |
| 10 · Actions (tous les contrôles visibles sur une PR)                  | [#9](https://github.com/Powai03/pokewishlist/pull/9) | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41461278831)                                                                        |
| 11 · Validation : « tour des contrôles », un contrôle cassé par commit | [#9](https://github.com/Powai03/pokewishlist/pull/9) | npm ci [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41458151088) · ESLint [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41459575829) · Prettier [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41459961703) · TypeScript [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41460214781) · Vitest [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41460631741) · build [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41460946117) | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41461273977)                                                                        |

Préparation de l'API (entre le TP CI et le TP CD) : Hono [#10](https://github.com/Powai03/pokewishlist/pull/10), routes wishlist [#11](https://github.com/Powai03/pokewishlist/pull/11), qualité API [#12](https://github.com/Powai03/pokewishlist/pull/12), front branché sur l'API [#13](https://github.com/Powai03/pokewishlist/pull/13), E2E full-stack [#14](https://github.com/Powai03/pokewishlist/pull/14), serveurs explicites en CI [#15](https://github.com/Powai03/pokewishlist/pull/15).

### TP CD (étapes 1 à 19)

| Étape                                                             | PR                                                                                                                                                                     | 🔴 rouge                                                                                                                                                              | 🟢 vert / preuve                                                                                                                                                                                |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · BDD `init.sql` (Supabase)                                     | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | —                                                                                                                                                                     | `supabase/init.sql`                                                                                                                                                                             |
| 2 · Hono → PostgreSQL                                             | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | —                                                                                                                                                                     | `api/src/postgres-store.ts`                                                                                                                                                                     |
| 3 · Tests sur BDD isolée (sans mock SQL)                          | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | —                                                                                                                                                                     | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41644967400) job « API · Tests BDD (Postgres) »                                                                                       |
| 4 · Route `/pokemon/[name]` + 404                                 | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | —                                                                                                                                                                     | `app/pages/pokemon/[id].vue` (nom ou numéro)                                                                                                                                                    |
| 5 · i18n (4 langues : en, fr, es, ja)                             | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | —                                                                                                                                                                     | E2E `e2e/i18n.spec.ts`                                                                                                                                                                          |
| 6 · CI traductions : une clé manquante fait échouer la CI         | [#16](https://github.com/Powai03/pokewishlist/pull/16)                                                                                                                 | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41645009963) (clé retirée, branche de démo)                                                                 | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41644967400)                                                                                                                          |
| 7 · Hono sur Lambda + API Gateway + Supabase/CORS                 | [#16](https://github.com/Powai03/pokewishlist/pull/16), [#17](https://github.com/Powai03/pokewishlist/pull/17), [#18](https://github.com/Powai03/pokewishlist/pull/18) | —                                                                                                                                                                     | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41652732318) [/health](https://r3as2k0zxl.execute-api.eu-west-1.amazonaws.com/health)                                                 |
| 8 · CD back : un merge met à jour Lambda (OIDC, sans clé)         | [#16](https://github.com/Powai03/pokewishlist/pull/16), [#17](https://github.com/Powai03/pokewishlist/pull/17)                                                         | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41649013890/attempts/1) (rôle AWS refusé)                                                                   | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41649013890/attempts/2) [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41650694022) (merge #17, automatique)               |
| 9 · Nuxt SSR sur Vercel (HTML côté serveur)                       | [#19](https://github.com/Powai03/pokewishlist/pull/19), [#20](https://github.com/Powai03/pokewishlist/pull/20), [#21](https://github.com/Powai03/pokewishlist/pull/21) | —                                                                                                                                                                     | [fiche SSR](https://pokewishlist-nu.vercel.app/pokemon/snivy)                                                                                                                                   |
| 10 · CD SSR : un merge met à jour Vercel                          | [#19](https://github.com/Powai03/pokewishlist/pull/19), [#20](https://github.com/Powai03/pokewishlist/pull/20), [#21](https://github.com/Powai03/pokewishlist/pull/21) | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41656091622) (preset) [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41657401734) (12 fonctions) | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41658533324)                                                                                                                          |
| 11 · Pré-génération des 156 fiches                                | [#22](https://github.com/Powai03/pokewishlist/pull/22)                                                                                                                 | —                                                                                                                                                                     | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41659653832)                                                                                                                          |
| 12 · SSG sur S3 + CloudFront (même API AWS)                       | [#27](https://github.com/Powai03/pokewishlist/pull/27)                                                                                                                 | —                                                                                                                                                                     | [site SSG](https://d7gp7a220g21z.cloudfront.net/pokemon/snivy)                                                                                                                                  |
| 13 · CD SSG : generate, sync S3, invalidation CloudFront          | [#27](https://github.com/Powai03/pokewishlist/pull/27)                                                                                                                 | —                                                                                                                                                                     | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41691067386) job « Deploy SSG »                                                                                                       |
| 14 · Migrations : une seule exécution, données préservées         | [#24](https://github.com/Powai03/pokewishlist/pull/24), [#26](https://github.com/Powai03/pokewishlist/pull/26)                                                         | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41660954105) (base de test partagée)                                                                        | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41662198061) · [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41687466354) job « Migrate DB » (001 ignorée, 002 appliquée) |
| 15 · E2E : parcours du navigateur jusqu'à l'API                   | [#25](https://github.com/Powai03/pokewishlist/pull/25)                                                                                                                 | [🔴](https://github.com/Powai03/pokewishlist/actions/runs/41664958121) (timing en CI)                                                                                 | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41665850666) · [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41686353671) (36 tests)                                      |
| 16 · Smoke tests : la CD échoue si une URL critique ne répond pas | [#19](https://github.com/Powai03/pokewishlist/pull/19), [#27](https://github.com/Powai03/pokewishlist/pull/27)                                                         | —                                                                                                                                                                     | [🟢](https://github.com/Powai03/pokewishlist/actions/runs/41691067386) : `/health`, page SSR, page SSG, codes 200/404, dans chaque job « Deploy »                                               |
| 17 · SEO : HTML sans JavaScript (title + contenu)                 | — (vérification)                                                                                                                                                       | —                                                                                                                                                                     | `curl` des fiches SSR et SSG : titre, nom, catégorie, description, statistiques                                                                                                                 |
| 18 · Rollback : retour à la version précédente                    | [#28](https://github.com/Powai03/pokewishlist/pull/28)                                                                                                                 | —                                                                                                                                                                     | workflow « Rollback » (Actions → Rollback → Run workflow)                                                                                                                                       |
| 19 · Couverture des tests : rapport + badge                       | branche `feat/coverage`                                                                                                                                                | —                                                                                                                                                                     | badges ci-dessus ; [rapport](https://d7gp7a220g21z.cloudfront.net/coverage/) ; résumé dans chaque exécution (jobs « Tests (Vitest) »)                                                           |

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

## Retour arrière (rollback)

Onglet **Actions → Rollback → Run workflow** (depuis `main`) :

- sans paramètre : remet en ligne le **dernier déploiement stable** avant la version actuelle (la dernière exécution verte du pipeline sur `main` qui précède le commit renvoyé par `/health`) ;
- avec un commit : remet en ligne cette version (par exemple pour revenir ensuite à la plus récente).

Le retour arrière passe par le même workflow que les mises en ligne (`.github/workflows/deploy.yml` : API Lambda, Vercel, S3 + CloudFront), smoke tests compris. La base n'est pas remise en arrière : les migrations ne vont que vers l'avant et restent compatibles avec la version précédente.

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
