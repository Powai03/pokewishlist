// Accès à PokéAPI (https://pokeapi.co) : API publique, gratuite, sans clé.
// On utilise le `fetch` STANDARD du navigateur (et de Node.js) plutôt que le `$fetch` de Nuxt :
// il fonctionne partout, y compris dans les tests Vitest, où on peut le remplacer par un faux (mock).
import {
  STAT_KEYS,
  type Pokemon,
  type PokemonDetails,
  type PokemonStat,
  type SpeciesEntry,
} from '../types/pokemon'
import { localize } from './locale'
import { GEN5, idFromUrl, isGen5, isPokemonType } from './wishlist'

const API = 'https://pokeapi.co/api/v2'
const GRAPHQL = 'https://beta.pokeapi.co/graphql/v1beta'
const LANG_FR = 5 // identifiant de la langue française dans PokéAPI

/** Erreur renvoyée par PokéAPI (statut HTTP autre que 2xx). */
export class PokeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`PokéAPI a répondu ${status} pour ${url}`)
    this.name = 'PokeApiError'
  }
}

/** Cas particulier : PokéAPI répond 404, le Pokémon demandé n'existe pas. */
export class PokemonNotFoundError extends PokeApiError {
  constructor(url: string) {
    super(404, url)
    this.name = 'PokemonNotFoundError'
  }
}

/**
 * Appelle PokéAPI et renvoie le JSON de la réponse.
 * `fetch` ne lève PAS d'erreur sur un 404 ou un 500 : il faut regarder `res.ok` soi-même.
 */
async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (res.status === 404) throw new PokemonNotFoundError(url)
  if (!res.ok) throw new PokeApiError(res.status, url)
  return (await res.json()) as T
}

interface GraphqlResponse {
  data?: { species: { id: number; name: string; names: { name: string }[] }[] }
}

interface GenerationResponse {
  pokemon_species: { name: string; url: string }[]
}

interface PokemonResponse {
  id: number
  name: string
  /** En décimètres. */
  height: number
  /** En hectogrammes. */
  weight: number
  stats: { base_stat: number; stat: { name: string } }[]
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
  id: number
  names: { name: string; language: { name: string } }[]
  genera?: { genus: string; language: { name: string } }[]
  flavor_text_entries?: {
    flavor_text: string
    language: { name: string }
    version: { name: string }
  }[]
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
    const res = await getJson<GraphqlResponse>(GRAPHQL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: GEN5_QUERY }),
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
  const data = await getJson<GenerationResponse>(`${API}/generation/5`)
  return data.pokemon_species
    .map((s): SpeciesEntry => ({ id: idFromUrl(s.url), name: s.name }))
    .filter((s) => isGen5(s.id))
    .sort((a, b) => a.id - b.id)
}

/**
 * Fiche complète d'un Pokémon : sprite animé de Noir et Blanc, icône de menu, types et nom français.
 * @throws PokemonNotFoundError si PokéAPI répond 404 ; PokeApiError pour les autres erreurs HTTP.
 */
export async function fetchPokemon(entry: SpeciesEntry): Promise<Pokemon> {
  if (!isGen5(entry.id))
    throw new Error(
      `#${entry.id} n'est pas de 5e génération (#${GEN5.first}–#${GEN5.last})`,
    )
  const [pokemon, frName]: [PokemonResponse, string] = await Promise.all([
    getJson<PokemonResponse>(`${API}/pokemon/${entry.id}`),
    // Nom français déjà connu grâce à l'index ? Sinon, on le demande à l'API.
    entry.frName ??
      getJson<SpeciesResponse>(`${API}/pokemon-species/${entry.id}`).then(
        (s) =>
          s.names.find((n) => n.language.name === 'fr')?.name ?? entry.name,
      ),
  ])
  return toPokemon(pokemon, frName)
}

