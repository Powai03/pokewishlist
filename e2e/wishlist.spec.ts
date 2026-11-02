import { expect, test, type Page } from '@playwright/test'

// Fausses réponses PokéAPI : le test ne dépend ni du réseau ni de la disponibilité de l'API.
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
const POKEMON: Record<string, { name: string, fr: string, type: string }> = {
  495: { name: 'snivy', fr: 'Vipélierre', type: 'grass' },
  498: { name: 'tepig', fr: 'Gruikui', type: 'fire' },
  501: { name: 'oshawott', fr: 'Moustillon', type: 'water' },
}

async function mockPokeApi(page: Page) {
  await page.route('https://beta.pokeapi.co/graphql/**', route => route.fulfill({ json: GRAPHQL_INDEX }))
  await page.route('https://pokeapi.co/api/v2/**', (route) => {
    const url = new URL(route.request().url())
    const [, , , resource, id] = url.pathname.split('/') // /api/v2/<resource>/<id>
    const p = POKEMON[id ?? '']
    if (resource === 'generation') return route.fulfill({ json: GEN5_INDEX })
    if (resource === 'pokemon' && p) {
      return route.fulfill({ json: { id: Number(id), name: p.name, types: [{ slot: 1, type: { name: p.type } }], sprites: { front_default: null } } })
    }
    if (resource === 'pokemon-species' && p) {
      return route.fulfill({ json: { names: [{ name: p.fr, language: { name: 'fr' } }] } })
    }
    return route.fulfill({ status: 404, json: {} })
  })
}

test.beforeEach(async ({ page }) => {
  await mockPokeApi(page)
  await page.goto('/')
})

test('ajouter un Pokémon puis rafraîchir : il reste dans la liste', async ({ page }) => {
  await expect(page.getByText('Ta boîte est vide')).toBeVisible()

  // 1. Rechercher (en français, sans accent) et ajouter Vipélierre
  await page.getByLabel('Nom ou numéro').fill('vipe')
  await page.getByRole('button', { name: /Vipélierre/ }).click()

  const card = page.getByTestId('card-495')
  await expect(card).toBeVisible()
  await expect(card).toContainText('Vipélierre')
  await expect(page.getByTestId('scene')).toContainText('Plante') // affiché sur l'écran du haut

  // 2. Rafraîchir la page : la liste doit être relue depuis le localStorage
  await page.reload()
  await expect(page.getByTestId('card-495')).toBeVisible()
  await expect(page.getByTestId('card-495')).toContainText('Vipélierre')
  await expect(page.getByText('Ta boîte est vide')).toHaveCount(0)
})

test('supprimer un Pokémon : il ne revient pas après rafraîchissement', async ({ page }) => {
  await page.getByLabel('Nom ou numéro').fill('498')
  await page.getByRole('button', { name: /Gruikui/ }).click()
  await expect(page.getByTestId('card-498')).toBeVisible()

  await page.getByRole('button', { name: 'Retirer Gruikui' }).click()
  await expect(page.getByTestId('card-498')).toHaveCount(0)

  await page.reload()
  await expect(page.getByText('Ta boîte est vide')).toBeVisible()
  await expect(page.getByTestId('card-498')).toHaveCount(0)
})

test('la capture est sauvegardée et met à jour la progression', async ({ page }) => {
  await page.getByLabel('Nom ou numéro').fill('moustillon')
  await page.keyboard.press('Enter') // Entrée ajoute le premier résultat
  await expect(page.getByTestId('card-501')).toBeVisible()
  await expect(page.getByTestId('progress')).toHaveText('0/1')

  await page.getByRole('button', { name: 'Capturer' }).click()
  await expect(page.getByTestId('progress')).toHaveText('1/1')

  await page.reload()
  await expect(page.getByTestId('progress')).toHaveText('1/1')
  await expect(page.getByRole('button', { name: 'Relâcher' })).toBeVisible()
})
