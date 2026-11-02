// Accès à PokéAPI (https://pokeapi.co) : API publique, gratuite, sans clé.
import type { Pokemon, SpeciesEntry } from '../types/pokemon'
import { GEN5, idFromUrl, isGen5, isPokemonType } from './wishlist'

const API = 'https://pokeapi.co/api/v2'
const GRAPHQL = 'https://beta.pokeapi.co/graphql/v1beta'
const LANG_FR = 5 // identifiant de la langue française dans PokéAPI

interface GraphqlResponse {
  data?: { species: { id: number; name: string; names: { name: string }[] }[] }
}

interface GenerationResponse {
  pokemon_species: { name: string; url: string }[]
}

interface PokemonResponse {
  id: number
  name: string
  types: { slot: number; type: { name: string } }[]
  sprites: {
    front_default: string | null
    versions?: {
      'generation-v'?: {
        'black-white'?: {
          front_default?: string | null
          animated?: { front_default: string | null }
        }
      }
      'generation-vii'?: { icons?: { front_default: string | null } }
    }
  }
}

interface SpeciesResponse {
  names: { name: string; language: { name: string } }[]
}

// Les interfaces ci-dessus décrivent ce que PokéAPI RENVOIE (format brut de l'API) ;
// les fonctions ci-dessous le convertissent en NOS types (`SpeciesEntry`, `Pokemon`).

// Une seule requête GraphQL : les 156 Pokémon d'Unys avec leur nom français.
const GEN5_QUERY = `query {
  species: pokemon_v2_pokemonspecies(where: {generation_id: {_eq: 5}}, order_by: {id: asc}) {
    id
    name
    names: pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: ${LANG_FR}}}) { name }
  }
}`

/**
 * Index de recherche des 156 Pokémon de la 5e génération.
 * 1er choix : l'API GraphQL (noms français, 1 appel). Secours : l'API REST (noms anglais seulement).
 */
export async function fetchGen5Index(): Promise<SpeciesEntry[]> {
  try {
    const res = await $fetch<GraphqlResponse>(GRAPHQL, {
      method: 'POST',
      body: { query: GEN5_QUERY },
    })
    const species = res.data?.species ?? []
    if (species.length) {
      return species
        .filter((s) => isGen5(s.id))
        .map((s): SpeciesEntry => ({
          id: s.id,
          name: s.name,
          frName: s.names[0]?.name ?? s.name,
        }))
    }
  } catch {
    // GraphQL indisponible (c'est une API « beta ») : on passe au secours
  }
  const data = await $fetch<GenerationResponse>(`${API}/generation/5`)
  return data.pokemon_species
    .map((s): SpeciesEntry => ({ id: idFromUrl(s.url), name: s.name }))
    .filter((s) => isGen5(s.id))
    .sort((a, b) => a.id - b.id)
}

/** Fiche complète d'un Pokémon : sprite animé de Noir et Blanc, icône de menu, types et nom français. */
export async function fetchPokemon(entry: SpeciesEntry): Promise<Pokemon> {
  if (!isGen5(entry.id))
    throw new Error(
      `#${entry.id} n'est pas de 5e génération (#${GEN5.first}–#${GEN5.last})`,
    )
  const [pokemon, frName]: [PokemonResponse, string] = await Promise.all([
    $fetch<PokemonResponse>(`${API}/pokemon/${entry.id}`),
    // Nom français déjà connu grâce à l'index ? Sinon, on le demande à l'API.
    entry.frName ??
      $fetch<SpeciesResponse>(`${API}/pokemon-species/${entry.id}`).then(
        (s) =>
          s.names.find((n) => n.language.name === 'fr')?.name ?? entry.name,
      ),
  ])
  const bw = pokemon.sprites.versions?.['generation-v']?.['black-white']
  return {
    id: pokemon.id,
    name: pokemon.name,
    frName,
    sprite:
      bw?.animated?.front_default ??
      bw?.front_default ??
      pokemon.sprites.front_default,
    icon:
      pokemon.sprites.versions?.['generation-vii']?.icons?.front_default ??
      null,
    // L'API renvoie de simples textes : on ne garde que les 18 types connus (garde de type).
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name)
      .filter(isPokemonType),
  }
}
