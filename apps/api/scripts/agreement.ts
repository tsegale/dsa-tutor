// Prints percentage agreement between each imported rater and the rule-
// based ruleLabel, as a markdown table for the methodology writeup.
// Run with: npx tsx scripts/agreement.ts
import { prisma } from '../src/lib/prisma'
import { computeAgreement, agreementToMarkdownTable } from '../src/services/research.service'

async function main() {
  const ratings = await prisma.misconceptionRating.findMany({
    include: { interaction: { select: { misconceptionCategory: true } } },
  })

  const rows = computeAgreement(
    ratings.map((r) => ({
      raterCode: r.raterCode,
      label: r.label,
      ruleLabel: r.interaction.misconceptionCategory,
    })),
  )

  console.log(agreementToMarkdownTable(rows))
  await prisma.$disconnect()
}

main()
