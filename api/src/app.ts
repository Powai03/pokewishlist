// L'application Hono : les routes, SANS démarrer de serveur.
// Séparée de index.ts pour pouvoir la tester avec `app.request()` (aucun port réseau ouvert).
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { languageDetector } from 'hono/language'
import { DEFAULT_CORS_ORIGINS, type AppConfig, type AppEnv } from './config.js'
import { DEFAULT_LANGUAGE, LANGUAGES } from './i18n.js'
import { fail, wishlistRoutes } from './routes/wishlist.js'
import { MemoryWishlistStore, type WishlistStore } from './wishlist-store.js'

export type StorageKind = 'memory' | 'postgres'

/** Réponse de GET /health. */
export interface HealthResponse {
  status: 'ok'
  version: string
  /** Commit git déployé (« local » hors déploiement) : permet de vérifier qu'une mise en ligne a bien eu lieu. */
  commit: string
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
    Partial<Pick<AppConfig, 'corsOrigins' | 'commit'>>,
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
      allowHeaders: ['Content-Type', 'Accept-Language'],
    }),
  )

  // Langue de la réponse, choisie pour CHAQUE requête : ?lang=fr, sinon l'en-tête Accept-Language
  // (envoyé par le front et par tout navigateur), sinon l'anglais. Aucun cookie n'est posé (`caches: false`) :
  // l'API reste sans état, la langue ne dépend que de la requête.
  app.use(
    '*',
    languageDetector({
      supportedLanguages: [...LANGUAGES],
      fallbackLanguage: DEFAULT_LANGUAGE,
      order: ['querystring', 'header'],
      lookupQueryString: 'lang',
      caches: false,
      // « fr-FR », « ja-JP »… → « fr », « ja » (seule la langue compte, pas le pays).
      convertDetectedLanguage: (lang) => lang.split('-')[0] ?? lang,
    }),
  )
  // Indique la langue choisie (Content-Language) et prévient les caches que la réponse
  // dépend de l'en-tête Accept-Language (Vary) : ils ne doivent pas servir du français à un Japonais.
  app.use('*', async (c, next) => {
    await next()
    c.header('Content-Language', c.get('language'))
    c.header('Vary', 'Accept-Language', { append: true })
  })

  // Contrôle de santé : utilisé par la CI, un hébergeur ou un outil de supervision
  // pour savoir si l'API répond, et QUELLE version tourne dans QUEL environnement.
  app.get('/health', (c) => {
    const body: HealthResponse = {
      status: 'ok',
      version: config.version,
      commit: config.commit ?? 'local',
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
    return fail(c, 500, 'internal')
  })

  // Toute autre route : 404 en JSON (plutôt qu'une page texte).
  app.notFound((c) => fail(c, 404, 'routeNotFound', { path: c.req.path }))

  return app
}
