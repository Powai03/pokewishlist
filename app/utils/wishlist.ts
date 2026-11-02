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

/** Taille maximale de la wishlist : 6 Pokémon, comme une équipe dans le jeu. */
export const WISHLIST_MAX = 6

/** La wishlist a-t-elle atteint sa taille maximale ? */
export function isFull(list: WishlistItem[]): boolean {
  return list.length >= WISHLIST_MAX
}

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
 * Ajoute un Pokémon à la wishlist ; la liste reste triée par numéro.
 * Reçoit un `Pokemon` (données de l'API) et le transforme en `WishlistItem` (ajoute l'état de capture).
 * Renvoie la liste INCHANGÉE si l'ajout est refusé :
 * - Pokémon hors 5e génération ;
 * - Pokémon déjà présent (pas de doublon) ;
 * - liste pleine (WISHLIST_MAX = 6).
 */
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

/** Progression de la chasse : combien capturés sur combien, et le pourcentage arrondi. */
export function progress(list: WishlistItem[]): WishlistStats {
  const total = list.length
  const captured = list.filter((p) => p.captured).length
  return {
    captured,
    total,
    percent: total === 0 ? 0 : Math.round((captured / total) * 100),
  }
}
