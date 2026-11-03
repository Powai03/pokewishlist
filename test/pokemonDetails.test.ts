// Fiche d'un Pokémon (page /pokemon/:id) : lecture de l'adresse et chargement depuis PokéAPI (fetch simulé).
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PokeApiError,
  PokemonNotFoundError,
  fetchPokemonDetails,
  parsePokemonParam,
} from '../app/utils/pokeapi'

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

/** Faux `fetch` : répond selon la fin de l'URL, 404 sinon ; enregistre les URL demandées. */
function mockFetch(routes: Record<string, unknown>): ReturnType<typeof vi.fn> {
  const fake = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input)
    const key = Object.keys(routes).find((k) => url.endsWith(k))
    return key ? json(200, routes[key]) : json(404, { detail: 'Not found' })
  })
  vi.stubGlobal('fetch', fake)
  return fake
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// Réponses réduites de PokéAPI pour Vipélierre (#495), au format réel.
const SNIVY = {
  id: 495,
  name: 'snivy',
  height: 6,
  weight: 81,
  types: [{ slot: 1, type: { name: 'grass' } }],
  stats: [
    { base_stat: 63, stat: { name: 'speed' } }, // volontairement dans le désordre
    { base_stat: 45, stat: { name: 'hp' } },
    { base_stat: 45, stat: { name: 'attack' } },
    { base_stat: 55, stat: { name: 'defense' } },
    { base_stat: 45, stat: { name: 'special-attack' } },
    { base_stat: 55, stat: { name: 'special-defense' } },
  ],
  sprites: { front_default: 'https://img/495.png' },
}
const SNIVY_SPECIES = {
  id: 495,
  names: [
    { name: 'Snivy', language: { name: 'en' } },
    { name: 'Vipélierre', language: { name: 'fr' } },
    { name: 'ツタージャ', language: { name: 'ja-Hrkt' } },
    { name: 'Snivy', language: { name: 'es' } },
  ],
  genera: [
    { genus: 'Grass Snake Pokémon', language: { name: 'en' } },
    { genus: 'Pokémon Serpenterbe', language: { name: 'fr' } },
    { genus: 'くさへびポケモン', language: { name: 'ja' } },
  ],
  flavor_text_entries: [
    {
      flavor_text: 'Texte de X.',
      language: { name: 'fr' },
      version: { name: 'x' },
    },
    {
      flavor_text: 'It is very\nintelligent.',
      language: { name: 'en' },
      version: { name: 'black' },
    },
    {
      flavor_text: 'Un Pokémon intelligent\net très calme.\fIl aime le soleil.',
      language: { name: 'fr' },
      version: { name: 'white' },
    },
  ],
}

describe('parsePokemonParam (adresse /pokemon/:id)', () => {
  it.each([
    ['495', 495],
    [' 649 ', 649],
    ['snivy', 'snivy'],
    ['Snivy', 'snivy'],
    ['mr-mime', 'mr-mime'],
  ])('« %s » → %s', (raw, value) => {
    expect(parsePokemonParam(raw)).toEqual({ ok: true, value })
  })

  it('numéro hors 5e génération → refusé avec un code (traduit par la page)', () => {
    expect(parsePokemonParam('25')).toEqual({
      ok: false,
      reason: 'notGen5',
      id: 25,
    })
  })

  it('texte invalide → code « invalidName » avec le texte saisi', () => {
    expect(parsePokemonParam('<b>')).toEqual({
      ok: false,
      reason: 'invalidName',
      raw: '<b>',
    })
  })

  it.each(['', '<script>', '../etc', 'a b', '-1', '1.5'])(
    'texte invalide « %s » → refusé',
    (raw) => {
      expect(parsePokemonParam(raw).ok).toBe(false)
    },
  )
})

