// Traduction (i18n) de bout en bout : anglais par défaut, sélecteur de langue, langue mémorisée,
// et messages de l'API Hono traduits dans la langue choisie (en-tête Accept-Language envoyé par le front).
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'
import { API_URL } from '../playwright.config'

async function resetApi(request: APIRequestContext): Promise<void> {
  const items = (await (await request.get(`${API_URL}/wishlist`)).json()) as {
    id: number
  }[]
  for (const { id } of items) await request.delete(`${API_URL}/wishlist/${id}`)
}

/** Index de recherche (PokéAPI GraphQL) simulé : la page d'accueil le charge au démarrage. */
async function mockSearchIndex(page: Page): Promise<void> {
  await page.route('https://beta.pokeapi.co/graphql/**', (route) =>
    route.fulfill({
      json: {
        data: {
          species: [
            { id: 495, name: 'snivy', names: [{ name: 'Vipélierre' }] },
          ],
        },
      },
    }),
  )
}

const chooseLanguage = (page: Page, code: string): Promise<string[]> =>
  page.getByTestId('lang-select').selectOption(code)

test.beforeEach(async ({ page, request }) => {
  await resetApi(request)
  await mockSearchIndex(page)
})

test.describe('anglais par défaut', () => {
  // Navigateur réglé en français : l'anglais reste la langue par défaut (choix du projet).
  test.use({ locale: 'fr-FR' })

  test('première visite → interface en anglais, <html lang="en-US">', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByText('Your box is empty. Add a Pokémon from the Pokédex!'),
    ).toBeVisible()
    await expect(page.getByText('Unova region · Generation V')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    await expect(page.getByTestId('lang-select')).toHaveValue('en')
    await expect(page).toHaveTitle('PokéWishlist · Unova')
  })
})

test.describe('changer de langue', () => {
  test('modifie toute l’interface, sans recharger la page', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByText('Your box is empty')).toBeVisible()

    for (const [code, empty, subtitle, lang] of [
      ['fr', 'Ta boîte est vide', "Région d'Unys", 'fr-FR'],
      ['es', 'Tu caja está vacía', 'Región de Teselia', 'es-ES'],
      ['ja', 'ボックスは からっぽ', 'イッシュ地方', 'ja-JP'],
      ['en', 'Your box is empty', 'Unova region', 'en-US'],
    ] as const) {
      await chooseLanguage(page, code)
      await expect(page.getByText(empty)).toBeVisible()
      await expect(page.getByText(subtitle)).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', lang)
    }
  })

  test('le choix est mémorisé : rechargement et page rendue par le serveur', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await chooseLanguage(page, 'es')
    await expect(page.getByText('Tu caja está vacía')).toBeVisible()

    const cookies = await context.cookies()
    expect(cookies.find((c) => c.name === 'lang')?.value).toBe('es')

    await page.reload()
    await expect(page.getByText('Tu caja está vacía')).toBeVisible()
    await expect(page.getByTestId('lang-select')).toHaveValue('es')
  })

  test('fiche Pokémon : interface ET données PokéAPI dans la langue choisie', async ({
    page,
  }) => {
    await page.goto('/pokemon/495')
    const sheet = page.getByTestId('pokemon-sheet')
    await expect(sheet.getByRole('heading', { name: 'Snivy' })).toBeVisible()
    await expect(sheet.getByText('Grass Snake Pokémon')).toBeVisible()
    await expect(sheet.getByText('0.6 m')).toBeVisible()
    await expect(sheet.getByRole('list', { name: 'Types' })).toHaveText('Grass')

    await chooseLanguage(page, 'ja')
    await expect(
      sheet.getByRole('heading', { name: 'ツタージャ' }),
    ).toBeVisible()
    await expect(sheet.getByText('くさへびポケモン')).toBeVisible()
    await expect(sheet.getByRole('list', { name: 'タイプ' })).toHaveText('くさ')
    await expect(sheet.getByText('こうげき')).toBeVisible()
    await expect(page).toHaveTitle(/ツタージャ/)

    await chooseLanguage(page, 'fr')
    await expect(
      sheet.getByRole('heading', { name: 'Vipélierre' }),
    ).toBeVisible()
    await expect(sheet.getByText('0,6 m')).toBeVisible()
  })

  test('page 404 : traduite elle aussi, même après coup', async ({ page }) => {
    const res = await page.goto('/pokemon/9999')
    expect(res?.status()).toBe(404)
    const error = page.getByTestId('error-page')
    await expect(
      error.getByRole('heading', { name: 'Pokémon not found' }),
    ).toBeVisible()
    await expect(error).toContainText('No. 9999 is not a Unova Pokémon')

    await chooseLanguage(page, 'es')
    await expect(
      error.getByRole('heading', { name: 'Pokémon no encontrado' }),
    ).toBeVisible()
    await expect(error).toContainText('El n.º 9999 no es un Pokémon de Teselia')
  })
})

test.describe('messages de l’API Hono', () => {
  test('changer de langue modifie le message d’erreur renvoyé par l’API', async ({
    page,
    request,
  }) => {
    // Vipélierre est dans la wishlist à l'ouverture de la page…
    await request.post(`${API_URL}/wishlist`, {
      data: { id: 495, name: 'snivy', frName: 'Vipélierre', types: ['grass'] },
    })
    await page.goto('/')
    await expect(page.getByTestId('card-495')).toBeVisible()
    // … puis un autre client le retire : « Capturer » provoquera un 404 de l'API.
    await request.delete(`${API_URL}/wishlist/495`)

    const apiError = page.getByTestId('api-error')
    const catchButton = page.locator('.cmd-catch')

    for (const [code, message] of [
      ['en', 'Pokémon #495 is not in the wishlist'],
      ['fr', "Le Pokémon #495 n'est pas dans la wishlist"],
      ['es', 'El Pokémon #495 no está en la wishlist'],
      ['ja', 'ポケモン #495 はウィッシュリストにありません'],
    ] as const) {
      await chooseLanguage(page, code)
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith('/wishlist/495') && r.request().method() === 'PATCH',
      )
      await catchButton.click()
      // La requête du front porte la langue choisie…
      expect((await response).request().headers()['accept-language']).toBe(code)
      // … et le message affiché est celui de l'API, dans cette langue.
      await expect(apiError).toHaveText(message)
    }
  })

  test('l’API seule : même erreur, quatre langues (Accept-Language)', async ({
    request,
  }) => {
    const messages: Record<string, string> = {}
    for (const lang of ['en', 'fr', 'es', 'ja']) {
      const res = await request.delete(`${API_URL}/wishlist/495`, {
        headers: { 'Accept-Language': lang },
      })
      expect(res.status()).toBe(404)
      expect(res.headers()['content-language']).toBe(lang)
      const body = (await res.json()) as { error: string; code: string }
      expect(body.code).toBe('notInList')
      messages[lang] = body.error
    }
    expect(new Set(Object.values(messages)).size).toBe(4) // 4 textes différents
  })
})
