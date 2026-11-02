// Noms français et couleurs des types Pokémon (palette proche de celle des jeux).
const TYPES: Record<string, { label: string, color: string }> = {
  normal: { label: 'Normal', color: '#a8a878' },
  fire: { label: 'Feu', color: '#f08030' },
  water: { label: 'Eau', color: '#6890f0' },
  grass: { label: 'Plante', color: '#78c850' },
  electric: { label: 'Électrik', color: '#f8d030' },
  ice: { label: 'Glace', color: '#98d8d8' },
  fighting: { label: 'Combat', color: '#c03028' },
  poison: { label: 'Poison', color: '#a040a0' },
  ground: { label: 'Sol', color: '#e0c068' },
  flying: { label: 'Vol', color: '#a890f0' },
  psychic: { label: 'Psy', color: '#f85888' },
  bug: { label: 'Insecte', color: '#a8b820' },
  rock: { label: 'Roche', color: '#b8a038' },
  ghost: { label: 'Spectre', color: '#705898' },
  dragon: { label: 'Dragon', color: '#7038f8' },
  dark: { label: 'Ténèbres', color: '#705848' },
  steel: { label: 'Acier', color: '#b8b8d0' },
  fairy: { label: 'Fée', color: '#ee99ac' },
}

export function typeInfo(type: string): { label: string, color: string } {
  return TYPES[type] ?? { label: type, color: '#888888' }
}
