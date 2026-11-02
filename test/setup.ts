// Exécuté avant chaque fichier de test (voir vitest.config.ts → setupFiles).
import { afterEach, beforeEach, vi } from 'vitest'

// Filet de sécurité : aucun test ne doit appeler le vrai réseau.
// Par défaut, `fetch` échoue avec un message clair ; chaque test le remplace par un faux (mock).
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

// Remet le vrai `fetch` après chaque test, pour que les tests ne se contaminent pas entre eux.
afterEach(() => {
  vi.unstubAllGlobals()
})
