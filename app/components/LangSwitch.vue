<script setup lang="ts">
// Sélecteur de langue : change TOUTE l'interface sans recharger la page (les textes sont réactifs).
// Le choix est mémorisé dans un cookie (app/plugins/locale-cookie.ts) et envoyé à l'API (Accept-Language).
const { locale, locales, setLocale, t } = useI18n()

async function onChange(event: Event): Promise<void> {
  const value = (event.target as HTMLSelectElement).value
  if (isAppLocale(value)) await setLocale(value)
}
</script>

<template>
  <div class="lang">
    <label for="lang-select" class="lang-label">
      <span aria-hidden="true">🌐</span> {{ t('app.language') }}
    </label>
    <select
      id="lang-select"
      class="lang-select"
      :value="locale"
      data-testid="lang-select"
      @change="onChange"
    >
      <option
        v-for="l in locales"
        :key="l.code"
        :value="l.code"
        :lang="l.language"
      >
        {{ l.name }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.lang {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 0;
  padding: 3px 4px 3px 12px;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #ececea;
  background: #141417;
  border: 2px solid #ececea;
}
.lang-select {
  padding: 2px 6px;
  font: inherit;
  color: #141417;
  background: #ececea;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}
.lang-select:focus-visible {
  outline: 3px solid #8edcf8;
  outline-offset: 2px;
}
</style>
