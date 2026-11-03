// Le script de vérification des traductions (scripts/check-locales.mjs) : il doit SAVOIR ÉCHOUER.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  compareLocales,
  flatten,
  placeholders,
} from '../scripts/check-locales.mjs'

const EN = {
  app: { title: 'PokéWishlist', hello: 'Hello {name}' },
  box: { full: 'Box full ({max}/{max})' },
}

describe('compareLocales (une langue comparée à en.json)', () => {
  it('mêmes clés, mêmes variables → aucun problème', () => {
    const fr = {
      app: { title: 'PokéWishlist', hello: 'Bonjour {name}' },
      box: { full: 'Boîte pleine ({max}/{max})' },
    }
    expect(compareLocales(EN, fr)).toEqual([])
  })

  it('clé manquante → signalée avec son chemin complet', () => {
    const fr = {
      app: { title: 'PokéWishlist' },
      box: { full: '({max}/{max})' },
    }
    expect(compareLocales(EN, fr)).toEqual(['clé manquante : « app.hello »'])
  })

  it('section entière manquante → chacune de ses clés est signalée', () => {
    const fr = { app: { title: 'x', hello: '{name}' } }
    expect(compareLocales(EN, fr)).toEqual(['clé manquante : « box.full »'])
  })

  it('clé en trop (faute de frappe) → signalée', () => {
    const fr = {
      app: { title: 'x', hello: '{name}', helo: 'y' },
      box: { full: '{max}{max}' },
    }
    expect(compareLocales(EN, fr)).toEqual([
      'clé en trop (absente de en.json) : « app.helo »',
    ])
  })

  it('texte vide, valeur non texte, variable renommée → signalés', () => {
    const fr = {
      app: { title: '  ', hello: 'Bonjour {nom}' },
      box: { full: 6 },
    }
    expect(compareLocales(EN, fr)).toEqual([
      'texte vide : « app.title »',
      'variables différentes dans « app.hello » : {nom} au lieu de {name}',
      '« box.full » doit être un texte',
    ])
  })

  it('outils : flatten et placeholders', () => {
    expect([...flatten(EN).keys()]).toEqual([
      'app.title',
      'app.hello',
      'box.full',
    ])
    expect(placeholders('{b} et {a}')).toEqual(['a', 'b'])
  })
})

describe('le script en ligne de commande (comme en CI)', () => {
  let dir = ''
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  /** Écrit des fichiers de langue dans un dossier temporaire et lance le script dessus. */
  function run(files: Record<string, unknown>): {
    status: number | null
    stdout: string
  } {
    dir = mkdtempSync(join(tmpdir(), 'locales-'))
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(dir, name), JSON.stringify(content))
    }
    const res = spawnSync(
      process.execPath,
      ['scripts/check-locales.mjs', dir],
      { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true' } },
    )
    return { status: res.status, stdout: res.stdout }
  }

  it('traductions complètes → code de sortie 0', () => {
    const { status, stdout } = run({ 'en.json': EN, 'fr.json': EN })
    expect(status).toBe(0)
    expect(stdout).toContain('[1/1]')
  })

  it('une clé manquante → code de sortie 1 (la CI passe au rouge) + annotation GitHub', () => {
    const { status, stdout } = run({
      'en.json': EN,
      'fr.json': { app: { title: 'x' }, box: { full: '{max}{max}' } },
      'es.json': EN,
    })
    expect(status).toBe(1)
    expect(stdout).toContain('clé manquante : « app.hello »')
    expect(stdout).toMatch(
      /::error file=.*fr\.json,title=Traduction::clé manquante/,
    )
  })

  it('JSON illisible → code de sortie 1', () => {
    dir = mkdtempSync(join(tmpdir(), 'locales-'))
    writeFileSync(join(dir, 'en.json'), JSON.stringify(EN))
    writeFileSync(join(dir, 'fr.json'), '{ "app": ')
    const res = spawnSync(
      process.execPath,
      ['scripts/check-locales.mjs', dir],
      {
        encoding: 'utf8',
      },
    )
    expect(res.status).toBe(1)
    expect(res.stdout).toContain('JSON illisible')
  })

  it('en.json absent → code de sortie 1', () => {
    expect(run({ 'fr.json': EN }).status).toBe(1)
  })
})
