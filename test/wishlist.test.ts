import { describe, expect, it } from 'vitest'
import {
  addPokemon,
  fold,
  idFromUrl,
  isGen5,
  normalizeQuery,
  progress,
  removePokemon,
  searchSpecies,
  toggleCaptured,
  isPokemonType,
  isFull,
  WISHLIST_MAX,
} from '../app/utils/wishlist'
import type { SpeciesEntry, WishlistItem } from '../app/types/pokemon'

const make = (
  id: number,
  name: string,
  frName: string = name,
): WishlistItem => ({
  id,
  name,
  frName,
  sprite: null,
  icon: null,
  types: [],
  captured: false,
})

const vipelierre = make(495, 'snivy', 'Vipélierre')
const gruikui = make(498, 'tepig', 'Gruikui')
const pikachu = make(25, 'pikachu', 'Pikachu')

const index: SpeciesEntry[] = [
  { id: 494, name: 'victini', frName: 'Victini' },
  { id: 495, name: 'snivy', frName: 'Vipélierre' },
  { id: 498, name: 'tepig', frName: 'Gruikui' },
  { id: 501, name: 'oshawott', frName: 'Moustillon' },
  { id: 579, name: 'reuniclus', frName: 'Symbios' },
  { id: 643, name: 'reshiram', frName: 'Reshiram' },
  { id: 644, name: 'zekrom', frName: 'Zekrom' },
]

describe('isGen5', () => {
  it('accepte les bornes Victini (#494) et Genesect (#649)', () => {
    expect(isGen5(494)).toBe(true)
    expect(isGen5(649)).toBe(true)
  })
  it('refuse les autres générations', () => {
    expect(isGen5(493)).toBe(false)
    expect(isGen5(650)).toBe(false)
    expect(isGen5(25)).toBe(false)
  })
})

describe('isPokemonType', () => {
  it('accepte les 18 types connus', () => {
    expect(isPokemonType('grass')).toBe(true)
    expect(isPokemonType('dragon')).toBe(true)
  })
  it('refuse le reste', () => {
    expect(isPokemonType('plante')).toBe(false)
    expect(isPokemonType('shadow')).toBe(false)
    expect(isPokemonType(42)).toBe(false)
  })
})

describe('idFromUrl', () => {
  it("extrait le numéro d'une URL PokéAPI", () => {
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon-species/495/')).toBe(
      495,
    )
  })
})

describe('fold / normalizeQuery', () => {
  it('retire accents et majuscules', () => {
    expect(fold('Vipélierre')).toBe('vipelierre')
  })
  it('nettoie les espaces et les majuscules', () => {
    expect(normalizeQuery('  Snivy ')).toBe('snivy')
  })
  it('accepte un numéro avec # et zéros', () => {
    expect(normalizeQuery('#0495')).toBe('495')
  })
})

describe('searchSpecies', () => {
  it('trouve par numéro exact', () => {
    expect(searchSpecies(index, '#495').map((e) => e.id)).toEqual([495])
  })
  it('trouve par nom français, sans tenir compte des accents', () => {
    expect(searchSpecies(index, 'vipe').map((e) => e.frName)).toEqual([
      'Vipélierre',
    ])
    expect(searchSpecies(index, 'MOUSTI').map((e) => e.frName)).toEqual([
      'Moustillon',
    ])
  })
  it('trouve aussi par nom anglais', () => {
    expect(searchSpecies(index, 'tepig').map((e) => e.frName)).toEqual([
      'Gruikui',
    ])
  })
  it("classe le français avant l'anglais, et « commence par » avant « contient »", () => {
    expect(searchSpecies(index, 're').map((e) => e.frName)).toEqual([
      'Reshiram',
      'Symbios',
      'Vipélierre',
    ])
  })
  it('renvoie une liste vide pour une saisie vide', () => {
    expect(searchSpecies(index, '   ')).toEqual([])
  })
  it('respecte la limite', () => {
    expect(searchSpecies(index, 'o', 2)).toHaveLength(2)
  })
})

