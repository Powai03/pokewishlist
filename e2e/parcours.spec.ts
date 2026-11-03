// Parcours complets, du navigateur jusqu'à l'API : chaque action faite à l'écran est ensuite vérifiée
// DANS L'API (requêtes directes), et chaque état de l'API est vérifié À L'ÉCRAN.
//
//   navigateur ──▶ front Nuxt (3100) ──fetch──▶ API Hono (3101)        ◀── vérifications directes (request)
//                    └── fiches en SSR ──▶ faux PokéAPI (3102) ; recherche (navigateur) ──▶ page.route()
//
// Parcours : fiche · langues · persistance (2e appareil) · likes (2 visiteurs, fiche pré-rendue, refus serveur).
import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test'
import { API_URL, FRONT_URL } from '../playwright.config'

// ── Outils ─────────────────────────────────────────────────────────────────────
interface ApiItem {
  id: number
  captured: boolean
}

const apiWishlist = async (request: APIRequestContext): Promise<ApiItem[]> =>
  (await (await request.get(`${API_URL}/wishlist`)).json()) as ApiItem[]

const apiLikes = async (
  request: APIRequestContext,
  id: number,
): Promise<number> =>
  (
    (await (await request.get(`${API_URL}/pokemon/${id}/likes`)).json()) as {
      likes: number
    }
  ).likes

async function resetWishlist(request: APIRequestContext): Promise<void> {
  for (const { id } of await apiWishlist(request)) {
    await request.delete(`${API_URL}/wishlist/${id}`)
  }
}

// PokéAPI côté NAVIGATEUR (recherche + ajout depuis l'accueil) : simulée par page.route().
const DEX: Record<number, { name: string; fr: string; types: string[] }> = {
  495: { name: 'snivy', fr: 'Vipélierre', types: ['grass'] },
  498: { name: 'tepig', fr: 'Gruikui', types: ['fire'] },
}
async function mockBrowserPokeApi(page: Page): Promise<void> {
  await page.route('https://beta.pokeapi.co/graphql/**', (route) =>
    route.fulfill({
      json: {
        data: {
          species: Object.entries(DEX).map(([id, p]) => ({
            id: Number(id),
            name: p.name,
            names: [{ name: p.fr }],
          })),
        },
      },
    }),
  )
  await page.route('https://pokeapi.co/api/v2/pokemon/*', (route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop())
    const p = DEX[id]
    if (!p) return route.fulfill({ status: 404, json: {} })
    return route.fulfill({
      json: {
        id,
        name: p.name,
        types: p.types.map((name, i) => ({ slot: i + 1, type: { name } })),
        sprites: { front_default: null },
      },
    })
  })
}

/** Accueil : cherche un numéro et clique sur le résultat (langue anglaise par défaut). */
async function addFromSearch(page: Page, id: number): Promise<void> {
  await page.getByLabel('Pokémon name or number').fill(String(id))
  const name = DEX[id]!.name
  await page
    .getByRole('list', { name: 'Search results' })
    .getByRole('button', { name: new RegExp(name, 'i') })
    .click()
  await expect(page.getByTestId(`card-${id}`)).toBeVisible()
}

/** Clique sur « Like » et attend la réponse de l'API ; renvoie le total affiché. */
async function like(page: Page): Promise<number> {
  const count = page.getByTestId('like-count')
  await expect(count).not.toHaveText('…')
  const before = Number(await count.textContent())
  const response = page.waitForResponse(
    (r) =>
      /\/pokemon\/\d+\/likes$/.test(r.url()) && r.request().method() === 'POST',
  )
  await page.getByTestId('like-button').click()
  expect((await response).status()).toBe(200)
  await expect(count).toHaveText(String(before + 1))
  return before + 1
}

/** Un « autre appareil » : un navigateur neuf, sans cookie ni état. */
async function otherDevice(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ baseURL: FRONT_URL })
  const page = await context.newPage()
  await mockBrowserPokeApi(page)
  return page
}

test.beforeEach(async ({ page, request }) => {
  await resetWishlist(request)
  await mockBrowserPokeApi(page)
})

