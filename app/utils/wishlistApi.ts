// Client HTTP de l'API Hono (dossier api/) : la wishlist est désormais stockée côté serveur.
//
//   GET    /wishlist       → la liste
//   POST   /wishlist       → ajoute un Pokémon
//   PATCH  /wishlist/:id   → change l'état « capturé »
//   DELETE /wishlist/:id   → retire un Pokémon
//
// L'adresse de l'API (`baseUrl`) est passée en paramètre : l'appli lui donne celle de la configuration
// (NUXT_PUBLIC_API_BASE), les tests une adresse factice avec un `fetch` simulé.
//
// Langue : chaque appel envoie l'en-tête HTTP standard `Accept-Language` (« fr », « ja »…) ;
// l'API répond alors ses messages d'erreur dans cette langue.
import type { Pokemon, WishlistItem } from '../types/pokemon'
import { addPokemon, isPokemonType } from './wishlist'

/**
 * Pourquoi l'appel a échoué, quand le message ne vient PAS de l'API (le front doit alors le traduire lui-même) :
 * · 'unreachable' : l'API ne répond pas (réseau, serveur arrêté) ;
 * · 'unexpected'  : réponse illisible ;
 * · 'status'      : erreur HTTP sans message de l'API.
 * Absent (`undefined`) : le message vient de l'API, déjà traduit par elle.
 */
export type ApiErrorCode = 'unreachable' | 'unexpected' | 'status'

/** Erreur d'appel à l'API ; `status` vaut 0 quand l'API est injoignable (réseau, serveur arrêté). */
export class WishlistApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: ApiErrorCode,
  ) {
    super(message)
    this.name = 'WishlistApiError'
  }
}

/** Appelle l'API et renvoie le JSON de la réponse (en `unknown` : il sera vérifié ensuite). */
async function request(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  lang?: string,
): Promise<unknown> {
  const headers = new Headers(init.headers)
  if (lang) headers.set('Accept-Language', lang)
  let res: Response
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers,
    })
  } catch {
    throw new WishlistApiError(
      0,
      'The API is not responding. Is it running?',
      'unreachable',
    )
  }
  // `fetch` ne lève pas d'erreur sur un 4xx/5xx : on lit le message renvoyé par l'API ({ error }).
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    if (
      typeof body === 'object' &&
      body !== null &&
      typeof (body as { error?: unknown }).error === 'string'
    ) {
      throw new WishlistApiError(res.status, (body as { error: string }).error)
    }
    throw new WishlistApiError(res.status, `API error ${res.status}`, 'status')
  }
  return body
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

/** Un élément renvoyé par l'API, vérifié champ par champ (ou `null` s'il est inutilisable). */
export function parseWishlistItem(data: unknown): WishlistItem | null {
  if (typeof data !== 'object' || data === null) return null
  const p = data as Partial<Record<keyof WishlistItem, unknown>>
  if (typeof p.id !== 'number' || typeof p.name !== 'string') return null
  return {
    id: p.id,
    name: p.name,
    frName: typeof p.frName === 'string' ? p.frName : p.name,
    sprite: typeof p.sprite === 'string' ? p.sprite : null,
    icon: typeof p.icon === 'string' ? p.icon : null,
    types: Array.isArray(p.types) ? p.types.filter(isPokemonType) : [],
    captured: p.captured === true,
  }
}

/**
 * La liste renvoyée par l'API, SANS lui faire une confiance aveugle :
 * pas un tableau → liste vide ; entrées invalides, hors 5e génération, doublons ou au-delà de 6 → écartées.
 */
export function parseWishlistItems(data: unknown): WishlistItem[] {
  if (!Array.isArray(data)) return []
  let list: WishlistItem[] = []
  for (const raw of data as unknown[]) {
    const item = parseWishlistItem(raw)
    if (item) list = addPokemon(list, item, item.captured)
  }
  return list
}

function expectItem(data: unknown): WishlistItem {
  const item = parseWishlistItem(data)
  if (!item) {
    throw new WishlistApiError(
      500,
      'Unexpected response from the API',
      'unexpected',
    )
  }
  return item
}

/** GET /wishlist */
export async function fetchWishlist(
  baseUrl: string,
  lang?: string,
): Promise<WishlistItem[]> {
  return parseWishlistItems(await request(baseUrl, '/wishlist', {}, lang))
}

/** POST /wishlist : envoie le Pokémon (données PokéAPI) ; renvoie l'élément créé par l'API. */
export async function postWishlistItem(
  baseUrl: string,
  pokemon: Pokemon,
  lang?: string,
): Promise<WishlistItem> {
  const { id, name, frName, sprite, icon, types } = pokemon
  return expectItem(
    await request(
      baseUrl,
      '/wishlist',
      jsonInit('POST', { id, name, frName, sprite, icon, types }),
      lang,
    ),
  )
}

/** PATCH /wishlist/:id : marque le Pokémon capturé (ou non) ; renvoie l'élément modifié. */
export async function patchCaptured(
  baseUrl: string,
  id: number,
  captured: boolean,
  lang?: string,
): Promise<WishlistItem> {
  return expectItem(
    await request(
      baseUrl,
      `/wishlist/${id}`,
      jsonInit('PATCH', { captured }),
      lang,
    ),
  )
}

/** DELETE /wishlist/:id */
export async function deleteWishlistItem(
  baseUrl: string,
  id: number,
  lang?: string,
): Promise<void> {
  await request(baseUrl, `/wishlist/${id}`, { method: 'DELETE' }, lang)
}

/** Likes d'une fiche : `{ id, likes }`. */
function parseLikes(data: unknown): number {
  const likes = (data as { likes?: unknown } | null)?.likes
  if (typeof likes !== 'number') {
    throw new WishlistApiError(
      500,
      'Unexpected response from the API',
      'unexpected',
    )
  }
  return likes
}

/** GET /pokemon/:id/likes : nombre de likes de la fiche. */
export async function fetchLikes(
  baseUrl: string,
  id: number,
  lang?: string,
): Promise<number> {
  return parseLikes(await request(baseUrl, `/pokemon/${id}/likes`, {}, lang))
}

/** POST /pokemon/:id/likes : un like de plus ; renvoie le nouveau total. */
export async function postLike(
  baseUrl: string,
  id: number,
  lang?: string,
): Promise<number> {
  return parseLikes(
    await request(baseUrl, `/pokemon/${id}/likes`, { method: 'POST' }, lang),
  )
}
