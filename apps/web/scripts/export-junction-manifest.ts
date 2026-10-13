// Junction manifest for the AI service's guidance coverage test (Phase 7A):
// which junction types each algorithm asks, from real engine runs.
//
// Run from apps/web:
//   npx tsx --tsconfig tsconfig.app.json scripts/export-junction-manifest.ts
import { writeFileSync } from 'fs'
import { buildJunctionManifest } from '../src/utils/junctionManifest'

const out = '../ai/tests/fixtures/junction_manifest.json'
const manifest = buildJunctionManifest()
writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${Object.keys(manifest).length} algorithms to ${out}`)
