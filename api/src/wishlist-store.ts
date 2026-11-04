import type { Translatable } from './i18n.js'

export const GEN5 = { first: 494, last: 649 } as const

export const WISHLIST_MAX = 6

export interface WishlistInput {
  id: number
  name: string
  frName: string
  sprite: string | null
  icon: string | null
  types: string[]
}

export interface WishlistItem extends WishlistInput {
  captured: boolean
  addedAt: string
}

export type Validation<T> =
  { ok: true; value: T } | { ok: false; error: Translatable }

export type AddResult =
  | { ok: true; item: WishlistItem }
  | { ok: false; reason: 'duplicate' | 'full' }
  | { ok: false; reason: 'invalid'; detail: string }

export interface WishlistStore {
  list(): Promise<WishlistItem[]>
  add(input: WishlistInput): Promise<AddResult>
  setCaptured(id: number, captured: boolean): Promise<WishlistItem | undefined>
  remove(id: number): Promise<WishlistItem | undefined>
  likes(id: number): Promise<number>
  like(id: number): Promise<number>
}

export function isGen5(id: number): boolean {
  return Number.isInteger(id) && id >= GEN5.first && id <= GEN5.last
}

const isShortText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim() !== '' && value.length <= max

function optionalUrl(field: string, value: unknown): Validation<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null }
  if (
    typeof value === 'string' &&
    value.length <= 500 &&
    /^https?:\/\//.test(value)
  ) {
    return { ok: true, value }
  }
  return { ok: false, error: { key: 'urlInvalid', params: { field } } }
}

const NAME_MAX = 50

export function validateInput(body: unknown): Validation<WishlistInput> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: { key: 'bodyNotObject' } }
  }
  const b = body as Record<string, unknown>
  if (typeof b.id !== 'number' || !Number.isInteger(b.id)) {
    return { ok: false, error: { key: 'idInteger' } }
  }
  if (!isGen5(b.id)) {
    return {
      ok: false,
      error: { key: 'idGen5', params: { first: GEN5.first, last: GEN5.last } },
    }
  }
  if (typeof b.name !== 'string' || b.name.trim() === '') {
    return { ok: false, error: { key: 'nameRequired' } }
  }
  if (b.name.trim().length > NAME_MAX) {
    return {
      ok: false,
      error: { key: 'nameTooLong', params: { max: NAME_MAX } },
    }
  }
  if (b.frName !== undefined && !isShortText(b.frName, NAME_MAX)) {
    return {
      ok: false,
      error: { key: 'frNameInvalid', params: { max: NAME_MAX } },
    }
  }
  const sprite = optionalUrl('sprite', b.sprite)
  if (!sprite.ok) return sprite
  const icon = optionalUrl('icon', b.icon)
  if (!icon.ok) return icon
  const types = b.types ?? []
  if (
    !Array.isArray(types) ||
    types.length > 2 ||
    !types.every((t) => isShortText(t, 20))
  ) {
    return { ok: false, error: { key: 'typesInvalid' } }
  }
  const name = b.name.trim()
  return {
    ok: true,
    value: {
      id: b.id,
      name,
      frName: typeof b.frName === 'string' ? b.frName.trim() : name,
      sprite: sprite.value,
      icon: icon.value,
      types: types as string[],
    },
  }
}

export function validatePatch(
  body: unknown,
): Validation<{ captured: boolean }> {
  if (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>).captured === 'boolean'
  ) {
    return {
      ok: true,
      value: { captured: (body as { captured: boolean }).captured },
    }
  }
  return { ok: false, error: { key: 'capturedInvalid' } }
}

export class MemoryWishlistStore implements WishlistStore {
  private items: WishlistItem[] = []

  private find(id: number): WishlistItem | undefined {
    return this.items.find((item) => item.id === id)
  }

  async list(): Promise<WishlistItem[]> {
    return [...this.items].sort((a, b) => a.id - b.id)
  }

  async add(input: WishlistInput): Promise<AddResult> {
    if (this.find(input.id)) return { ok: false, reason: 'duplicate' }
    if (this.items.length >= WISHLIST_MAX) return { ok: false, reason: 'full' }
    const item: WishlistItem = {
      ...input,
      captured: false,
      addedAt: new Date().toISOString(),
    }
    this.items.push(item)
    return { ok: true, item }
  }

  async setCaptured(
    id: number,
    captured: boolean,
  ): Promise<WishlistItem | undefined> {
    const item = this.find(id)
    if (item) item.captured = captured
    return item
  }

  async remove(id: number): Promise<WishlistItem | undefined> {
    const item = this.find(id)
    if (item) this.items = this.items.filter((i) => i.id !== id)
    return item
  }

  private likeCounts = new Map<number, number>()

  async likes(id: number): Promise<number> {
    return this.likeCounts.get(id) ?? 0
  }

  async like(id: number): Promise<number> {
    const total = (this.likeCounts.get(id) ?? 0) + 1
    this.likeCounts.set(id, total)
    return total
  }
}
