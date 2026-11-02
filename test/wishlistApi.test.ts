import { describe, expect, it, vi } from 'vitest'
import type { Pokemon } from '../app/types/pokemon'
import {
  WishlistApiError,
  deleteWishlistItem,
  fetchWishlist,
  parseWishlistItems,
  patchCaptured,
  postWishlistItem,
} from '../app/utils/wishlistApi'

const API = 'http://api.test'

// Une fausse réponse HTTP (classe Response standard).
const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

// Remplace `fetch` par un faux qui renvoie toujours `response`, et enregistre les appels.
function mockFetch(response: () => Response): ReturnType<typeof vi.fn> {
  const fake = vi.fn(async (): Promise<Response> => response())
  vi.stubGlobal('fetch', fake)
  return fake
}

const vipelierre: Pokemon = {
  id: 495,
  name: 'snivy',
  frName: 'Vipélierre',
  sprite: 'https://img/495.gif',
  icon: 'https://img/icons/495.png',
  types: ['grass'],
}
// Ce que l'API renvoie pour Vipélierre (avec captured et addedAt en plus).
const fromApi = {
  ...vipelierre,
  captured: false,
  addedAt: '2026-11-02T10:00:00.000Z',
}

describe('fetchWishlist (GET /wishlist)', () => {
  it('appelle GET /wishlist et renvoie la liste', async () => {
    const fake = mockFetch(() => json(200, [fromApi]))

    const list = await fetchWishlist(API)

    expect(fake).toHaveBeenCalledWith('http://api.test/wishlist', undefined)
    expect(list).toEqual([{ ...vipelierre, captured: false }])
  })

  it('tolère une adresse de base terminée par « / »', async () => {
    const fake = mockFetch(() => json(200, []))
    await fetchWishlist('http://api.test/')
    expect(fake).toHaveBeenCalledWith('http://api.test/wishlist', undefined)
  })

  it('API injoignable → WishlistApiError avec status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )
    await expect(fetchWishlist(API)).rejects.toMatchObject({
      name: 'WishlistApiError',
      status: 0,
    })
  })

  it('erreur 500 → WishlistApiError avec le statut', async () => {
    mockFetch(() => new Response('boom', { status: 500 }))
    await expect(fetchWishlist(API)).rejects.toMatchObject({ status: 500 })
  })
})

describe('postWishlistItem (POST /wishlist)', () => {
  it('envoie le Pokémon en JSON et renvoie l’élément créé (201)', async () => {
    const fake = mockFetch(() => json(201, fromApi))

    const item = await postWishlistItem(API, vipelierre)

    expect(item).toEqual({ ...vipelierre, captured: false })
    const [url, init] = fake.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://api.test/wishlist')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('content-type')).toBe(
      'application/json',
    )
    expect(JSON.parse(init.body as string)).toEqual(vipelierre)
  })

  it('409 (doublon) → WishlistApiError avec le message de l’API', async () => {
    mockFetch(() =>
      json(409, { error: 'Le Pokémon #495 est déjà dans la wishlist' }),
    )
    const promise = postWishlistItem(API, vipelierre)
    await expect(promise).rejects.toBeInstanceOf(WishlistApiError)
    await expect(promise).rejects.toMatchObject({
      status: 409,
      message: 'Le Pokémon #495 est déjà dans la wishlist',
    })
  })

  it('réponse inattendue (pas un Pokémon) → erreur', async () => {
    mockFetch(() => json(201, { bizarre: true }))
    await expect(postWishlistItem(API, vipelierre)).rejects.toBeInstanceOf(
      WishlistApiError,
    )
  })
})

describe('patchCaptured (PATCH /wishlist/:id)', () => {
  it('envoie { captured } et renvoie l’élément modifié', async () => {
    const fake = mockFetch(() => json(200, { ...fromApi, captured: true }))

    const item = await patchCaptured(API, 495, true)

    expect(item.captured).toBe(true)
    const [url, init] = fake.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://api.test/wishlist/495')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ captured: true })
  })
})

describe('deleteWishlistItem (DELETE /wishlist/:id)', () => {
  it('appelle DELETE /wishlist/:id', async () => {
    const fake = mockFetch(() => json(200, { deleted: fromApi }))

    await deleteWishlistItem(API, 495)

    expect(fake).toHaveBeenCalledWith('http://api.test/wishlist/495', {
      method: 'DELETE',
    })
  })

  it('404 → WishlistApiError avec status 404', async () => {
    mockFetch(() =>
      json(404, { error: "Le Pokémon #495 n'est pas dans la wishlist" }),
    )
    await expect(deleteWishlistItem(API, 495)).rejects.toMatchObject({
      status: 404,
    })
  })
})

describe('parseWishlistItems (vérification des réponses de l’API)', () => {
  it('pas un tableau → liste vide', () => {
    expect(parseWishlistItems({ items: [] })).toEqual([])
    expect(parseWishlistItems(null)).toEqual([])
  })

  it('garde les entrées valides, écarte le reste, trie par numéro', () => {
    const list = parseWishlistItems([
      { ...fromApi, id: 498, name: 'tepig', frName: 'Gruikui', captured: true },
      null,
      { id: 'x', name: 'zorua' },
      { id: 25, name: 'pikachu' }, // hors 5e génération
      { ...fromApi, types: ['grass', 'plante'] }, // type inconnu écarté
    ])
    expect(list.map((p) => p.id)).toEqual([495, 498])
    expect(list[0]?.types).toEqual(['grass'])
    expect(list[1]?.captured).toBe(true)
  })
})
