<script setup lang="ts">
import type { WishlistItem, WishlistStats } from '~/types/pokemon'

// Écran du haut de la « DS » : une scène de combat façon Pokémon Noir et Blanc.
const props = defineProps<{
  pokemon: WishlistItem | null
  stats: WishlistStats
}>()

const message = computed<string>(() => {
  const p = props.pokemon
  if (!p) return "Les hautes herbes sont calmes… Cherche un Pokémon d'Unys !"
  return p.captured
    ? `Et hop ! ${p.frName} est capturé !`
    : `Un ${p.frName} sauvage apparaît !`
})

// Couleur de la barre comme une barre de PV : vert, puis jaune, puis rouge.
type BarClass = 'bar-high' | 'bar-mid' | 'bar-low'
const barClass = computed<BarClass>(() =>
  props.stats.percent > 50
    ? 'bar-high'
    : props.stats.percent > 20
      ? 'bar-mid'
      : 'bar-low',
)
</script>

<template>
  <section class="scene" aria-label="Pokémon sélectionné" data-testid="scene">
    <div class="stage">
      <!-- Décor : ciel, horizon, herbe et les deux plateformes du combat -->
      <div class="scene-bg" aria-hidden="true">
        <span class="platform platform-far" />
        <span class="platform platform-near" />
      </div>

      <!-- Encadré du Pokémon adverse (en haut à gauche, comme dans le jeu) -->
      <div v-if="pokemon" class="foe-box">
        <div class="foe-line">
          <span class="foe-name">{{ pokemon.frName }}</span>
          <span class="foe-no"
            >N°{{ String(pokemon.id).padStart(3, '0') }}</span
          >
        </div>
        <ul class="foe-types">
          <li
            v-for="t in pokemon.types"
            :key="t"
            :style="{ '--type': typeInfo(t).color }"
          >
            {{ typeInfo(t).label }}
          </li>
        </ul>
        <span v-if="pokemon.captured" class="ball ball-foe" title="Capturé" />
      </div>

      <!-- Le Pokémon, posé sur la plateforme du fond -->
      <Transition name="appear" mode="out-in">
        <img
          v-if="pokemon?.sprite"
          :key="pokemon.id"
          class="foe-sprite"
          :class="{ captured: pokemon.captured }"
          :src="pokemon.sprite"
          :alt="pokemon.frName"
        />
      </Transition>

      <!-- Encadré du dresseur (en bas à droite) : la progression de la chasse façon barre de PV -->
      <div class="player-box">
        <div class="foe-line">
          <span class="foe-name">Chasse</span>
          <span class="foe-no" data-testid="progress"
            >{{ stats.captured }}/{{ stats.total }}</span
          >
        </div>
        <div
          class="hp"
          role="progressbar"
          :aria-valuenow="stats.percent"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Progression des captures"
        >
          <span class="hp-label">PV</span>
          <span class="hp-track"
            ><span
              class="hp-fill"
              :class="barClass"
              :style="{ width: `${stats.percent}%` }"
          /></span>
        </div>
      </div>

      <!-- Boîte de texte du combat -->
      <p class="battle-text" aria-live="polite">
        {{ message }}
        <span class="battle-arrow" aria-hidden="true">▼</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.scene {
  container-type: inline-size; /* les tailles en « cqw » de l'intérieur suivent la largeur de l'écran */
}
.stage {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  font-size: 4.6cqw;
  color: #fff;
}

/* Ciel clair, horizon, puis l'herbe d'Unys */
.scene-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    #9ad3f0 0%,
    #d8f0fa 26%,
    #f4fbf2 33%,
    #b9df86 34%,
    #8cc65a 62%,
    #6eae46 100%
  );
}
.platform {
  position: absolute;
  border-radius: 50%;
}
.platform-far {
  left: 50%;
  top: 33%;
  width: 44%;
  height: 12%;
  background: radial-gradient(
    ellipse at 50% 40%,
    #c9ea9a 0 45%,
    #94c862 46% 70%,
    #6fa946 71%
  );
  box-shadow: 0 0.6cqw 0 #5b8f3a;
}
.platform-near {
  left: -10%;
  top: 58%;
  width: 62%;
  height: 18%;
  background: radial-gradient(
    ellipse at 50% 40%,
    #c9ea9a 0 45%,
    #94c862 46% 70%,
    #6fa946 71%
  );
  box-shadow: 0 0.8cqw 0 #5b8f3a;
}

