// État partagé de la wishlist + sauvegarde automatique dans le localStorage
// (la lecture/écriture elle-même est dans app/utils/storage.ts, testée à part).
import type { ComputedRef, Ref } from 'vue'
import type { Pokemon, WishlistItem, WishlistStats } from '~/types/pokemon'

/** Ce que renvoie `useWishlist()` : l'état de la liste et les actions possibles. */
export interface UseWishlist {
  list: Ref<WishlistItem[]>
  ready: Ref<boolean>
  stats: ComputedRef<WishlistStats>
  /** `true` quand la wishlist contient déjà WISHLIST_MAX (6) Pokémon. */
  full: ComputedRef<boolean>
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
    const storage = getBrowserStorage()
    list.value = storage ? loadWishlist(storage) : [] // ne lève jamais, même si le JSON est corrompu
    ready.value = true
  })

  watch(
    list,
    (value: WishlistItem[]): void => {
      if (!ready.value) return
      const storage = getBrowserStorage()
      if (storage) saveWishlist(value, storage) // si ça échoue, la liste reste en mémoire
    },
    { deep: true },
  )

  return {
    list,
    ready,
    stats: computed(() => progress(list.value)),
    full: computed(() => isFull(list.value)),
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
