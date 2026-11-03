<script setup lang="ts">
// Le cadre commun à toutes les pages : logo (lien vers l'accueil), contenu, pied de page.
// Utilisé par app.vue ET par error.vue (la page d'erreur remplace app.vue entièrement).
useHead({
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
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <header class="logo">
      <NuxtLink to="/" class="logo-link" aria-label="PokéWishlist, accueil">
        <h1 class="logo-title">
          <span class="logo-black">Poké</span
          ><span class="logo-white">Wishlist</span>
        </h1>
      </NuxtLink>
      <p class="logo-sub">Région d'Unys · 5e génération</p>
    </header>

    <slot />

    <footer class="foot">
      Données :
      <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a> ·
      Projet étudiant non officiel, inspiré de Pokémon Noir et Blanc
    </footer>
  </div>
</template>
