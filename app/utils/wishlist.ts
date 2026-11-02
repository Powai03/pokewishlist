// Logique métier de la wishlist : fonctions pures (pas de DOM, pas de réseau),
// donc faciles à tester. Chaque fonction renvoie une NOUVELLE liste sans modifier l'ancienne.

/** 5e génération (région d'Unys, Pokémon Noir et Blanc) : de Victini (#494) à Genesect (#649). */
export const GEN5 = { first: 494, last: 649 } as const

export interface Pokemon {
  id: number
  name: string // nom anglais, tel que renvoyé par PokéAPI (ex. « snivy »)
  frName: string // nom français (ex. « Vipélierre »)
  sprite: string | null // sprite animé de Noir et Blanc (écran du haut)
  icon: string | null // petite icône de menu (boîte du PC)
  types: string[]
  captured: boolean
}

/** Entrée de l'index de recherche : numéro, nom anglais et nom français (si disponible). */
export interface SpeciesEntry {
  id: number
  name: string
  frName?: string
}

export function isGen5(id: number): boolean {
  return Number.isInteger(id) && id >= GEN5.first && id <= GEN5.last
}

/** Extrait le numéro d'une URL PokéAPI : « …/pokemon-species/495/ » → 495. */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : Number.NaN
}

/** Minuscules sans accents : « Vipélierre » → « vipelierre » (pour comparer sans se soucier des accents). */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
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
export function searchSpecies(entries: SpeciesEntry[], input: string, limit = 8): SpeciesEntry[] {
  const query = normalizeQuery(input)
  if (!query) return []
  if (/^\d+$/.test(query)) return entries.filter(e => e.id === Number(query))
  // Score : 0 = le nom français commence par la saisie, 1 = l'anglais commence,
  //         2 = le français la contient, 3 = l'anglais la contient, -1 = aucun rapport.
  const rank = (e: SpeciesEntry) => {
    const fr = fold(e.frName ?? '')
    if (fr.startsWith(query)) return 0
    if (e.name.startsWith(query)) return 1
    if (fr.includes(query)) return 2
    if (e.name.includes(query)) return 3
    return -1
  }
  return entries
    .map(e => ({ e, r: rank(e) }))
    .filter(x => x.r >= 0)
    .sort((a, b) => a.r - b.r) // tri stable : à score égal, l'ordre du Pokédex est conservé
    .slice(0, limit)
    .map(x => x.e)
}

/** Ajoute un Pokémon de 5e génération s'il n'y est pas déjà ; la liste reste triée par numéro. */
export function addPokemon(list: Pokemon[], pokemon: Pokemon): Pokemon[] {
  console.log('ajout', pokemon.id)
  if (!isGen5(pokemon.id) || list.some(p => p.id === pokemon.id)) return list
  return [...list, pokemon].sort((a, b) => a.id - b.id)
}

export function removePokemon(list: Pokemon[], id: number): Pokemon[] {
  return list.filter(p => p.id !== id)
}

export function toggleCaptured(list: Pokemon[], id: number): Pokemon[] {
  return list.map(p => (p.id === id ? { ...p, captured: !p.captured } : p))
}

/** Progression de la chasse : combien capturés sur combien, et le pourcentage arrondi. */
export function progress(list: Pokemon[]): { captured: number, total: number, percent: number } {
  const total = list.length
  const captured = list.filter(p => p.captured).length
  return { captured, total, percent: total === 0 ? 0 : Math.round((captured / total) * 100) }
}

/**
 * Relit la liste sauvegardée dans le localStorage SANS lui faire confiance :
 * JSON cassé, données d'une ancienne version ou Pokémon hors 5e génération sont écartés.
 */
export function parseStoredWishlist(raw: string | null): Pokemon[] {
  let data: unknown
  try {
    data = JSON.parse(raw ?? '[]')
  }
  catch {
    return []
  }
  if (!Array.isArray(data)) return []

  let list: Pokemon[] = []
  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue
    const p = item as Partial<Pokemon>
    if (typeof p.id !== 'number' || typeof p.name !== 'string') continue
    list = addPokemon(list, {
      id: p.id,
      name: p.name,
      frName: typeof p.frName === 'string' ? p.frName : p.name,
      sprite: typeof p.sprite === 'string' ? p.sprite : null,
      icon: typeof p.icon === 'string' ? p.icon : null,
      types: Array.isArray(p.types) ? p.types.filter(t => typeof t === 'string') : [],
      captured: p.captured === true,
    })
  }
  return list
}
