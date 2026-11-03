// Routes de la wishlist :
//   GET    /wishlist      → 200 + la liste
//   POST   /wishlist      → 201 + le Pokémon créé (400 si invalide, 409 si doublon ou liste pleine)
//   PATCH  /wishlist/:id  → 200 + le Pokémon modifié ({ captured }) (400 si invalide, 404 s'il n'est pas dans la liste)
//   DELETE /wishlist/:id  → 200 + le Pokémon retiré (400 si id invalide, 404 s'il n'est pas dans la liste)
import { Hono } from 'hono'
import {
  WISHLIST_MAX,
  validateInput,
  validatePatch,
  type WishlistStore,
} from '../wishlist-store.js'

/** Format commun des réponses d'erreur. */
export interface ErrorResponse {
  error: string
}

export function wishlistRoutes(store: WishlistStore): Hono {
  const routes = new Hono()

  // PANNE VOLONTAIRE : la liste ne renvoie plus le nom français (frName).
  routes.get('/', (c) =>
    c.json(
      store.list().map((item) => ({ ...item, frName: undefined })),
      200,
    ),
  )

  routes.post('/', async (c) => {
    // 1. Lire le JSON : un corps illisible est une erreur du client (400), pas un plantage (500).
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json<ErrorResponse>({ error: 'Corps JSON invalide' }, 400)
    }

    // 2. Valider la forme et les règles (5e génération, nom non vide).
    const input = validateInput(body)
    if (!input.ok) return c.json<ErrorResponse>({ error: input.error }, 400)

    // 3. Ajouter : 409 (conflit) si déjà présent ou si la liste est pleine.
    const result = store.add(input.value)
    if (!result.ok) {
      const error =
        result.reason === 'duplicate'
          ? `Le Pokémon #${input.value.id} est déjà dans la wishlist`
          : `La wishlist est pleine (${WISHLIST_MAX} Pokémon maximum)`
      return c.json<ErrorResponse>({ error }, 409)
    }

    // 4. 201 Created + en-tête Location : l'adresse de la ressource créée.
    c.header('Location', `/wishlist/${result.item.id}`)
    return c.json(result.item, 201)
  })

  routes.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) {
      return c.json<ErrorResponse>(
        { error: '« id » doit être un nombre entier' },
        400,
      )
    }
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json<ErrorResponse>({ error: 'Corps JSON invalide' }, 400)
    }
    const patch = validatePatch(body)
    if (!patch.ok) return c.json<ErrorResponse>({ error: patch.error }, 400)

    const item = store.setCaptured(id, patch.value.captured)
    if (!item) {
      return c.json<ErrorResponse>(
        { error: `Le Pokémon #${id} n'est pas dans la wishlist` },
        404,
      )
    }
    return c.json(item, 200)
  })

  routes.delete('/:id', (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) {
      return c.json<ErrorResponse>(
        { error: '« id » doit être un nombre entier' },
        400,
      )
    }
    const removed = store.remove(id)
    if (!removed) {
      return c.json<ErrorResponse>(
        { error: `Le Pokémon #${id} n'est pas dans la wishlist` },
        404,
      )
    }
    return c.json({ deleted: removed }, 200)
  })

  return routes
}
