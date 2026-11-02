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

La wishlist est stockée **en mémoire** : elle est vidée à chaque redémarrage de l'API.

Variables de l'API : `CORS_ORIGIN` (origines autorisées, séparées par des virgules ; défaut : `http://localhost:3000,http://localhost:3001`).

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
