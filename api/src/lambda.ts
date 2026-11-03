import { handle } from 'hono/aws-lambda'
import { loadConfig } from './config.js'
import { createRuntime } from './runtime.js'

const { app } = createRuntime(loadConfig(), {
  max: 1,
  idleTimeout: 20,
  maxLifetime: 5 * 60,
})

export const handler = handle(app)
