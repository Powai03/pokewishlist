<script setup lang="ts">
import { WISHLIST_MAX } from '~/utils/wishlist'
import type { WishlistItem } from '~/types/pokemon'

defineProps<{
  list: WishlistItem[]
  selectedId: number | null
  ready: boolean
}>()
defineEmits<{ select: [id: number] }>()

const { t, locale } = useI18n()
const nameOf = (p: WishlistItem): string => pokemonName(p, locale.value)
</script>

<template>
  <section class="pc" aria-labelledby="pc-title">
    <h2 id="pc-title" class="pc-title">
      <span aria-hidden="true">◀</span>
      {{ t('box.title') }}
      <span class="pc-count">{{ list.length }}/{{ WISHLIST_MAX }}</span>
      <span aria-hidden="true">▶</span>
    </h2>

    <div class="pc-wall">
      <ul
        v-if="ready && list.length"
        class="pc-grid"
        :aria-label="t('box.list')"
      >
        <li v-for="p in list" :key="p.id" :data-testid="`card-${p.id}`">
          <button
            type="button"
            class="pc-cell"
            :class="{ selected: p.id === selectedId, captured: p.captured }"
            :aria-pressed="p.id === selectedId"
            :aria-label="
              p.captured ? t('box.captured', { name: nameOf(p) }) : nameOf(p)
            "
            @click="$emit('select', p.id)"
          >
            <img
              v-if="p.icon || p.sprite"
              class="pc-icon"
              :class="{ 'is-sprite': !p.icon }"
              :src="p.icon ?? p.sprite ?? ''"
              alt=""
              loading="lazy"
            />
            <span class="pc-name">{{ nameOf(p) }}</span>
            <span v-if="p.captured" class="ball ball-cell" />
          </button>
        </li>
      </ul>
      <p v-else-if="ready" class="pc-empty">
        {{ t('box.empty') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.pc-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 auto 10px;
  width: fit-content;
  padding: 6px 18px;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #2b2b2b;
  background: linear-gradient(#ffffff, #dcdcdc);
  border: 3px solid #2b2b2b;
  border-radius: 999px;
  box-shadow: 0 3px 0 #0006;
}
.pc-title > span[aria-hidden] {
  color: #3a8ee0;
  font-size: 0.8em;
}
.pc-count {
  background: #2b2b2b;
  color: #fff;
  border-radius: 6px;
  padding: 0 7px;
  font-size: 0.85em;
}

.pc-wall {
  min-height: 150px;
  padding: 10px;
  border: 3px solid #2b2b2b;
  border-radius: 12px;
  background:
    linear-gradient(#ffffff22 2px, transparent 2px) 0 0 / 24px 24px,
    linear-gradient(90deg, #ffffff22 2px, transparent 2px) 0 0 / 24px 24px,
    linear-gradient(180deg, #8fd16f, #5daf4a);
  box-shadow:
    inset 0 0 0 3px #c8f0a8,
    0 3px 0 #0006;
}
.pc-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 8px;
}
.pc-cell {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px 6px;
  background: #ffffffcc;
  color: #2b2b2b;
  border: 2px solid #2b2b2b;
  border-radius: 10px;
  font: inherit;
}
.pc-cell:hover {
  background: #fff;
}
.pc-cell.selected {
  background: #fff7c8;
  border-color: #e8a020;
  box-shadow: 0 0 0 3px #f8d030;
}
.pc-cell.selected::before {
  content: '☛';
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%) rotate(90deg);
  font-size: 18px;
  color: #2b2b2b;
  animation: bob 0.8s steps(2) infinite;
}
@keyframes bob {
  50% {
    top: -10px;
  }
}
.pc-icon {
  width: 80px;
  height: 60px;
  object-fit: contain;
  image-rendering: pixelated;
}
.pc-icon.is-sprite {
  width: 60px;
}
.pc-name {
  font-size: 0.8rem;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-cell.captured .pc-icon {
  opacity: 0.55;
}
.ball-cell {
  position: absolute;
  top: 5px;
  right: 5px;
}
.pc-empty {
  margin: 0;
  padding: 30px 14px;
  text-align: center;
  font-weight: 600;
  color: #fff;
  text-shadow: 2px 2px 0 #2b5a1e;
}
@media (prefers-reduced-motion: reduce) {
  .pc-cell.selected::before {
    animation: none;
  }
}
</style>
