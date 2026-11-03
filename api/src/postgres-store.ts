// Stockage de la wishlist dans PostgreSQL (la base Supabase, schéma : supabase/init.sql).
//
// Les règles (5G, doublon, 6 max) sont vérifiées PAR LA BASE : on tente l'écriture,
// et on traduit son éventuel refus (code d'erreur PostgreSQL) en résultat compréhensible par les routes.
import postgres from 'postgres'
import type {
  AddResult,
  WishlistInput,
  WishlistItem,
  WishlistStore,
} from './wishlist-store.js'

/** Une ligne de la table `wishlist`, telle que PostgreSQL la renvoie (noms en snake_case). */
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

/** Ligne SQL → objet JSON de l'API (snake_case → camelCase, date → texte ISO 8601). */
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

/** Codes d'erreur PostgreSQL utiles ici (norme SQLSTATE). */
const UNIQUE_VIOLATION = '23505'
const CHECK_VIOLATION = '23514'

/**
 * Traduit le refus d'un INSERT par la base en résultat métier, ou `null` si c'est une autre erreur
 * (base injoignable…), qui sera alors remontée telle quelle (→ 500).
 *   · 23505 sur la clé primaire           → doublon
 *   · 23514 sans contrainte nommée        → le déclencheur « 6 maximum »
 *   · 23514 avec une contrainte CHECK     → donnée invalide (ex. type inconnu)
 */
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

/** Réglages de connexion ; les valeurs par défaut conviennent à Supabase. */
export interface PostgresStoreOptions {
  /** Connexion chiffrée (défaut : true). Désactivée seulement pour une base de test locale. */
  ssl?: boolean
  /** Nombre maximal de connexions simultanées (défaut : 5). */
  max?: number
  /** Ferme une connexion inutilisée depuis ce nombre de secondes (défaut : jamais). */
  idleTimeout?: number
  /** Renouvelle toute connexion plus vieille que ce nombre de secondes (défaut : 30 à 60 min). */
  maxLifetime?: number
}

export class PostgresWishlistStore implements WishlistStore {
  private readonly sql: postgres.Sql

  /** @param url chaîne de connexion (DATABASE_URL), ex. celle du « Session pooler » de Supabase. */
  constructor(url: string, options: PostgresStoreOptions = {}) {
    this.sql = postgres(url, {
      max: options.max ?? 5, // l'offre gratuite de Supabase limite le nombre de connexions
      ssl: options.ssl === false ? false : 'require', // chiffrée : le mot de passe ne circule pas en clair
      prepare: false, // compatible avec le pooler de Supabase en mode « transaction »
      idle_timeout: options.idleTimeout,
      ...(options.maxLifetime ? { max_lifetime: options.maxLifetime } : {}),
      onnotice: () => {}, // ignore les messages d'information de PostgreSQL (« NOTICE »)
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

  /** Ferme les connexions (arrêt propre du serveur). */
  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 })
  }
}
