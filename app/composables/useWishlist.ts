// État partagé de la wishlist + sauvegarde automatique dans le localStorage.
import type { ComputedRef, Ref } from 'vue'
import type { Pokemon, WishlistItem, WishlistStats } from '~/types/pokemon'

export const STORAGE_KEY = 'pokewishlist'

/** Ce que renvoie `useWishlist()` : l'état de la liste et les actions possibles. */
export interface UseWishlist {
  list: Ref<WishlistItem[]>
  ready: Ref<boolean>
  stats: ComputedRef<WishlistStats>
  has: (id: number) => boolean
  add: (pokemon: Pokemon) => void
  remove: (id: number) => void
  toggle: (id: number) => void
}

export function useWishlist(): UseWishlist {
  const list = useState<WishlistItem[]>('wishlist', () => [])
  // `ready` passe à true une fois la liste relue : évite d'afficher « liste vide » le temps du chargement.
  const ready = useState<boolean>('wishlist-ready', () => false)

  // Le localStorage n'existe que dans le navigateur : on le lit après le montage, jamais côté serveur.
  onMounted(() => {
    if (ready.value) return
    try {
      list.value = parseStoredWishlist(localStorage.getItem(STORAGE_KEY))
    } catch {
      list.value = [] // stockage bloqué (navigation privée stricte)
    }
    ready.value = true
  })

  watch(
    list,
    (value: WishlistItem[]): void => {
      if (!ready.value) return
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // stockage indisponible : la liste reste en mémoire pour cette session
      }
    },
    { deep: true },
  )

  return {
    list,
    ready,
    stats: computed(() => progress(list.value)),
    has: (id: number) => list.value.some((p) => p.id === id),
    add: (pokemon: Pokemon) => {
      list.value = addPokemon(list.value, pokemon)
    },
    remove: (id: number) => {
      list.value = removePokemon(list.value, id)
    },
    toggle: (id: number) => {
      list.value = toggleCaptured(list.value, id)
    },
  }
}