// ── 1. Fiche ──────────────────────────────────────────────────────────────────
test('fiche : recherche → ajout → fiche → like → retour, chaque étape enregistrée par l’API', async ({
  page,
  request,
}) => {
  await page.goto('/')
  await addFromSearch(page, 495)
  expect((await apiWishlist(request)).map((p) => p.id)).toEqual([495])

  await page.getByRole('link', { name: 'Pokédex entry for Snivy' }).click()
  await expect(page).toHaveURL('/pokemon/495')
  const sheet = page.getByTestId('pokemon-sheet')
  await expect(sheet.getByRole('heading', { name: 'Snivy' })).toBeVisible()
  // L'état de la wishlist (venu de l'API) est connu de la fiche.
  await expect(
    sheet.getByRole('button', { name: 'In your wishlist' }),
  ).toBeDisabled()

  const shown = await like(page)
  expect(await apiLikes(request, 495)).toBe(shown) // l'écran = l'API

  await sheet.getByRole('link', { name: 'Back' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByTestId('card-495')).toBeVisible()
})

// ── 2. Langues ────────────────────────────────────────────────────────────────
test('langues : le choix suit la navigation et le rechargement, et part à l’API (Accept-Language)', async ({
  page,
  request,
}) => {
  await request.post(`${API_URL}/wishlist`, {
    data: { id: 495, name: 'snivy', frName: 'Vipélierre', types: ['grass'] },
  })
  await page.goto('/')
  await page.getByTestId('lang-select').selectOption('fr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR')

  // Navigation vers la fiche : toujours en français, données PokéAPI comprises.
  await page.getByRole('link', { name: 'Fiche de Vipélierre' }).click()
  const sheet = page.getByTestId('pokemon-sheet')
  await expect(sheet.getByRole('heading', { name: 'Vipélierre' })).toBeVisible()
  await expect(sheet.getByText('Statistiques de base')).toBeVisible()

  // Rechargement : la page arrive DÉJÀ en français du serveur (cookie lu en SSR).
  const html = await (await page.request.get('/pokemon/495')).text()
  expect(html).toContain('Statistiques de base')
  await page.reload()
  await expect(sheet.getByText('Statistiques de base')).toBeVisible()

  // Japonais : l'appel à l'API porte la langue choisie.
  await page.getByTestId('lang-select').selectOption('ja')
  await expect(sheet.getByRole('heading', { name: 'ツタージャ' })).toBeVisible()
  const sent = page.waitForRequest(
    (r) => r.url().endsWith('/pokemon/495/likes') && r.method() === 'POST',
  )
  await like(page)
  expect((await sent).headers()['accept-language']).toBe('ja')

  // Et l'API répond dans cette langue : erreur provoquée depuis l'écran d'accueil.
  await page.goto('/')
  // Attendre que la liste soit chargée AVANT la suppression : sinon (CI plus lente) la page lirait
  // une liste déjà vide, sans bouton « Capturer ».
  await expect(page.getByTestId('card-495')).toBeVisible()
  await request.delete(`${API_URL}/wishlist/495`) // retiré par « un autre client »
  await page.locator('.cmd-catch').click()
  await expect(page.getByTestId('api-error')).toHaveText(
    'ポケモン #495 はウィッシュリストにありません',
  )
})

// ── 3. Persistance ────────────────────────────────────────────────────────────
test('persistance : ajouts, capture et like faits ici sont retrouvés sur un autre appareil', async ({
  page,
  request,
  browser,
}) => {
  await page.goto('/')
  await addFromSearch(page, 495)
  await addFromSearch(page, 498)
  await page.getByTestId('card-495').getByRole('button').click()
  await page.getByRole('button', { name: 'Catch' }).click()
  await expect(page.getByTestId('progress')).toHaveText('1/2')
  await page.goto('/pokemon/498')
  const likes498 = await like(page)

  // L'API a tout enregistré.
  expect(await apiWishlist(request)).toEqual([
    expect.objectContaining({ id: 495, captured: true }),
    expect.objectContaining({ id: 498, captured: false }),
  ])

  // Un autre appareil (navigateur neuf) voit exactement le même état, lu dans l'API.
  const other = await otherDevice(browser)
  await other.goto('/')
  await expect(other.getByTestId('card-495')).toBeVisible()
  await expect(other.getByTestId('card-498')).toBeVisible()
  await expect(other.getByTestId('progress')).toHaveText('1/2')
  await other.goto('/pokemon/498')
  await expect(other.getByTestId('like-count')).toHaveText(String(likes498))
  await other.context().close()
})

// ── 4. Likes ──────────────────────────────────────────────────────────────────
test('likes : deux visiteurs sur une fiche PRÉ-RENDUE, les likes s’additionnent dans l’API', async ({
  page,
  request,
  browser,
}) => {
  const before = await apiLikes(request, 495)
  // /pokemon/snivy fait partie des 156 fiches générées au build (HTML statique).
  await page.goto('/pokemon/snivy')
  await like(page)

  const other = await otherDevice(browser)
  await other.goto('/pokemon/snivy')
  await expect(other.getByTestId('like-count')).toHaveText(String(before + 1))
  await like(other)
  await other.context().close()

  expect(await apiLikes(request, 495)).toBe(before + 2)
  await page.reload()
  await expect(page.getByTestId('like-count')).toHaveText(String(before + 2))
})

test('likes : refusés par l’API hors 5e génération, et pas de bouton sur une page 404', async ({
  page,
  request,
}) => {
  const res = await request.post(`${API_URL}/pokemon/25/likes`)
  expect(res.status()).toBe(400)
  expect(((await res.json()) as { code: string }).code).toBe('idGen5')

  const response = await page.goto('/pokemon/9999')
  expect(response?.status()).toBe(404)
  await expect(page.getByTestId('like-button')).toHaveCount(0)
})
