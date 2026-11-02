import { describe, expect, it } from 'vitest'
import { addPokemon, normalizeQuery, progress, removePokemon, toggleCaptured, type Pokemon } from '../app/utils/wishlist'

const pikachu: Pokemon = { id: 25, name: 'pikachu', sprite: null, captured: false }
const bulbizarre: Pokemon = { id: 1, name: 'bulbasaur', sprite: null, captured: false }

describe('normalizeQuery', () => {
  it('nettoie les espaces et les majuscules', () => {
    expect(normalizeQuery('  Pikachu ')).toBe('pikachu')
  })
  it('accepte un numéro avec # et zéros', () => {
    expect(normalizeQuery('#025')).toBe('25')
  })
})

describe('addPokemon', () => {
  it('ajoute et trie par numéro', () => {
    const list = addPokemon(addPokemon([], pikachu), bulbizarre)
    expect(list.map(p => p.id)).toEqual([1, 25])
  })
  it('ignore les doublons', () => {
    const list = addPokemon([pikachu], pikachu)
    expect(list).toHaveLength(1)
  })
  it('ne modifie pas la liste d\'origine', () => {
    const original: Pokemon[] = []
    addPokemon(original, pikachu)
    expect(original).toHaveLength(0)
  })
})

describe('removePokemon / toggleCaptured', () => {
  it('retire un Pokémon', () => {
    expect(removePokemon([pikachu, bulbizarre], 25)).toEqual([bulbizarre])
  })
  it('bascule l\'état capturé', () => {
    const list = toggleCaptured([pikachu], 25)
    expect(list[0]?.captured).toBe(true)
    expect(toggleCaptured(list, 25)[0]?.captured).toBe(false)
  })
})

describe('progress', () => {
  it('vaut 0 % pour une liste vide', () => {
    expect(progress([])).toEqual({ captured: 0, total: 0, percent: 0 })
  })
  it('calcule le pourcentage arrondi', () => {
    const list = [{ ...pikachu, captured: true }, bulbizarre, { ...bulbizarre, id: 4 }]
    expect(progress(list)).toEqual({ captured: 1, total: 3, percent: 33 })
  })
})
