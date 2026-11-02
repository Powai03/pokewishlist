import { describe, expect, it } from 'vitest'
import { formatDexNumber } from '../app/utils/format'

describe('formatDexNumber', () => {
  it('complète avec des zéros jusqu’à 3 chiffres', () => {
    expect(formatDexNumber(7)).toBe('007')
    expect(formatDexNumber(25)).toBe('025')
  })
  it('laisse tel quel un numéro de 3 chiffres', () => {
    expect(formatDexNumber(495)).toBe('495')
  })
})
