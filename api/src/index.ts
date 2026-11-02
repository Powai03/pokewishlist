// Point d'entrée : lit la configuration et démarre le serveur HTTP Node.js.
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = createApp(config)

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.info(
    `API PokéWishlist v${config.version} (${config.env}) : http://localhost:${info.port}/health`,
  )
})
