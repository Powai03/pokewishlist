// Assemble l'application à partir de la configuration : choix du stockage + création de l'app Hono.
// Partagé par les deux points d'entrée : index.ts (serveur Node.js) et lambda.ts (AWS Lambda).
import type { Hono } from 'hono'
import { createApp, type StorageKind } from './app.js'
import type { AppConfig } from './config.js'
import {
  PostgresWishlistStore,
  type PostgresStoreOptions,
} from './postgres-store.js'
import { MemoryWishlistStore, type WishlistStore } from './wishlist-store.js'

export interface Runtime {
  app: Hono
  store: WishlistStore
  storage: StorageKind
  /** Ferme les connexions à la base (arrêt propre). */
  close: () => Promise<void>
}

/** DATABASE_URL définie → base Supabase ; sinon tableau en mémoire (tests, CI, dev sans base). */
export function createRuntime(
  config: AppConfig,
  dbOptions: PostgresStoreOptions = {},
): Runtime {
  const store = config.databaseUrl
    ? new PostgresWishlistStore(config.databaseUrl, dbOptions)
    : new MemoryWishlistStore()
  const storage: StorageKind =
    store instanceof PostgresWishlistStore ? 'postgres' : 'memory'
  return {
    app: createApp(config, store, storage),
    store,
    storage,
    close: async () => {
      if (store instanceof PostgresWishlistStore) await store.close()
    },
  }
}
