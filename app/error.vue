<script setup lang="ts">
// Page d'erreur de Nuxt : affichée à la place de toute l'appli (404 Pokémon introuvable, 502 PokéAPI en panne…).
// Le statut HTTP de la réponse est celui de l'erreur : une adresse inconnue renvoie bien un 404.
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed<boolean>(() => props.error.statusCode === 404)
const title = computed<string>(() =>
  notFound.value
    ? 'Pokémon introuvable'
    : (props.error.statusMessage ?? 'Erreur'),
)

useHead({ title: `${title.value} · PokéWishlist` })

/** Efface l'erreur et revient à l'accueil. */
const goHome = (): Promise<void> => clearError({ redirect: '/' })
</script>

<template>
  <AppFrame>
    <main class="ds error-ds" data-testid="error-page">
      <div class="ds-shell ds-top">
        <div class="ds-screen error-screen">
          <p class="error-code">{{ error.statusCode }}</p>
          <h2 class="error-title">{{ title }}</h2>
        </div>
      </div>
      <div class="ds-hinge" aria-hidden="true" />
      <div class="ds-shell ds-bottom">
        <div class="ds-screen touch">
          <p class="error-text" role="alert">
            <template v-if="notFound">
              Les hautes herbes sont vides… {{ error.message }}
            </template>
            <template v-else>{{ error.message }}</template>
          </p>
          <button type="button" class="cmd cmd-run" @click="goHome">
            Retour au PC
          </button>
        </div>
      </div>
    </main>
  </AppFrame>
</template>

<style scoped>
.error-ds {
  /* Toujours la console « fermée » (un écran au-dessus de l'autre), même sur grand écran */
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  max-width: 640px;
  margin: 0 auto;
}
.error-ds .ds-hinge {
  display: block;
}
.error-ds .ds-top {
  position: static;
  border-radius: 22px 22px 8px 8px;
}
.error-ds .ds-bottom {
  border-radius: 8px 8px 22px 22px;
}
.touch {
  /* le bouton prend toute la largeur */
  grid-template-columns: 1fr;
}
.error-screen {
  padding: 28px 16px;
  text-align: center;
  color: #fff;
  background:
    radial-gradient(circle at 50% 120%, #3f9a2c 0 45%, transparent 46%),
    linear-gradient(#24242b, #3b3b42);
}
.error-code {
  margin: 0;
  font-family: var(--logo);
  font-size: clamp(3.5rem, 18vw, 6rem);
  line-height: 1;
  color: #f8d030;
  text-shadow: 4px 4px 0 #0c0c0e;
}
.error-title {
  margin: 8px 0 0;
  font-size: 1.4rem;
}
.error-text {
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
</style>
