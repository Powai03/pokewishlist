<script setup lang="ts">
import type { Pokemon } from '~/utils/wishlist'

useHead({ title: 'PokéWishlist', htmlAttrs: { lang: 'fr' } })

const STORAGE_KEY = 'pokewishlist'
const list = ref<Pokemon[]>([])
const query = ref('')
const loading = ref(false)
const error = ref('')

// La liste est sauvegardée dans le navigateur (localStorage), uniquement côté client.
onMounted(() => {
  try {
    list.value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  }
  catch {
    list.value = []
  }
})
watch(list, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  }
  catch {
    // stockage indisponible (navigation privée) : on garde la liste en mémoire
  }
}, { deep: true })

const stats = computed(() => progress(list.value))

interface PokeApiResponse {
  id: number
  name: string
  sprites: { front_default: string | null }
}

async function add() {
  const name = normalizeQuery(query.value)
  if (!name) return
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<PokeApiResponse>(`https://pokeapi.co/api/v2/pokemon/${name}`)
    list.value = addPokemon(list.value, {
      id: data.id,
      name: data.name,
      sprite: data.sprites.front_default,
      captured: false,
    })
    query.value = ''
  }
  catch {
    error.value = `Aucun Pokémon trouvé pour « ${query.value} ».`
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="page">
    <NuxtRouteAnnouncer />
    <h1>PokéWishlist</h1>
    <p class="subtitle">
      Les Pokémon à capturer
    </p>

    <form
      class="add"
      @submit.prevent="add"
    >
      <input
        v-model="query"
        type="text"
        placeholder="Nom ou numéro (ex. pikachu, 25)"
        aria-label="Nom ou numéro du Pokémon"
        :disabled="loading"
      >
      <button
        type="submit"
        :disabled="loading || !query.trim()"
      >
        {{ loading ? 'Recherche…' : 'Ajouter' }}
      </button>
    </form>
    <p
      v-if="error"
      class="error"
      role="alert"
    >
      {{ error }}
    </p>

    <p
      v-if="stats.total"
      class="progress"
    >
      {{ stats.captured }} / {{ stats.total }} capturés ({{ stats.percent }} %)
    </p>

    <ul
      v-if="list.length"
      class="list"
    >
      <li
        v-for="p in list"
        :key="p.id"
        :class="{ captured: p.captured }"
      >
        <img
          v-if="p.sprite"
          :src="p.sprite"
          :alt="p.name"
          width="64"
          height="64"
        >
        <span class="name">#{{ p.id }} {{ p.name }}</span>
        <button @click="list = toggleCaptured(list, p.id)">
          {{ p.captured ? 'Relâcher' : 'Capturé !' }}
        </button>
        <button
          class="remove"
          :aria-label="`Retirer ${p.name}`"
          @click="list = removePokemon(list, p.id)"
        >
          ✕
        </button>
      </li>
    </ul>
    <p
      v-else
      class="empty"
    >
      Ta liste est vide : ajoute ton premier Pokémon.
    </p>
  </main>
</template>

<style>
:root { color-scheme: light dark; --accent: #e3350d; --muted: #888; }
body { margin: 0; font-family: system-ui, sans-serif; background: Canvas; color: CanvasText; }
.page { max-width: 640px; margin: 0 auto; padding: 24px 16px; }
h1 { color: var(--accent); margin-bottom: 0; }
.subtitle, .empty, .progress { color: var(--muted); }
.add { display: flex; gap: 8px; margin: 24px 0 8px; }
.add input { flex: 1; padding: 8px; font-size: 1rem; }
button { padding: 8px 12px; cursor: pointer; }
.error { color: var(--accent); }
.list { list-style: none; padding: 0; }
.list li { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #8884; padding: 4px 0; }
.list .name { flex: 1; text-transform: capitalize; }
.list li.captured .name { text-decoration: line-through; color: var(--muted); }
</style>
