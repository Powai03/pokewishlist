// État partagé de la wishlist + sauvegarde automatique dans le localStorage.
import type { Pokemon } from '~/utils/wishlist'

export const STORAGE_KEY = 'pokewishlist'

export function useWishlist() {
  const list = useState<Pokemon[]>('wishlist', () => [])
  // `ready` passe à true une fois la liste relue : évite d'afficher « liste vide » le temps du chargement.
  const ready = useState('wishlist-ready', () => false)

  // Le localStorage n'existe que dans le navigateur : on le lit après le montage, jamais côté serveur.
  onMounted(() => {
    if (ready.value) return
    try {
      list.value = parseStoredWishlist(localStorage.getItem(STORAGE_KEY))
    }
    catch {
      list.value = [] // stockage bloqué (navigation privée stricte)
    }
    ready.value = true
  })

  watch(list, (value) => {
    if (!ready.value) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    }
    catch {
      // stockage indisponible : la liste reste en mémoire pour cette session
    }
  }, { deep: true })

  return {
    list,
    ready,
    stats: computed(() => progress(list.value)),
    has: (id: number) => list.value.some(p => p.id === id),
    add: (pokemon: Pokemon) => { list.value = addPokemon(list.value, pokemon) },
    remove: (id: number) => { list.value = removePokemon(list.value, id) },
    toggle: (id: number) => { list.value = toggleCaptured(list.value, id) },
  }
}
