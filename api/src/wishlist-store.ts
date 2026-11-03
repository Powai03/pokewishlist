// Règles métier de la wishlist + l'interface commune des stockages (`WishlistStore`).
//
// Deux stockages respectent cette interface :
//   · MemoryWishlistStore (ce fichier)  : un tableau en mémoire, pour les tests et la CI ;
//   · PostgresWishlistStore (postgres-store.ts) : la base Supabase, quand DATABASE_URL est définie.
// Les routes ne connaissent que l'interface : elles ne savent pas où les données sont rangées.
//
// Les règles métier sont les mêmes que côté front (app/utils/wishlist.ts) :
// 5e génération uniquement, pas de doublon, 6 Pokémon maximum.

/** 5e génération (région d'Unys) : de Victini (#494) à Genesect (#649). */
export const GEN5 = { first: 494, last: 649 } as const

/** Taille maximale de la wishlist : 6 Pokémon, comme une équipe dans le jeu. */
export const WISHLIST_MAX = 6

/** Ce que le client envoie dans POST /wishlist : le Pokémon tel que le front le connaît (via PokéAPI). */
export interface WishlistInput {
  /** Numéro du Pokédex national (494 à 649). */
  id: number
  /** Nom (anglais côté front, ex. « snivy »). */
  name: string
  /** Nom français (ex. « Vipélierre ») ; vaut `name` s'il n'est pas fourni. */
  frName: string
  /** Adresse du sprite animé, ou null. */
  sprite: string | null
  /** Adresse de l'icône de menu, ou null. */
  icon: string | null
  /** Types élémentaires (ex. ['grass']), 2 au maximum. */
  types: string[]
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
  | { ok: true; item: WishlistItem }
  | { ok: false; reason: 'duplicate' | 'full' }
  /** Refusé par une contrainte de la base (ex. type inconnu) : `detail` nomme la contrainte. */
  | { ok: false; reason: 'invalid'; detail: string }

/**
 * Ce que doit savoir faire un stockage de wishlist. Tout est asynchrone (`Promise`) :
 * une base de données répond via le réseau, pas instantanément comme un tableau.
 */
export interface WishlistStore {
  /** La liste, triée par numéro. */
  list(): Promise<WishlistItem[]>
  /** Ajoute un Pokémon (déjà validé) ; refuse un doublon ou une liste pleine. */
  add(input: WishlistInput): Promise<AddResult>
  /** Marque capturé ou non ; `undefined` si le Pokémon n'est pas dans la liste. */
  setCaptured(id: number, captured: boolean): Promise<WishlistItem | undefined>
  /** Retire un Pokémon ; renvoie l'élément retiré, ou `undefined` s'il n'était pas là. */
  remove(id: number): Promise<WishlistItem | undefined>
}

export function isGen5(id: number): boolean {
  return Number.isInteger(id) && id >= GEN5.first && id <= GEN5.last
}

const isShortText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim() !== '' && value.length <= max

/** Champ optionnel « adresse d'image » : absent/null → null ; sinon une URL http(s) raisonnable. */
function optionalUrl(value: unknown): Validation<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null }
  if (
    typeof value === 'string' &&
    value.length <= 500 &&
    /^https?:\/\//.test(value)
  ) {
    return { ok: true, value }
  }
  return { ok: false, error: 'doit être une adresse http(s) ou null' }
}

/**
 * Vérifie le corps de POST /wishlist, qui arrive en `unknown` (le client peut envoyer n'importe quoi).
 * Obligatoires : id (entier 494–649), name (texte). Optionnels : frName, sprite, icon, types.
 */
export function validateInput(body: unknown): Validation<WishlistInput> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Le corps doit être un objet JSON' }
  }
  const b = body as Record<string, unknown>
  if (typeof b.id !== 'number' || !Number.isInteger(b.id)) {
    return { ok: false, error: '« id » doit être un nombre entier' }
  }
  if (!isGen5(b.id)) {
    return {
      ok: false,
      error: `« id » doit être un Pokémon de 5e génération (${GEN5.first} à ${GEN5.last})`,
    }
  }
  if (typeof b.name !== 'string' || b.name.trim() === '') {
    return { ok: false, error: '« name » doit être un texte non vide' }
  }
  if (b.name.trim().length > 50) {
    return { ok: false, error: '« name » ne doit pas dépasser 50 caractères' }
  }
  if (b.frName !== undefined && !isShortText(b.frName, 50)) {
    return {
      ok: false,
      error: '« frName » doit être un texte de 1 à 50 caractères',
    }
  }
  const sprite = optionalUrl(b.sprite)
  if (!sprite.ok) return { ok: false, error: `« sprite » ${sprite.error}` }
  const icon = optionalUrl(b.icon)
  if (!icon.ok) return { ok: false, error: `« icon » ${icon.error}` }
  const types = b.types ?? []
  if (
    !Array.isArray(types) ||
    types.length > 2 ||
    !types.every((t) => isShortText(t, 20))
  ) {
    return {
      ok: false,
      error: '« types » doit être une liste de 2 textes au plus',
    }
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

/** Vérifie le corps de PATCH /wishlist/:id : { captured: boolean }. */
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
  return { ok: false, error: '« captured » doit être true ou false' }
}

/** Stockage EN MÉMOIRE : un simple tableau, perdu à chaque redémarrage (tests, CI, dev sans base). */
export class MemoryWishlistStore implements WishlistStore {
  /** Le tableau en mémoire. `private` : on n'y touche que par les méthodes ci-dessous. */
  private items: WishlistItem[] = []

  private find(id: number): WishlistItem | undefined {
    return this.items.find((item) => item.id === id)
  }

  /** Copie de la liste, triée par numéro (l'appelant ne peut pas modifier le tableau interne). */
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
}
