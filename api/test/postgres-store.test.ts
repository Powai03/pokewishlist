import { describe, expect, it } from 'vitest'
import {
  insertErrorToResult,
  rowToItem,
  type WishlistRow,
} from '../src/postgres-store.js'

describe('rowToItem (ligne SQL → JSON de l’API)', () => {
  it('passe en camelCase et convertit la date en texte ISO', () => {
    const row: WishlistRow = {
      id: 495,
      name: 'snivy',
      fr_name: 'Vipélierre',
      sprite: null,
      icon: 'https://img/icons/495.png',
      types: ['grass'],
      captured: true,
      added_at: new Date('2026-11-03T10:00:00.000Z'),
    }
    expect(rowToItem(row)).toEqual({
      id: 495,
      name: 'snivy',
      frName: 'Vipélierre',
      sprite: null,
      icon: 'https://img/icons/495.png',
      types: ['grass'],
      captured: true,
      addedAt: '2026-11-03T10:00:00.000Z',
    })
  })
})

describe('insertErrorToResult (refus de la base → réponse métier)', () => {
  it('23505 (clé primaire déjà prise) → doublon', () => {
    expect(
      insertErrorToResult({ code: '23505', constraint_name: 'wishlist_pkey' }),
    ).toEqual({ ok: false, reason: 'duplicate' })
  })

  it('23514 sans contrainte nommée (déclencheur des 6) → liste pleine', () => {
    expect(insertErrorToResult({ code: '23514' })).toEqual({
      ok: false,
      reason: 'full',
    })
  })

  it('23514 sur une contrainte CHECK → donnée invalide, avec son nom', () => {
    expect(
      insertErrorToResult({
        code: '23514',
        constraint_name: 'wishlist_types_known',
      }),
    ).toEqual({ ok: false, reason: 'invalid', detail: 'wishlist_types_known' })
  })

  it('autre erreur (base injoignable…) → null : elle sera remontée (500)', () => {
    expect(insertErrorToResult({ code: 'ECONNREFUSED' })).toBeNull()
    expect(insertErrorToResult(new Error('boom'))).toBeNull()
    expect(insertErrorToResult(null)).toBeNull()
  })
})
