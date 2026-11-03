import { beforeEach, describe, expect, it } from 'vitest'
import type { Hono } from 'hono'
import { createApp } from '../src/app.js'
import type { ErrorResponse } from '../src/routes/wishlist.js'
import { WISHLIST_MAX, type WishlistItem } from '../src/wishlist-store.js'

// ── Outils ────────────────────────────────────────────────────────────────────
let app: Hono

// Une application NEUVE avant chaque test : wishlist vide, aucun test n'influence le suivant.
beforeEach(() => {
  app = createApp({ version: '0.0.0-test', env: 'test' })
})

const vipelierre = { id: 495, name: 'Vipélierre' }
const gruikui = { id: 498, name: 'Gruikui' }

/** Envoie POST /wishlist avec un corps JSON (ou un texte brut, pour tester le JSON invalide). */
function post(body: unknown, raw?: string): Promise<Response> | Response {
  return app.request('/wishlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  })
}

function del(id: string | number): Promise<Response> | Response {
  return app.request(`/wishlist/${id}`, { method: 'DELETE' })
}

async function list(): Promise<WishlistItem[]> {
  return (await (await app.request('/wishlist')).json()) as WishlistItem[]
}

// ── GET /wishlist ─────────────────────────────────────────────────────────────
describe('GET /wishlist', () => {
  it('200 + liste vide au départ', async () => {
    const res = await app.request('/wishlist')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('200 + les Pokémon ajoutés, triés par numéro', async () => {
    await post(gruikui)
    await post(vipelierre)

    const res = await app.request('/wishlist')

    expect(res.status).toBe(200)
    const items = (await res.json()) as WishlistItem[]
    expect(items.map((p) => p.id)).toEqual([495, 498])
  })
})

// ── POST /wishlist ────────────────────────────────────────────────────────────
describe('POST /wishlist', () => {
  it('201 + le Pokémon créé, non capturé, avec sa date d’ajout', async () => {
    const res = await post(vipelierre)

    expect(res.status).toBe(201)
    const item = (await res.json()) as WishlistItem
    expect(item).toMatchObject({ id: 495, name: 'Vipélierre', captured: false })
    expect(new Date(item.addedAt).toISOString()).toBe(item.addedAt)
  })

  it('201 + en-tête Location vers la ressource créée', async () => {
    const res = await post(vipelierre)
    expect(res.headers.get('Location')).toBe('/wishlist/495')
  })

  it('le Pokémon ajouté apparaît ensuite dans GET /wishlist', async () => {
    await post(vipelierre)
    expect(await list()).toHaveLength(1)
  })

  it('nettoie les espaces autour du nom', async () => {
    const res = await post({ id: 495, name: '  Vipélierre  ' })
    expect(((await res.json()) as WishlistItem).name).toBe('Vipélierre')
  })

  describe('400 : requête invalide', () => {
    it.each([
      ['pas d’objet', [495]],
      ['id manquant', { name: 'Vipélierre' }],
      ['id en texte', { id: '495', name: 'Vipélierre' }],
      ['id décimal', { id: 495.5, name: 'Vipélierre' }],
      ['hors 5e génération', { id: 25, name: 'Pikachu' }],
      ['nom manquant', { id: 495 }],
      ['nom vide', { id: 495, name: '   ' }],
      ['nom trop long', { id: 495, name: 'x'.repeat(51) }],
    ])('%s → 400', async (_label, body) => {
      const res = await post(body)
      expect(res.status).toBe(400)
      expect(((await res.json()) as ErrorResponse).error).toBeTypeOf('string')
      expect(await list()).toEqual([]) // rien n'a été ajouté
    })

    it('JSON invalide → 400 (pas de plantage 500)', async () => {
      const res = await post(undefined, '{pas du json')
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({
        error: 'Invalid JSON body',
        code: 'invalidJson',
      })
    })
  })

  describe('409 : conflit avec l’état de la wishlist', () => {
    it('doublon → 409, la liste ne change pas', async () => {
      await post(vipelierre)
      const res = await post(vipelierre)

      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({
        error: 'Pokémon #495 is already in the wishlist',
        code: 'duplicate',
      })
      expect(await list()).toHaveLength(1)
    })

    it(`liste pleine (${WISHLIST_MAX}) → 409 pour le 7e`, async () => {
      for (const id of [495, 498, 501, 570, 610, 633]) {
        expect((await post({ id, name: `#${id}` })).status).toBe(201)
      }
      const res = await post({ id: 644, name: 'Zekrom' })

      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({
        error: 'The wishlist is full (6 Pokémon maximum)',
        code: 'full',
      })
      expect(await list()).toHaveLength(WISHLIST_MAX)
    })
  })
})

// ── DELETE /wishlist/:id ──────────────────────────────────────────────────────
describe('DELETE /wishlist/:id', () => {
  it('200 + le Pokémon retiré', async () => {
    await post(vipelierre)
    const res = await del(495)

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      deleted: { id: 495, name: 'Vipélierre' },
    })
  })

  it('le Pokémon retiré disparaît de GET /wishlist, les autres restent', async () => {
    await post(vipelierre)
    await post(gruikui)
    await del(495)

    expect((await list()).map((p) => p.id)).toEqual([498])
  })

  it('404 si le Pokémon n’est pas dans la wishlist', async () => {
    const res = await del(495)
    expect(res.status).toBe(404)
    expect(((await res.json()) as ErrorResponse).code).toBe('notInList')
  })

  it('404 la deuxième fois (déjà retiré)', async () => {
    await post(vipelierre)
    expect((await del(495)).status).toBe(200)
    expect((await del(495)).status).toBe(404)
  })

  it('400 si l’id n’est pas un nombre', async () => {
    expect((await del('abc')).status).toBe(400)
  })

  it('libère une place : on peut de nouveau ajouter après un retrait', async () => {
    for (const id of [495, 498, 501, 570, 610, 633])
      await post({ id, name: `#${id}` })
    await del(495)
    expect((await post({ id: 644, name: 'Zekrom' })).status).toBe(201)
  })
})

// ── Routes inconnues et isolation ─────────────────────────────────────────────
describe('autres cas', () => {
  it('route inconnue → 404', async () => {
    expect((await app.request('/wishlists')).status).toBe(404)
  })

  it('DELETE /wishlist sans id → 404', async () => {
    expect((await app.request('/wishlist', { method: 'DELETE' })).status).toBe(
      404,
    )
  })

  it('chaque application a sa propre wishlist (stockage en mémoire, non partagé)', async () => {
    await post(vipelierre)
    const autre = createApp({ version: '0.0.0-test', env: 'test' })
    expect(await (await autre.request('/wishlist')).json()).toEqual([])
  })
})

// ── POST : champs complets envoyés par le front ───────────────────────────────
describe('POST /wishlist : données complètes du Pokémon', () => {
  const complet = {
    id: 644,
    name: 'zekrom',
    frName: 'Zekrom',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/644.gif',
    icon: 'https://raw.githubusercontent.com/PokeAPI/sprites/icons/644.png',
    types: ['dragon', 'electric'],
  }

  it('201 + tous les champs sont conservés', async () => {
    const res = await post(complet)
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ ...complet, captured: false })
  })

  it('frName vaut name, sprite/icon null et types [] quand ils sont absents', async () => {
    const res = await post({ id: 495, name: 'snivy' })
    expect(await res.json()).toMatchObject({
      frName: 'snivy',
      sprite: null,
      icon: null,
      types: [],
    })
  })

  it.each([
    ['sprite qui n’est pas une adresse', { sprite: 'javascript:alert(1)' }],
    ['icon qui n’est pas un texte', { icon: 42 }],
    ['types qui n’est pas une liste', { types: 'dragon' }],
    ['plus de 2 types', { types: ['a', 'b', 'c'] }],
    ['frName vide', { frName: '' }],
  ])('%s → 400', async (_label, extra) => {
    expect((await post({ ...complet, ...extra })).status).toBe(400)
  })
})

