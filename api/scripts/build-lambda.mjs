import { execSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { build } from 'esbuild'

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
)
const commit =
  process.env.GIT_COMMIT?.trim() ||
  execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
const outfile = 'dist-lambda/index.mjs'

process.stdout.write(
  `[1/2] esbuild : src/lambda.ts → ${outfile} (v${pkg.version}, commit ${commit.slice(0, 7)})\n`,
)
await build({
  entryPoints: ['src/lambda.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  define: {
    __BUILD_INFO__: JSON.stringify({ version: pkg.version, commit }),
  },
})
const size = (statSync(outfile).size / 1024).toFixed(0)
process.stdout.write(`[2/2] paquet prêt : ${outfile} (${size} Ko)\n`)
