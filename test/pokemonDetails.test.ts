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
  ],
  genera: [
    { genus: 'Grass Snake Pokémon', language: { name: 'en' } },
    { genus: 'Pokémon Serpenterbe', language: { name: 'fr' } },
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

  it('numéro hors 5e génération → refusé avec une explication', () => {
    const result = parsePokemonParam('25')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('494 à 649')
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
      genus: 'Pokémon Serpenterbe',
      types: ['grass'],
      height: 6,
      weight: 81,
    })
  })

  it('préfère le texte français de Noir et Blanc, sans retours à la ligne du jeu', async () => {
    mockFetch({
      '/pokemon/495': SNIVY,
      '/pokemon-species/495': SNIVY_SPECIES,
    })
    const p = await fetchPokemonDetails(495)
    expect(p.description).toBe(
      'Un Pokémon intelligent et très calme. Il aime le soleil.',
    )
  })

  it('statistiques dans l’ordre du jeu, avec les libellés français', async () => {
    mockFetch({
      '/pokemon/495': SNIVY,
      '/pokemon-species/495': SNIVY_SPECIES,
    })
    const p = await fetchPokemonDetails(495)
    expect(p.stats.map((s) => `${s.label} ${s.value}`)).toEqual([
      'PV 45',
      'Attaque 45',
      'Défense 55',
      'Atq. Spé. 45',
      'Déf. Spé. 55',
      'Vitesse 63',
    ])
  })

  it('sans texte ni catégorie en français → null (la page affiche un texte par défaut)', async () => {
    mockFetch({
      '/pokemon/495': SNIVY,
      '/pokemon-species/495': { id: 495, names: [] },
    })
    const p = await fetchPokemonDetails(495)
    expect(p).toMatchObject({ frName: 'snivy', genus: null, description: null })
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
