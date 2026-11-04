import postgres from 'postgres'
import { runMigrations } from './migrations.js'

const url = process.env.DATABASE_URL?.trim()
if (!url) {
  console.error('DATABASE_URL absente (api/.env) : aucune base à migrer.')
  process.exit(1)
}
const { hostname } = new URL(url)
const local = ['localhost', '127.0.0.1', '::1'].includes(hostname)
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
