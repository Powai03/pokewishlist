// Fichiers de traduction du front (i18n/locales/*.json) et textes de PokéAPI selon la langue.
import { describe, expect, it } from 'vitest'
import en from '../i18n/locales/en.json'
import es from '../i18n/locales/es.json'
import fr from '../i18n/locales/fr.json'
import ja from '../i18n/locales/jp.json'
import { POKEMON_TYPES, STAT_KEYS } from '../app/types/pokemon'
import { LOCALES, inLocale, localize, pokemonName } from '../app/utils/locale'

// Mêmes clés, mêmes variables, aucun texte vide : vérifié par scripts/check-locales.mjs
// (lancé en CI, testé dans checkLocales.test.ts). Ici : le contenu attendu par le code.
const FILES = { en, fr, es, ja } as const

describe('fichiers de traduction du front', () => {
  it('une langue par code de l’appli (en, fr, es, ja)', () => {
    expect(Object.keys(FILES).sort()).toEqual([...LOCALES].sort())
  })

  it('les 18 types et les 6 statistiques sont traduits', () => {
    expect(Object.keys(en.types).sort()).toEqual([...POKEMON_TYPES].sort())
    expect(Object.keys(en.stats)).toEqual([...STAT_KEYS])
  })

  it('les textes diffèrent bien d’une langue à l’autre (pas de copier-coller oublié)', () => {
    const texts = Object.values(FILES).map((m) => m.home.catch)
    expect(new Set(texts).size).toBe(texts.length)
  })
})

describe('textes de PokéAPI selon la langue', () => {
  const entries = [
    { name: 'Snivy', language: { name: 'en' } },
    { name: 'Vipélierre', language: { name: 'fr' } },
    { name: 'ツタージャ', language: { name: 'ja-Hrkt' } },
    { name: '모부기', language: { name: 'ko' } }, // langue non proposée : ignorée
  ]

  it('localize : un texte par langue de l’appli, langues inconnues ignorées', () => {
    expect(localize(entries, (e) => e.name)).toEqual({
      en: 'Snivy',
      fr: 'Vipélierre',
      ja: 'ツタージャ',
    })
  })

  it('inLocale : null si la langue manque ou n’est pas proposée', () => {
    const text = localize(entries, (e) => e.name)
    expect(inLocale(text, 'fr')).toBe('Vipélierre')
    expect(inLocale(text, 'es')).toBeNull()
    expect(inLocale(text, 'ko')).toBeNull()
  })

  it('pokemonName : nom français en français, nom anglais (espèce, majuscule) sinon', () => {
    const p = { name: 'tornadus-incarnate', frName: 'Boréas' }
    expect(pokemonName(p, 'fr')).toBe('Boréas')
    expect(pokemonName(p, 'en')).toBe('Tornadus')
    expect(pokemonName(p, 'ja')).toBe('Tornadus')
    expect(pokemonName({ name: 'snivy' }, 'fr')).toBe('Snivy')
  })
})
