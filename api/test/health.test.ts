import { describe, expect, it } from 'vitest'
import { createApp, type HealthResponse } from '../src/app.js'
import { loadConfig, parseEnv, parsePort, readVersion } from '../src/config.js'

describe('GET /health', () => {
  const app = createApp({ version: '1.2.3', env: 'test' })

  it('répond 200 en JSON', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it("donne l'état, la version et l'environnement", async () => {
    const body = (await (await app.request('/health')).json()) as HealthResponse
    expect(body).toMatchObject({ status: 'ok', version: '1.2.3', env: 'test' })
  })

  it('donne aussi uptime (secondes) et un horodatage ISO', async () => {
    const body = (await (await app.request('/health')).json()) as HealthResponse
    expect(body.uptime).toBeGreaterThanOrEqual(0)
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  it('route inconnue → 404 en JSON', async () => {
    const res = await app.request('/inconnue')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not Found', path: '/inconnue' })
  })

  it('POST /health → 404 (seul GET est prévu)', async () => {
    const res = await app.request('/health', { method: 'POST' })
    expect(res.status).toBe(404)
  })
})

describe('configuration', () => {
  it('lit la version dans api/package.json', () => {
    expect(readVersion()).toMatch(/^\d+\.\d+\.\d+/)
  })

  it.each([
    ['production', 'production'],
    ['test', 'test'],
    ['development', 'development'],
    [undefined, 'development'],
    ['prod', 'development'], // faute de frappe : jamais considérée comme « production »
  ])('NODE_ENV=%s → env « %s »', (value, expected) => {
    expect(parseEnv(value)).toBe(expected)
  })

  it.each([
    ['8080', 8080],
    [undefined, 3002],
    ['abc', 3002],
    ['0', 3002],
    ['70000', 3002],
  ])('PORT=%s → %s', (value, expected) => {
    expect(parsePort(value)).toBe(expected)
  })

  it('assemble la configuration depuis les variables d’environnement', () => {
    expect(loadConfig({ NODE_ENV: 'production', PORT: '4000' })).toMatchObject({
      env: 'production',
      port: 4000,
    })
  })
})
