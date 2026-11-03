import { describe, expect, it, vi } from 'vitest'
import {
  fetchGen5Index,
  fetchPokemon,
  PokeApiError,
  PokemonNotFoundError,
} from '../app/utils/pokeapi'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function mockFetch(
  routes: Record<string, () => Response>,
): ReturnType<typeof vi.fn> {
  const fake = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input)
    const route = Object.keys(routes).find((key) => url.endsWith(key))
    return route ? routes[route]!() : jsonResponse(404, { detail: 'Not found' })
  })
  vi.stubGlobal('fetch', fake)
  return fake
}

const SNIVY = {
  id: 495,
  name: 'snivy',
  types: [{ slot: 1, type: { name: 'grass' } }],
  sprites: {
    front_default: 'https://img/495.png',
    versions: {
      'generation-v': {
        'black-white': {
          front_default: 'https://img/bw/495.png',
          animated: { front_default: 'https://img/bw/animated/495.gif' },
        },
      },
      'generation-vii': {
        icons: { front_default: 'https://img/icons/495.png' },
      },
    },
  },
}

const ZEKROM = {
  id: 644,
  name: 'zekrom',
  types: [
    { slot: 2, type: { name: 'electric' } },
    { slot: 1, type: { name: 'dragon' } },
  ],
  sprites: { front_default: null },
}

describe('fetchPokemon', () => {
  describe('réponse 200', () => {
    it('transforme la réponse de PokéAPI en Pokemon', async () => {
      mockFetch({ '/pokemon/495': () => jsonResponse(200, SNIVY) })

      const pokemon = await fetchPokemon({
        id: 495,
        name: 'snivy',
        frName: 'Vipélierre',
      })

      expect(pokemon).toEqual({
        id: 495,
        name: 'snivy',
        frName: 'Vipélierre',
        sprite: 'https://img/bw/animated/495.gif',
        icon: 'https://img/icons/495.png',
        types: ['grass'],
      })
    })

    it('appelle la bonne URL, une seule fois quand le nom français est connu', async () => {
      const fake = mockFetch({ '/pokemon/495': () => jsonResponse(200, SNIVY) })

      await fetchPokemon({ id: 495, name: 'snivy', frName: 'Vipélierre' })

      expect(fake).toHaveBeenCalledTimes(1)
      expect(fake).toHaveBeenCalledWith(
        'https://pokeapi.co/api/v2/pokemon/495',
        undefined,
      )
    })

    it("demande le nom français à /pokemon-species quand il n'est pas connu", async () => {
      const fake = mockFetch({
        '/pokemon/495': () => jsonResponse(200, SNIVY),
        '/pokemon-species/495': () =>
          jsonResponse(200, {
            names: [
              { name: 'Snivy', language: { name: 'en' } },
              { name: 'Vipélierre', language: { name: 'fr' } },
            ],
          }),
      })

      const pokemon = await fetchPokemon({ id: 495, name: 'snivy' })

      expect(pokemon.frName).toBe('Vipélierre')
      expect(fake).toHaveBeenCalledTimes(2)
    })

    it('trie les types par slot et gère un Pokémon sans sprite', async () => {
      mockFetch({ '/pokemon/644': () => jsonResponse(200, ZEKROM) })

      const pokemon = await fetchPokemon({
        id: 644,
        name: 'zekrom',
        frName: 'Zekrom',
      })

      expect(pokemon.types).toEqual(['dragon', 'electric'])
      expect(pokemon.sprite).toBeNull()
      expect(pokemon.icon).toBeNull()
    })
  })

  describe('Pokémon introuvable (404)', () => {
    it('lève une PokemonNotFoundError', async () => {
      mockFetch({
        '/pokemon/600': () => jsonResponse(404, { detail: 'Not found.' }),
      })

      await expect(
        fetchPokemon({ id: 600, name: 'klang', frName: 'Clic' }),
      ).rejects.toBeInstanceOf(PokemonNotFoundError)
    })

    it("donne le statut 404 et l'URL demandée", async () => {
      mockFetch({
        '/pokemon/600': () => jsonResponse(404, { detail: 'Not found.' }),
      })

      await expect(
        fetchPokemon({ id: 600, name: 'klang', frName: 'Clic' }),
      ).rejects.toMatchObject({
        status: 404,
        url: 'https://pokeapi.co/api/v2/pokemon/600',
      })
    })
  })

  describe('autres erreurs', () => {
    it("une erreur serveur (500) n'est PAS confondue avec « introuvable »", async () => {
      mockFetch({ '/pokemon/495': () => jsonResponse(500, {}) })

      const promise = fetchPokemon({
        id: 495,
        name: 'snivy',
        frName: 'Vipélierre',
      })

      await expect(promise).rejects.toBeInstanceOf(PokeApiError)
      await expect(promise).rejects.not.toBeInstanceOf(PokemonNotFoundError)
    })

    it("refuse un Pokémon hors 5e génération sans même appeler l'API", async () => {
      const fake = mockFetch({})

      await expect(
        fetchPokemon({ id: 25, name: 'pikachu', frName: 'Pikachu' }),
      ).rejects.toThrow("n'est pas de 5e génération")
      expect(fake).not.toHaveBeenCalled()
    })
  })
})

describe('fetchGen5Index', () => {
  it('réponse 200 de GraphQL : index avec les noms français', async () => {
    mockFetch({
      '/graphql/v1beta': () =>
        jsonResponse(200, {
          data: {
            species: [
              { id: 495, name: 'snivy', names: [{ name: 'Vipélierre' }] },
              { id: 25, name: 'pikachu', names: [{ name: 'Pikachu' }] },
            ],
          },
        }),
    })

    expect(await fetchGen5Index()).toEqual([
      { id: 495, name: 'snivy', frName: 'Vipélierre' },
    ])
  })

  it("GraphQL en panne : bascule sur l'API REST (noms anglais)", async () => {
    const fake = mockFetch({
      '/graphql/v1beta': () => jsonResponse(503, {}),
      '/generation/5': () =>
        jsonResponse(200, {
          pokemon_species: [
            {
              name: 'tepig',
              url: 'https://pokeapi.co/api/v2/pokemon-species/498/',
            },
            {
              name: 'snivy',
              url: 'https://pokeapi.co/api/v2/pokemon-species/495/',
            },
          ],
        }),
    })

    expect(await fetchGen5Index()).toEqual([
      { id: 495, name: 'snivy' },
      { id: 498, name: 'tepig' },
    ])
    expect(fake).toHaveBeenCalledTimes(2)
  })
})

describe('filet de sécurité (test/setup.ts)', () => {
  it('sans mock, tout appel réseau est refusé', async () => {
    await expect(
      fetchPokemon({ id: 495, name: 'snivy', frName: 'Vipélierre' }),
    ).rejects.toThrow('Appel réseau réel interdit')
  })
})
