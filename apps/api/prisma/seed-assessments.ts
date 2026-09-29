import { PrismaClient } from '@prisma/client'
import { ITEM_BANK } from '../src/data/assessmentItemBank'
import { STUDY_TOPICS } from '../src/config/studyTopics'

// The same instrument is used for both phases - two Assessment rows with
// identical item content, so PRE and POST attempts stay independent
// (separate unique-per-user constraints) while measuring the same thing.
const ASSESSMENTS: Array<{ code: string; phase: 'PRE' | 'POST'; title: string }> = [
  { code: 'STUDY_PRE_V1', phase: 'PRE', title: 'Pre-study assessment' },
  { code: 'STUDY_POST_V1', phase: 'POST', title: 'Post-study assessment' },
]

/**
 * Creates the pre/post assessments and their items. Runs on every
 * production startup from seed.ts (additive only: items are written only
 * for an assessment that has none), so a fresh database always has the
 * instrument - it was missing in production until 2026-09-29 because this
 * script only ever ran by hand. replaceItems (the by-hand run below)
 * rewrites the item set, and refuses once any participant has answered.
 */
export async function seedAssessments(prisma: PrismaClient, { replaceItems }: { replaceItems: boolean }): Promise<void> {
  for (const definition of ASSESSMENTS) {
    const assessment = await prisma.assessment.upsert({
      where: { code: definition.code },
      create: {
        code: definition.code,
        phase: definition.phase,
        title: definition.title,
        topicSlugs: [...STUDY_TOPICS],
      },
      update: {
        title: definition.title,
        topicSlugs: [...STUDY_TOPICS],
      },
    })

    const existingItems = await prisma.assessmentItem.count({ where: { assessmentId: assessment.id } })
    if (existingItems > 0 && !replaceItems) {
      // Items created before AssessmentItem.topicSlug existed get their topic
      // filled in by order - only that column, never touching responses.
      let order = 0
      for (const bank of ITEM_BANK) {
        for (let i = 0; i < bank.items.length; i++) {
          order += 1
          await prisma.assessmentItem.updateMany({
            where: { assessmentId: assessment.id, order, topicSlug: null },
            data: { topicSlug: bank.topicSlug },
          })
        }
      }
      continue
    }

    // Items don't carry a natural per-topic unique key (order restarts at 1
    // for each topic, and a conceptTag like EDGE_SINGLE recurs across
    // topics), so re-seeding replaces this assessment's whole item set
    // rather than trying to match and update individual rows. Only safe
    // before real attempts exist.
    if (existingItems > 0) {
      const answered = await prisma.assessmentResponse.count({ where: { item: { assessmentId: assessment.id } } })
      if (answered > 0) {
        throw new Error(`${definition.code} already has ${answered} responses - its items cannot be replaced`)
      }
      await prisma.assessmentItem.deleteMany({ where: { assessmentId: assessment.id } })
    }

    let order = 0
    for (const bank of ITEM_BANK) {
      for (const item of bank.items) {
        order += 1
        await prisma.assessmentItem.create({
          data: {
            assessmentId: assessment.id,
            order,
            itemType: item.itemType,
            stem: item.stem,
            options: item.options ?? undefined,
            correctOptionId: item.correctOptionId,
            conceptTag: item.conceptTag,
            maxScore: item.maxScore,
            topicSlug: bank.topicSlug,
          },
        })
      }
    }
  }
}

// By hand: `pnpm tsx prisma/seed-assessments.ts` rewrites the item set
// (before any participant has answered).
if (require.main === module) {
  const prisma = new PrismaClient()
  seedAssessments(prisma, { replaceItems: true })
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
      console.error(error)
      await prisma.$disconnect()
      process.exit(1)
    })
}
