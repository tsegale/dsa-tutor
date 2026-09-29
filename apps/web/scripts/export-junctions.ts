// Junction inventory for expert review (Week 3 3E): a printable HTML sheet
// (and the same rows as CSV for entering the ratings) that a DSA lecturer
// rates for pedagogical significance, 1-5, with comments.
//
// Run from apps/web:
//   npx tsx --tsconfig tsconfig.app.json scripts/export-junctions.ts [--out-dir ../../docs/junction-review]
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { buildJunctionInventory, inventoryToCsvRows, inventoryToHtml } from '../src/utils/junctionInventory'

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

const i = process.argv.indexOf('--out-dir')
const outDir = i === -1 ? '../../docs/junction-review' : process.argv[i + 1]
mkdirSync(outDir, { recursive: true })

const rows = buildJunctionInventory()
const today = new Date().toISOString().slice(0, 10)
writeFileSync(join(outDir, 'junction-inventory.html'), inventoryToHtml(rows, today))
const csv = inventoryToCsvRows(rows)
writeFileSync(join(outDir, 'junction-inventory.csv'), [csv.header, ...csv.rows].map((r) => r.map(csvField).join(',')).join('\n') + '\n')
console.log(`Wrote ${rows.length} junction forms across ${new Set(rows.map((r) => r.topic)).size} topics to ${outDir}`)
