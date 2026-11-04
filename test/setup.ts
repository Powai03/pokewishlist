import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      throw new Error(
        `Appel réseau réel interdit dans les tests : ${String(input)}`,
      )
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})
