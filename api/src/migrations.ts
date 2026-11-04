import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import type postgres from 'postgres'

export const MIGRATIONS_DIR = new URL(
  '../../supabase/migrations/',
  import.meta.url,
)

const FILE_PATTERN = /^(\d{3})_([a-z0-9_]+)\.sql$/

const LOCK_ID = 7_274_001

export interface Migration {
  version: string
  name: string
  file: string
  sql: string
  checksum: string
}

export interface MigrationOptions {
  dir?: URL | string
  table?: string
  log?: (line: string) => void
}

export interface MigrationReport {
  applied: string[]
  skipped: string[]
}

export function readMigrations(
  dir: URL | string = MIGRATIONS_DIR,
): Migration[] {
  const base = typeof dir === 'string' ? dir : dir.pathname
  const files = readdirSync(dir)
    .filter((f) => FILE_PATTERN.test(f))
    .sort()
  const migrations = files.map((file): Migration => {
    const [, version = '', name = ''] = FILE_PATTERN.exec(file) ?? []
    const sql = readFileSync(new URL(file, pathToDirUrl(base)), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    return { version, name, file, sql, checksum }
  })
  const versions = migrations.map((m) => m.version)
  const duplicate = versions.find((v, i) => versions.indexOf(v) !== i)
  if (duplicate)
    throw new Error(`Deux migrations portent le numéro ${duplicate}`)
  return migrations
}

function pathToDirUrl(path: string): URL {
  const withSlash = path.endsWith('/') ? path : `${path}/`
  return new URL(`file://${withSlash}`)
}

export async function runMigrations(
  sql: postgres.Sql,
  options: MigrationOptions = {},
): Promise<MigrationReport> {
  const table = options.table ?? 'schema_migrations'
  if (!/^[a-z_][a-z0-9_]*$/.test(table)) {
    throw new Error(`Nom de table invalide : ${table}`)
  }
  const log = options.log ?? (() => {})
  const migrations = readMigrations(options.dir)

  await sql.unsafe(`
    create table if not exists public.${table} (
      version    text primary key,
      name       text not null,
      checksum   text not null,
      applied_at timestamptz not null default now()
    )`)

  const report: MigrationReport = { applied: [], skipped: [] }
  for (const [i, m] of migrations.entries()) {
    const step = `[${i + 1}/${migrations.length}] ${m.file}`
    const started = Date.now()
    const status = await sql.begin(async (tx) => {
      await tx.unsafe('select pg_advisory_xact_lock($1)', [LOCK_ID])
      const [done] = await tx.unsafe<{ checksum: string }[]>(
        `select checksum from public.${table} where version = $1`,
        [m.version],
      )
      if (done) {
        if (done.checksum !== m.checksum) {
          throw new Error(
            `${m.file} a été modifiée après avoir été appliquée : écrire une nouvelle migration plutôt.`,
          )
        }
        return 'skipped' as const
      }
      await tx.unsafe(m.sql).simple()
      await tx.unsafe(
        `insert into public.${table} (version, name, checksum) values ($1, $2, $3)`,
        [m.version, m.name, m.checksum],
      )
      return 'applied' as const
    })
    report[status].push(m.version)
    log(
      status === 'applied'
        ? `${step} : appliquée (${Date.now() - started} ms)`
        : `${step} : déjà appliquée, ignorée`,
    )
  }
  log(
    `${report.applied.length} migration(s) appliquée(s), ${report.skipped.length} déjà en place.`,
  )
  return report
}
