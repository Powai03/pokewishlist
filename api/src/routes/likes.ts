// Likes des fiches Pokémon :
//   GET  /pokemon/:id/likes → 200 { id, likes }
//   POST /pokemon/:id/likes → 200 { id, likes } (un like de plus)
// 400 si l'id n'est pas un Pokémon d'Unys (494 à 649).
import { Hono, type Context } from 'hono'
import { GEN5, isGen5, type WishlistStore } from '../wishlist-store.js'
import { fail } from './wishlist.js'

/** L'id de l'adresse s'il désigne un Pokémon d'Unys ; sinon la réponse d'erreur 400. */
function gen5Id(c: Context): number | Response {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) return fail(c, 400, 'idInteger')
  if (!isGen5(id))
    return fail(c, 400, 'idGen5', { first: GEN5.first, last: GEN5.last })
  return id
}

export function likesRoutes(store: WishlistStore): Hono {
  const routes = new Hono()
  routes.get('/:id/likes', async (c) => {
    const id = gen5Id(c)
    if (id instanceof Response) return id
    return c.json({ id, likes: await store.likes(id) }, 200)
  })
  routes.post('/:id/likes', async (c) => {
    const id = gen5Id(c)
    if (id instanceof Response) return id
    return c.json({ id, likes: await store.like(id) }, 200)
  })
  return routes
}
