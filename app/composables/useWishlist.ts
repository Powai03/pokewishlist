// État partagé de la wishlist, synchronisé avec l'API Hono (plus de localStorage).
// Principe : chaque action appelle l'API d'abord ; l'écran n'est mis à jour qu'avec SA réponse.
// Ainsi, ce qui est affiché correspond toujours à ce que le serveur a réellement enregistré.
import type { ComputedRef, Ref } from 'vue'
import type { Pokemon, WishlistItem, WishlistStats } from '~/types/pokemon'

/** Ce que renvoie `useWishlist()` : l'état de la liste et les actions possibles. */
export interface UseWishlist {
  list: Ref<WishlistItem[]>
  /** `true` une fois la liste chargée depuis l'API (avec succès ou non). */
  ready: Ref<boolean>
  /** Dernier message d'erreur de l'API (injoignable, 409…), ou `null`. */
  error: Ref<string | null>
  stats: ComputedRef<WishlistStats>
  /** `true` quand la wishlist contient déjà WISHLIST_MAX (6) Pokémon. */
  full: ComputedRef<boolean>
  has: (id: number) => boolean
  /** Ajoute via POST /wishlist ; renvoie `true` si l'API l'a accepté. */
  add: (pokemon: Pokemon) => Promise<boolean>
  /** Retire via DELETE /wishlist/:id. */
  remove: (id: number) => Promise<void>
  /** Bascule « capturé » via PATCH /wishlist/:id. */
  toggle: (id: number) => Promise<void>
  /** Recharge la liste via GET /wishlist. */
  reload: () => Promise<void>
}

export function useWishlist(): UseWishlist {
  const list = useState<WishlistItem[]>('wishlist', () => [])
  const ready = useState<boolean>('wishlist-ready', () => false)
  const error = useState<string | null>('wishlist-error', () => null)
  const apiBase = useRuntimeConfig().public.apiBase
  // `$i18n` plutôt que `useI18n()` : ce composable peut aussi être appelé hors d'un composant.
  const i18n = useNuxtApp().$i18n
  /** Langue affichée, envoyée à l'API (Accept-Language) pour qu'elle réponde dans la même langue. */
  const lang = (): string => i18n.locale.value

  /**
   * Message lisible pour une erreur d'appel à l'API :
   * celui de l'API (déjà dans la bonne langue), ou un message du front traduit ici.
   */
  const messageOf = (e: unknown): string => {
    if (!(e instanceof WishlistApiError)) return i18n.t('api.unexpected')
    if (e.code === 'status') return i18n.t('api.status', { status: e.status })
    if (e.code) return i18n.t(`api.${e.code}`)
    return e.message
  }

  /** Exécute un appel à l'API ; en cas d'échec, garde le message pour l'afficher. */
  async function call<T>(action: () => Promise<T>): Promise<T | undefined> {
    error.value = null
    try {
      return await action()
    } catch (e: unknown) {
      error.value = messageOf(e)
      return undefined
    }
  }

  async function reload(): Promise<void> {
    const items = await call(() => fetchWishlist(apiBase, lang()))
    if (items) list.value = items
    ready.value = true
  }

  // Chargement initial, côté navigateur uniquement (une seule fois pour toute l'appli).
  onMounted(() => {
    if (!ready.value) void reload()
  })

  async function add(pokemon: Pokemon): Promise<boolean> {
    const item = await call(() => postWishlistItem(apiBase, pokemon, lang()))
    if (!item) return false
    list.value = addPokemon(list.value, item, item.captured)
    return true
  }

  async function remove(id: number): Promise<void> {
    error.value = null
    try {
      await deleteWishlistItem(apiBase, id, lang())
    } catch (e: unknown) {
      // 404 : déjà absent côté serveur → on le retire aussi de l'écran ; sinon on affiche l'erreur.
      if (!(e instanceof WishlistApiError && e.status === 404)) {
        error.value = messageOf(e)
        return
      }
    }
    list.value = removePokemon(list.value, id)
  }

  async function toggle(id: number): Promise<void> {
    const current = list.value.find((p) => p.id === id)
    if (!current) return
    const item = await call(() =>
      patchCaptured(apiBase, id, !current.captured, lang()),
    )
    if (item) list.value = list.value.map((p) => (p.id === id ? item : p))
  }

  return {
    list,
    ready,
    error,
    stats: computed(() => progress(list.value)),
    full: computed(() => isFull(list.value)),
    has: (id: number) => list.value.some((p) => p.id === id),
    add,
    remove,
    toggle,
    reload,
  }
}
