// Logique métier de la wishlist : fonctions pures (pas de DOM, pas de réseau),
// donc faciles à tester. Chaque fonction renvoie une NOUVELLE liste sans modifier l'ancienne.
import {
  POKEMON_TYPES,
  type Pokemon,
  type PokemonType,
  type SpeciesEntry,
  type WishlistItem,
  type WishlistStats,
} from '../types/pokemon'

/** 5e génération (région d'Unys, Pokémon Noir et Blanc) : de Victini (#494) à Genesect (#649). */
export const GEN5 = { first: 494, last: 649 } as const

export function isGen5(id: number): boolean {
  return Number.isInteger(id) && id >= GEN5.first && id <= GEN5.last
}

/**
 * Garde de type : vérifie qu'un texte venu de l'extérieur (API, localStorage) est bien un des 18 types.
 * Si elle renvoie `true`, TypeScript sait ensuite que `value` est un `PokemonType`.
 */
export function isPokemonType(value: unknown): value is PokemonType {
  return (
    typeof value === 'string' &&
    (POKEMON_TYPES as readonly string[]).includes(value)
  )
}

/** Extrait le numéro d'une URL PokéAPI : « …/pokemon-species/495/ » → 495. */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : Number.NaN
}

/** Minuscules sans accents : « Vipélierre » → « vipelierre » (pour comparer sans se soucier des accents). */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Nettoie une saisie utilisateur : « Vipé  » → « vipe », « #0495 » → « 495 ». */
export function normalizeQuery(input: string): string {
  const cleaned = fold(input).replace(/^#/, '')
  return /^\d+$/.test(cleaned) ? String(Number(cleaned)) : cleaned
}

/**
 * Recherche dans l'index : par numéro exact, ou par morceau de nom FRANÇAIS ou anglais,
 * sans tenir compte des accents ni des majuscules.
 * Le français passe avant l'anglais, et « commence par » avant « contient ».
 */
export function searchSpecies(
  entries: SpeciesEntry[],
  input: string,
  limit: number = 8,
): SpeciesEntry[] {
  const query = normalizeQuery(input)
  if (!query) return []
  if (/^\d+$/.test(query)) return entries.filter((e) => e.id === Number(query))
  // Score : 0 = le nom français commence par la saisie, 1 = l'anglais commence,
  //         2 = le français la contient, 3 = l'anglais la contient, -1 = aucun rapport.
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
    .sort((a, b) => a.r - b.r) // tri stable : à score égal, l'ordre du Pokédex est conservé
    .slice(0, limit)
    .map((x) => x.e)
}

/**
 * Ajoute un Pokémon de 5e génération s'il n'y est pas déjà ; la liste reste triée par numéro.
 * Reçoit un `Pokemon` (données de l'API) et le transforme en `WishlistItem` (ajoute l'état de capture).
 */
export function addPokemon(
  list: WishlistItem[],
  pokemon: Pokemon,
  captured: boolean = false,
): WishlistItem[] {
  if (!isGen5(pokemon.id) || list.some((p) => p.id === pokemon.id)) return list
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

/** Progression de la chasse : combien capturés sur combien, et le pourcentage arrondi. */
export function progress(list: WishlistItem[]): WishlistStats {
  const total: string = list.length
  const captured = list.filter((p) => p.captured).length
  return {
    captured,
    total,
    percent: total === 0 ? 0 : Math.round((captured / total) * 100),
  }
}

/**
 * Relit la liste sauvegardée dans le localStorage SANS lui faire confiance :
 * JSON cassé, données d'une ancienne version ou Pokémon hors 5e génération sont écartés.
 * Les données arrivent en `unknown` : chaque champ est vérifié avant d'être utilisé.
 */
export function parseStoredWishlist(raw: string | null): WishlistItem[] {
  let data: unknown
  try {
    data = JSON.parse(raw ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []

  let list: WishlistItem[] = []
  for (const item of data as unknown[]) {
    if (typeof item !== 'object' || item === null) continue
    const p = item as Partial<Record<keyof WishlistItem, unknown>>
    if (typeof p.id !== 'number' || typeof p.name !== 'string') continue
    const pokemon: Pokemon = {
      id: p.id,
      name: p.name,
      frName: typeof p.frName === 'string' ? p.frName : p.name,
      sprite: typeof p.sprite === 'string' ? p.sprite : null,
      icon: typeof p.icon === 'string' ? p.icon : null,
      types: Array.isArray(p.types) ? p.types.filter(isPokemonType) : [],
    }
    list = addPokemon(list, pokemon, p.captured === true)
  }
  return list
}
