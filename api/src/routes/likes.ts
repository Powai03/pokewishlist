import { Hono, type Context } from 'hono'
import { GEN5, isGen5, type WishlistStore } from '../wishlist-store.js'
import { fail } from './wishlist.js'

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