/* Le Pokémon : sprite pixel agrandi sans flou */
.foe-sprite {
  position: absolute;
  left: 72%;
  top: 39%;
  height: 31%;
  width: auto;
  transform: translate(-50%, -100%);
  image-rendering: pixelated;
  filter: drop-shadow(0 0.6cqw 0 #0002);
}
.foe-sprite.captured {
  filter: grayscale(0.8) brightness(1.1);
  opacity: 0.7;
}
.appear-enter-active {
  transition:
    opacity 0.35s,
    transform 0.35s;
}
.appear-enter-from {
  opacity: 0;
  transform: translate(-30%, -100%);
}
.appear-leave-active {
  transition: opacity 0.15s;
}
.appear-leave-to {
  opacity: 0;
}

/* Encadrés gris foncé à liseré clair, comme les boîtes de PV de Noir et Blanc */
.foe-box,
.player-box {
  position: absolute;
  background: linear-gradient(180deg, #4a4a52 0%, #2c2c33 100%);
  border: 0.5cqw solid #e8e8e8;
  box-shadow:
    0 0 0 0.4cqw #1a1a1e,
    0 1cqw 0 #0004;
  padding: 1.6cqw 3cqw;
  text-shadow: 0.3cqw 0.3cqw 0 #000;
}
.foe-box {
  top: 4cqw;
  left: 0;
  min-width: 46%;
  border-left: 0;
  border-radius: 0 3cqw 3cqw 0;
}
.player-box {
  top: 45%;
  right: 0;
  min-width: 44%;
  border-right: 0;
  border-radius: 3cqw 0 0 3cqw;
}
.foe-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 3cqw;
}
.foe-name {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.foe-no {
  font-size: 0.8em;
  color: #f8d878;
}
.foe-types {
  list-style: none;
  display: flex;
  gap: 1.2cqw;
  margin: 1cqw 0 0;
  padding: 0;
}
.foe-types li {
  font-size: 0.7em;
  padding: 0.2cqw 1.6cqw;
  border-radius: 1cqw;
  background: var(--type);
  border: 0.3cqw solid #fff8;
  text-transform: uppercase;
}
.ball-foe {
  position: absolute;
  right: 2.4cqw;
  bottom: 1.8cqw;
}

.hp {
  display: flex;
  align-items: center;
  gap: 1.4cqw;
  margin-top: 1cqw;
}
.hp-label {
  font-size: 0.65em;
  font-weight: 700;
  color: #f8b830;
  text-shadow: none;
  background: #1a1a1e;
  padding: 0 1.2cqw;
  border-radius: 1cqw;
}
.hp-track {
  flex: 1;
  height: 2.2cqw;
  background: #1a1a1e;
  border: 0.4cqw solid #e8e8e8;
  border-radius: 1.2cqw;
  overflow: hidden;
}
.hp-fill {
  display: block;
  height: 100%;
  transition:
    width 0.5s steps(12),
    background 0.3s;
}
.bar-high {
  background: linear-gradient(#70f8a8 0 40%, #18c020 40%);
}
.bar-mid {
  background: linear-gradient(#f8e038 0 40%, #c8a808 40%);
}
.bar-low {
  background: linear-gradient(#f85838 0 40%, #a84048 40%);
}

/* Boîte de texte : bandeau sombre semi-transparent en bas de l'écran, comme en combat */
.battle-text {
  position: absolute;
  left: 1.6cqw;
  right: 1.6cqw;
  bottom: 1.6cqw;
  margin: 0;
  /* hauteur fixe de 2 lignes : la boîte ne grandit jamais par-dessus l'encadré « Chasse » */
  height: calc(2 * 1.35em + 5.8cqw);
  font-size: 0.86em;
  padding: 2.4cqw 7cqw 2.4cqw 3.4cqw;
  background: #1f1f26e6;
  border: 0.5cqw solid #e8e8e8;
  box-shadow: 0 0 0 0.4cqw #1a1a1e;
  border-radius: 2.4cqw;
  line-height: 1.35;
  text-shadow: 0.3cqw 0.3cqw 0 #000;
}
.battle-arrow {
  position: absolute;
  right: 3cqw;
  bottom: 1.8cqw;
  color: #f85838;
  animation: blink 0.9s steps(2) infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .battle-arrow {
    animation: none;
  }
  .hp-fill {
    transition: none;
  }
}
</style>
