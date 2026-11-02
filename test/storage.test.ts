import { describe, expect, it } from 'vitest'
import type { WishlistItem } from '../app/types/pokemon'
import {
  STORAGE_KEY,
  loadWishlist,
  parseStoredWishlist,
  saveWishlist,
  type KeyValueStorage,
} from '../app/utils/storage'
import { WISHLIST_MAX } from '../app/utils/wishlist'

// ── Faux stockages ────────────────────────────────────────────────────────────
// Un faux localStorage en mémoire : même interface (getItem / setItem), mais on peut lire `data`.
class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>()
  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial))
      this.data.set(key, value)
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value))
  }
}

// Un stockage qui refuse tout, comme en navigation privée stricte ou quand le quota est dépassé.
const brokenStorage: KeyValueStorage = {
  getItem: (): string | null => {
    throw new DOMException('Accès refusé', 'SecurityError')
  },
  setItem: (): void => {
    throw new DOMException('Stockage plein', 'QuotaExceededError')
  },
}

// Un stockage qui contient déjà `raw` (texte brut) sous la clé de l'appli.
const storageWith = (raw: string): MemoryStorage =>
  new MemoryStorage({ [STORAGE_KEY]: raw })

const make = (
  id: number,
  name: string,
  frName: string = name,
  captured: boolean = false,
): WishlistItem => ({
  id,
  name,
  frName,
  sprite: null,
  icon: null,
  types: [],
  captured,
})

const vipelierre: WishlistItem = {
  ...make(495, 'snivy', 'Vipélierre'),
  sprite: 'https://img/495.gif',
  icon: 'https://img/icons/495.png',
  types: ['grass'],
}
const gruikui = make(498, 'tepig', 'Gruikui', true)
const pikachu = make(25, 'pikachu', 'Pikachu') // 1re génération : jamais relu

// ── Sauvegarde ────────────────────────────────────────────────────────────────
describe('sauvegarde (saveWishlist)', () => {
  it('écrit la liste en JSON sous la clé « pokewishlist »', () => {
    const storage = new MemoryStorage()

    expect(saveWishlist([vipelierre, gruikui], storage)).toBe(true)

    expect(STORAGE_KEY).toBe('pokewishlist')
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toEqual([
      vipelierre,
      gruikui,
    ])
  })

  it('sauvegarde une liste vide comme « [] »', () => {
    const storage = new MemoryStorage()
    saveWishlist([], storage)
    expect(storage.data.get(STORAGE_KEY)).toBe('[]')
  })

  it('remplace la sauvegarde précédente', () => {
    const storage = new MemoryStorage()
    saveWishlist([vipelierre, gruikui], storage)
    saveWishlist([gruikui], storage)
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toEqual([gruikui])
  })

  it('stockage plein ou bloqué : renvoie false, sans planter', () => {
    expect(() => saveWishlist([vipelierre], brokenStorage)).not.toThrow()
    expect(saveWishlist([vipelierre], brokenStorage)).toBe(false)
  })
})

// ── Lecture ───────────────────────────────────────────────────────────────────
describe('lecture (loadWishlist)', () => {
  it("relit à l'identique ce qui a été sauvegardé (aller-retour)", () => {
    const storage = new MemoryStorage()
    saveWishlist([vipelierre, gruikui], storage)

    expect(loadWishlist(storage)).toEqual([vipelierre, gruikui])
  })

  it("conserve l'état « capturé »", () => {
    const list = loadWishlist(
      storageWith(JSON.stringify([vipelierre, gruikui])),
    )
    expect(list.map((p) => p.captured)).toEqual([false, true])
  })

  it('remet la liste dans l’ordre du Pokédex', () => {
    const list = loadWishlist(
      storageWith(JSON.stringify([gruikui, vipelierre])),
    )
    expect(list.map((p) => p.id)).toEqual([495, 498])
  })

  it('complète les champs absents (sauvegarde d’une ancienne version)', () => {
    const list = loadWishlist(
      storageWith(JSON.stringify([{ id: 501, name: 'oshawott' }])),
    )
    expect(list).toEqual([make(501, 'oshawott')])
  })

  it(`ne relit que ${WISHLIST_MAX} Pokémon même si le stockage en contient plus`, () => {
    const ids = [494, 495, 496, 497, 498, 499, 500, 501]
    const raw = JSON.stringify(ids.map((id) => make(id, `p${id}`)))
    expect(loadWishlist(storageWith(raw))).toHaveLength(WISHLIST_MAX)
  })
})

// ── Stockage vide ─────────────────────────────────────────────────────────────
describe('stockage vide', () => {
  it('rien de sauvegardé (première visite) → liste vide', () => {
    expect(loadWishlist(new MemoryStorage())).toEqual([])
  })

  it.each([
    ['chaîne vide', ''],
    ['tableau vide', '[]'],
    ['null', 'null'],
  ])('%s → liste vide', (_label, raw) => {
    expect(loadWishlist(storageWith(raw))).toEqual([])
  })

  it('stockage inaccessible (navigation privée stricte) → liste vide, sans planter', () => {
    expect(() => loadWishlist(brokenStorage)).not.toThrow()
    expect(loadWishlist(brokenStorage)).toEqual([])
  })
})

// ── JSON invalide ─────────────────────────────────────────────────────────────
describe('JSON invalide', () => {
  // Chaque texte ci-dessous a été écrit à la place d'une vraie sauvegarde.
  it.each([
    ['JSON cassé', '{pas du json'],
    ['sauvegarde coupée au milieu', '[{"id":495,"name":"sni'],
    ['mot-clé JavaScript (pas du JSON)', 'undefined'],
    ['texte au lieu d’un tableau', '"texte"'],
    ['nombre au lieu d’un tableau', '42'],
    ['objet au lieu d’un tableau', '{"id":495,"name":"snivy"}'],
    ['caractères binaires', '\u0000ÿ\u0001'],
  ])('%s → liste vide, sans planter', (_label, raw) => {
    expect(() => loadWishlist(storageWith(raw))).not.toThrow()
    expect(loadWishlist(storageWith(raw))).toEqual([])
  })

  it('tableau en partie abîmé : garde les entrées valides, écarte le reste', () => {
    const raw = JSON.stringify([
      vipelierre,
      null, // pas un objet
      'snivy', // pas un objet
      { id: 'x', name: 'zorua' }, // numéro invalide
      { id: 570 }, // pas de nom
      pikachu, // hors 5e génération
      { ...gruikui, types: ['fire', 'feu', 7] }, // types inconnus écartés
    ])

    const list = loadWishlist(storageWith(raw))

    expect(list.map((p) => p.id)).toEqual([495, 498])
    expect(list[1]?.types).toEqual(['fire'])
  })

  it('parseStoredWishlist(null) → liste vide', () => {
    expect(parseStoredWishlist(null)).toEqual([])
  })
})
