// Prints a per-category markdown table for the methodology writeup:
// detection count, resolution/persistence/abandonment rates, median
// junctions to resolution, and the aggregate guess probability of the
// probes used. Abandoned events are excluded from the resolution
// denominator and both are reported explicitly so the numbers cannot be
// misread as "resolution rate out of everything detected."
// Study participants only, after consent, on study topics; add
// --include-pilot to count PILOT- codes too.
// Run with: npx tsx scripts/misconception-report.ts [--include-pilot]
import { getMisconceptionReport, misconceptionReportToMarkdown } from '../src/services/misconceptionReport.service'
import { prisma } from '../src/lib/prisma'

async function main() {
  const includePilot = process.argv.includes('--include-pilot')
  const rows = await getMisconceptionReport(includePilot)
  console.log(`Participants: active, consented${includePilot ? ', pilots included' : ', pilots excluded'}; study topics only.`)
  console.log()
  console.log(misconceptionReportToMarkdown(rows))
  console.log()
  console.log(
    'Resolution rate and persistence rate are both out of (detected - abandoned) per category, ' +
      'not out of every detection - an abandoned event was never retested, so it is neither ' +
      'evidence of resolution nor of persistence.',
  )
  await prisma.$disconnect()
}

main()
