import type { LocalizedText } from '../types/pokemon'

export const LOCALES = ['en', 'fr', 'es', 'ja'] as const
export type AppLocale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = 'en'

export const LOCALE_COOKIE = 'lang'

export function isAppLocale(value: unknown): value is AppLocale {
  return (LOCALES as readonly unknown[]).includes(value)
}

export const POKEAPI_LANGUAGES: Record<AppLocale, readonly string[]> = {
  en: ['en'],
  fr: ['fr'],
  es: ['es'],
  ja: ['ja', 'ja-Hrkt'],
}

export function localize<T extends { language: { name: string } }>(
  entries: readonly T[],
  text: (entry: T) => string,
  pick: (candidates: T[]) => T | undefined = (c) => c[0],
): LocalizedText {
  const result: LocalizedText = {}
  for (const locale of LOCALES) {
    for (const code of POKEAPI_LANGUAGES[locale]) {
      const chosen = pick(entries.filter((e) => e.language.name === code))
      if (chosen) {
        result[locale] = text(chosen)
        break
      }
    }
  }
  return result
}

export function pokemonName(
  pokemon: { name: string; frName?: string },
  locale: string,
): string {
  if (locale === 'fr' && pokemon.frName) return pokemon.frName
  const species = pokemon.name.split('-')[0] ?? pokemon.name
  return species.charAt(0).toUpperCase() + species.slice(1)
}

export function inLocale(text: LocalizedText, locale: string): string | null {
  return isAppLocale(locale) ? (text[locale] ?? null) : null
}
