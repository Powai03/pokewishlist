import type { Pokemon, WishlistItem } from '../types/pokemon'
import { addPokemon, isPokemonType } from './wishlist'

export type ApiErrorCode = 'unreachable' | 'unexpected' | 'status'

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

export async function fetchWishlist(
  baseUrl: string,
  lang?: string,
): Promise<WishlistItem[]> {
  return parseWishlistItems(await request(baseUrl, '/wishlist', {}, lang))
}

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

export async function deleteWishlistItem(
  baseUrl: string,
  id: number,
  lang?: string,
): Promise<void> {
  await request(baseUrl, `/wishlist/${id}`, { method: 'DELETE' }, lang)
}

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

export async function fetchLikes(
  baseUrl: string,
  id: number,
  lang?: string,
): Promise<number> {
  return parseLikes(await request(baseUrl, `/pokemon/${id}/likes`, {}, lang))
}

export async function postLike(
  baseUrl: string,
  id: number,
  lang?: string,
): Promise<number> {
  return parseLikes(
    await request(baseUrl, `/pokemon/${id}/likes`, { method: 'POST' }, lang),
  )
}
