<script setup lang="ts">
import type { Pokemon, WishlistItem } from '~/types/pokemon'

const { t, locale } = useI18n()
useHead({ title: () => t('home.title') })

const { list, ready, error, stats, full, add, remove, toggle } = useWishlist()
const owned = computed<number[]>(() => list.value.map((p) => p.id))

const selectedId = ref<number | null>(null)
const selected = computed<WishlistItem | null>(
  () =>
    list.value.find((p) => p.id === selectedId.value) ?? list.value[0] ?? null,
)

const selectedName = computed<string>(() =>
  selected.value ? pokemonName(selected.value, locale.value) : '',
)

async function onAdd(pokemon: Pokemon): Promise<void> {
  if (await add(pokemon)) selectedId.value = pokemon.id
}
</script>

<template>
  <main class="ds">
    <div class="ds-shell ds-top">
      <div class="ds-screen">
        <BattleScene :pokemon="ready ? selected : null" :stats="stats" />
      </div>
    </div>

    <div class="ds-hinge" aria-hidden="true" />

    <div class="ds-shell ds-bottom">
      <div class="ds-screen touch">
        <p v-if="error" class="api-error" role="alert" data-testid="api-error">
          {{ error }}
        </p>

        <div
          v-if="ready && selected"
          class="commands"
          role="group"
          :aria-label="t('home.actionsFor', { name: selectedName })"
        >
          <button
            type="button"
            class="cmd cmd-catch"
            @click="toggle(selected.id)"
          >
            {{ selected.captured ? t('home.release') : t('home.catch') }}
          </button>
          <button
            type="button"
            class="cmd cmd-run"
            :aria-label="t('home.removeLabel', { name: selectedName })"
            @click="remove(selected.id)"
          >
            {{ t('home.remove') }}
          </button>
          <NuxtLink
            :to="`/pokemon/${selected.id}`"
            class="cmd cmd-info"
            :aria-label="t('home.sheetLabel', { name: selectedName })"
          >
            {{ t('home.sheet') }}
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
