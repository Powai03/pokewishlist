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

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close()
    void close()
  })
}
