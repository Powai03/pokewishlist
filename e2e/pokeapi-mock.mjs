// Faux serveur PokéAPI pour les tests E2E (port 3102 par défaut).
//
// Pourquoi un vrai serveur et pas `page.route()` ? La fiche /pokemon/:id est chargée PAR LE SERVEUR NUXT (SSR),
// pas par le navigateur : Playwright ne voit pas cette requête et ne peut pas la simuler.
// Le front est donc lancé avec NUXT_PUBLIC_POKEAPI_BASE=http://localhost:3102 pendant les tests.
//
// Réponses : Vipélierre (#495 / snivy) en détail, un Pokémon générique pour les autres numéros d'Unys,
// Pikachu (#25, existe mais hors 5e génération), et 404 pour tout le reste.
import { createServer } from 'node:http'

const PORT = Number(process.env.PORT ?? 3102)

const SNIVY = {
  pokemon: {
    id: 495,
    name: 'snivy',
    height: 6,
    weight: 81,
    types: [{ slot: 1, type: { name: 'grass' } }],
    stats: [
      ['hp', 45],
      ['attack', 45],
      ['defense', 55],
      ['special-attack', 45],
      ['special-defense', 55],
      ['speed', 63],
    ].map(([name, base_stat]) => ({ base_stat, stat: { name } })),
    sprites: { front_default: null },
  },
  species: {
    id: 495,
    // Plusieurs langues, comme le vrai PokéAPI : la fiche affiche celle choisie dans le sélecteur.
    names: [
      { name: 'Snivy', language: { name: 'en' } },
      { name: 'Vipélierre', language: { name: 'fr' } },
      { name: 'ツタージャ', language: { name: 'ja-Hrkt' } },
    ],
    genera: [
      { genus: 'Grass Snake Pokémon', language: { name: 'en' } },
      { genus: 'Pokémon Serpenterbe', language: { name: 'fr' } },
      { genus: 'くさへびポケモン', language: { name: 'ja' } },
    ],
    flavor_text_entries: [
      {
        flavor_text: 'Un Pokémon intelligent\net très calme.',
        language: { name: 'fr' },
        version: { name: 'black' },
      },
      {
        flavor_text: 'It is very intelligent\nand calm.',
        language: { name: 'en' },
        version: { name: 'black' },
      },
    ],
  },
}

/** Un Pokémon d'Unys « générique » (pour naviguer vers les voisins de Vipélierre). */
function generic(id) {
  return {
    pokemon: {
      ...SNIVY.pokemon,
      id,
      name: `pokemon-${id}`,
      types: [{ slot: 1, type: { name: 'normal' } }],
    },
    species: {
      id,
      names: [{ name: `Pokémon ${id}`, language: { name: 'fr' } }],
    },
  }
}

const PIKACHU = {
  pokemon: { ...SNIVY.pokemon, id: 25, name: 'pikachu' },
  species: { id: 25, names: [{ name: 'Pikachu', language: { name: 'fr' } }] },
}

/** Le Pokémon demandé (numéro ou nom), ou undefined → 404. */
function find(key) {
  if (key === '495' || key === 'snivy') return SNIVY
  if (key === '25' || key === 'pikachu') return PIKACHU
  const id = Number(key)
  if (Number.isInteger(id) && id >= 494 && id <= 649) return generic(id)
  return undefined
}

const server = createServer((req, res) => {
  // CORS : en navigation côté navigateur (lien « N°496 »), c'est le navigateur qui appelle ce serveur.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')
  const match = /^\/(pokemon|pokemon-species)\/([^/]+)\/?$/.exec(req.url ?? '')
  const found = match && find(decodeURIComponent(match[2]).toLowerCase())
  if (req.url === '/health') {
    res.end('{"status":"ok"}')
  } else if (!found) {
    res.statusCode = 404
    res.end('{"detail":"Not found"}')
  } else {
    res.end(
      JSON.stringify(match[1] === 'pokemon' ? found.pokemon : found.species),
    )
  }
})

server.listen(PORT, () => {
  process.stdout.write(`Faux PokéAPI : http://localhost:${PORT}\n`)
})