describe('addPokemon', () => {
  const team: WishlistItem[] = [
    make(495, 'snivy', 'Vipélierre'),
    make(498, 'tepig', 'Gruikui'),
    make(501, 'oshawott', 'Moustillon'),
    make(570, 'zorua', 'Zorua'),
    make(610, 'axew', 'Coupenotte'),
    make(633, 'deino', 'Solochi'),
  ]
  const zekrom = make(644, 'zekrom', 'Zekrom')

  describe('ajout', () => {
    it('ajoute un Pokémon à une liste vide', () => {
      const list = addPokemon([], vipelierre)
      expect(list).toHaveLength(1)
      expect(list[0]?.frName).toBe('Vipélierre')
    })
    it('le transforme en WishlistItem non capturé par défaut', () => {
      const pokemon = { ...vipelierre, captured: undefined }
      expect(addPokemon([], pokemon)[0]?.captured).toBe(false)
    })
    it('garde la liste triée par numéro', () => {
      const list = addPokemon(addPokemon([], gruikui), vipelierre)
      expect(list.map((p) => p.id)).toEqual([495, 498])
    })
    it("ne modifie pas la liste d'origine", () => {
      const original: WishlistItem[] = []
      addPokemon(original, vipelierre)
      expect(original).toHaveLength(0)
    })
    it('refuse un Pokémon hors 5e génération', () => {
      expect(addPokemon([], pikachu)).toEqual([])
    })
  })

  describe('doublon', () => {
    it("n'ajoute pas un Pokémon déjà présent", () => {
      const list = addPokemon([vipelierre], vipelierre)
      expect(list).toHaveLength(1)
    })
    it('renvoie la même liste, sans copie inutile', () => {
      const list = [vipelierre]
      expect(addPokemon(list, vipelierre)).toBe(list)
    })
    it("conserve l'état capturé de l'exemplaire déjà présent", () => {
      const list = [{ ...vipelierre, captured: true }]
      expect(addPokemon(list, vipelierre)[0]?.captured).toBe(true)
    })
  })

  describe(`liste pleine (${WISHLIST_MAX} Pokémon maximum)`, () => {
    it('la limite vaut 6', () => {
      expect(WISHLIST_MAX).toBe(6)
    })
    it('accepte le 6e Pokémon', () => {
      const five = team.slice(0, 5)
      expect(addPokemon(five, team[5]!)).toHaveLength(6)
      expect(isFull(five)).toBe(false)
    })
    it('refuse le 7e Pokémon : la liste reste à 6, inchangée', () => {
      expect(isFull(team)).toBe(true)
      const list = addPokemon(team, zekrom)
      expect(list).toHaveLength(6)
      expect(list).toBe(team)
      expect(list.some((p) => p.id === 644)).toBe(false)
    })
    it('accepte de nouveau un ajout après un retrait', () => {
      const five = removePokemon(team, 495)
      expect(addPokemon(five, zekrom).map((p) => p.id)).toContain(644)
    })
  })
})

describe('removePokemon / toggleCaptured', () => {
  it('retire un Pokémon', () => {
    expect(removePokemon([vipelierre, gruikui], 495)).toEqual([gruikui])
  })
  it("bascule l'état capturé", () => {
    const list = toggleCaptured([vipelierre], 495)
    expect(list[0]?.captured).toBe(true)
    expect(toggleCaptured(list, 495)[0]?.captured).toBe(false)
  })
})

describe('progress', () => {
  it('vaut 0 % pour une liste vide', () => {
    expect(progress([])).toEqual({ captured: 0, total: 0, percent: 0 })
  })
  it('calcule le pourcentage arrondi', () => {
    const list = [
      { ...vipelierre, captured: true },
      gruikui,
      make(501, 'oshawott'),
    ]
    expect(progress(list)).toEqual({ captured: 1, total: 3, percent: 33 })
  })
})
