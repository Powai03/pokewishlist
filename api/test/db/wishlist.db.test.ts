// Tests d'INTÉGRATION : le vrai stockage PostgreSQL sur une vraie base (aucun mock SQL).
// Chaque test part d'une table vide (`clean` avant chaque test) et la base est vidée à la fin.
// On vérifie à la fois ce que renvoie l'API ET ce qui est réellement écrit dans la table.
import type { Hono } from 'hono'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { PostgresWishlistStore } from '../../src/postgres-store.js'
import type { WishlistInput, WishlistItem } from '../../src/wishlist-store.js'
import {
  assertLocalDatabase,
  startTestDatabase,
  type TestDatabase,
} from './test-database.js'

/** true en CI (TEST_DATABASE_URL → serveur PostgreSQL 17) ; false en local (PGlite). */
const REAL_SERVER = Boolean(process.env.TEST_DATABASE_URL?.trim())

let db: TestDatabase
let store: PostgresWishlistStore
let app: Hono

beforeAll(async () => {
  db = await startTestDatabase()
  store = new PostgresWishlistStore(db.url, { ssl: false })
  app = createApp({ version: '0.0.0-test', env: 'test' }, store, 'postgres')
}, 60_000)

beforeEach(async () => {
  await db.clean()
})

afterAll(async () => {
  await store?.close()
  await db?.stop()
})

/** Pokémon de 5e génération utilisés dans les tests. */
const pokemon = (id: number, types: string[] = ['grass']): WishlistInput => ({
  id,
  name: `pokemon-${id}`,
  frName: `Pokémon ${id}`,
  sprite: `https://img/${id}.gif`,
  icon: null,
  types,
})
const SIX = [495, 498, 501, 570, 610, 633]

/** Ce qui est VRAIMENT dans la table, lu sans passer par le code testé. */
async function rowsInDb(): Promise<{ id: number; captured: boolean }[]> {
  return db.sql<{ id: number; captured: boolean }[]>`
    select id, captured from public.wishlist order by id`
}

const post = async (body: unknown): Promise<Response> =>
  app.request('/wishlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('base de test isolée', () => {
  it('démarre vide, avec le schéma de supabase/init.sql', async () => {
    expect(await rowsInDb()).toEqual([])
    const [trigger] = await db.sql<{ tgname: string }[]>`
      select tgname from pg_trigger where tgname = 'wishlist_max_6'`
    expect(trigger?.tgname).toBe('wishlist_max_6')
  })

  it('refuse une base distante (les tests effacent la table)', () => {
    expect(() =>
      assertLocalDatabase(
        'postgresql://u:p@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
      ),
    ).toThrow(/locale/)
    expect(() =>
      assertLocalDatabase('postgresql://u:p@127.0.0.1:5432/x'),
    ).not.toThrow()
  })
})

describe('CRUD (stockage PostgreSQL)', () => {
  it('Create : add enregistre la ligne et renvoie le Pokémon complet', async () => {
    const result = await store.add(pokemon(495))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.item).toMatchObject({
      id: 495,
      frName: 'Pokémon 495',
      sprite: 'https://img/495.gif',
      icon: null,
      types: ['grass'],
      captured: false,
    })
    expect(new Date(result.item.addedAt).toISOString()).toBe(
      result.item.addedAt,
    )
    expect(await rowsInDb()).toEqual([{ id: 495, captured: false }])
  })

  it('Read : list renvoie les lignes triées par numéro', async () => {
    await store.add(pokemon(570))
    await store.add(pokemon(495))
    expect((await store.list()).map((p) => p.id)).toEqual([495, 570])
  })

  it('Update : setCaptured modifie la ligne ; Pokémon absent → undefined', async () => {
    await store.add(pokemon(495))

    expect((await store.setCaptured(495, true))?.captured).toBe(true)
    expect(await rowsInDb()).toEqual([{ id: 495, captured: true }])
    expect(await store.setCaptured(644, true)).toBeUndefined()
  })

  it('Delete : remove supprime la ligne ; Pokémon absent → undefined', async () => {
    await store.add(pokemon(495))

    expect((await store.remove(495))?.id).toBe(495)
    expect(await rowsInDb()).toEqual([])
    expect(await store.remove(495)).toBeUndefined()
  })

  it('les données survivent à un « redémarrage » (nouvelle connexion)', async () => {
    await store.add(pokemon(495))
    const restarted = new PostgresWishlistStore(db.url, { ssl: false, max: 1 })
    try {
      expect((await restarted.list()).map((p) => p.id)).toEqual([495])
    } finally {
      await restarted.close()
    }
  })
})

