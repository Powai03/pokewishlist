<script setup lang="ts">
import type { Pokemon, WishlistItem } from '~/types/pokemon'

// Page d'accueil : la console DS (combat en haut, recherche + boîte du PC en bas).
useHead({ title: 'PokéWishlist · Unys' })

const { list, ready, error, stats, full, add, remove, toggle } = useWishlist()
const owned = computed<number[]>(() => list.value.map((p) => p.id))

// Pokémon affiché sur l'écran du haut : celui qu'on a choisi, sinon le premier de la boîte.
const selectedId = ref<number | null>(null)
const selected = computed<WishlistItem | null>(
  () =>
    list.value.find((p) => p.id === selectedId.value) ?? list.value[0] ?? null,
)

async function onAdd(pokemon: Pokemon): Promise<void> {
  // L'API enregistre le Pokémon ; on ne le sélectionne que si l'ajout a réussi.
  if (await add(pokemon)) selectedId.value = pokemon.id
}
</script>

<template>
  <main class="ds">
    <!-- La console : écran du haut (combat) + charnière + écran du bas (tactile) -->
    <div class="ds-shell ds-top">
      <div class="ds-screen">
        <BattleScene :pokemon="ready ? selected : null" :stats="stats" />
      </div>
    </div>

    <div class="ds-hinge" aria-hidden="true" />

    <div class="ds-shell ds-bottom">
      <div class="ds-screen touch">
        <!-- Erreur de l'API (injoignable, conflit…) : affichée sans bloquer l'appli -->
        <p v-if="error" class="api-error" role="alert" data-testid="api-error">
          {{ error }}
        </p>

        <!-- Commandes du combat : les gros boutons colorés de Noir et Blanc -->
        <div
          v-if="ready && selected"
          class="commands"
          role="group"
          :aria-label="`Actions pour ${selected.frName}`"
        >
          <button
            type="button"
            class="cmd cmd-catch"
            @click="toggle(selected.id)"
          >
            {{ selected.captured ? 'Relâcher' : 'Capturer' }}
          </button>
          <button
            type="button"
            class="cmd cmd-run"
            :aria-label="`Retirer ${selected.frName}`"
            @click="remove(selected.id)"
          >
            Retirer
          </button>
          <NuxtLink
            :to="`/pokemon/${selected.id}`"
            class="cmd cmd-info"
            :aria-label="`Fiche de ${selected.frName}`"
          >
            Fiche
          </NuxtLink>
        </div>

        <PokeSearch :owned="owned" :full="full" @add="onAdd" />

        <PcBox
          :list="list"
          :selected-id="selected?.id ?? null"
          :ready="ready"
          @select="selectedId = $event"
        />
      </div>
    </div>
  </main>
</template>
