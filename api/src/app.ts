// L'application Hono : les routes, SANS démarrer de serveur.
// Séparée de index.ts pour pouvoir la tester avec `app.request()` (aucun port réseau ouvert).
import { Hono } from 'hono'
import type { AppConfig, AppEnv } from './config.js'

/** Réponse de GET /health. */
export interface HealthResponse {
  status: 'ok'
  version: string
  env: AppEnv
  /** Secondes écoulées depuis le démarrage de l'API. */
  uptime: number
  /** Date et heure de la réponse (ISO 8601). */
  timestamp: string
}

export function createApp(config: Pick<AppConfig, 'version' | 'env'>): Hono {
  const app = new Hono()
  const startedAt = Date.now()

  // Contrôle de santé : utilisé par la CI, un hébergeur ou un outil de supervision
  // pour savoir si l'API répond, et QUELLE version tourne dans QUEL environnement.
  app.get('/health', (c) => {
    const body: HealthResponse = {
      status: 'ok',
      version: config.version,
      env: config.env,
      uptime: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    }
    return c.json(body)
  })

  // Toute autre route : 404 en JSON (plutôt qu'une page texte).
  app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404))

  return app
}
