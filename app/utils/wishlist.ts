import {
  POKEMON_TYPES,
  type Pokemon,
  type PokemonType,
  type SpeciesEntry,
  type WishlistItem,
  type WishlistStats,
} from '../types/pokemon'

export const GEN5 = { first: 494, last: 649 } as const

export const WISHLIST_MAX = 6

export function isFull(list: WishlistItem[]): boolean {
  return list.length >= WISHLIST_MAX
}

export function isGen5(id: number): boolean {
  return Number.isInteger(id) && id >= GEN5.first && id <= GEN5.last
}

export function isPokemonType(value: unknown): value is PokemonType {
  return (
    typeof value === 'string' &&
    (POKEMON_TYPES as readonly string[]).includes(value)
  )
}

export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : Number.NaN
}

export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function normalizeQuery(input: string): string {
  const cleaned = fold(input).replace(/^#/, '')
  return /^\d+$/.test(cleaned) ? String(Number(cleaned)) : cleaned
}

export function searchSpecies(
  entries: SpeciesEntry[],
  input: string,
  limit: number = 8,
): SpeciesEntry[] {
  const query = normalizeQuery(input)
  if (!query) return []
  if (/^\d+$/.test(query)) return entries.filter((e) => e.id === Number(query))
  const rank = (e: SpeciesEntry): number => {
    const fr = fold(e.frName ?? '')
    if (fr.startsWith(query)) return 0
    if (e.name.startsWith(query)) return 1
    if (fr.includes(query)) return 2
    if (e.name.includes(query)) return 3
    return -1
  }
  return entries
    .map((e) => ({ e, r: rank(e) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map((x) => x.e)
}

export function addPokemon(
  list: WishlistItem[],
  pokemon: Pokemon,
  captured: boolean = false,
): WishlistItem[] {
  if (!isGen5(pokemon.id)) return list
  if (list.some((p) => p.id === pokemon.id)) return list
  if (isFull(list)) return list
  const item: WishlistItem = { ...pokemon, captured }
  return [...list, item].sort((a, b) => a.id - b.id)
}

export function removePokemon(
  list: WishlistItem[],
  id: number,
): WishlistItem[] {
  return list.filter((p) => p.id !== id)
}

export function toggleCaptured(
  list: WishlistItem[],
  id: number,
): WishlistItem[] {
  return list.map((p) => (p.id === id ? { ...p, captured: !p.captured } : p))
}

export function progress(list: WishlistItem[]): WishlistStats {
  const total = list.length
  const captured = list.filter((p) => p.captured).length
  return {
    captured,
    total,
    percent: total === 0 ? 0 : Math.round((captured / total) * 100),
  }
}
