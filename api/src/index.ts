// Point d'entrée « serveur » : lit la configuration et démarre le serveur HTTP Node.js (dev, CI, E2E).
// Sur AWS, c'est lambda.ts qui sert la même application.
import { serve } from '@hono/node-server'
import { loadConfig } from './config.js'
import { createRuntime } from './runtime.js'

const config = loadConfig()
const { app, storage, close } = createRuntime(config)

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.info(
    `API PokéWishlist v${config.version} (${config.env}, stockage : ${storage}) : http://localhost:${info.port}/health`,
  )
})

// Arrêt propre (Ctrl+C, arrêt par l'hébergeur) : on ferme les connexions à la base.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close()
    void close()
  })
}
