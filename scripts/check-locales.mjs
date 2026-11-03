#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_DIRS = ['i18n/locales', 'api/src/locales']
const REFERENCE = 'en.json'

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

export function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
}

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

function readJson(file) {
  try {
    return { data: JSON.parse(readFileSync(file, 'utf8')) }
  } catch (e) {
    return { error: `JSON illisible : ${e instanceof Error ? e.message : e}` }
  }
}

export function checkDirs(
  dirs,
  print = (line) => process.stdout.write(`${line}\n`),
) {
  const inCi = process.env.GITHUB_ACTIONS === 'true'
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
    const path = relative(process.cwd(), file)
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2)
  process.exitCode = checkDirs(args.length ? args : DEFAULT_DIRS) === 0 ? 0 : 1
}
