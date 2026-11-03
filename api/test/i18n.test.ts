// Traduction des messages de l'API : fichiers src/locales/*.json + choix de la langue par requête.
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { LANGUAGES, translate, type MessageKey } from '../src/i18n.js'
import en from '../src/locales/en.json' with { type: 'json' }
import es from '../src/locales/es.json' with { type: 'json' }
import fr from '../src/locales/fr.json' with { type: 'json' }
import ja from '../src/locales/jp.json' with { type: 'json' }
import type { ErrorResponse } from '../src/routes/wishlist.js'

const FILES: Record<string, Record<string, string>> = { en, fr, es, ja }
const vars = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort()

describe('fichiers de traduction de l’API', () => {
  it('une langue par code proposé (en, fr, es, ja)', () => {
    expect(Object.keys(FILES).sort()).toEqual([...LANGUAGES].sort())
  })

  for (const [code, messages] of Object.entries(FILES)) {
    it(`${code} : mêmes clés que l’anglais, mêmes variables, aucun texte vide`, () => {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort())
      for (const [key, text] of Object.entries(messages)) {
        expect(text.trim(), key).not.toBe('')
        expect(vars(text), key).toEqual(vars(en[key as MessageKey]))
      }
    })
  }
})

describe('translate', () => {
  it('remplace les paramètres dans la langue demandée', () => {
    expect(translate('fr', 'duplicate', { id: 495 })).toBe(
      'Le Pokémon #495 est déjà dans la wishlist',
    )
    expect(translate('ja', 'full', { max: 6 })).toBe(
      'ウィッシュリストがいっぱいです（最大6匹）',
    )
  })

  it('langue inconnue → anglais', () => {
    expect(translate('de', 'invalidJson')).toBe('Invalid JSON body')
  })

  it('paramètre manquant → laissé tel quel (visible, plutôt qu’un « undefined »)', () => {
    expect(translate('en', 'duplicate')).toBe(
      'Pokémon #{id} is already in the wishlist',
    )
  })
})

describe('langue de la réponse HTTP', () => {
  /** DELETE d'un Pokémon absent : 404 « pas dans la wishlist », avec les en-têtes donnés. */
  async function notInList(
    path = '/wishlist/495',
    headers: Record<string, string> = {},
  ): Promise<{ body: ErrorResponse; res: Response }> {
    const app = createApp({ version: '0.0.0-test', env: 'test' })
    const res = await app.request(path, { method: 'DELETE', headers })
    expect(res.status).toBe(404)
    return { body: (await res.json()) as ErrorResponse, res }
  }

  it('sans indication → anglais (langue par défaut)', async () => {
    const { body, res } = await notInList()
    expect(body).toEqual({
      error: 'Pokémon #495 is not in the wishlist',
      code: 'notInList',
    })
    expect(res.headers.get('content-language')).toBe('en')
  })

  it.each([
    ['fr', "Le Pokémon #495 n'est pas dans la wishlist"],
    ['es', 'El Pokémon #495 no está en la wishlist'],
    ['ja', 'ポケモン #495 はウィッシュリストにありません'],
    ['en', 'Pokémon #495 is not in the wishlist'],
  ])('Accept-Language: %s → message traduit', async (lang, message) => {
    const { body, res } = await notInList(undefined, {
      'Accept-Language': lang,
    })
    expect(body).toEqual({ error: message, code: 'notInList' })
    expect(res.headers.get('content-language')).toBe(lang)
  })

  it('en-tête complet d’un navigateur (« fr-FR,fr;q=0.9,en;q=0.8 ») → français', async () => {
    const { body } = await notInList(undefined, {
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    })
    expect(body.error).toBe("Le Pokémon #495 n'est pas dans la wishlist")
  })

  it('langue non proposée (« de ») → anglais', async () => {
    const { body } = await notInList(undefined, { 'Accept-Language': 'de' })
    expect(body.error).toBe('Pokémon #495 is not in the wishlist')
  })

  it('?lang=es dans l’adresse → prioritaire sur Accept-Language', async () => {
    const { body } = await notInList('/wishlist/495?lang=es', {
      'Accept-Language': 'fr',
    })
    expect(body.error).toBe('El Pokémon #495 no está en la wishlist')
  })

  it('le code d’erreur ne change pas avec la langue (fiable pour un programme)', async () => {
    const codes = await Promise.all(
      LANGUAGES.map(
        async (lang) =>
          (await notInList(undefined, { 'Accept-Language': lang })).body.code,
      ),
    )
    expect(new Set(codes)).toEqual(new Set(['notInList']))
  })

  it('validation traduite avec ses paramètres (Pokémon hors 5e génération)', async () => {
    const app = createApp({ version: '0.0.0-test', env: 'test' })
    const res = await app.request('/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept-language': 'fr' },
      body: JSON.stringify({ id: 25, name: 'pikachu' }),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: '« id » doit être un Pokémon de 5e génération (494 à 649)',
      code: 'idGen5',
    })
  })

  it('n’écrit aucun cookie (l’API reste sans état) et signale Vary: Accept-Language', async () => {
    const { res } = await notInList(undefined, { 'Accept-Language': 'fr' })
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(res.headers.get('vary')).toContain('Accept-Language')
  })
})
