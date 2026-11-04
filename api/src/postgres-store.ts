import postgres from 'postgres'
import type {
  AddResult,
  WishlistInput,
  WishlistItem,
  WishlistStore,
} from './wishlist-store.js'

export interface WishlistRow {
  id: number
  name: string
  fr_name: string
  sprite: string | null
  icon: string | null
  types: string[]
  captured: boolean
  added_at: Date
}

export function rowToItem(row: WishlistRow): WishlistItem {
  return {
    id: row.id,
    name: row.name,
    frName: row.fr_name,
    sprite: row.sprite,
    icon: row.icon,
    types: row.types,
    captured: row.captured,
    addedAt: row.added_at.toISOString(),
  }
}

const UNIQUE_VIOLATION = '23505'
const CHECK_VIOLATION = '23514'

export function insertErrorToResult(error: unknown): AddResult | null {
  if (typeof error !== 'object' || error === null) return null
  const { code, constraint_name: constraint } = error as {
    code?: unknown
    constraint_name?: unknown
  }
  if (code === UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate' }
  if (code === CHECK_VIOLATION) {
    return typeof constraint === 'string' && constraint !== ''
      ? { ok: false, reason: 'invalid', detail: constraint }
      : { ok: false, reason: 'full' }
  }
  return null
}

export interface PostgresStoreOptions {
  ssl?: boolean
  max?: number
  idleTimeout?: number
  maxLifetime?: number
}

export class PostgresWishlistStore implements WishlistStore {
  private readonly sql: postgres.Sql

  constructor(url: string, options: PostgresStoreOptions = {}) {
    this.sql = postgres(url, {
      max: options.max ?? 5,
      ssl: options.ssl === false ? false : 'require',
      prepare: false,
      idle_timeout: options.idleTimeout,
      ...(options.maxLifetime ? { max_lifetime: options.maxLifetime } : {}),
      onnotice: () => {},
    })
  }

  async list(): Promise<WishlistItem[]> {
    const rows = await this.sql<WishlistRow[]>`
      select * from public.wishlist order by id`
    return rows.map(rowToItem)
  }

  async add(input: WishlistInput): Promise<AddResult> {
    try {
      const [row] = await this.sql<WishlistRow[]>`
        insert into public.wishlist (id, name, fr_name, sprite, icon, types)
        values (${input.id}, ${input.name}, ${input.frName},
                ${input.sprite}, ${input.icon}, ${input.types})
        returning *`
      if (!row) throw new Error("L'insertion n'a renvoyé aucune ligne")
      return { ok: true, item: rowToItem(row) }
    } catch (error: unknown) {
      const refused = insertErrorToResult(error)
      if (refused) return refused
      throw error
    }
  }

  async setCaptured(
    id: number,
    captured: boolean,
  ): Promise<WishlistItem | undefined> {
    const [row] = await this.sql<WishlistRow[]>`
      update public.wishlist set captured = ${captured}
      where id = ${id} returning *`
    return row ? rowToItem(row) : undefined
  }

  async remove(id: number): Promise<WishlistItem | undefined> {
    const [row] = await this.sql<WishlistRow[]>`
      delete from public.wishlist where id = ${id} returning *`
    return row ? rowToItem(row) : undefined
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 })
  }

  async likes(id: number): Promise<number> {
    const [row] = await this.sql<{ likes: number }[]>`
      select likes from public.pokemon_likes where pokemon_id = ${id}`
    return row?.likes ?? 0
  }

  async like(id: number): Promise<number> {
    const [row] = await this.sql<{ likes: number }[]>`
      insert into public.pokemon_likes (pokemon_id, likes) values (${id}, 1)
      on conflict (pokemon_id)
      do update set likes = public.pokemon_likes.likes + 1, updated_at = now()
      returning likes`
    return row?.likes ?? 0
  }
}