describe('fetchPokemonDetails (200)', () => {
  it('assemble la fiche à partir de /pokemon et /pokemon-species', async () => {
    const fake = mockFetch({
      '/pokemon/495': SNIVY,
      '/pokemon-species/495': SNIVY_SPECIES,
    })

    const p = await fetchPokemonDetails(495)

    expect(fake).toHaveBeenCalledTimes(2)
    expect(p).toMatchObject({
      id: 495,
      name: 'snivy',
      frName: 'Vipélierre',
      genus: { en: 'Grass Snake Pokémon', fr: 'Pokémon Serpenterbe' },
      types: ['grass'],
      height: 6,
      weight: 81,
    })
  })

  it('garde le nom dans chacune des 4 langues (japonais : repli sur « ja-Hrkt »)', async () => {
    mockFetch({
      '/pokemon/495': SNIVY,
      '/pokemon-species/495': SNIVY_SPECIES,
    })
    const p = await fetchPokemonDetails(495)
    expect(p.names).toEqual({
      en: 'Snivy',
      fr: 'Vipélierre',
      es: 'Snivy',
      ja: 'ツタージャ',
    })
  })

  it('préfère le texte de Noir et Blanc dans chaque langue, sans retours à la ligne du jeu', async () => {
    mockFetch({
      '/pokemon/495': SNIVY,
      '/pokemon-species/495': SNIVY_SPECIES,
    })
    const p = await fetchPokemonDetails(495)
    expect(p.description).toEqual({
      fr: 'Un Pokémon intelligent et très calme. Il aime le soleil.',
      en: 'It is very intelligent.',
    })
  })

  it('statistiques dans l’ordre du jeu (clés traduites par la page)', async () => {
    mockFetch({
      '/pokemon/495': SNIVY,
      '/pokemon-species/495': SNIVY_SPECIES,
    })
    const p = await fetchPokemonDetails(495)
    expect(p.stats.map((s) => `${s.key} ${s.value}`)).toEqual([
      'hp 45',
      'attack 45',
      'defense 55',
      'special-attack 45',
      'special-defense 55',
      'speed 63',
    ])
  })

  it('sans aucun texte → objets vides (la page affiche un texte par défaut)', async () => {
    mockFetch({
      '/pokemon/495': SNIVY,
      '/pokemon-species/495': { id: 495, names: [] },
    })
    const p = await fetchPokemonDetails(495)
    expect(p).toMatchObject({
      frName: 'snivy',
      names: {},
      genus: {},
      description: {},
    })
  })

  it('accepte un nom et une autre adresse de PokéAPI (base configurable)', async () => {
    const fake = mockFetch({
      '/pokemon/snivy': SNIVY,
      '/pokemon-species/snivy': SNIVY_SPECIES,
    })
    await fetchPokemonDetails('snivy', 'http://mock.test/api/')
    expect(fake).toHaveBeenCalledWith(
      'http://mock.test/api/pokemon/snivy',
      undefined,
    )
  })
})

describe('fetchPokemonDetails (cas 404)', () => {
  it('Pokémon inconnu de PokéAPI → PokemonNotFoundError', async () => {
    mockFetch({})
    await expect(fetchPokemonDetails(9999)).rejects.toBeInstanceOf(
      PokemonNotFoundError,
    )
  })

  it('Pokémon qui existe mais pas en 5e génération (pikachu) → PokemonNotFoundError aussi', async () => {
    mockFetch({
      '/pokemon/pikachu': { ...SNIVY, id: 25, name: 'pikachu' },
      '/pokemon-species/pikachu': { ...SNIVY_SPECIES, id: 25 },
    })
    await expect(fetchPokemonDetails('pikachu')).rejects.toBeInstanceOf(
      PokemonNotFoundError,
    )
  })

  it('PokéAPI en panne (500) → PokeApiError, pas un 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(500, {})),
    )
    const promise = fetchPokemonDetails(495)
    await expect(promise).rejects.toBeInstanceOf(PokeApiError)
    await expect(promise).rejects.not.toBeInstanceOf(PokemonNotFoundError)
  })
})
