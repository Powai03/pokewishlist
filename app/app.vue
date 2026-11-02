<script setup lang="ts">
import type { Pokemon, WishlistItem } from '~/types/pokemon'

useHead({
  title: 'PokéWishlist · Unys',
  htmlAttrs: { lang: 'fr' },
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=DotGothic16&family=Pixelify+Sans:wght@700&display=swap',
    },
  ],
})

const { list, ready, stats, add, remove, toggle } = useWishlist()
const owned = computed<number[]>(() => list.value.map((p) => p.id))

// Pokémon affiché sur l'écran du haut : celui qu'on a choisi, sinon le premier de la boîte.
const selectedId = ref<number | null>(null)
const selected = computed<WishlistItem | null>(
  () =>
    list.value.find((p) => p.id === selectedId.value) ?? list.value[0] ?? null,
)

function onAdd(pokemon: Pokemon): void {
  add(pokemon)
  selectedId.value = pokemon.id
}
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <header class="logo">
      <h1 class="logo-title">
        <span class="logo-black">Poké</span
        ><span class="logo-white">Wishlist</span>
      </h1>
      <p class="logo-sub">Région d'Unys · 5e génération</p>
    </header>

    <!-- La console : écran du haut (combat) + charnière + écran du bas (tactile) -->
    <main class="ds">
      <div class="ds-shell ds-top">
        <div class="ds-screen">
          <BattleScene :pokemon="ready ? selected : null" :stats="stats" />
        </div>
      </div>

      <div class="ds-hinge" aria-hidden="true" />

      <div class="ds-shell ds-bottom">
        <div class="ds-screen touch">
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
          </div>

          <PokeSearch :owned="owned" @add="onAdd" />

          <PcBox
            :list="list"
            :selected-id="selected?.id ?? null"
            :ready="ready"
            @select="selectedId = $event"
          />
        </div>
      </div>
    </main>

    <footer class="foot">
      Données :
      <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a> ·
      Projet étudiant non officiel, inspiré de Pokémon Noir et Blanc
    </footer>
  </div>
</template>

<style>
:root {
  --ink: #2b2b2b;
  --font:
    'DotGothic16', ui-monospace, monospace; /* police « à points », proche du texte des jeux DS */
  --logo: 'Pixelify Sans', var(--font);
  color-scheme: light;
}
* {
  box-sizing: border-box;
}
/* Noir d'un côté, Blanc de l'autre : les deux versions du jeu */
html {
  background: linear-gradient(115deg, #141417 0 50%, #ececea 50% 100%);
  min-height: 100%;
}
body {
  margin: 0;
  font-family: var(--font);
  color: var(--ink);
  background: transparent;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: default;
}
:focus-visible {
  outline: 3px solid #f8d030;
  outline-offset: 2px;
}

.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px 32px;
}

/* ── Logo : « Poké » en noir sur blanc, « Wishlist » en blanc sur noir ── */
.logo {
  text-align: center;
  margin-bottom: 18px;
}
.logo-title {
  margin: 0;
  font-family: var(--logo);
  font-size: clamp(2rem, 9vw, 3.2rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
}
.logo-black,
.logo-white {
  display: inline-block;
  padding: 6px 12px;
  border: 4px solid;
}
.logo-black {
  background: #ececea;
  color: #141417;
  border-color: #141417;
  border-radius: 14px 0 0 14px;
}
.logo-white {
  background: #141417;
  color: #ececea;
  border-color: #ececea;
  border-radius: 0 14px 14px 0;
}
.logo-sub {
  display: inline-block;
  margin: 10px 0 0;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #ececea;
  background: #141417;
  border: 2px solid #ececea;
}

/* ── La console DS ── */
.ds {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.ds-shell {
  padding: 14px;
  background: linear-gradient(160deg, #3b3b42, #1d1d22);
  border: 3px solid #0c0c0e;
  box-shadow:
    inset 0 2px 0 #ffffff22,
    0 8px 18px #0007;
}
.ds-top {
  border-radius: 22px 22px 8px 8px;
}
.ds-bottom {
  border-radius: 8px 8px 22px 22px;
}
.ds-hinge {
  height: 16px;
  margin: 0 24px;
  background: linear-gradient(#15151a, #34343c 50%, #15151a);
  border-left: 3px solid #0c0c0e;
  border-right: 3px solid #0c0c0e;
}
.ds-screen {
  border: 3px solid #0c0c0e;
  border-radius: 6px;
  overflow: hidden;
  background: #000;
}

/* Écran tactile : fond sombre à rayures diagonales, comme l'écran du bas en combat */
.touch {
  display: grid;
  gap: 18px;
  padding: 16px;
  background: repeating-linear-gradient(
    135deg,
    #2a2a31 0 8px,
    #32323a 8px 16px
  );
}

/* ── Boutons de commande ── */
.commands {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
}
.cmd {
  padding: 14px 10px;
  font: inherit;
  font-size: 1.35rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #fff;
  text-shadow: 2px 2px 0 #0008;
  border: 3px solid #fff;
  border-radius: 16px;
  box-shadow:
    0 0 0 3px #0c0c0e,
    0 5px 0 3px #0c0c0e;
  transition:
    transform 0.08s,
    box-shadow 0.08s;
}
.cmd:active {
  transform: translateY(4px);
  box-shadow:
    0 0 0 3px #0c0c0e,
    0 1px 0 3px #0c0c0e;
}
.cmd-catch {
  background: linear-gradient(#ff8a6a 0 48%, #e8402a 52%);
}
.cmd-run {
  background: linear-gradient(#7ac8ff 0 48%, #2878d8 52%);
}

/* Poké Ball dessinée en CSS (utilisée pour marquer les captures) */
.ball {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #1a1a1e;
  background:
    radial-gradient(circle, #fff 0 2px, #1a1a1e 2px 3.5px, transparent 3.5px),
    linear-gradient(#e83828 0 44%, #1a1a1e 44% 56%, #fff 56%);
}

.foot {
  width: fit-content;
  margin: 22px auto 0;
  padding: 4px 14px;
  text-align: center;
  font-size: 0.85rem;
  color: #ececea;
  background: #141417;
  border: 2px solid #ececea;
  border-radius: 999px;
}
.foot a {
  color: #8edcf8;
}

/* Écran large : les deux écrans côte à côte, l'écran de combat reste visible pendant le défilement */
@media (min-width: 1100px) {
  .page {
    max-width: 1240px;
  }
  .ds {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    align-items: start;
  }
  .ds-hinge {
    display: none;
  }
  .ds-top,
  .ds-bottom {
    border-radius: 22px;
  }
  .ds-top {
    position: sticky;
    top: 20px;
  }
}

@media (max-width: 420px) {
  .page {
    padding-left: 10px;
    padding-right: 10px;
  }
  .ds-shell {
    padding: 8px;
  }
  .touch {
    padding: 12px;
  }
  .cmd {
    font-size: 1.1rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cmd {
    transition: none;
  }
}
</style>
