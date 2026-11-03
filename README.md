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

| Méthode  | Route           | Succès                                         | Erreurs                                             |
| -------- | --------------- | ---------------------------------------------- | --------------------------------------------------- |
| `GET`    | `/health`       | `200` état, version, environnement             |                                                     |
| `GET`    | `/wishlist`     | `200` liste des Pokémon                        |                                                     |
| `POST`   | `/wishlist`     | `201` Pokémon créé (+ en-tête `Location`)      | `400` corps invalide, `409` doublon ou liste pleine |
| `PATCH`  | `/wishlist/:id` | `200` Pokémon modifié (`{ "captured": true }`) | `400` corps invalide, `404` absent de la liste      |
| `DELETE` | `/wishlist/:id` | `200` Pokémon retiré                           | `400` id invalide, `404` absent de la liste         |

Corps de `POST /wishlist` : `{ "id": 495, "name": "Vipélierre" }` (5e génération : 494 à 649, 6 Pokémon maximum).

### Base de données (Supabase)

La wishlist est enregistrée dans une base PostgreSQL hébergée par Supabase quand `DATABASE_URL` est définie ; sinon elle reste **en mémoire** (vidée à chaque redémarrage : c'est le cas des tests et de la CI). `GET /health` indique lequel (`"storage": "postgres"` ou `"memory"`).

1. Créer un projet sur supabase.com, puis exécuter `supabase/init.sql` dans **SQL Editor** (table `wishlist`, règles 5G / doublon / 6 maximum, RLS).
2. Copier `api/.env.example` en `api/.env` et y mettre la chaîne de connexion (**Connect → Direct → Session pooler**).
3. `npm run dev` lit `api/.env` automatiquement.

Une donnée refusée par une contrainte de la base (ex. type inconnu) renvoie `400`.

Variables de l'API : `CORS_ORIGIN` (origines autorisées, séparées par des virgules ; défaut : `http://localhost:3000,http://localhost:3001`).

## Fiche d'un Pokémon

`/pokemon/495` ou `/pokemon/snivy` : fiche rendue par le serveur à partir de PokéAPI (nom, catégorie, types, taille, poids, texte du Pokédex, statistiques). Un Pokémon inconnu ou hors 5e génération renvoie une page **404**. Adresse de PokéAPI : `NUXT_PUBLIC_POKEAPI_BASE` (défaut `https://pokeapi.co/api/v2` ; un faux serveur, `e2e/pokeapi-mock.mjs`, la remplace pendant les tests E2E).

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

Après chaque merge dans `main`, si **toute la CI est verte**, le workflow `.github/workflows/cd.yml` construit l'API en un seul fichier (`npm --prefix api run build:lambda`), l'envoie sur la fonction Lambda, puis vérifie en ligne que `GET /health` renvoie bien le commit déployé (champ `commit`).

- Connexion à AWS par **OIDC** : aucune clé AWS dans GitHub, seulement l'identifiant d'un rôle (secret `AWS_ROLE_ARN`) qui ne peut que mettre à jour le code de cette fonction, et seulement depuis l'environnement GitHub `production`.
- `DATABASE_URL` reste côté AWS (configuration de la fonction), jamais dans GitHub.
- Mise en place, une seule fois : `bash infra/aws-setup.sh` (AWS CLI connecté), puis créer l'environnement `production` dans GitHub avec les valeurs affichées par le script (`AWS_ROLE_ARN` ; variables `AWS_REGION`, `LAMBDA_FUNCTION_NAME`, `API_URL`).
- Relance manuelle : onglet **Actions → CD → Run workflow** (depuis `main`).

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
