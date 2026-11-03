// Langues de l'application et choix du texte adapté à la langue affichée.
// Les traductions de l'interface sont dans i18n/locales/*.json ; ce fichier gère le reste :
// les données de PokéAPI (noms, descriptions), qui existent déjà dans plusieurs langues.
import type { LocalizedText } from '../types/pokemon'

/** Les 4 langues proposées, l'anglais en premier (langue par défaut). */
export const LOCALES = ['en', 'fr', 'es', 'ja'] as const
export type AppLocale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = 'en'

/** Cookie qui mémorise la langue choisie (lu côté serveur pour un rendu SSR déjà dans la bonne langue). */
export const LOCALE_COOKIE = 'lang'

export function isAppLocale(value: unknown): value is AppLocale {
  return (LOCALES as readonly unknown[]).includes(value)
}

/**
 * Codes de langue de PokéAPI pour chaque langue de l'appli, par ordre de préférence.
 * Japonais : « ja » (kanji/kana) d'abord, puis « ja-Hrkt » (kana seuls).
 */
export const POKEAPI_LANGUAGES: Record<AppLocale, readonly string[]> = {
  en: ['en'],
  fr: ['fr'],
  es: ['es'],
  ja: ['ja', 'ja-Hrkt'],
}

/**
 * Regroupe des entrées PokéAPI (« un texte + sa langue ») en un texte par langue de l'appli.
 * `pick` choisit l'entrée à garder quand une langue en a plusieurs (par défaut : la première).
 */
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

/**
 * Nom d'un Pokémon à afficher : le nom français en français, sinon le nom anglais avec une majuscule.
 * (La wishlist ne stocke que ces deux noms ; en 5e génération, les noms espagnols sont les noms anglais.)
 * Les noms PokéAPI des formes (« tornadus-incarnate ») sont ramenés à l'espèce (« Tornadus »).
 */
export function pokemonName(
  pokemon: { name: string; frName?: string },
  locale: string,
): string {
  if (locale === 'fr' && pokemon.frName) return pokemon.frName
  const species = pokemon.name.split('-')[0] ?? pokemon.name
  return species.charAt(0).toUpperCase() + species.slice(1)
}

/** Le texte dans la langue affichée, ou `null` si PokéAPI ne le fournit pas dans cette langue. */
export function inLocale(text: LocalizedText, locale: string): string | null {
  return isAppLocale(locale) ? (text[locale] ?? null) : null
}
