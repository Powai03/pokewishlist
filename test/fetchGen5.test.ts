// Le script de récupération des Pokémon d'Unys et la liste qu'il a produite (pré-rendu des fiches).
import { describe, expect, it } from 'vitest'
import gen5 from '../data/gen5-pokemon.json'
import {
  idFromUrl,
  parseGeneration,
  prerenderRoutes,
} from '../scripts/fetch-gen5-pokemon.mjs'

describe('scripts/fetch-gen5-pokemon.mjs', () => {
  it('idFromUrl : numéro à la fin d’une adresse PokéAPI', () => {
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon-species/495/')).toBe(
      495,
    )
  })

  it('parseGeneration : trié par numéro, limité à 494–649', () => {
    const species = (
      id: number,
      name: string,
    ): { name: string; url: string } => ({
      name,
      url: `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
    })
    expect(
      parseGeneration({
        pokemon_species: [
          species(498, 'tepig'),
          species(25, 'pikachu'), // hors 5e génération : écarté
          species(495, 'snivy'),
        ],
      }),
    ).toEqual([
      { id: 495, name: 'snivy' },
      { id: 498, name: 'tepig' },
    ])
  })

  it('prerenderRoutes : une route par nom', () => {
    expect(prerenderRoutes([{ id: 495, name: 'snivy' }])).toEqual([
      '/pokemon/snivy',
    ])
  })
})

describe('data/gen5-pokemon.json (routes pré-rendues)', () => {
  it('les 156 Pokémon d’Unys, de Victini (494) à Genesect (649), sans trou ni doublon', () => {
    expect(gen5).toHaveLength(156)
    expect(gen5.map((p) => p.id)).toEqual(
      Array.from({ length: 156 }, (_, i) => 494 + i),
    )
    expect(new Set(gen5.map((p) => p.name)).size).toBe(156)
  })

  it('des noms utilisables dans une adresse (minuscules, chiffres, tirets)', () => {
    for (const p of gen5) expect(p.name).toMatch(/^[a-z][a-z0-9-]*$/)
  })
})
