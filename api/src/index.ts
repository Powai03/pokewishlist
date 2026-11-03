// Point d'entrée : lit la configuration, choisit le stockage et démarre le serveur HTTP Node.js.
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { PostgresWishlistStore } from './postgres-store.js'
import { MemoryWishlistStore } from './wishlist-store.js'

const config = loadConfig()

// DATABASE_URL définie → base Supabase ; sinon tableau en mémoire (tests, CI, dev sans base).
const store = config.databaseUrl
  ? new PostgresWishlistStore(config.databaseUrl)
  : new MemoryWishlistStore()
const storage = store instanceof PostgresWishlistStore ? 'postgres' : 'memory'
const app = createApp(config, store, storage)

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.info(
    `API PokéWishlist v${config.version} (${config.env}, stockage : ${storage}) : http://localhost:${info.port}/health`,
  )
})

// Arrêt propre (Ctrl+C, arrêt par l'hébergeur) : on ferme les connexions à la base.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close()
    if (store instanceof PostgresWishlistStore) void store.close()
  })
}
