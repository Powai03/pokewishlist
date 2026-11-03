// Base de données de TEST, isolée de Supabase : les tests y écrivent et l'effacent librement.
//
//   · TEST_DATABASE_URL définie (CI) → un vrai serveur PostgreSQL 17 (conteneur « service » de GitHub Actions) ;
//   · sinon (poste du développeur)   → PGlite : le vrai moteur PostgreSQL compilé en WebAssembly,
//     lancé en mémoire dans le processus des tests et joignable par le réseau comme un serveur normal.
//
// Dans les deux cas, le schéma est créé avec le MÊME fichier que la production : supabase/init.sql.
import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import postgres from 'postgres'

const INIT_SQL = new URL('../../../supabase/init.sql', import.meta.url)

export interface TestDatabase {
  /** Chaîne de connexion à donner au stockage testé. */
  url: string
  /** D'où vient la base (affiché dans le nom des tests). */
  kind: 'PostgreSQL (TEST_DATABASE_URL)' | 'PGlite (PostgreSQL en mémoire)'
  /** Connexion « d'inspection » : lire la table directement, sans passer par le code testé. */
  sql: postgres.Sql
  /** Vide la table (avant chaque test). */
  clean: () => Promise<void>
  /** Vide la table, ferme les connexions et arrête PGlite. */
  stop: () => Promise<void>
}

/** Garde-fou : ces tests VIDENT la table ; on refuse toute base qui n'est pas locale. */
export function assertLocalDatabase(url: string): void {
  const { hostname } = new URL(url)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) {
    throw new Error(
      `TEST_DATABASE_URL doit désigner une base locale (reçu : ${hostname}) : ` +
        'les tests effacent la table wishlist, jamais sur Supabase.',
    )
  }
}

/** Un port TCP libre, choisi par le système. */
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
    url = `postgresql://postgres@127.0.0.1:${port}/postgres` // PGlite : pas de mot de passe
    kind = 'PGlite (PostgreSQL en mémoire)'
    stopEngine = async () => {
      await server.stop()
      await db.close()
    }
  }

  const sql = postgres(url, { max: 1, ssl: false, onnotice: () => {} })
  // Le schéma de production, appliqué tel quel (requête « simple » : plusieurs instructions d'un coup).
  await sql.unsafe(readFileSync(INIT_SQL, 'utf8')).simple()

  const clean = async (): Promise<void> => {
    await sql`truncate table public.wishlist`
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
