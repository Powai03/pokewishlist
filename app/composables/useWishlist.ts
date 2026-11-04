import type { ComputedRef, Ref } from 'vue'
import type { Pokemon, WishlistItem, WishlistStats } from '~/types/pokemon'

export interface UseWishlist {
  list: Ref<WishlistItem[]>
  ready: Ref<boolean>
  error: Ref<string | null>
  stats: ComputedRef<WishlistStats>
  full: ComputedRef<boolean>
  has: (id: number) => boolean
  add: (pokemon: Pokemon) => Promise<boolean>
  remove: (id: number) => Promise<void>
  toggle: (id: number) => Promise<void>
  reload: () => Promise<void>
}

export function useWishlist(): UseWishlist {
  const list = useState<WishlistItem[]>('wishlist', () => [])
  const ready = useState<boolean>('wishlist-ready', () => false)
  const error = useState<string | null>('wishlist-error', () => null)
  const apiBase = useRuntimeConfig().public.apiBase
  const i18n = useNuxtApp().$i18n
  const lang = (): string => i18n.locale.value

  const messageOf = (e: unknown): string => {
    if (!(e instanceof WishlistApiError)) return i18n.t('api.unexpected')
    if (e.code === 'status') return i18n.t('api.status', { status: e.status })
    if (e.code) return i18n.t(`api.${e.code}`)
    return e.message
  }

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
