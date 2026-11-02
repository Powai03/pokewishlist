// Stockage de la wishlist EN MÉMOIRE : un simple tableau, sans base de données.
// Les données sont perdues à chaque redémarrage de l'API (choix assumé pour l'instant).
//
// Les règles métier sont les mêmes que côté front (app/utils/wishlist.ts) :
// 5e génération uniquement, pas de doublon, 6 Pokémon maximum.

/** 5e génération (région d'Unys) : de Victini (#494) à Genesect (#649). */
export const GEN5 = { first: 494, last: 649 } as const

/** Taille maximale de la wishlist : 6 Pokémon, comme une équipe dans le jeu. */
export const WISHLIST_MAX = 6

/** Ce que le client envoie dans POST /wishlist. */
export interface WishlistInput {
  /** Numéro du Pokédex national (494 à 649). */
  id: number
  /** Nom du Pokémon (ex. « Vipélierre »). */
  name: string
}

/** Un Pokémon enregistré dans la wishlist. */
export interface WishlistItem extends WishlistInput {
  captured: boolean
  /** Date d'ajout (ISO 8601). */
  addedAt: string
}

/** Résultat d'une validation : soit la valeur propre, soit un message d'erreur. */
export type Validation<T> =
  { ok: true; value: T } | { ok: false; error: string }

/** Résultat d'un ajout : l'élément créé, ou la raison du refus. */
export type AddResult =
  { ok: true; item: WishlistItem } | { ok: false; reason: 'duplicate' | 'full' }

export function isGen5(id: number): boolean {
  return Number.isInteger(id) && id >= GEN5.first && id <= GEN5.last
}

/**
 * Vérifie le corps de POST /wishlist, qui arrive en `unknown` (le client peut envoyer n'importe quoi).
 * Attendu : { id: entier de 494 à 649, name: texte non vide (50 caractères max) }.
 */
export function validateInput(body: unknown): Validation<WishlistInput> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Le corps doit être un objet JSON' }
  }
  const { id, name } = body as Record<string, unknown>
  if (typeof id !== 'number' || !Number.isInteger(id)) {
    return { ok: false, error: '« id » doit être un nombre entier' }
  }
  if (!isGen5(id)) {
    return {
      ok: false,
      error: `« id » doit être un Pokémon de 5e génération (${GEN5.first} à ${GEN5.last})`,
    }
  }
  if (typeof name !== 'string' || name.trim() === '') {
    return { ok: false, error: '« name » doit être un texte non vide' }
  }
  if (name.trim().length > 50) {
    return { ok: false, error: '« name » ne doit pas dépasser 50 caractères' }
  }
  return { ok: true, value: { id, name: name.trim() } }
}

export class WishlistStore {
  /** Le tableau en mémoire. `private` : on n'y touche que par les méthodes ci-dessous. */
  private items: WishlistItem[] = []

  /** Copie de la liste, triée par numéro (l'appelant ne peut pas modifier le tableau interne). */
  list(): WishlistItem[] {
    return [...this.items].sort((a, b) => a.id - b.id)
  }

  get(id: number): WishlistItem | undefined {
    return this.items.find((item) => item.id === id)
  }

  /** Ajoute un Pokémon (déjà validé) ; refuse un doublon ou une liste pleine. */
  add(input: WishlistInput, now: Date = new Date()): AddResult {
    if (this.get(input.id)) return { ok: false, reason: 'duplicate' }
    if (this.items.length >= WISHLIST_MAX) return { ok: false, reason: 'full' }
    const item: WishlistItem = {
      ...input,
      captured: false,
      addedAt: now.toISOString(),
    }
    this.items.push(item)
    return { ok: true, item }
  }

  /** Retire un Pokémon ; renvoie l'élément retiré, ou `undefined` s'il n'était pas là. */
  remove(id: number): WishlistItem | undefined {
    const item = this.get(id)
    if (item) this.items = this.items.filter((i) => i.id !== id)
    return item
  }
}
