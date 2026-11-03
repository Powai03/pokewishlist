#!/usr/bin/env node
// Vérifie les fichiers de traduction : chaque langue doit avoir EXACTEMENT les clés de en.json (la référence).
//
//   node scripts/check-locales.mjs                 → front (i18n/locales) + API (api/src/locales)
//   node scripts/check-locales.mjs dossier1 …      → seulement ces dossiers
//
// Pour chaque fichier, signale :
//   · une clé MANQUANTE (le site afficherait la clé brute, ex. « sheet.weight ») ;
//   · une clé EN TROP (faute de frappe, ou clé oubliée dans en.json) ;
//   · un texte vide, ou une valeur qui n'est pas un texte ;
//   · des variables différentes de l'anglais (« {name} » oublié ou mal orthographié).
// Code de sortie : 0 si tout est bon, 1 sinon → l'étape de CI GitHub Actions passe au rouge.
//
// Aucune dépendance : seulement Node.js (fs, path). En CI, pas besoin de `npm ci`.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_DIRS = ['i18n/locales', 'api/src/locales']
const REFERENCE = 'en.json'

/**
 * Aplatit un objet de traduction : { app: { title: 'x' } } → Map { 'app.title' → 'x' }.
 * @param {unknown} value
 * @param {string} [prefix]
 * @param {Map<string, unknown>} [out]
 * @returns {Map<string, unknown>}
 */
export function flatten(value, prefix = '', out = new Map()) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out)
    }
  } else {
    out.set(prefix, value)
  }
  return out
}

/**
 * Les variables d'un message, triées : « Hello {name}, {max} » → ['max', 'name'].
 * @param {string} text
 * @returns {string[]}
 */
export function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
}

/**
 * Compare une traduction à la référence (anglais) ; renvoie la liste des problèmes (vide = OK).
 * @param {unknown} reference contenu de en.json
 * @param {unknown} target contenu de l'autre langue
 * @returns {string[]}
 */
export function compareLocales(reference, target) {
  const ref = flatten(reference)
  const tgt = flatten(target)
  const problems = []
  for (const key of ref.keys()) {
    if (!tgt.has(key)) problems.push(`clé manquante : « ${key} »`)
  }
  for (const [key, value] of tgt) {
    if (!ref.has(key)) {
      problems.push(`clé en trop (absente de ${REFERENCE}) : « ${key} »`)
      continue
    }
    if (typeof value !== 'string') {
      problems.push(`« ${key} » doit être un texte`)
      continue
    }
    if (value.trim() === '') {
      problems.push(`texte vide : « ${key} »`)
      continue
    }
    const expected = placeholders(String(ref.get(key)))
    const actual = placeholders(value)
    if (expected.join() !== actual.join()) {
      const show = (vars) => vars.map((v) => `{${v}}`).join(' ') || 'aucune'
      problems.push(
        `variables différentes dans « ${key} » : ${show(actual)} au lieu de ${show(expected)}`,
      )
    }
  }
  return problems
}

/** Lit un fichier JSON ; renvoie { data } ou { error }. */
function readJson(file) {
  try {
    return { data: JSON.parse(readFileSync(file, 'utf8')) }
  } catch (e) {
    return { error: `JSON illisible : ${e instanceof Error ? e.message : e}` }
  }
}

/**
 * Vérifie un ou plusieurs dossiers de traductions, en affichant la progression.
 * @param {string[]} dirs
 * @param {(line: string) => void} [print]
 * @returns {number} nombre de problèmes trouvés
 */
export function checkDirs(
  dirs,
  print = (line) => process.stdout.write(`${line}\n`),
) {
  const inCi = process.env.GITHUB_ACTIONS === 'true'
  // Liste des fichiers à comparer (toutes les langues sauf la référence), pour afficher « [i/total] ».
  const jobs = []
  let total = 0
  for (const dir of dirs) {
    const refFile = join(dir, REFERENCE)
    if (!existsSync(refFile)) {
      print(`✘ ${dir} : ${REFERENCE} introuvable (fichier de référence)`)
      total++
      continue
    }
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.json') && f !== REFERENCE)
      .sort()
    for (const file of files) jobs.push({ dir, refFile, file: join(dir, file) })
  }

  print(`Traductions : ${jobs.length} fichier(s) comparé(s) à ${REFERENCE}`)
  jobs.forEach(({ refFile, file }, i) => {
    const path = relative(process.cwd(), file) // chemin relatif au dépôt (attendu par GitHub)
    const step = `[${i + 1}/${jobs.length}] ${path}`
    const ref = readJson(refFile)
    const tgt = readJson(file)
    const problems = ref.error
      ? [`${REFERENCE} : ${ref.error}`]
      : tgt.error
        ? [tgt.error]
        : compareLocales(ref.data, tgt.data)
    if (problems.length === 0) {
      print(`${step} ✔ ${flatten(tgt.data).size} clés`)
      return
    }
    print(`${step} ✘ ${problems.length} problème(s)`)
    for (const problem of problems) {
      print(`    · ${problem}`)
      // Annotation GitHub Actions : le problème s'affiche sur le fichier, dans l'onglet « Files changed » de la PR.
      if (inCi) print(`::error file=${path},title=Traduction::${problem}`)
    }
    total += problems.length
  })
  print(
    total === 0
      ? '✔ Toutes les traductions sont complètes.'
      : `✘ ${total} problème(s) de traduction.`,
  )
  return total
}

// Exécuté directement (node scripts/check-locales.mjs) — et pas importé par un test.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2)
  process.exitCode = checkDirs(args.length ? args : DEFAULT_DIRS) === 0 ? 0 : 1
}
