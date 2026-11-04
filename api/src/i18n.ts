import en from './locales/en.json' with { type: 'json' }
import es from './locales/es.json' with { type: 'json' }
import fr from './locales/fr.json' with { type: 'json' }
import ja from './locales/jp.json' with { type: 'json' }

export const LANGUAGES = ['en', 'fr', 'es', 'ja'] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'

export type MessageKey = keyof typeof en
type Messages = Record<MessageKey, string>

const MESSAGES: Record<Language, Messages> = { en, fr, es, ja }

export type MessageParams = Record<string, string | number>

export interface Translatable {
  key: MessageKey
  params?: MessageParams
}

export function isLanguage(value: unknown): value is Language {
  return (LANGUAGES as readonly unknown[]).includes(value)
}

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
