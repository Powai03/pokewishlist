// Client HTTP de l'API Hono (dossier api/) : la wishlist est désormais stockée côté serveur.
//
//   GET    /wishlist       → la liste
//   POST   /wishlist       → ajoute un Pokémon
//   PATCH  /wishlist/:id   → change l'état « capturé »
//   DELETE /wishlist/:id   → retire un Pokémon
//
// L'adresse de l'API (`baseUrl`) est passée en paramètre : l'appli lui donne celle de la configuration
// (NUXT_PUBLIC_API_BASE), les tests une adresse factice avec un `fetch` simulé.
import type { Pokemon, WishlistItem } from '../types/pokemon'
import { addPokemon, isPokemonType } from './wishlist'

/** Erreur d'appel à l'API ; `status` vaut 0 quand l'API est injoignable (réseau, serveur arrêté). */
export class WishlistApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'WishlistApiError'
  }
}

/** Appelle l'API et renvoie le JSON de la réponse (en `unknown` : il sera vérifié ensuite). */
async function request(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, init)
  } catch {
    throw new WishlistApiError(0, "L'API ne répond pas. Est-elle démarrée ?")
  }
  // `fetch` ne lève pas d'erreur sur un 4xx/5xx : on lit le message renvoyé par l'API ({ error }).
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Erreur ${res.status} de l'API`
    throw new WishlistApiError(res.status, message)
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
  if (!item) throw new WishlistApiError(500, "Réponse inattendue de l'API")
  return item
}

/** GET /wishlist */
export async function fetchWishlist(baseUrl: string): Promise<WishlistItem[]> {
  return parseWishlistItems(await request(baseUrl, '/wishlist'))
}

/** POST /wishlist : envoie le Pokémon (données PokéAPI) ; renvoie l'élément créé par l'API. */
export async function postWishlistItem(
  baseUrl: string,
  pokemon: Pokemon,
): Promise<WishlistItem> {
  const { id, name, frName, sprite, icon, types } = pokemon
  return expectItem(
    await request(
      baseUrl,
      '/wishlist',
      jsonInit('POST', { id, name, frName, sprite, icon, types }),
    ),
  )
}

/** PATCH /wishlist/:id : marque le Pokémon capturé (ou non) ; renvoie l'élément modifié. */
export async function patchCaptured(
  baseUrl: string,
  id: number,
  captured: boolean,
): Promise<WishlistItem> {
  return expectItem(
    await request(baseUrl, `/wishlist/${id}`, jsonInit('PATCH', { captured })),
  )
}

/** DELETE /wishlist/:id */
export async function deleteWishlistItem(
  baseUrl: string,
  id: number,
): Promise<void> {
  await request(baseUrl, `/wishlist/${id}`, { method: 'DELETE' })
}
