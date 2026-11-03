// Smoke test du paquet Lambda SANS AWS : charge dist-lambda/index.mjs et appelle son handler
// avec un faux événement « Function URL » (GET /health), comme le ferait AWS.
//
//   node scripts/invoke-lambda.mjs <commit attendu>
//
// Code de sortie 1 si la réponse n'est pas 200, ou si le commit gravé n'est pas celui attendu.
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const expected = process.argv[2]
const { handler } = await import(pathToFileURL(resolve('dist-lambda/index.mjs')).href)
const host = 'smoke.lambda-url.local'
const res = await handler(
  {
    version: '2.0',
    rawPath: '/health',
    rawQueryString: '',
    headers: { host },
    requestContext: { domainName: host, http: { method: 'GET', path: '/health' } },
    isBase64Encoded: false,
  },
  {},
)
const health = JSON.parse(res.body)
process.stdout.write(`${res.statusCode} ${res.body}\n`)
if (res.statusCode !== 200 || health.status !== 'ok') {
  process.stderr.write('Le handler Lambda ne répond pas correctement.\n')
  process.exit(1)
}
if (expected && health.commit !== expected) {
  process.stderr.write(`Commit gravé « ${health.commit} » ≠ attendu « ${expected} ».\n`)
  process.exit(1)
}
process.stdout.write(`OK : handler Lambda, commit ${health.commit.slice(0, 7)}\n`)