// ── PATCH /wishlist/:id ───────────────────────────────────────────────────────
describe('PATCH /wishlist/:id', () => {
  function patch(
    id: string | number,
    body: unknown,
  ): Promise<Response> | Response {
    return app.request(`/wishlist/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('200 + marque le Pokémon capturé, visible ensuite dans GET', async () => {
    await post(vipelierre)
    const res = await patch(495, { captured: true })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: 495, captured: true })
    expect((await list())[0]?.captured).toBe(true)
  })

  it('200 + peut le « relâcher » (captured: false)', async () => {
    await post(vipelierre)
    await patch(495, { captured: true })
    expect(await (await patch(495, { captured: false })).json()).toMatchObject({
      captured: false,
    })
  })

  it('404 si le Pokémon n’est pas dans la wishlist', async () => {
    expect((await patch(495, { captured: true })).status).toBe(404)
  })

  it.each([
    ['captured manquant', {}],
    ['captured en texte', { captured: 'oui' }],
  ])('%s → 400', async (_label, body) => {
    await post(vipelierre)
    expect((await patch(495, body)).status).toBe(400)
  })

  it('400 si l’id n’est pas un nombre', async () => {
    expect((await patch('abc', { captured: true })).status).toBe(400)
  })
})

// ── CORS ──────────────────────────────────────────────────────────────────────
describe('CORS', () => {
  const corsApp = createApp({
    version: '0.0.0-test',
    env: 'test',
    corsOrigins: ['http://localhost:3001'],
  })

  it('autorise le front déclaré (en-tête Access-Control-Allow-Origin)', async () => {
    const res = await corsApp.request('/wishlist', {
      headers: { Origin: 'http://localhost:3001' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:3001',
    )
  })

  it('n’autorise pas une autre origine', async () => {
    const res = await corsApp.request('/wishlist', {
      headers: { Origin: 'https://site-pirate.example' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('répond à la requête préalable (preflight) du navigateur pour un POST JSON', async () => {
    const res = await corsApp.request('/wishlist', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3001',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
})
