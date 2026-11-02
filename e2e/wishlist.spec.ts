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

test.beforeEach(async ({ page }) => {
  await mockPokeApi(page)
  await page.goto('/')
})

test('ajouter un Pokémon puis rafraîchir : il reste dans la liste', async ({
  page,
}) => {
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

test('supprimer un Pokémon : il ne revient pas après rafraîchissement', async ({
  page,
}) => {
  await page.getByLabel('Nom ou numéro').fill('498')
  await page.getByRole('button', { name: /Gruikui/ }).click()
  await expect(page.getByTestId('card-498')).toBeVisible()

  await page.getByRole('button', { name: 'Retirer Gruikui' }).click()
  await expect(page.getByTestId('card-498')).toHaveCount(0)

  await page.reload()
  await expect(page.getByText('Ta boîte est vide')).toBeVisible()
  await expect(page.getByTestId('card-498')).toHaveCount(0)
})

test('la capture est sauvegardée et met à jour la progression', async ({
  page,
}) => {
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

// ── localStorage corrompu : l'application ne doit jamais planter ──────────────
test.describe('localStorage corrompu', () => {
  // Écrit `raw` à la place de la sauvegarde, puis recharge la page pour que l'appli le relise.
  async function corruptStorageAndReload(
    page: Page,
    raw: string,
  ): Promise<void> {
    await page.evaluate(
      (value) => localStorage.setItem('pokewishlist', value),
      raw,
    )
    await page.reload()
  }

  test("un JSON corrompu ne fait pas planter l'application", async ({
    page,
  }) => {
    // Toute erreur JavaScript non rattrapée dans la page est enregistrée ici.
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await corruptStorageAndReload(page, '{"id":495,"name":"sni') // sauvegarde coupée au milieu

    // 1. L'appli s'affiche normalement, avec une boîte vide (pas d'écran d'erreur)
    await expect(page.getByText('Ta boîte est vide')).toBeVisible()
    await expect(page.getByLabel('Nom ou numéro')).toBeEnabled()

    // 2. Elle reste utilisable : on peut ajouter un Pokémon…
    await page.getByLabel('Nom ou numéro').fill('vipe')
    await page.getByRole('button', { name: /Vipélierre/ }).click()
    await expect(page.getByTestId('card-495')).toBeVisible()

    // 3. … et la nouvelle sauvegarde, valide, remplace la sauvegarde corrompue
    await page.reload()
    await expect(page.getByTestId('card-495')).toBeVisible()
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('pokewishlist') ?? 'null'),
      ),
    ).toHaveLength(1)

    // 4. Aucune erreur JavaScript pendant tout le scénario
    expect(pageErrors).toEqual([])
  })

  test('sauvegarde en partie abîmée : seuls les Pokémon valides s’affichent', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await corruptStorageAndReload(
      page,
      JSON.stringify([
        { id: 495, name: 'snivy', frName: 'Vipélierre', types: ['grass'] },
        null,
        { id: 'x', name: 'zorua' },
        { id: 25, name: 'pikachu', frName: 'Pikachu' }, // hors 5e génération
      ]),
    )

    await expect(page.getByTestId('card-495')).toBeVisible()
    await expect(page.locator('[data-testid^="card-"]')).toHaveCount(1)
    expect(pageErrors).toEqual([])
  })
})
