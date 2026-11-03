#!/usr/bin/env node
// Récupère dans PokéAPI la liste des Pokémon de la 5e génération (Unys, n°494 à 649) et l'écrit
// dans data/gen5-pokemon.json. Ce fichier sert à PRÉ-RENDRE leurs fiches au build (nuxt.config.ts) :
// /pokemon/snivy, /pokemon/tepig… deviennent des pages HTML statiques.
//
//   node scripts/fetch-gen5-pokemon.mjs        (npm run fetch:pokemon)
//
// Pourquoi 156 et pas les 1025 Pokémon ? Le site ne couvre que la 5e génération : pré-rendre les
// autres serait inutile (ils répondent 404) et rallongerait le build de plusieurs minutes.
// Le fichier est versionné : le build ne dépend pas de ce script, seulement du fichier produit.
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const GENERATION_URL = 'https://pokeapi.co/api/v2/generation/5'
const OUTPUT = 'data/gen5-pokemon.json'
export const GEN5 = { first: 494, last: 649 }

/** Numéro du Pokédex à la fin d'une adresse PokéAPI : « …/pokemon-species/495/ » → 495. */
export function idFromUrl(url) {
  return Number(/\/(\d+)\/?$/.exec(url)?.[1] ?? NaN)
}

/**
 * Réponse de /generation/5 → [{ id, name }] triés par numéro, limités à 494–649.
 * @param {{ pokemon_species?: { name: string, url: string }[] }} generation
 * @returns {{ id: number, name: string }[]}
 */
export function parseGeneration(generation) {
  return (generation.pokemon_species ?? [])
    .map((s) => ({ id: idFromUrl(s.url), name: s.name }))
    .filter(
      (p) => Number.isInteger(p.id) && p.id >= GEN5.first && p.id <= GEN5.last,
    )
    .sort((a, b) => a.id - b.id)
}

/** Les routes à pré-rendre : une par nom (« /pokemon/snivy »). */
export function prerenderRoutes(pokemon) {
  return pokemon.map((p) => `/pokemon/${p.name}`)
}

// Exécuté directement (et pas importé par un test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const out = (line) => process.stdout.write(`${line}\n`)
  out(`[1/3] Lecture de ${GENERATION_URL}…`)
  const res = await fetch(GENERATION_URL)
  if (!res.ok) {
    process.stderr.write(`PokéAPI a répondu ${res.status}\n`)
    process.exit(1)
  }
  const pokemon = parseGeneration(await res.json())
  const expected = GEN5.last - GEN5.first + 1
  out(`[2/3] ${pokemon.length} Pokémon trouvés (attendu : ${expected})`)
  if (pokemon.length !== expected) {
    process.stderr.write('Liste incomplète : fichier non modifié.\n')
    process.exit(1)
  }
  writeFileSync(OUTPUT, `${JSON.stringify(pokemon, null, 2)}\n`)
  out(`[3/3] ${OUTPUT} écrit (${pokemon[0].name} … ${pokemon.at(-1).name})`)
}
