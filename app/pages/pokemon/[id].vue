<script setup lang="ts">
// Fiche d'un Pokémon : /pokemon/495 (numéro) ou /pokemon/snivy (nom anglais).
//
// Les données sont chargées PAR LE SERVEUR (rendu SSR) : une adresse ouverte directement
// arrive déjà remplie, et un Pokémon inconnu renvoie un vrai statut HTTP 404 (page d'erreur, error.vue).
// Textes de l'interface : i18n/locales/*.json ; nom, catégorie et description : PokéAPI, dans les 4 langues.
import type { PokemonDetails, PokemonStat } from '~/types/pokemon'
import {
  PokemonNotFoundError,
  fetchPokemonDetails,
  parsePokemonParam,
} from '~/utils/pokeapi'
import { formatDexNumber, formatHeight, formatWeight } from '~/utils/format'
import { GEN5 } from '~/utils/wishlist'

const { t, locale } = useI18n()
const route = useRoute()
const raw = String(route.params.id)

// Les erreurs portent une CLÉ de traduction (data.i18n), pas une phrase : error.vue la traduit
// dans la langue affichée, et la retraduit si on change de langue sur la page d'erreur.

// 1. Adresse impossible (n°25, « <script> »…) : 404 tout de suite, sans appeler PokéAPI.
const param = parsePokemonParam(raw)
if (!param.ok) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Pokemon not found',
    fatal: true,
    data: {
      i18n:
        param.reason === 'notGen5'
          ? {
              key: 'error.notGen5',
              params: { id: param.id, first: GEN5.first, last: GEN5.last },
            }
          : { key: 'error.invalidName', params: { raw: param.raw } },
    },
  })
}

// 2. Appel à PokéAPI ; un 404 de PokéAPI devient NOTRE 404, une panne devient un 502.
const pokeapiBase = useRuntimeConfig().public.pokeapiBase
const { data: pokemon, error } = await useAsyncData<PokemonDetails>(
  `pokemon:${param.value}`,
  async () => {
    try {
      return await fetchPokemonDetails(param.value, pokeapiBase)
    } catch (e: unknown) {
      if (e instanceof PokemonNotFoundError) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Pokemon not found',
          data: { i18n: { key: 'error.unknownPokemon', params: { raw } } },
        })
      }
      throw createError({
        statusCode: 502,
        statusMessage: 'PokeAPI is not responding',
        data: { i18n: { key: 'error.pokeapiDown' } },
      })
    }
  },
)
if (error.value || !pokemon.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Pokemon not found',
    data: error.value?.data,
    fatal: true,
  })
}
const p = pokemon.value

// Textes PokéAPI dans la langue affichée (repli : nom de la wishlist, texte « aucune description »).
const name = computed<string>(
  () => inLocale(p.names, locale.value) ?? pokemonName(p, locale.value),
)
const genus = computed<string | null>(() => inLocale(p.genus, locale.value))
const description = computed<string>(
  () => inLocale(p.description, locale.value) ?? t('sheet.noDescription'),
)
const dexNo = (id: number): string => t('app.dexNo', { n: formatDexNumber(id) })

useHead({ title: () => `${name.value} · ${dexNo(p.id)} · PokéWishlist` })

// Pokémon précédent / suivant dans le Pokédex d'Unys (null aux deux bouts).
const prevId = p.id > GEN5.first ? p.id - 1 : null
const nextId = p.id < GEN5.last ? p.id + 1 : null

// Barre de statistique : longueur sur 180 (rares sont les stats au-delà), couleur selon la valeur.
const statWidth = (s: PokemonStat): string =>
  `${Math.min(100, Math.round((s.value / 180) * 100))}%`
const statClass = (s: PokemonStat): string =>
  s.value >= 120
    ? 'stat-top'
    : s.value >= 90
      ? 'stat-high'
      : s.value >= 60
        ? 'stat-mid'
        : 'stat-low'
const total = p.stats.reduce((sum, s) => sum + s.value, 0)

// Ajout à la wishlist depuis la fiche (même état partagé que la page d'accueil).
const { ready, error: apiError, full, has, add } = useWishlist()
const inList = computed<boolean>(() => has(p.id))
const adding = ref(false)
async function onAdd(): Promise<void> {
  adding.value = true
  await add(p)
  adding.value = false
}
// Likes de la fiche (API → table pokemon_likes) : chargés dans le navigateur, pour rester à jour
// même sur une fiche pré-rendue.
const apiBase = useRuntimeConfig().public.apiBase
const likes = ref<number | null>(null)
const liking = ref(false)
onMounted(async () => {
  likes.value = await fetchLikes(apiBase, p.id, locale.value).catch(() => null)
})
async function onLike(): Promise<void> {
  liking.value = true
  likes.value = await postLike(apiBase, p.id, locale.value).catch(
    () => likes.value,
  )
  liking.value = false
}

