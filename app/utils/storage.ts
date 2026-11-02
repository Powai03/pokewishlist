// Sauvegarde et lecture de la wishlist dans le stockage du navigateur (localStorage).
//
// Principe : le stockage est passé EN PARAMÈTRE (« injection de dépendance »).
// - dans l'application, on passe le vrai `localStorage` ;
// - dans les tests, on passe un faux stockage en mémoire, qu'on peut remplir avec n'importe quoi
//   (vide, JSON cassé, données d'une vieille version…) ou faire planter exprès.
//
// Règle d'or : le contenu du stockage n'est JAMAIS digne de confiance (l'utilisateur, une extension
// ou une ancienne version de l'appli a pu l'abîmer). Ces fonctions ne lèvent donc JAMAIS d'erreur.
import type { Pokemon, WishlistItem } from '../types/pokemon'
import { addPokemon, isPokemonType } from './wishlist'

/** Clé sous laquelle la wishlist est rangée dans le localStorage. */
export const STORAGE_KEY = 'pokewishlist'

/** Le strict nécessaire d'un stockage : `localStorage` convient, un faux objet en mémoire aussi. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

/**
 * Renvoie le `localStorage` du navigateur, ou `null` s'il est inaccessible :
 * côté serveur (SSR) il n'existe pas, et certains navigateurs lèvent une erreur rien qu'en y accédant
 * (cookies bloqués, navigation privée stricte).
 */
export function getBrowserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * SAUVEGARDE : écrit la liste en JSON sous `STORAGE_KEY`.
 * @returns `true` si c'est enregistré, `false` si le stockage refuse (plein, bloqué) ; ne lève jamais.
 */
export function saveWishlist(
  list: WishlistItem[],
  storage: KeyValueStorage,
): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(list))
    return true
  } catch {
    return false // la liste reste en mémoire pour cette session
  }
}

/**
 * LECTURE : relit la liste sauvegardée.
 * Stockage vide, inaccessible ou corrompu → liste vide (jamais d'erreur).
 */
export function loadWishlist(storage: KeyValueStorage): WishlistItem[] {
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return [] // stockage bloqué
  }
  return parseStoredWishlist(raw)
}

/**
 * Transforme le texte sauvegardé en liste, SANS lui faire confiance :
 * - rien de sauvegardé (`null`), chaîne vide → liste vide ;
 * - JSON invalide (« {pas du json ») → liste vide ;
 * - JSON valide mais pas un tableau (« "texte" », « 42 », un objet) → liste vide ;
 * - tableau en partie abîmé → on garde les entrées valides, on écarte le reste
 *   (entrée qui n'est pas un objet, sans numéro ou sans nom, Pokémon hors 5e génération,
 *   au-delà de 6 Pokémon, types inconnus).
 * Les données arrivent en `unknown` : chaque champ est vérifié avant d'être utilisé.
 */
export function parseStoredWishlist(raw: string | null): WishlistItem[] {
  if (!raw) return []
  let data: unknown
  try {
    data = JSON.parse(raw)
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
