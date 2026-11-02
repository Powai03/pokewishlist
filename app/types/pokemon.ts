// Types partagés de l'application : ils décrivent la FORME des données.
// TypeScript vérifie à la compilation que tout le code les respecte (`npm run typecheck`).

/** Les 18 types élémentaires des Pokémon, tels que PokéAPI les nomme. */
export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const

/** Un type élémentaire : uniquement l'une des 18 valeurs ci-dessus (« grass », « fire »…), jamais un texte quelconque. */
export type PokemonType = (typeof POKEMON_TYPES)[number]

/** Un Pokémon tel qu'on le connaît grâce à PokéAPI : ce sont des données de référence, identiques pour tout le monde. */
export interface Pokemon {
  /** Numéro du Pokédex national (494 à 649 pour la 5e génération). */
  id: number
  /** Nom anglais, tel que renvoyé par PokéAPI (ex. « snivy »). */
  name: string
  /** Nom français (ex. « Vipélierre »). */
  frName: string
  /** Sprite animé de Noir et Blanc (écran du haut), ou `null` s'il n'existe pas. */
  sprite: string | null
  /** Petite icône de menu (boîte du PC), ou `null` si elle n'existe pas. */
  icon: string | null
  /** Un ou deux types, dans l'ordre du jeu (ex. ['dragon', 'electric'] pour Zekrom). */
  types: PokemonType[]
}

/** Un Pokémon DANS la wishlist : le Pokémon + ce qui est propre à ma chasse. */
export interface WishlistItem extends Pokemon {
  /** `true` une fois le Pokémon capturé dans le jeu. */
  captured: boolean
}

/** Entrée de l'index de recherche : juste de quoi trouver un Pokémon, sans ses détails. */
export interface SpeciesEntry {
  id: number
  name: string
  /** Absent si l'index vient de l'API de secours (noms anglais seulement). */
  frName?: string
}

/** Progression de la chasse. */
export interface WishlistStats {
  captured: number
  total: number
  /** Pourcentage arrondi, de 0 à 100. */
  percent: number
}
