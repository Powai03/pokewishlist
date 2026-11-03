// Traduction des messages de l'API : un fichier JSON par langue dans src/locales/ (en, fr, es, jp).
//
// La langue de chaque requête est choisie par le middleware `languageDetector` de Hono (voir app.ts) :
//   1. paramètre d'adresse « ?lang=fr » (pratique pour tester dans un navigateur ou avec curl) ;
//   2. en-tête HTTP standard « Accept-Language: fr » (envoyé par le front, et par tout navigateur) ;
//   3. sinon l'anglais, langue par défaut.
//
// Les règles métier ne renvoient pas de phrases, mais une CLÉ + des paramètres (`Translatable`) :
// la phrase n'est fabriquée qu'au dernier moment, dans la langue de la requête.
import en from './locales/en.json' with { type: 'json' }
import es from './locales/es.json' with { type: 'json' }
import fr from './locales/fr.json' with { type: 'json' }
import ja from './locales/jp.json' with { type: 'json' }

/** Langues proposées. « ja » est le code de LANGUE du japonais (« jp » est celui du pays, gardé pour le fichier). */
export const LANGUAGES = ['en', 'fr', 'es', 'ja'] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'

/** Les clés des messages : celles du fichier anglais, qui sert de référence. */
export type MessageKey = keyof typeof en
type Messages = Record<MessageKey, string>

// Le typage `Messages` fait échouer la compilation si un fichier oublie une clé de l'anglais.
const MESSAGES: Record<Language, Messages> = { en, fr, es, ja }

export type MessageParams = Record<string, string | number>

/** Un message pas encore traduit : sa clé et ses paramètres (ex. { key: 'duplicate', params: { id: 495 } }). */
export interface Translatable {
  key: MessageKey
  params?: MessageParams
}

export function isLanguage(value: unknown): value is Language {
  return (LANGUAGES as readonly unknown[]).includes(value)
}

/**
 * Le message `key` dans la langue `lang`, avec ses paramètres remplacés (« {id} » → 495).
 * Langue inconnue → anglais.
 */
export function translate(
  lang: string,
  key: MessageKey,
  params: MessageParams = {},
): string {
  const messages = MESSAGES[isLanguage(lang) ? lang : DEFAULT_LANGUAGE]
  return messages[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}
