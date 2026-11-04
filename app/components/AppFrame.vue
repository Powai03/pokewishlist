<script setup lang="ts">
const { t, localeProperties } = useI18n()
const commit = useRuntimeConfig().public.commit

useHead({
  htmlAttrs: { lang: () => localeProperties.value.language ?? 'en' },
  meta: [{ name: 'app-commit', content: commit }],
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
      <NuxtLink to="/" class="logo-link" :aria-label="t('app.homeLink')">
        <h1 class="logo-title">
          <span class="logo-black">Poké</span
          ><span class="logo-white">Wishlist</span>
        </h1>
      </NuxtLink>
      <div class="logo-row">
        <p class="logo-sub">{{ t('app.subtitle') }}</p>
        <LangSwitch />
      </div>
    </header>

    <slot />

    <footer class="foot">
      <i18n-t keypath="app.footer" scope="global">
        <template #pokeapi>
          <a href="https://pokeapi.co" target="_blank" rel="noopener"
            >PokéAPI</a
          >
        </template>
      </i18n-t>
      <span class="foot-version" data-testid="app-version">
        · v{{ commit.slice(0, 7) }}</span
      >
    </footer>
  </div>
</template>
