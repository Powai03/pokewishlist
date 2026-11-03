// Tests de bout en bout « full-stack » : playwright.config.ts démarre la VRAIE API Hono (port 3101)
// et le VRAI front Nuxt (port 3100). Seule PokéAPI (service externe) est simulée.
//
// Organisation : ajout · doublon · limite de 6 · suppression · capture · robustesse.
// Pour le doublon et la limite, deux niveaux sont vérifiés :
//   - l'INTERFACE empêche l'action (bouton désactivé) ;
//   - le SERVEUR la refuse aussi (409) quand l'interface n'est pas à jour
//     (un autre client a modifié l'API entre-temps) : la règle ne repose pas que sur le front.
import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
} from '@playwright/test'
import { API_URL } from '../playwright.config'

// ── Fausses réponses PokéAPI : 7 Pokémon d'Unys (de quoi dépasser la limite de 6) ──
const POKEMON: Record<number, { name: string; fr: string; types: string[] }> = {
  495: { name: 'snivy', fr: 'Vipélierre', types: ['grass'] },
  498: { name: 'tepig', fr: 'Gruikui', types: ['fire'] },
  501: { name: 'oshawott', fr: 'Moustillon', types: ['water'] },
  570: { name: 'zorua', fr: 'Zorua', types: ['dark'] },
  610: { name: 'axew', fr: 'Coupenotte', types: ['dragon'] },
  633: { name: 'deino', fr: 'Solochi', types: ['dark', 'dragon'] },
  644: { name: 'zekrom', fr: 'Zekrom', types: ['dragon', 'electric'] },
}
const IDS = Object.keys(POKEMON).map(Number)
const SIX = IDS.slice(0, 6) // 495 … 633
const SEVENTH = 644

