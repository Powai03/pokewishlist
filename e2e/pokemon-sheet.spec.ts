// Fiche d'un Pokémon (/pokemon/:id) : rendue par le serveur Nuxt à partir de PokéAPI (ici le faux PokéAPI, port 3102).
// Vérifie : une adresse ouverte directement affiche le Pokémon et ses infos ; un Pokémon inconnu donne un vrai 404.
import { expect, test, type APIRequestContext } from '@playwright/test'
import { API_URL, FRONT_URL } from '../playwright.config'

async function resetApi(request: APIRequestContext): Promise<void> {
  const items = (await (await request.get(`${API_URL}/wishlist`)).json()) as {
    id: number
  }[]
  for (const { id } of items) await request.delete(`${API_URL}/wishlist/${id}`)
}

// Fiche vérifiée EN FRANÇAIS (cookie « lang », comme après un choix dans le sélecteur de langue).
test.beforeEach(async ({ context, request }) => {
  await context.addCookies([{ name: 'lang', value: 'fr', url: FRONT_URL }])
  await resetApi(request)
})

test.describe('adresse directe', () => {
  test('/pokemon/495 affiche Vipélierre et toutes ses infos', async ({
    page,
  }) => {
    const res = await page.goto('/pokemon/495')
    expect(res?.status()).toBe(200)

    const sheet = page.getByTestId('pokemon-sheet')
    await expect(
      sheet.getByRole('heading', { name: 'Vipélierre' }),
    ).toBeVisible()
    await expect(sheet.getByText('N°495')).toBeVisible()
    await expect(sheet.getByText('Pokémon Serpenterbe')).toBeVisible()
    await expect(sheet.getByRole('list', { name: 'Types' })).toHaveText(
      'Plante',
    )
    await expect(sheet.getByText('0,6 m')).toBeVisible()
    await expect(sheet.getByText('8,1 kg')).toBeVisible()
    await expect(sheet.getByTestId('pokemon-description')).toHaveText(
      'Un Pokémon intelligent et très calme.',
    )
    await expect(
      sheet.getByRole('listitem').filter({ hasText: 'PV' }),
    ).toContainText('45')
    await expect(sheet.getByText('total 308')).toBeVisible()
    await expect(page).toHaveTitle(/Vipélierre/)
  })

  test('le HTML arrive déjà rempli du serveur (SSR), sans JavaScript', async ({
    request,
  }) => {
    const res = await request.get('/pokemon/495', {
      headers: { cookie: 'lang=fr' },
    })
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain('Vipélierre')
    expect(html).toContain('Pokémon Serpenterbe')
  })

  test('/pokemon/snivy (nom anglais) affiche la même fiche', async ({
    page,
  }) => {
    await page.goto('/pokemon/snivy')
    await expect(
      page.getByRole('heading', { name: 'Vipélierre' }),
    ).toBeVisible()
  })
})

test.describe('cas 404', () => {
  for (const [url, why] of [
    ['/pokemon/9999', 'numéro hors 5e génération'],
    ['/pokemon/pikachu', 'existe dans PokéAPI, mais pas en 5e génération'],
    ['/pokemon/missingno', 'inconnu de PokéAPI (404)'],
  ] as const) {
    test(`${url} → page « Pokémon introuvable » et statut HTTP 404 (${why})`, async ({
      page,
    }) => {
      const res = await page.goto(url)
      expect(res?.status()).toBe(404)
      const error = page.getByTestId('error-page')
      await expect(error.getByText('404')).toBeVisible()
      await expect(
        error.getByRole('heading', { name: 'Pokémon introuvable' }),
      ).toBeVisible()
    })
  }

  test('« Retour au PC » ramène à l’accueil', async ({ page }) => {
    await page.goto('/pokemon/9999')
    await page.getByRole('button', { name: 'Retour au PC' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Ta boîte est vide')).toBeVisible()
  })
})

test.describe('navigation et wishlist', () => {
  test('bouton « Fiche » de la console → fiche du Pokémon sélectionné', async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/wishlist`, {
      data: { id: 495, name: 'snivy', frName: 'Vipélierre', types: ['grass'] },
    })
    await page.goto('/')
    await page.getByRole('link', { name: 'Fiche de Vipélierre' }).click()

    await expect(page).toHaveURL('/pokemon/495')
    await expect(page.getByText('Pokémon Serpenterbe')).toBeVisible()
  })

  test('liens vers les voisins du Pokédex (N°494 ◀ ▶ N°496)', async ({
    page,
  }) => {
    await page.goto('/pokemon/495')
    await page.getByRole('link', { name: /N°496/ }).click()
    await expect(page).toHaveURL('/pokemon/496')
    await expect(
      page.getByRole('heading', { name: 'Pokémon 496' }),
    ).toBeVisible()
  })

  test('« Ajouter » depuis la fiche enregistre le Pokémon dans l’API', async ({
    page,
    request,
  }) => {
    await page.goto('/pokemon/495')
    await page.getByRole('button', { name: 'Ajouter' }).click()

    await expect(
      page.getByRole('button', { name: 'Dans ta wishlist' }),
    ).toBeDisabled()
    const list = (await (await request.get(`${API_URL}/wishlist`)).json()) as {
      id: number
      frName: string
    }[]
    expect(list).toMatchObject([{ id: 495, frName: 'Vipélierre' }])
  })
})

test('like : le compteur augmente et reste après rechargement (enregistré par l’API)', async ({
  page,
}) => {
  await page.goto('/pokemon/495')
  const count = page.getByTestId('like-count')
  await expect(count).not.toHaveText('…')
  const before = Number(await count.textContent())
  await page.getByTestId('like-button').click()
  await expect(count).toHaveText(String(before + 1))
  await page.reload()
  await expect(count).toHaveText(String(before + 1))
})
