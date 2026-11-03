<script setup lang="ts">
import type { Pokemon, SpeciesEntry } from '~/types/pokemon'

const props = defineProps<{ owned: number[]; full: boolean }>()
const emit = defineEmits<{ add: [pokemon: Pokemon] }>()

const index = ref<SpeciesEntry[]>([])
const indexError = ref<boolean>(false)
const query = ref<string>('')
const pendingId = ref<number | null>(null)
const error = ref<string>('')

// L'index des 156 Pokémon d'Unys (avec leurs noms français) est chargé une fois, au montage.
onMounted(async (): Promise<void> => {
  try {
    index.value = await fetchGen5Index()
  } catch {
    indexError.value = true
  }
})

const results = computed<SpeciesEntry[]>(() =>
  searchSpecies(index.value, query.value, 6),
)
const noResult = computed<boolean>(
  () =>
    query.value.trim() !== '' &&
    index.value.length > 0 &&
    results.value.length === 0,
)
const { t, locale } = useI18n()
/** Nom affiché dans la langue choisie (nom français en français, anglais sinon). */
const label = (e: SpeciesEntry): string => pokemonName(e, locale.value)

async function add(entry: SpeciesEntry): Promise<void> {
  if (props.full || props.owned.includes(entry.id) || pendingId.value) return
  pendingId.value = entry.id
  error.value = ''
  try {
    emit('add', await fetchPokemon(entry))
    query.value = ''
  } catch (e: unknown) {
    error.value =
      e instanceof PokemonNotFoundError
        ? t('search.notFound', { name: label(entry) })
        : t('search.fetchFailed', { name: label(entry) })
  } finally {
    pendingId.value = null
  }
}

function addFirst(): void {
  const first = results.value.find((r) => !props.owned.includes(r.id))
  if (first) add(first)
}
</script>

<template>
  <section class="dex" aria-labelledby="dex-title">
    <h2 id="dex-title" class="dex-title">{{ t('search.title') }}</h2>

    <form class="dex-form" role="search" @submit.prevent="addFirst">
      <label for="search-input" class="sr-only">{{ t('search.label') }}</label>
      <input
        id="search-input"
        v-model="query"
        type="search"
        autocomplete="off"
        :placeholder="t('search.placeholder')"
        :disabled="indexError"
      />
    </form>

    <p v-if="indexError" class="dex-msg dex-error" role="alert">
      {{ t('search.apiDown') }}
    </p>
    <p v-else-if="noResult" class="dex-msg">
      {{ t('search.noResult') }}
    </p>
    <p v-if="full" class="dex-msg dex-full" role="status">
      {{ t('search.full', { max: WISHLIST_MAX }) }}
    </p>
    <p v-if="error" class="dex-msg dex-error" role="alert">
      {{ error }}
    </p>

    <ul
      v-if="results.length"
      class="dex-list"
      :aria-label="t('search.results')"
    >
      <li v-for="r in results" :key="r.id">
        <button
          type="button"
          class="dex-item"
          :disabled="full || owned.includes(r.id) || pendingId !== null"
          @click="add(r)"
        >
          <span class="dex-no">{{ String(r.id).padStart(3, '0') }}</span>
          <span class="dex-name">{{ label(r) }}</span>
          <span class="dex-action">
            {{
              owned.includes(r.id)
                ? t('search.inBox')
                : full
                  ? t('search.boxFull')
                  : pendingId === r.id
                    ? '…'
                    : t('search.add')
            }}
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.dex-title {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fff;
  text-shadow: 2px 2px 0 #000;
}
.dex-form input {
  width: 100%;
  padding: 10px 14px;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 600;
  color: #2b2b2b;
  background: #fff;
  border: 3px solid #2b2b2b;
  border-radius: 10px;
  box-shadow:
    inset 0 0 0 2px #d8d8d8,
    0 3px 0 #0006;
}
.dex-form input:focus {
  outline: none;
  box-shadow:
    inset 0 0 0 2px #5ec8f2,
    0 3px 0 #0006;
}
.dex-msg {
  margin: 8px 0 0;
  color: #dcdce4;
  font-weight: 600;
}
.dex-error {
  color: #ff8a78;
}

/* Liste du Pokédex : lignes arrondies, le curseur ▶ apparaît sur la ligne survolée */
.dex-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.dex-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  padding: 8px 14px 8px 26px;
  font: inherit;
  color: #2b2b2b;
  position: relative;
  background: linear-gradient(#ffffff 0 50%, #ececec 50%);
  border: 2px solid #2b2b2b;
  border-radius: 999px;
  box-shadow: 0 2px 0 #0006;
}
.dex-item:not(:disabled):hover,
.dex-item:not(:disabled):focus-visible {
  background: linear-gradient(#bff0ff 0 50%, #8edcf8 50%);
  outline: none;
}
.dex-item:not(:disabled):hover::before,
.dex-item:not(:disabled):focus-visible::before {
  content: '▶';
  position: absolute;
  left: 9px;
  color: #e84830;
  font-size: 0.75em;
}
.dex-item:disabled {
  opacity: 0.6;
}
.dex-no {
  font-weight: 700;
  color: #707078;
  min-width: 2.6em;
}
.dex-name {
  flex: 1;
  font-weight: 700;
}
.dex-action {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1d78c8;
}
.dex-full {
  color: #f8d878;
}
.dex-item:disabled .dex-action {
  color: #707078;
}
</style>
