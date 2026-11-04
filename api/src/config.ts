import { readFileSync } from 'node:fs'
import { BUILD_INFO } from './build-info.js'

export const ENVIRONMENTS = ['development', 'test', 'production'] as const
export type AppEnv = (typeof ENVIRONMENTS)[number]

export interface AppConfig {
  version: string
  env: AppEnv
  port: number
  corsOrigins: string[]
  databaseUrl: string | undefined
  commit: string
}

export const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
]

export function readVersion(): string {
  const url = new URL('../package.json', import.meta.url)
  let pkg: unknown
  try {
    pkg = JSON.parse(readFileSync(url, 'utf8'))
  } catch {
    return '0.0.0'
  }
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

export function parseEnv(value: string | undefined): AppEnv {
  return (ENVIRONMENTS as readonly string[]).includes(value ?? '')
    ? (value as AppEnv)
    : 'development'
}

export function parsePort(value: string | undefined): number {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : 3002
}

export function parseCorsOrigins(value: string | undefined): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return origins.length ? origins : DEFAULT_CORS_ORIGINS
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    version: BUILD_INFO?.version ?? readVersion(),
    env: parseEnv(env.NODE_ENV),
    port: parsePort(env.PORT),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGIN),
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
    commit: env.GIT_COMMIT?.trim() || BUILD_INFO?.commit || 'local',
  }
}
