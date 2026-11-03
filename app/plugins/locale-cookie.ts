// Mémorise la langue choisie dans un cookie et la réapplique au chargement suivant.
//
// Pourquoi pas l'option intégrée du module (detectBrowserLanguage) ? Elle suit AUSSI la langue du
// navigateur : un navigateur en français afficherait le site en français. Or l'anglais doit être la
// langue par défaut. Ici, seul un choix explicite du visiteur (le sélecteur de langue) change la langue.
//
// Le cookie est lu côté serveur : la page arrive directement dans la bonne langue (rendu SSR).
export default defineNuxtPlugin({
  name: 'locale-cookie',
  dependsOn: ['i18n:plugin', 'i18n:plugin:route-locale-detect'],
  async setup(nuxtApp) {
    const cookie = useCookie<string | null>(LOCALE_COOKIE, {
      maxAge: 60 * 60 * 24 * 365, // un an
      sameSite: 'lax',
      path: '/',
    })
    const i18n = nuxtApp.$i18n
    if (isAppLocale(cookie.value) && cookie.value !== i18n.locale.value) {
      await i18n.setLocale(cookie.value)
    }
    nuxtApp.hook('i18n:localeSwitched', ({ newLocale }) => {
      cookie.value = newLocale
    })
  },
})
