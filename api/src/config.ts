// Configuration lue au démarrage : version (package.json) et environnement (variables d'environnement).
import { readFileSync } from 'node:fs'

/** Environnements reconnus ; tout le reste est ramené à « development ». */
export const ENVIRONMENTS = ['development', 'test', 'production'] as const
export type AppEnv = (typeof ENVIRONMENTS)[number]

export interface AppConfig {
  /** Version de l'API, lue dans api/package.json (ex. « 0.1.0 »). */
  version: string
  /** Environnement d'exécution, lu dans NODE_ENV. */
  env: AppEnv
  /** Port d'écoute HTTP, lu dans PORT (3002 par défaut). */
  port: number
  /** Origines (sites) autorisées à appeler l'API depuis un navigateur, lues dans CORS_ORIGIN. */
  corsOrigins: string[]
}

/** Origines autorisées par défaut : le front Nuxt en local (ports 3000 et 3001). */
export const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
]

/** Lit la version dans api/package.json (fonctionne depuis src/ avec tsx comme depuis dist/ après build). */
export function readVersion(): string {
  const url = new URL('../package.json', import.meta.url)
  const pkg: unknown = JSON.parse(readFileSync(url, 'utf8'))
  if (
    typeof pkg === 'object' &&
    pkg !== null &&
    'version' in pkg &&
    typeof pkg.version === 'string'
  ) {
    return pkg.version
  }
  return '0.0.0'
}

/** Ramène NODE_ENV à une valeur connue (une faute de frappe ne doit pas passer inaperçue en « production »). */
export function parseEnv(value: string | undefined): AppEnv {
  return (ENVIRONMENTS as readonly string[]).includes(value ?? '')
    ? (value as AppEnv)
    : 'development'
}

/** Port valide entre 1 et 65535, sinon 3002. */
export function parsePort(value: string | undefined): number {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : 3002
}

/** CORS_ORIGIN : liste d'origines séparées par des virgules (« http://a.fr,http://b.fr »). */
export function parseCorsOrigins(value: string | undefined): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return origins.length ? origins : DEFAULT_CORS_ORIGINS
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    version: readVersion(),
    env: parseEnv(env.NODE_ENV),
    port: parsePort(env.PORT),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGIN),
  }
}
