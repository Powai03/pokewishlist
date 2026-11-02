// Logique métier de la wishlist : fonctions pures (pas de DOM, pas de réseau),
// donc faciles à tester. Chaque fonction renvoie une NOUVELLE liste sans modifier l'ancienne.

export interface Pokemon {
  id: number
  name: string
  sprite: string | null
  captured: boolean
}

/** Nettoie une saisie utilisateur : « Pikachu  » → « pikachu », « #025 » → « 25 ». */
export function normalizeQuery(input: string): string {
  const cleaned = input.trim().toLowerCase().replace(/^#/, '')
  return /^\d+$/.test(cleaned) ? String(Number(cleaned)) : cleaned
}

/** Ajoute un Pokémon s'il n'est pas déjà dans la liste, et garde la liste triée par numéro. */
export function addPokemon(list: Pokemon[], pokemon: Pokemon): Pokemon[] {
  if (list.some(p => p.id === pokemon.id)) return list
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
