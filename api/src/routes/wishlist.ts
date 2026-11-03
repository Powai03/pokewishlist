// Routes de la wishlist :
//   GET    /wishlist      → 200 + la liste
//   POST   /wishlist      → 201 + le Pokémon créé (400 si invalide, 409 si doublon ou liste pleine)
//   PATCH  /wishlist/:id  → 200 + le Pokémon modifié ({ captured }) (400 si invalide, 404 s'il n'est pas dans la liste)
//   DELETE /wishlist/:id  → 200 + le Pokémon retiré (400 si id invalide, 404 s'il n'est pas dans la liste)
//
// Les messages d'erreur sont dans la langue de la requête (?lang=… ou Accept-Language, anglais par défaut).
import { Hono, type Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { translate, type MessageKey, type MessageParams } from '../i18n.js'
import {
  WISHLIST_MAX,
  validateInput,
  validatePatch,
  type WishlistStore,
} from '../wishlist-store.js'

/** Format commun des réponses d'erreur. */
export interface ErrorResponse {
  /** Message lisible, dans la langue de la requête. */
  error: string
  /** Code stable, identique dans toutes les langues (ex. « duplicate ») : à utiliser dans un programme. */
  code: MessageKey
}

/**
 * Répond une erreur JSON traduite dans la langue détectée pour cette requête.
 * (`c.get('language')` est posé par le middleware `languageDetector` de app.ts ; Hono en connaît le type.)
 */
export function fail(
  c: Context,
  status: ContentfulStatusCode,
  key: MessageKey,
  params?: MessageParams,
): Response {
  const body: ErrorResponse = {
    error: translate(c.get('language'), key, params),
    code: key,
  }
  return c.json(body, status)
}

/** L'id de l'adresse /wishlist/:id, ou null s'il n'est pas un entier. */
function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) ? id : null
}

export function wishlistRoutes(store: WishlistStore): Hono {
  const routes = new Hono()

  routes.get('/', async (c) => c.json(await store.list(), 200))

  routes.post('/', async (c) => {
    // 1. Lire le JSON : un corps illisible est une erreur du client (400), pas un plantage (500).
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return fail(c, 400, 'invalidJson')
    }

    // 2. Valider la forme et les règles (5e génération, nom non vide).
    const input = validateInput(body)
    if (!input.ok) return fail(c, 400, input.error.key, input.error.params)

    // 3. Ajouter : 409 (conflit) si déjà présent ou si la liste est pleine ;
    //    400 si la base refuse une donnée (ex. type inconnu, contrôlé par une contrainte SQL).
    const result = await store.add(input.value)
    if (!result.ok) {
      switch (result.reason) {
        case 'invalid':
          return fail(c, 400, 'rejectedByDb', { detail: result.detail })
        case 'duplicate':
          return fail(c, 409, 'duplicate', { id: input.value.id })
        case 'full':
          return fail(c, 409, 'full', { max: WISHLIST_MAX })
      }
    }

    // 4. 201 Created + en-tête Location : l'adresse de la ressource créée.
    c.header('Location', `/wishlist/${result.item.id}`)
    return c.json(result.item, 201)
  })

  routes.patch('/:id', async (c) => {
    const id = parseId(c.req.param('id'))
    if (id === null) return fail(c, 400, 'idInteger')
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return fail(c, 400, 'invalidJson')
    }
    const patch = validatePatch(body)
    if (!patch.ok) return fail(c, 400, patch.error.key, patch.error.params)

    const item = await store.setCaptured(id, patch.value.captured)
    if (!item) return fail(c, 404, 'notInList', { id })
    return c.json(item, 200)
  })

  routes.delete('/:id', async (c) => {
    const id = parseId(c.req.param('id'))
    if (id === null) return fail(c, 400, 'idInteger')
    const removed = await store.remove(id)
    if (!removed) return fail(c, 404, 'notInList', { id })
    return c.json({ deleted: removed }, 200)
  })

  return routes
}
