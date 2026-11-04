import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { languageDetector } from 'hono/language'
import { DEFAULT_CORS_ORIGINS, type AppConfig, type AppEnv } from './config.js'
import { DEFAULT_LANGUAGE, LANGUAGES } from './i18n.js'
import { likesRoutes } from './routes/likes.js'
import { fail, wishlistRoutes } from './routes/wishlist.js'
import { MemoryWishlistStore, type WishlistStore } from './wishlist-store.js'

export type StorageKind = 'memory' | 'postgres'

export interface HealthResponse {
  status: 'ok'
  version: string
  commit: string
  env: AppEnv
  storage: StorageKind
  uptime: number
  timestamp: string
}

export function createApp(
  config: Pick<AppConfig, 'version' | 'env'> &
    Partial<Pick<AppConfig, 'corsOrigins' | 'commit'>>,
  store: WishlistStore = new MemoryWishlistStore(),
  storage: StorageKind = 'memory',
): Hono {
  const app = new Hono()
  const startedAt = Date.now()

  app.use(
    '*',
    cors({
      origin: config.corsOrigins ?? DEFAULT_CORS_ORIGINS,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowHeaders: ['Content-Type', 'Accept-Language'],
    }),
  )

  app.use(
    '*',
    languageDetector({
      supportedLanguages: [...LANGUAGES],
      fallbackLanguage: DEFAULT_LANGUAGE,
      order: ['querystring', 'header'],
      lookupQueryString: 'lang',
      caches: false,
      convertDetectedLanguage: (lang) => lang.split('-')[0] ?? lang,
    }),
  )
  app.use('*', async (c, next) => {
    await next()
    c.header('Content-Language', c.get('language'))
    c.header('Vary', 'Accept-Language', { append: true })
  })

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
  app.route('/pokemon', likesRoutes(store))

  app.onError((err, c) => {
    console.error(err)
    return fail(c, 500, 'internal')
  })

  app.notFound((c) => fail(c, 404, 'routeNotFound', { path: c.req.path }))

  return app
}
