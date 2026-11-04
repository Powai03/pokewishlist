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

export type PokemonType = (typeof POKEMON_TYPES)[number]

export interface Pokemon {
  id: number
  name: string
  frName: string
  sprite: string | null
  icon: string | null
  types: PokemonType[]
}

export interface WishlistItem extends Pokemon {
  captured: boolean
}

export interface SpeciesEntry {
  id: number
  name: string
  frName?: string
}

export interface WishlistStats {
  captured: number
  total: number
  percent: number
}

export const STAT_KEYS = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const
export type StatKey = (typeof STAT_KEYS)[number]

export interface PokemonStat {
  key: StatKey
  value: number
}

export type LocalizedText = Partial<Record<'en' | 'fr' | 'es' | 'ja', string>>

export interface PokemonDetails extends Pokemon {
  names: LocalizedText
  genus: LocalizedText
  description: LocalizedText
  height: number
  weight: number
  stats: PokemonStat[]
}