const addLabel = computed<string>(() => {
  if (!ready.value) return t('sheet.loading')
  if (inList.value) return t('sheet.inList')
  if (full.value) return t('sheet.full')
  return t('sheet.add')
})
</script>

<template>
  <main class="ds" data-testid="pokemon-sheet">
    <!-- Écran du haut : l'entrée du Pokédex -->
    <div class="ds-shell ds-top">
      <div class="ds-screen dex">
        <div class="dex-bar">
          <span>{{ t('sheet.dex') }}</span>
          <span class="dex-no">{{ dexNo(p.id) }}</span>
        </div>
        <div class="dex-body">
          <div class="dex-portrait">
            <img
              v-if="p.sprite"
              :src="p.sprite"
              :alt="t('sheet.sprite', { name })"
              class="dex-sprite"
            />
          </div>
          <div class="dex-id">
            <h2 class="dex-name">{{ name }}</h2>
            <!-- Nom anglais en petit, sauf s'il répète le nom affiché (anglais, espagnol) -->
            <p v-if="p.name !== name.toLowerCase()" class="dex-en">
              {{ p.name }}
            </p>
            <p v-if="genus" class="dex-genus">{{ genus }}</p>
            <ul class="dex-types" :aria-label="t('sheet.types')">
              <li
                v-for="type in p.types"
                :key="type"
                :style="{ '--type': typeColor(type) }"
              >
                {{ t(`types.${type}`) }}
              </li>
            </ul>
          </div>
        </div>
        <dl class="dex-size">
          <div>
            <dt>{{ t('sheet.height') }}</dt>
            <dd>{{ formatHeight(p.height, locale) }}</dd>
          </div>
          <div>
            <dt>{{ t('sheet.weight') }}</dt>
            <dd>{{ formatWeight(p.weight, locale) }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="ds-hinge" aria-hidden="true" />

    <!-- Écran du bas : description, statistiques, actions -->
    <div class="ds-shell ds-bottom">
      <div class="ds-screen touch">
        <p v-if="apiError" class="api-error" role="alert">{{ apiError }}</p>

        <p class="dex-text" data-testid="pokemon-description">
          {{ description }}
        </p>

        <section class="stats" aria-labelledby="stats-title">
          <h3 id="stats-title" class="stats-title">
            {{ t('sheet.stats') }}
            <span>{{ t('sheet.total', { total }) }}</span>
          </h3>
          <ul>
            <li v-for="s in p.stats" :key="s.key" class="stat">
              <span class="stat-label">{{ t(`stats.${s.key}`) }}</span>
              <span class="stat-value">{{ s.value }}</span>
              <span class="stat-track" aria-hidden="true">
                <span
                  class="stat-bar"
                  :class="statClass(s)"
                  :style="{ width: statWidth(s) }"
                />
              </span>
            </li>
          </ul>
        </section>

        <div class="commands sheet-commands">
          <button
            type="button"
            class="cmd cmd-catch"
            :disabled="!ready || inList || full || adding"
            @click="onAdd"
          >
            {{ addLabel }}
          </button>
          <button
            type="button"
            class="cmd cmd-like"
            data-testid="like-button"
            :aria-label="t('sheet.likeLabel', { name })"
            :disabled="liking || likes === null"
            @click="onLike"
          >
            ♥ {{ t('sheet.like') }}
            <span class="like-count" data-testid="like-count">{{
              likes ?? '…'
            }}</span>
          </button>
          <NuxtLink to="/" class="cmd cmd-run">{{ t('sheet.back') }}</NuxtLink>
        </div>

        <nav class="dex-nav" :aria-label="t('sheet.neighbours')">
          <NuxtLink
            v-if="prevId"
            :to="`/pokemon/${prevId}`"
            class="dex-nav-link"
            rel="prev"
          >
            ◀ {{ dexNo(prevId) }}
          </NuxtLink>
          <span v-else />
          <NuxtLink
            v-if="nextId"
            :to="`/pokemon/${nextId}`"
            class="dex-nav-link"
            rel="next"
          >
            {{ dexNo(nextId) }} ▶
          </NuxtLink>
        </nav>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Écran du haut : un Pokédex rouge et blanc, comme celui de Noir et Blanc */
.dex {
  display: grid;
  gap: 12px;
  padding: 0 0 14px;
  color: #1d1d22;
  background:
    linear-gradient(#ffffff22 1px, transparent 1px) 0 0 / 100% 12px,
    #f2f2ee;
}
.dex-bar {
  display: flex;
  justify-content: space-between;
  padding: 8px 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
  background: linear-gradient(#e8402a, #b8281a);
  border-bottom: 3px solid #0c0c0e;
  text-shadow: 1px 1px 0 #0006;
}
.dex-body {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 1.3fr;
  gap: 14px;
  align-items: center;
  padding: 0 14px;
}
.dex-portrait {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border: 3px solid #0c0c0e;
  border-radius: 12px;
  background:
    radial-gradient(circle at 50% 70%, #b8e8a0 0 38%, transparent 39%),
    linear-gradient(#cfeaff, #eaf6ff);
}
.dex-sprite {
  width: 75%;
  height: 75%;
  object-fit: contain;
  image-rendering: pixelated;
}
.dex-name {
  margin: 0;
  font-family: var(--logo);
  font-size: clamp(1.6rem, 6vw, 2.2rem);
  line-height: 1.1;
}
.dex-en {
  margin: 2px 0 0;
  color: #666;
  text-transform: capitalize;
}
.dex-genus {
  margin: 8px 0 0;
  font-weight: 700;
}
.dex-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.dex-types li {
  padding: 2px 10px;
  color: #fff;
  font-weight: 700;
  text-shadow: 1px 1px 0 #0007;
  background: var(--type);
  border: 2px solid #0c0c0e;
  border-radius: 999px;
}
.dex-size {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0;
  padding: 0 14px;
}
.dex-size div {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  background: #fff;
  border: 2px solid #0c0c0e;
  border-radius: 10px;
}
.dex-size dt {
  color: #b8281a;
  font-weight: 700;
}
.dex-size dd {
  margin: 0;
}

/* Écran du bas */
.dex-text {
  margin: 0;
  padding: 14px 16px;
  font-size: 1.1rem;
  line-height: 1.5;
  color: #1d1d22;
  background: #fff;
  border: 3px solid #0c0c0e;
  border-radius: 12px;
  box-shadow: inset 0 0 0 3px #8ec8e8;
}
.stats {
  padding: 12px 14px;
  color: #fff;
  background: #1d1d22cc;
  border: 3px solid #fff;
  border-radius: 12px;
  box-shadow: 0 0 0 3px #0c0c0e;
}
.stats-title {
  display: flex;
  justify-content: space-between;
  margin: 0 0 8px;
  font-size: 1rem;
}
.stats-title span {
  color: #f8d030;
}
.stats ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.stat {
  display: grid;
  grid-template-columns: 6.5em 2.5em 1fr;
  gap: 8px;
  align-items: center;
}
.stat-value {
  text-align: right;
  font-weight: 700;
}
.stat-track {
  height: 10px;
  background: #0c0c0e;
  border: 2px solid #55555f;
  border-radius: 999px;
  overflow: hidden;
}
.stat-bar {
  display: block;
  height: 100%;
  border-radius: 999px;
}
.stat-low {
  background: #f0703a;
}
.stat-mid {
  background: #f8d030;
}
.stat-high {
  background: #58d068;
}
.stat-top {
  background: #48c8f0;
}
.sheet-commands {
  grid-template-columns: 2fr 1.2fr 1fr;
}
.cmd-like {
  color: #fff;
  background: linear-gradient(#f06292, #c2185b);
}
.like-count {
  margin-left: 6px;
  padding: 0 8px;
  border-radius: 999px;
  background: #0003;
}
.dex-nav {
  display: flex;
  justify-content: space-between;
}
.dex-nav-link {
  padding: 4px 12px;
  color: #fff;
  text-decoration: none;
  background: #1d1d22;
  border: 2px solid #fff;
  border-radius: 999px;
}
.dex-nav-link:hover {
  background: #3b3b42;
}

@media (max-width: 420px) {
  .dex-body {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
  .dex-portrait {
    width: 60%;
  }
  .dex-types {
    justify-content: center;
  }
  .dex-size {
    grid-template-columns: 1fr;
  }
}
</style>
