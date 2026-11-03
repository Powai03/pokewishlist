// Runner de migrations sur une VRAIE base PostgreSQL (PGlite en local, PostgreSQL 17 en CI).
// Chaque test a SON journal et SES fichiers de migration (dossier temporaire) : isolé des autres tests.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readMigrations, runMigrations } from '../../src/migrations.js'
import { PostgresWishlistStore } from '../../src/postgres-store.js'
import { startTestDatabase, type TestDatabase } from './test-database.js'

let db: TestDatabase
beforeAll(async () => {
  db = await startTestDatabase()
})
afterAll(async () => {
  await db.stop()
})

let n = 0
/** Un dossier de migrations temporaire + une table de journal et une table de données uniques. */
function sandbox(): {
  dir: string
  table: string
  data: string
  cleanup: () => void
} {
  n++
  const suffix = `${process.pid}_${n}`
  const dir = mkdtempSync(join(tmpdir(), 'migrations-'))
  return {
    dir,
    table: `test_migrations_${suffix}`,
    data: `test_notes_${suffix}`,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}

describe('runner de migrations', () => {
  it('applique chaque migration UNE fois : le 2e passage ne rejoue rien', async () => {
    const s = sandbox()
    writeFileSync(
      join(s.dir, '001_notes.sql'),
      `create table public.${s.data} (txt text);`,
    )
    const first = await runMigrations(db.sql, { dir: s.dir, table: s.table })
    const second = await runMigrations(db.sql, { dir: s.dir, table: s.table })
    expect(first).toEqual({ applied: ['001'], skipped: [] })
    expect(second).toEqual({ applied: [], skipped: ['001'] }) // sinon « create table » échouerait
    const rows = await db.sql.unsafe(
      `select version, name from public.${s.table}`,
    )
    expect(rows).toEqual([{ version: '001', name: 'notes' }])
    s.cleanup()
  })

  it('préserve les données : une nouvelle migration ne touche pas aux lignes existantes', async () => {
    const s = sandbox()
    writeFileSync(
      join(s.dir, '001_notes.sql'),
      `create table public.${s.data} (txt text);`,
    )
    await runMigrations(db.sql, { dir: s.dir, table: s.table })
    await db.sql.unsafe(`insert into public.${s.data} values ('gardée')`)
    writeFileSync(
      join(s.dir, '002_notes_date.sql'),
      `alter table public.${s.data} add column at date;`,
    )
    const report = await runMigrations(db.sql, { dir: s.dir, table: s.table })
    expect(report).toEqual({ applied: ['002'], skipped: ['001'] })
    expect(await db.sql.unsafe(`select txt from public.${s.data}`)).toEqual([
      { txt: 'gardée' },
    ])
    s.cleanup()
  })

  it('tout ou rien : une migration en erreur n’est ni appliquée ni notée', async () => {
    const s = sandbox()
    writeFileSync(
      join(s.dir, '001_casse.sql'),
      `create table public.${s.data} (txt text); select * from table_inexistante;`,
    )
    await expect(
      runMigrations(db.sql, { dir: s.dir, table: s.table }),
    ).rejects.toThrow()
    const [row] = await db.sql.unsafe<{ exists: boolean }[]>(
      `select to_regclass('public.${s.data}') is not null as exists`,
    )
    expect(row?.exists).toBe(false) // la table créée avant l'erreur a été annulée
    expect(await db.sql.unsafe(`select * from public.${s.table}`)).toEqual([])
    s.cleanup()
  })

  it('refuse une migration modifiée après avoir été appliquée (empreinte SHA-256)', async () => {
    const s = sandbox()
    const file = join(s.dir, '001_notes.sql')
    writeFileSync(file, `create table public.${s.data} (txt text);`)
    await runMigrations(db.sql, { dir: s.dir, table: s.table })
    writeFileSync(file, `create table public.${s.data} (txt text, autre int);`)
    await expect(
      runMigrations(db.sql, { dir: s.dir, table: s.table }),
    ).rejects.toThrow(/modifiée/)
    s.cleanup()
  })

  it('supabase/migrations : 001_likes appliquée sur la base de test, notée dans schema_migrations', async () => {
    expect(readMigrations().map((m) => m.file)).toContain('001_likes.sql')
    const rows =
      await db.sql`select version, name from public.schema_migrations`
    expect(rows).toContainEqual({ version: '001', name: 'likes' })
  })
})

describe('likes (table pokemon_likes)', () => {
  it('like → total qui augmente, conservé après une nouvelle exécution des migrations', async () => {
    // Pas de db.clean() : en CI, la base est partagée avec les autres fichiers de test.
    // On travaille donc en relatif, sur un Pokémon que les autres tests n'utilisent pas.
    const store = new PostgresWishlistStore(db.url, { ssl: false, max: 1 })
    const before = await store.likes(649)
    expect(await store.like(649)).toBe(before + 1)
    expect(await store.like(649)).toBe(before + 2)
    expect(await runMigrations(db.sql)).toMatchObject({ applied: [] }) // rien à refaire…
    expect(await store.likes(649)).toBe(before + 2) // … et les likes sont toujours là
    await store.close()
  })
})