/** Réponse brute de /pokemon/:id + nom français → notre type `Pokemon`. */
function toPokemon(pokemon: PokemonResponse, frName: string): Pokemon {
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

// ── Fiche d'un Pokémon (page /pokemon/:id) ──────────────────────────────────

/**
 * Ce que l'adresse /pokemon/:id peut contenir : un numéro (« 495 ») ou un nom anglais (« snivy »).
 * Un refus porte un CODE (et non une phrase) : la page le traduit dans la langue affichée.
 */
export type PokemonParam =
  | { ok: true; value: number | string }
  | { ok: false; reason: 'notGen5'; id: number }
  | { ok: false; reason: 'invalidName'; raw: string }

/**
 * Vérifie le paramètre de l'adresse AVANT d'appeler PokéAPI :
 * un numéro hors 5e génération ou un texte bizarre n'a pas besoin d'un appel réseau pour finir en 404.
 */
export function parsePokemonParam(raw: string): PokemonParam {
  const value = raw.trim().toLowerCase()
  if (/^\d+$/.test(value)) {
    const id = Number(value)
    return isGen5(id)
      ? { ok: true, value: id }
      : { ok: false, reason: 'notGen5', id }
  }
  if (/^[a-z][a-z0-9-]{0,40}$/.test(value)) return { ok: true, value }
  return { ok: false, reason: 'invalidName', raw }
}

/** Versions dont on préfère le texte de Pokédex : celles de la 5e génération d'abord. */
const PREFERRED_VERSIONS = ['black', 'white', 'black-2', 'white-2']

type FlavorEntry = NonNullable<SpeciesResponse['flavor_text_entries']>[number]

/** Parmi les textes d'une langue, celui de Noir et Blanc si possible. */
function preferredFlavor(entries: FlavorEntry[]): FlavorEntry | undefined {
  const rank = (version: string): number => {
    const i = PREFERRED_VERSIONS.indexOf(version)
    return i === -1 ? PREFERRED_VERSIONS.length : i
  }
  return [...entries].sort(
    (a, b) => rank(a.version.name) - rank(b.version.name),
  )[0]
}

/** Texte du jeu nettoyé : retours à la ligne, sauts de page et tirets conditionnels → espaces simples. */
const cleanFlavor = (e: FlavorEntry): string =>
  e.flavor_text.replace(/[\s\u00ad]+/g, ' ').trim()

/**
 * Fiche complète : deux appels en parallèle (/pokemon et /pokemon-species), textes dans les 4 langues.
 * @param base adresse de PokéAPI (remplaçable, pour les tests de bout en bout).
 * @throws PokemonNotFoundError si le Pokémon n'existe pas OU n'est pas de 5e génération (même réponse : 404).
 */
export async function fetchPokemonDetails(
  param: number | string,
  base: string = API,
): Promise<PokemonDetails> {
  const root = base.replace(/\/$/, '')
  const speciesUrl = `${root}/pokemon-species/${encodeURIComponent(param)}`
  // Un numéro : les deux appels en parallèle. Un nom : d'abord l'ESPÈCE, puis le Pokémon par son numéro.
  // Pour certaines espèces (darmanitan, basculin, tornadus, keldeo, meloetta…), /pokemon/<nom> répond 404 :
  // seules leurs formes existent (« darmanitan-standard »). Le numéro, lui, désigne toujours la forme par défaut.
  const [pokemon, species] =
    typeof param === 'number'
      ? await Promise.all([
          getJson<PokemonResponse>(`${root}/pokemon/${param}`),
          getJson<SpeciesResponse>(speciesUrl),
        ])
      : await getJson<SpeciesResponse>(speciesUrl).then(
          async (sp): Promise<[PokemonResponse, SpeciesResponse]> => {
            // Espèce d'une autre génération (« pikachu ») : 404 sans 2e appel.
            if (!isGen5(sp.id)) throw new PokemonNotFoundError(speciesUrl)
            return [
              await getJson<PokemonResponse>(`${root}/pokemon/${sp.id}`),
              sp,
            ]
          },
        )
  const url = `${root}/pokemon/${pokemon.id}`
  // Un nom anglais peut désigner un Pokémon d'une autre génération (« pikachu ») : pas dans notre Pokédex.
  if (!isGen5(pokemon.id)) throw new PokemonNotFoundError(url)

  // PokéAPI fournit noms, catégories et textes dans toutes les langues en UNE réponse :
  // on les garde tous, la page choisit selon la langue affichée (sans nouvel appel au changement de langue).
  const names = localize(species.names, (n) => n.name)
  const stats: PokemonStat[] = STAT_KEYS.flatMap((key) => {
    const stat = pokemon.stats.find((s) => s.stat.name === key)
    return stat ? [{ key, value: stat.base_stat }] : []
  })
  return {
    ...toPokemon(pokemon, names.fr ?? pokemon.name),
    names,
    genus: localize(species.genera ?? [], (g) => g.genus),
    description: localize(
      species.flavor_text_entries ?? [],
      cleanFlavor,
      preferredFlavor,
    ),
    height: pokemon.height,
    weight: pokemon.weight,
    stats,
  }
}
