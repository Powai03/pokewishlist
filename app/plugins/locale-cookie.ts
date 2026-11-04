export default defineNuxtPlugin({
  name: 'locale-cookie',
  dependsOn: ['i18n:plugin', 'i18n:plugin:route-locale-detect'],
  async setup(nuxtApp) {
    const cookie = useCookie<string | null>(LOCALE_COOKIE, {
      maxAge: 60 * 60 * 24 * 365,
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
