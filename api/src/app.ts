// L'application Hono : les routes, SANS démarrer de serveur.
// Séparée de index.ts pour pouvoir la tester avec `app.request()` (aucun port réseau ouvert).
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { DEFAULT_CORS_ORIGINS, type AppConfig, type AppEnv } from './config.js'
import { wishlistRoutes } from './routes/wishlist.js'
import { MemoryWishlistStore, type WishlistStore } from './wishlist-store.js'

export type StorageKind = 'memory' | 'postgres'

/** Réponse de GET /health. */
export interface HealthResponse {
  status: 'ok'
  version: string
  env: AppEnv
  /** Où la wishlist est rangée : « postgres » (Supabase) ou « memory » (tableau, perdu au redémarrage). */
  storage: StorageKind
  /** Secondes écoulées depuis le démarrage de l'API. */
  uptime: number
  /** Date et heure de la réponse (ISO 8601). */
  timestamp: string
}

/**
 * Crée l'application. Le stockage est passé en paramètre (injection de dépendance) :
 * chaque test peut ainsi partir d'une wishlist vide, sans influencer les autres.
 */
export function createApp(
  config: Pick<AppConfig, 'version' | 'env'> &
    Partial<Pick<AppConfig, 'corsOrigins'>>,
  store: WishlistStore = new MemoryWishlistStore(),
  storage: StorageKind = 'memory',
): Hono {
  const app = new Hono()
  const startedAt = Date.now()

  // CORS : le front (ex. http://localhost:3001) et l'API (http://localhost:3002) sont deux « origines »
  // différentes ; sans cette autorisation explicite, le navigateur bloque les appels du front.
  // Seules les origines listées sont autorisées (pas « * »).
  app.use(
    '*',
    cors({
      origin: config.corsOrigins ?? DEFAULT_CORS_ORIGINS,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowHeaders: ['Content-Type'],
    }),
  )

  // Contrôle de santé : utilisé par la CI, un hébergeur ou un outil de supervision
  // pour savoir si l'API répond, et QUELLE version tourne dans QUEL environnement.
  app.get('/health', (c) => {
    const body: HealthResponse = {
      status: 'ok',
      version: config.version,
      env: config.env,
      storage,
      uptime: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    }
    return c.json(body)
  })

  app.route('/wishlist', wishlistRoutes(store))

  // Erreur imprévue (ex. base injoignable) : 500 en JSON, sans détail technique pour le client.
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Erreur interne du serveur' }, 500)
  })

  // Toute autre route : 404 en JSON (plutôt qu'une page texte).
  app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404))

  return app
}
