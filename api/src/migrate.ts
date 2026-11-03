// Ligne de commande : applique les migrations sur la base de DATABASE_URL (api/.env).
//
//   npm run migrate        (depuis api/)
//
// Sans risque à relancer : ce qui est déjà appliqué est ignoré (voir migrations.ts).
import postgres from 'postgres'
import { runMigrations } from './migrations.js'

const url = process.env.DATABASE_URL?.trim()
if (!url) {
  console.error('DATABASE_URL absente (api/.env) : aucune base à migrer.')
  process.exit(1)
}
const { hostname } = new URL(url)
const local = ['localhost', '127.0.0.1', '::1'].includes(hostname)
// Seul l'hôte est affiché : jamais le mot de passe contenu dans l'adresse.
console.info(`Migrations sur ${hostname}`)

const sql = postgres(url, {
  max: 1,
  ssl: local ? false : 'require',
  prepare: false,
  onnotice: () => {},
})
try {
  await runMigrations(sql, { log: (line) => console.info(line) })
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await sql.end()
}
