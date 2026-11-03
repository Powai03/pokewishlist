#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const GENERATION_URL = 'https://pokeapi.co/api/v2/generation/5'
const OUTPUT = 'data/gen5-pokemon.json'
export const GEN5 = { first: 494, last: 649 }

export function idFromUrl(url) {
  return Number(/\/(\d+)\/?$/.exec(url)?.[1] ?? NaN)
}

export function parseGeneration(generation) {
  return (generation.pokemon_species ?? [])
    .map((s) => ({ id: idFromUrl(s.url), name: s.name }))
    .filter(
      (p) => Number.isInteger(p.id) && p.id >= GEN5.first && p.id <= GEN5.last,
    )
    .sort((a, b) => a.id - b.id)
}

export function prerenderRoutes(pokemon) {
  return pokemon.map((p) => `/pokemon/${p.name}`)
}

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
