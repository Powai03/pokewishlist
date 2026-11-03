// Le point d'entrée AWS Lambda (src/lambda.ts) : la même app Hono, appelée avec un événement
// « Function URL » (format 2.0) au lieu d'une requête HTTP. Aucun compte AWS nécessaire.
import { describe, expect, it } from 'vitest'
import type { HealthResponse } from '../src/app.js'
import { handler } from '../src/lambda.js'

interface LambdaResult {
  statusCode: number
  headers: Record<string, string>
  body: string
}

/** Événement tel qu'AWS l'envoie pour un appel à l'URL de la fonction. */
function urlEvent(
  method: string,
  path: string,
  options: {
    headers?: Record<string, string>
    body?: unknown
    query?: string
  } = {},
): unknown {
  const host = 'abc123.lambda-url.eu-west-1.on.aws'
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString: options.query ?? '',
    headers: { host, ...options.headers },
    requestContext: {
      domainName: host,
      http: { method, path, protocol: 'HTTP/1.1', sourceIp: '203.0.113.7' },
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    isBase64Encoded: false,
  }
}

const call = async (event: unknown): Promise<LambdaResult> =>
  (await handler(event as never, {} as never)) as LambdaResult

describe('handler AWS Lambda', () => {
  it('GET /health → 200, JSON, avec le commit déployé', async () => {
    const res = await call(urlEvent('GET', '/health'))
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    const body = JSON.parse(res.body) as HealthResponse
    expect(body).toMatchObject({ status: 'ok', storage: 'memory' })
    expect(body.commit).toBeTypeOf('string')
  })

  it('POST puis GET /wishlist : la même app, le même stockage d’un appel à l’autre', async () => {
    const created = await call(
      urlEvent('POST', '/wishlist', {
        headers: { 'content-type': 'application/json' },
        body: { id: 495, name: 'snivy' },
      }),
    )
    expect(created.statusCode).toBe(201)
    const list = await call(urlEvent('GET', '/wishlist'))
    expect(JSON.parse(list.body)).toMatchObject([{ id: 495, name: 'snivy' }])
  })

  it('erreurs traduites (Accept-Language) comme sur le serveur Node.js', async () => {
    const res = await call(
      urlEvent('DELETE', '/wishlist/650', {
        headers: { 'accept-language': 'ja' },
      }),
    )
    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.body)).toEqual({
      error: 'ポケモン #650 はウィッシュリストにありません',
      code: 'notInList',
    })
  })

  it('CORS géré par l’app : le front autorisé reçoit Access-Control-Allow-Origin', async () => {
    const res = await call(
      urlEvent('GET', '/wishlist', {
        headers: { origin: 'http://localhost:3001' },
      }),
    )
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3001',
    )
  })
})

describe('événements API Gateway', () => {
  it('HTTP API (format 2.0, stage $default) → mêmes routes', async () => {
    const event = {
      version: '2.0',
      routeKey: '$default',
      rawPath: '/health',
      rawQueryString: '',
      headers: { host: 'abc.execute-api.eu-west-1.amazonaws.com' },
      requestContext: {
        apiId: 'abc',
        stage: '$default',
        domainName: 'abc.execute-api.eu-west-1.amazonaws.com',
        http: { method: 'GET', path: '/health', sourceIp: '203.0.113.7' },
      },
      isBase64Encoded: false,
    }
    const res = await call(event)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ status: 'ok' })
  })

  it('HTTP API : requête préalable CORS (OPTIONS) → 204 et en-têtes CORS', async () => {
    const res = await call(
      urlEvent('OPTIONS', '/wishlist', {
        headers: {
          origin: 'http://localhost:3001',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      }),
    )
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3001',
    )
    expect(res.headers['access-control-allow-methods']).toContain('POST')
  })

  it('REST API (format 1.0) → mêmes routes, erreurs traduites', async () => {
    const event = {
      resource: '/{proxy+}',
      path: '/wishlist/650',
      httpMethod: 'DELETE',
      headers: { 'Accept-Language': 'es' },
      multiValueHeaders: { 'Accept-Language': ['es'] },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      requestContext: {
        stage: 'prod',
        resourcePath: '/{proxy+}',
        httpMethod: 'DELETE',
        path: '/prod/wishlist/650',
      },
      body: null,
      isBase64Encoded: false,
    }
    const res = await call(event)
    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.body)).toEqual({
      error: 'El Pokémon #650 no está en la wishlist',
      code: 'notInList',
    })
  })
})
