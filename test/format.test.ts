import { describe, expect, it } from 'vitest'
import {
  formatDexNumber,
  formatHeight,
  formatWeight,
} from '../app/utils/format'

describe('formatDexNumber', () => {
  it('complète avec des zéros jusqu’à 3 chiffres', () => {
    expect(formatDexNumber(7)).toBe('007')
    expect(formatDexNumber(25)).toBe('025')
  })
  it('laisse tel quel un numéro de 3 chiffres', () => {
    expect(formatDexNumber(495)).toBe('495')
  })
})

describe('formatHeight / formatWeight (unités de PokéAPI)', () => {
  it('décimètres → mètres, point décimal en anglais (langue par défaut)', () => {
    expect(formatHeight(6)).toBe('0.6 m')
    expect(formatHeight(29, 'en')).toBe('2.9 m')
  })
  it('virgule décimale en français et en espagnol', () => {
    expect(formatHeight(6, 'fr')).toBe('0,6 m')
    expect(formatHeight(6, 'es')).toBe('0,6 m')
  })
  it('hectogrammes → kilogrammes', () => {
    expect(formatWeight(81, 'fr')).toBe('8,1 kg')
    expect(formatWeight(81, 'ja')).toBe('8.1 kg')
    expect(formatWeight(3450)).toBe('345 kg')
  })
})
