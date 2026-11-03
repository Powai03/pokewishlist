import { Hono, type Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { translate, type MessageKey, type MessageParams } from '../i18n.js'
import {
  WISHLIST_MAX,
  validateInput,
  validatePatch,
  type WishlistStore,
} from '../wishlist-store.js'

export interface ErrorResponse {
  error: string
  code: MessageKey
}

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

function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) ? id : null
}

export function wishlistRoutes(store: WishlistStore): Hono {
  const routes = new Hono()

  routes.get('/', async (c) => c.json(await store.list(), 200))

  routes.post('/', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return fail(c, 400, 'invalidJson')
    }

    const input = validateInput(body)
    if (!input.ok) return fail(c, 400, input.error.key, input.error.params)

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
