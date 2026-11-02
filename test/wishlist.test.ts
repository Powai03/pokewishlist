import { describe, expect, it } from 'vitest'
import {
  addPokemon,
  fold,
  idFromUrl,
  isGen5,
  normalizeQuery,
  parseStoredWishlist,
  progress,
  removePokemon,
  searchSpecies,
  toggleCaptured,
  type Pokemon,
  type SpeciesEntry,
} from '../app/utils/wishlist'

const make = (id: number, name: string, frName = name): Pokemon => ({
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
const pikachu = make(25, 'pikachu', 'Pikachu') // 1re génération : doit être refusé

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
    expect(isGen5(493)).toBe(false) // Arceus, 4e gén.
    expect(isGen5(650)).toBe(false) // Marisson, 6e gén.
    expect(isGen5(25)).toBe(false)
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
    // « re » : Reshiram (le français commence par « re ») > Symbios (l'anglais « reuniclus » commence)
    //          > Vipélierre (le français contient « re »)
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
  it('ajoute et trie par numéro', () => {
    const list = addPokemon(addPokemon([], gruikui), vipelierre)
    expect(list.map((p) => p.id)).toEqual([495, 498])
  })
  it('ignore les doublons', () => {
    expect(addPokemon([vipelierre], vipelierre)).toHaveLength(1)
  })
  it('refuse un Pokémon hors 5e génération', () => {
    expect(addPokemon([], pikachu)).toEqual([])
  })
  it("ne modifie pas la liste d'origine", () => {
    const original: Pokemon[] = []
    addPokemon(original, vipelierre)
    expect(original).toHaveLength(0)
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

describe('parseStoredWishlist (relecture du localStorage)', () => {
  it("relit une liste sauvegardée à l'identique", () => {
    const saved = [vipelierre, { ...gruikui, captured: true }]
    expect(parseStoredWishlist(JSON.stringify(saved))).toEqual(saved)
  })
  it("renvoie une liste vide si rien n'est sauvegardé ou si le JSON est cassé", () => {
    expect(parseStoredWishlist(null)).toEqual([])
    expect(parseStoredWishlist('{pas du json')).toEqual([])
    expect(parseStoredWishlist('"texte"')).toEqual([])
  })
  it('écarte les entrées invalides et hors 5e génération', () => {
    const raw = JSON.stringify([
      vipelierre,
      pikachu,
      null,
      { id: 'x' },
      { id: 501, name: 'oshawott' },
    ])
    const list = parseStoredWishlist(raw)
    expect(list.map((p) => p.id)).toEqual([495, 501])
    expect(list[1]).toEqual(make(501, 'oshawott')) // champs manquants complétés
  })
})
