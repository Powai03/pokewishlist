// Runner de migrations SQL « maison » : fait évoluer le schéma de la base, étape par étape, une seule fois.
//
//   supabase/init.sql               → schéma de départ (table wishlist), appliqué à la création du projet
//   supabase/migrations/001_*.sql   → évolutions, appliquées dans l'ordre des numéros
//   table public.schema_migrations  → journal : quelles migrations ont déjà été appliquées, quand, avec quel contenu
//
// Garanties :
//   · UNE fois : une migration notée dans schema_migrations n'est jamais rejouée ;
//   · tout ou rien : chaque migration et sa ligne du journal sont dans la MÊME transaction
//     (si le SQL échoue, rien n'est appliqué ni noté) ;
//   · pas de course : un verrou PostgreSQL (advisory lock) empêche deux runners de migrer en même temps ;
//   · pas de triche : l'empreinte SHA-256 de chaque fichier est notée ; modifier une migration déjà
//     appliquée est refusé (il faut en écrire une nouvelle).
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import type postgres from 'postgres'

/** Dossier des migrations du projet. */
export const MIGRATIONS_DIR = new URL(
  '../../supabase/migrations/',
  import.meta.url,
)

/** Nom de fichier attendu : 3 chiffres, un tiret bas, un nom (« 001_likes.sql »). */
const FILE_PATTERN = /^(\d{3})_([a-z0-9_]+)\.sql$/

/** Identifiant arbitraire du verrou PostgreSQL réservé aux migrations. */
const LOCK_ID = 7_274_001

export interface Migration {
  /** « 001 » */
  version: string
  /** « likes » */
  name: string
  /** « 001_likes.sql » */
  file: string
  sql: string
  /** Empreinte SHA-256 du fichier : détecte une migration modifiée après coup. */
  checksum: string
}

export interface MigrationOptions {
  /** Dossier des fichiers .sql (défaut : supabase/migrations). */
  dir?: URL | string
  /** Table du journal (défaut : schema_migrations ; les tests en utilisent une à eux). */
  table?: string
  /** Affichage de la progression (défaut : rien). */
  log?: (line: string) => void
}

export interface MigrationReport {
  /** Versions appliquées pendant CET appel. */
  applied: string[]
  /** Versions déjà appliquées auparavant (ignorées). */
  skipped: string[]
}

/** Les migrations du dossier, triées par numéro ; refuse deux fichiers avec le même numéro. */
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

/** « /chemin/dossier » → URL de dossier (avec « / » final) pour résoudre les noms de fichiers. */
function pathToDirUrl(path: string): URL {
  const withSlash = path.endsWith('/') ? path : `${path}/`
  return new URL(`file://${withSlash}`)
}

/** Applique, dans l'ordre, les migrations pas encore notées dans le journal. */
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
      // Verrou pour toute la transaction : un 2e runner attend ici, puis voit la migration déjà notée.
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
      await tx.unsafe(m.sql).simple() // plusieurs instructions SQL d'un coup
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