async function mockPokeApi(page: Page): Promise<void> {
  await page.route('https://beta.pokeapi.co/graphql/**', (route) =>
    route.fulfill({
      json: {
        data: {
          species: IDS.map((id) => ({
            id,
            name: POKEMON[id]!.name,
            names: [{ name: POKEMON[id]!.fr }],
          })),
        },
      },
    }),
  )
  await page.route('https://pokeapi.co/api/v2/pokemon/*', (route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop())
    const p = POKEMON[id]
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

// ── Outils pour parler directement à l'API (sans passer par le front) ─────────
interface ApiItem {
  id: number
  frName: string
  captured: boolean
}

async function apiWishlist(request: APIRequestContext): Promise<ApiItem[]> {
  return (await (await request.get(`${API_URL}/wishlist`)).json()) as ApiItem[]
}

/** Ajoute un Pokémon directement dans l'API, comme le ferait un autre client (autre onglet, autre appareil). */
async function apiAdd(request: APIRequestContext, id: number): Promise<number> {
  const p = POKEMON[id]!
  const res = await request.post(`${API_URL}/wishlist`, {
    data: { id, name: p.name, frName: p.fr, types: p.types },
  })
  return res.status()
}

/** Vide la wishlist de l'API (en mémoire, partagée entre les tests). */
async function resetApi(request: APIRequestContext): Promise<void> {
  for (const item of await apiWishlist(request)) {
    await request.delete(`${API_URL}/wishlist/${item.id}`)
  }
}

/** Le bouton d'un Pokémon dans la liste des RÉSULTATS du Pokédex (pas dans la boîte). */
function searchResult(page: Page, frName: string | RegExp): Locator {
  return page
    .getByRole('list', { name: 'Résultats de recherche' })
    .getByRole('button', { name: frName })
}

/** Dans le front : cherche un Pokémon par son numéro et clique sur « Ajouter ». */
async function addFromUi(page: Page, id: number): Promise<void> {
  await page.getByLabel('Nom ou numéro').fill(String(id))
  await searchResult(page, new RegExp(POKEMON[id]!.fr)).click()
}

const ids = async (request: APIRequestContext): Promise<number[]> =>
  (await apiWishlist(request)).map((p) => p.id)

test.beforeEach(async ({ page, request }) => {
  await resetApi(request)
  await mockPokeApi(page)
  await page.goto('/')
  await expect(page.getByText('Ta boîte est vide')).toBeVisible()
})

// ── Ajout ─────────────────────────────────────────────────────────────────────
test.describe('ajout', () => {
  test("ajouter depuis Nuxt : le Pokémon apparaît dans l'API (GET /wishlist)", async ({
    page,
    request,
  }) => {
    expect(await apiWishlist(request)).toEqual([])

    await page.getByLabel('Nom ou numéro').fill('vipe') // recherche en français, sans accent
    await searchResult(page, /Vipélierre/).click()

    await expect(page.getByTestId('card-495')).toBeVisible()
    await expect.poll(() => ids(request)).toEqual([495])
    expect((await apiWishlist(request))[0]).toMatchObject({
      id: 495,
      frName: 'Vipélierre',
      captured: false,
    })
  })

  test('après rafraîchissement, la liste est relue depuis l’API', async ({
    page,
  }) => {
    await addFromUi(page, 495)
    await expect(page.getByTestId('card-495')).toBeVisible()

    await page.reload()

    await expect(page.getByTestId('card-495')).toContainText('Vipélierre')
  })

  test('un Pokémon ajouté directement dans l’API s’affiche dans Nuxt', async ({
    page,
    request,
  }) => {
    expect(await apiAdd(request, 498)).toBe(201)

    await page.reload()

    await expect(page.getByTestId('card-498')).toContainText('Gruikui')
    await expect(page.getByTestId('scene')).toContainText('Feu')
  })
})

// ── Doublon ───────────────────────────────────────────────────────────────────
test.describe('doublon', () => {
  test('interface : un Pokémon déjà dans la boîte ne peut pas être ré-ajouté', async ({
    page,
    request,
  }) => {
    await addFromUi(page, 495)
    await expect(page.getByTestId('card-495')).toBeVisible()

    await page.getByLabel('Nom ou numéro').fill('495')
    const button = searchResult(page, /Vipélierre/)

    await expect(button).toBeDisabled()
    await expect(button).toContainText('Dans la boîte')
    expect(await ids(request)).toEqual([495])
  })

  test('serveur : si un autre client l’a déjà ajouté, l’API répond 409 et Nuxt affiche son message', async ({
    page,
    request,
  }) => {
    // Un autre client ajoute Vipélierre ; ce front-ci ne le sait pas encore (liste affichée vide).
    expect(await apiAdd(request, 495)).toBe(201)

    await addFromUi(page, 495)

    await expect(page.getByTestId('api-error')).toContainText(
      'déjà dans la wishlist',
    )
    expect(await ids(request)).toEqual([495]) // toujours un seul exemplaire côté serveur
  })
})

// ── Limite de 6 ───────────────────────────────────────────────────────────────
test.describe('limite de 6 Pokémon', () => {
  test('interface : après 6 ajouts, le 7e est bloqué et l’API en contient 6', async ({
    page,
    request,
  }) => {
    for (const [i, id] of SIX.entries()) {
      await addFromUi(page, id)
      await expect(page.locator('[data-testid^="card-"]')).toHaveCount(i + 1)
    }

    await expect(page.getByText('Boîte pleine (6/6)')).toBeVisible()
    await page.getByLabel('Nom ou numéro').fill(String(SEVENTH))
    const seventh = searchResult(page, /Zekrom/)
    await expect(seventh).toBeDisabled()
    await expect(seventh).toContainText('Boîte pleine')

    expect(await ids(request)).toEqual(SIX)
  })

  test('serveur : si la liste a été remplie ailleurs, l’API refuse le 7e (409)', async ({
    page,
    request,
  }) => {
    // Un autre client remplit la liste ; ce front-ci l'affiche encore vide.
    for (const id of SIX) expect(await apiAdd(request, id)).toBe(201)

    await addFromUi(page, SEVENTH)

    await expect(page.getByTestId('api-error')).toContainText('pleine')
    expect(await ids(request)).toEqual(SIX)
  })
})

// ── Suppression ───────────────────────────────────────────────────────────────
test.describe('suppression', () => {
  test('retirer depuis Nuxt : le Pokémon disparaît de l’écran et de l’API', async ({
    page,
    request,
  }) => {
    await addFromUi(page, 498)
    await expect(page.getByTestId('card-498')).toBeVisible() // attendre la fin de l'ajout
    await addFromUi(page, 501)
    await expect(page.locator('[data-testid^="card-"]')).toHaveCount(2)

    await page.getByTestId('card-498').getByRole('button').click() // sélectionne Gruikui
    await page.getByRole('button', { name: 'Retirer Gruikui' }).click()

    await expect(page.getByTestId('card-498')).toHaveCount(0)
    await expect(page.getByTestId('card-501')).toBeVisible()
    await expect.poll(() => ids(request)).toEqual([501])
    await page.reload()
    await expect(page.getByTestId('card-498')).toHaveCount(0)
  })

  test('une suppression libère une place : on peut de nouveau ajouter après 6', async ({
    page,
    request,
  }) => {
    for (const id of SIX) await apiAdd(request, id)
    await page.reload()
    await expect(page.getByText('Boîte pleine (6/6)')).toBeVisible()

    await page.getByTestId('card-495').getByRole('button').click()
    await page.getByRole('button', { name: 'Retirer Vipélierre' }).click()
    await expect(page.getByText('Boîte pleine (6/6)')).toHaveCount(0)

    await addFromUi(page, SEVENTH)

    await expect(page.getByTestId(`card-${SEVENTH}`)).toBeVisible()
    await expect
      .poll(() => ids(request))
      .toEqual([498, 501, 570, 610, 633, SEVENTH])
  })

  test('déjà retiré par un autre client (404) : il disparaît quand même de l’écran', async ({
    page,
    request,
  }) => {
    await addFromUi(page, 495)
    await expect(page.getByTestId('card-495')).toBeVisible()
    await request.delete(`${API_URL}/wishlist/495`) // retiré ailleurs

    await page.getByRole('button', { name: 'Retirer Vipélierre' }).click()

    await expect(page.getByTestId('card-495')).toHaveCount(0)
    await expect(page.getByTestId('api-error')).toHaveCount(0)
  })
})

// ── Capture ───────────────────────────────────────────────────────────────────
test('capturer depuis Nuxt : PATCH envoyé, l’état est enregistré par l’API', async ({
  page,
  request,
}) => {
  await page.getByLabel('Nom ou numéro').fill('moustillon')
  await page.keyboard.press('Enter') // Entrée ajoute le premier résultat
  await expect(page.getByTestId('card-501')).toBeVisible()

  await page.getByRole('button', { name: 'Capturer' }).click()

  await expect(page.getByTestId('progress')).toHaveText('1/1')
  await expect
    .poll(async () => (await apiWishlist(request))[0]?.captured)
    .toBe(true)
})

// ── Robustesse ────────────────────────────────────────────────────────────────
test("API injoignable : message d'erreur, l'application ne plante pas", async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.route(`${API_URL}/**`, (route) => route.abort('connectionrefused'))

  await page.reload()

  await expect(page.getByTestId('api-error')).toContainText(
    "L'API ne répond pas",
  )
  await expect(page.getByLabel('Nom ou numéro')).toBeEnabled()
  expect(pageErrors).toEqual([])
})

// ── CORS, dans un VRAI navigateur sans interception ───────────────────────────
// Attention : dès qu'un test utilise `page.route()` (ici pour simuler PokéAPI), Playwright répond
// lui-même aux requêtes CORS préalables (« preflight ») : les tests ci-dessus ne voient donc PAS
// les erreurs CORS. Ce test utilise un contexte neuf, SANS aucune route, comme un vrai utilisateur.
test('CORS : depuis la page du front, le navigateur peut appeler GET, POST, PATCH et DELETE', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext() // aucun page.route() ici
  const page = await context.newPage()
  await page.goto(baseURL!)

  const results = await page.evaluate(async (api) => {
    const call = async (method: string, path: string, body?: unknown) => {
      try {
        const res = await fetch(`${api}${path}`, {
          method,
          headers: body ? { 'content-type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        })
        return `${method} ${res.status}`
      } catch {
        return `${method} BLOQUÉ par le navigateur`
      }
    }
    return [
      await call('GET', '/wishlist'),
      await call('POST', '/wishlist', { id: 495, name: 'snivy' }),
      await call('PATCH', '/wishlist/495', { captured: true }),
      await call('DELETE', '/wishlist/495'),
    ]
  }, API_URL)

  expect(results).toEqual(['GET 200', 'POST 201', 'PATCH 200', 'DELETE 200'])
  await context.close()
})
