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
