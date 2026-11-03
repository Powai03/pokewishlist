// Couleurs des types Pokémon (palette proche de celle des jeux).
// Les NOMS des types sont traduits dans i18n/locales/*.json (clés « types.grass », « types.fire »…).
import type { PokemonType } from '../types/pokemon'

// `Record<PokemonType, …>` : TypeScript exige une entrée pour CHACUN des 18 types, ni plus ni moins.
const COLORS: Record<PokemonType, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  fairy: '#ee99ac',
}

export function typeColor(type: PokemonType): string {
  return COLORS[type]
}
