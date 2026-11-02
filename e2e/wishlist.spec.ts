import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'
import { API_URL } from '../playwright.config'

// Fausses réponses PokéAPI : le test ne dépend ni du réseau ni de la disponibilité de PokéAPI.
// L'API Hono, elle, est la VRAIE (démarrée par playwright.config.ts).
const GRAPHQL_INDEX = {
  data: {
    species: [
      { id: 495, name: 'snivy', names: [{ name: 'Vipélierre' }] },
      { id: 498, name: 'tepig', names: [{ name: 'Gruikui' }] },
      { id: 501, name: 'oshawott', names: [{ name: 'Moustillon' }] },
    ],
  },
}
const GEN5_INDEX = {
  pokemon_species: [
    { name: 'snivy', url: 'https://pokeapi.co/api/v2/pokemon-species/495/' },
    { name: 'tepig', url: 'https://pokeapi.co/api/v2/pokemon-species/498/' },
    { name: 'oshawott', url: 'https://pokeapi.co/api/v2/pokemon-species/501/' },
  ],
}
const POKEMON: Record<string, { name: string; fr: string; type: string }> = {
  495: { name: 'snivy', fr: 'Vipélierre', type: 'grass' },
  498: { name: 'tepig', fr: 'Gruikui', type: 'fire' },
  501: { name: 'oshawott', fr: 'Moustillon', type: 'water' },
}

async function mockPokeApi(page: Page) {
  await page.route('https://beta.pokeapi.co/graphql/**', (route) =>
    route.fulfill({ json: GRAPHQL_INDEX }),
  )
  await page.route('https://pokeapi.co/api/v2/**', (route) => {
    const url = new URL(route.request().url())
    const [, , , resource, id] = url.pathname.split('/') // /api/v2/<resource>/<id>
    const p = POKEMON[id ?? '']
    if (resource === 'generation') return route.fulfill({ json: GEN5_INDEX })
    if (resource === 'pokemon' && p) {
      return route.fulfill({
        json: {
          id: Number(id),
          name: p.name,
          types: [{ slot: 1, type: { name: p.type } }],
          sprites: { front_default: null },
        },
      })
    }
    if (resource === 'pokemon-species' && p) {
      return route.fulfill({
        json: { names: [{ name: p.fr, language: { name: 'fr' } }] },
      })
    }
    return route.fulfill({ status: 404, json: {} })
  })
}

/** Vide la wishlist de l'API (stockée en mémoire, partagée entre les tests). */
async function resetApi(request: APIRequestContext): Promise<void> {
  const items = (await (await request.get(`${API_URL}/wishlist`)).json()) as {
    id: number
  }[]
  for (const item of items)
    await request.delete(`${API_URL}/wishlist/${item.id}`)
}

/** Ce que l'API contient réellement (lu directement, sans passer par le front). */
async function apiWishlist(
  request: APIRequestContext,
): Promise<{ id: number; frName: string; captured: boolean }[]> {
  return (await (await request.get(`${API_URL}/wishlist`)).json()) as {
    id: number
    frName: string
    captured: boolean
  }[]
}

test.beforeEach(async ({ page, request }) => {
  await resetApi(request)
  await mockPokeApi(page)
  await page.goto('/')
})

// ── Front → API : ce qu'on fait dans Nuxt est enregistré par l'API ────────────
test("ajouter un Pokémon depuis Nuxt : il apparaît dans l'API (GET /wishlist)", async ({
  page,
  request,
}) => {
  await expect(page.getByText('Ta boîte est vide')).toBeVisible()
  expect(await apiWishlist(request)).toEqual([]) // l'API est vide au départ

  // 1. Dans le front : rechercher et ajouter Vipélierre
  await page.getByLabel('Nom ou numéro').fill('vipe')
  await page.getByRole('button', { name: /Vipélierre/ }).click()
  await expect(page.getByTestId('card-495')).toBeVisible()

  // 2. Dans l'API, appelée directement : le Pokémon y est, avec les données envoyées par le front
  await expect
    .poll(async () => (await apiWishlist(request)).map((p) => p.id))
    .toEqual([495])
  expect((await apiWishlist(request))[0]).toMatchObject({
    id: 495,
    frName: 'Vipélierre',
    captured: false,
  })
})

// ── API → front : ce que l'API contient est affiché par Nuxt ──────────────────
test('un Pokémon ajouté directement dans l’API s’affiche dans Nuxt', async ({
  page,
  request,
}) => {
  const res = await request.post(`${API_URL}/wishlist`, {
    data: { id: 498, name: 'tepig', frName: 'Gruikui', types: ['fire'] },
  })
  expect(res.status()).toBe(201)

  await page.reload()

  await expect(page.getByTestId('card-498')).toContainText('Gruikui')
  await expect(page.getByTestId('scene')).toContainText('Feu')
})

test('ajouter puis rafraîchir : le Pokémon est relu depuis l’API', async ({
  page,
}) => {
  await page.getByLabel('Nom ou numéro').fill('vipe')
  await page.getByRole('button', { name: /Vipélierre/ }).click()
  await expect(page.getByTestId('card-495')).toBeVisible()

  await page.reload()

  await expect(page.getByTestId('card-495')).toContainText('Vipélierre')
  await expect(page.getByText('Ta boîte est vide')).toHaveCount(0)
})

test('supprimer depuis Nuxt : DELETE envoyé, le Pokémon disparaît de l’API', async ({
  page,
  request,
}) => {
  await page.getByLabel('Nom ou numéro').fill('498')
  await page.getByRole('button', { name: /Gruikui/ }).click()
  await expect(page.getByTestId('card-498')).toBeVisible()

  await page.getByRole('button', { name: 'Retirer Gruikui' }).click()

  await expect(page.getByTestId('card-498')).toHaveCount(0)
  await expect.poll(async () => apiWishlist(request)).toEqual([])
  await page.reload()
  await expect(page.getByText('Ta boîte est vide')).toBeVisible()
})

test('capturer depuis Nuxt : PATCH envoyé, l’état est enregistré par l’API', async ({
  page,
  request,
}) => {
  await page.getByLabel('Nom ou numéro').fill('moustillon')
  await page.keyboard.press('Enter') // Entrée ajoute le premier résultat
  await expect(page.getByTestId('card-501')).toBeVisible()
  await expect(page.getByTestId('progress')).toHaveText('0/1')

  await page.getByRole('button', { name: 'Capturer' }).click()

  await expect(page.getByTestId('progress')).toHaveText('1/1')
  await expect
    .poll(async () => (await apiWishlist(request))[0]?.captured)
    .toBe(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Relâcher' })).toBeVisible()
})

// ── Robustesse : l'API ne répond pas ──────────────────────────────────────────
test("API injoignable : message d'erreur, l'application ne plante pas", async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  // Simule une API arrêtée : la connexion est refusée.
  await page.route(`${API_URL}/**`, (route) => route.abort('connectionrefused'))

  await page.reload()

  await expect(page.getByTestId('api-error')).toContainText(
    "L'API ne répond pas",
  )
  await expect(page.getByText('Ta boîte est vide')).toBeVisible()
  await expect(page.getByLabel('Nom ou numéro')).toBeEnabled()
  expect(pageErrors).toEqual([])
})
