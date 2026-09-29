// Rater agreement for the misconception labels (Week 3 3D).
//
// 1. Draw a sample for the raters (blind: the rule label, AI label and the
//    feedback shown are left out, so raters are not anchored by them):
//      npx tsx scripts/agreement.ts --sample 20 --stratify junctionType --out sample.csv [--seed 7] [--include-pilot]
//    (written to a file, not stdout: the dev Prisma client logs queries to stdout)
//    Each rater fills in raterCode and label (a taxonomy category, or NONE)
//    and the file is imported with POST /api/v1/research/ratings.
//
// 2. Report agreement over the imported ratings, as markdown:
//      npx tsx scripts/agreement.ts
//    Cohen's kappa between the human raters, each human against aiLabel,
//    each human against ruleLabel; a confusion matrix per pair; and
//    per-category precision and recall for aiLabel.
import { writeFileSync } from 'fs'
import { prisma } from '../src/lib/prisma'
import { agreementReportToMarkdown, computeAgreementReport, stratifiedSample } from '../src/services/agreement.service'
import { misconceptionExportRows } from '../src/services/research.service'
import { toCsv } from '../src/utils/csv'

/** Columns the raters see: context only, never a label. */
const BLIND_COLUMNS = ['interactionId', 'algorithm', 'junctionType', 'junctionDifficulty', 'serialisedState', 'studentAnswer']

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

async function sample(n: number) {
  const stratifyBy = flag('stratify') ?? 'junctionType'
  const seed = Number(flag('seed') ?? 1)
  const { header, rows } = await misconceptionExportRows(process.argv.includes('--include-pilot'))
  if (!header.includes(stratifyBy)) throw new Error(`Cannot stratify by "${stratifyBy}" - columns are: ${header.join(', ')}`)
  const records = rows.map((row) => Object.fromEntries(header.map((column, i) => [column, row[i]])))
  const out = flag('out')
  if (!out) throw new Error('--out <file.csv> is required with --sample')
  const chosen = stratifiedSample(records, n, stratifyBy, seed)
  writeFileSync(out, toCsv([...BLIND_COLUMNS, 'raterCode', 'label'], chosen.map((r) => [...BLIND_COLUMNS.map((c) => r[c]), '', ''])))
  console.error(`Wrote ${chosen.length} of ${rows.length} rows to ${out}, stratified by ${stratifyBy} (seed ${seed}).`)
}

async function report() {
  const ratings = await prisma.misconceptionRating.findMany({
    include: { interaction: { select: { misconceptionCategory: true, aiMisconceptionCategory: true } } },
  })
  const items = new Map<string, { interactionId: string; ruleLabel: string | null; aiLabel: string | null; ratings: Record<string, string> }>()
  for (const rating of ratings) {
    const item = items.get(rating.interactionId) ?? {
      interactionId: rating.interactionId,
      ruleLabel: rating.interaction.misconceptionCategory,
      aiLabel: rating.interaction.aiMisconceptionCategory,
      ratings: {},
    }
    item.ratings[rating.raterCode] = rating.label
    items.set(rating.interactionId, item)
  }
  console.log(agreementReportToMarkdown(computeAgreementReport([...items.values()])))
}

async function main() {
  const n = flag('sample')
  if (n !== undefined) await sample(Number(n))
  else await report()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
