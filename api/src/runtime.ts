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
  close: () => Promise<void>
}

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
