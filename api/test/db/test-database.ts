import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import postgres from 'postgres'
import { runMigrations } from '../../src/migrations.js'

const INIT_SQL = new URL('../../../supabase/init.sql', import.meta.url)

export interface TestDatabase {
  url: string
  kind: 'PostgreSQL (TEST_DATABASE_URL)' | 'PGlite (PostgreSQL en mémoire)'
  sql: postgres.Sql
  clean: () => Promise<void>
  stop: () => Promise<void>
}

export function assertLocalDatabase(url: string): void {
  const { hostname } = new URL(url)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) {
    throw new Error(
      `TEST_DATABASE_URL doit désigner une base locale (reçu : ${hostname}) : ` +
        'les tests effacent la table wishlist, jamais sur Supabase.',
    )
  }
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() =>
        typeof address === 'object' && address
          ? resolve(address.port)
          : reject(new Error('Port introuvable')),
      )
    })
  })
}

export async function startTestDatabase(): Promise<TestDatabase> {
  let url = process.env.TEST_DATABASE_URL?.trim()
  let stopEngine = async (): Promise<void> => {}
  let kind: TestDatabase['kind'] = 'PostgreSQL (TEST_DATABASE_URL)'

  if (url) {
    assertLocalDatabase(url)
  } else {
    const db = await PGlite.create()
    const port = await freePort()
    const server = new PGLiteSocketServer({ db, port, maxConnections: 10 })
    await server.start()
    url = `postgresql://postgres@127.0.0.1:${port}/postgres`
    kind = 'PGlite (PostgreSQL en mémoire)'
    stopEngine = async () => {
      await server.stop()
      await db.close()
    }
  }

  const sql = postgres(url, { max: 1, ssl: false, onnotice: () => {} })
  await sql.unsafe(readFileSync(INIT_SQL, 'utf8')).simple()
  await runMigrations(sql)

  const clean = async (): Promise<void> => {
    await sql`truncate table public.wishlist, public.pokemon_likes`
  }

  return {
    url,
    kind,
    sql,
    clean,
    stop: async () => {
      await clean()
      await sql.end({ timeout: 5 })
      await stopEngine()
    },
  }
}
