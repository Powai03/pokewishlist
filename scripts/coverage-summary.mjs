#!/usr/bin/env node
// node scripts/coverage-summary.mjs summary <dossier> <titre>  → tableau Markdown (résumé GitHub Actions)
// node scripts/coverage-summary.mjs badge <dossier> <libellé>  → JSON du badge shields.io (format « endpoint »)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const [mode, dir, title] = process.argv.slice(2)
const { total } = JSON.parse(
  readFileSync(join(dir, 'coverage-summary.json'), 'utf8'),
)

export function color(pct) {
  if (pct >= 90) return 'brightgreen'
  if (pct >= 75) return 'green'
  if (pct >= 60) return 'yellow'
  return 'red'
}

if (mode === 'badge') {
  const pct = total.lines.pct
  process.stdout.write(
    JSON.stringify({
      schemaVersion: 1,
      label: title,
      message: `${pct}%`,
      color: color(pct),
    }),
  )
} else {
  const rows = ['lines', 'statements', 'functions', 'branches'].map(
    (k) =>
      `| ${k} | ${total[k].pct}% | ${total[k].covered}/${total[k].total} |`,
  )
  process.stdout.write(
    [
      `### Couverture des tests : ${title}`,
      '',
      '| | % | couvert |',
      '| --- | --- | --- |',
      ...rows,
      '',
    ].join('\n'),
  )
}