describe('CRUD par HTTP (routes Hono + PostgreSQL)', () => {
  it('POST 201 → GET 200 → PATCH 200 → DELETE 200 → GET vide', async () => {
    const created = await post(pokemon(495))
    expect(created.status).toBe(201)
    expect(created.headers.get('Location')).toBe('/wishlist/495')

    const list = await app.request('/wishlist')
    expect(list.status).toBe(200)
    expect(((await list.json()) as WishlistItem[]).map((p) => p.id)).toEqual([
      495,
    ])

    const patched = await app.request('/wishlist/495', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ captured: true }),
    })
    expect(patched.status).toBe(200)
    expect(await rowsInDb()).toEqual([{ id: 495, captured: true }])

    const deleted = await app.request('/wishlist/495', { method: 'DELETE' })
    expect(deleted.status).toBe(200)
    expect(await (await app.request('/wishlist')).json()).toEqual([])
  })

  it('PATCH et DELETE sur un Pokémon absent → 404', async () => {
    const patched = await app.request('/wishlist/495', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ captured: true }),
    })
    expect(patched.status).toBe(404)
    expect(
      (await app.request('/wishlist/495', { method: 'DELETE' })).status,
    ).toBe(404)
  })

  it('donnée refusée par une contrainte de la base (type inconnu) → 400, rien écrit', async () => {
    const res = await post(pokemon(498, ['plante']))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'Donnée refusée par la base (wishlist_types_known)',
    })
    expect(await rowsInDb()).toEqual([])
  })
})

describe('doublons', () => {
  it('add du même Pokémon → « duplicate », une seule ligne en base', async () => {
    await store.add(pokemon(495))
    expect(await store.add(pokemon(495))).toEqual({
      ok: false,
      reason: 'duplicate',
    })
    expect(await rowsInDb()).toHaveLength(1)
  })

  it('POST du même Pokémon → 409 avec un message clair', async () => {
    expect((await post(pokemon(495))).status).toBe(201)
    const res = await post(pokemon(495))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: 'Le Pokémon #495 est déjà dans la wishlist',
    })
  })
})

describe('limite de 6', () => {
  it('6 ajouts passent, le 7e est refusé (« full »), la table garde 6 lignes', async () => {
    for (const id of SIX) {
      expect((await store.add(pokemon(id))).ok).toBe(true)
    }
    expect(await store.add(pokemon(644))).toEqual({ ok: false, reason: 'full' })
    expect((await rowsInDb()).map((r) => r.id)).toEqual(SIX)
  })

  it('POST du 7e → 409 « liste pleine »', async () => {
    for (const id of SIX) expect((await post(pokemon(id))).status).toBe(201)
    const res = await post(pokemon(644))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: 'La wishlist est pleine (6 Pokémon maximum)',
    })
  })

  it('après une suppression, on peut de nouveau ajouter', async () => {
    for (const id of SIX) await store.add(pokemon(id))
    await store.remove(495)
    expect((await store.add(pokemon(644))).ok).toBe(true)
    expect(await rowsInDb()).toHaveLength(6)
  })

  // Uniquement sur un vrai serveur PostgreSQL (CI) : PGlite n'a qu'un moteur pour toutes les connexions
  // et mélange les requêtes envoyées en même temps ; ce test n'y aurait aucun sens.
  it.runIf(REAL_SERVER)(
    '10 ajouts SIMULTANÉS : exactement 6 acceptés (verrou du déclencheur) [vrai PostgreSQL]',
    async () => {
      const ids = [495, 498, 501, 570, 610, 633, 644, 643, 494, 649]
      const results = await Promise.all(ids.map((id) => store.add(pokemon(id))))

      expect(results.filter((r) => r.ok)).toHaveLength(6)
      expect(results.filter((r) => !r.ok && r.reason === 'full')).toHaveLength(
        4,
      )
      expect(await rowsInDb()).toHaveLength(6)
    },
  )
})
