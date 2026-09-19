import { PrismaClient } from '@prisma/client'
import { ITEM_BANK } from '../src/data/assessmentItemBank'
import { STUDY_TOPICS } from '../src/config/studyTopics'

const prisma = new PrismaClient()

// The same instrument is used for both phases - two Assessment rows with
// identical item content, so PRE and POST attempts stay independent
// (separate unique-per-user constraints) while measuring the same thing.
const ASSESSMENTS: Array<{ code: string; phase: 'PRE' | 'POST'; title: string }> = [
  { code: 'STUDY_PRE_V1', phase: 'PRE', title: 'Pre-study assessment' },
  { code: 'STUDY_POST_V1', phase: 'POST', title: 'Post-study assessment' },
]

async function main() {
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

    // Items don't carry a natural per-topic unique key (order restarts at 1
    // for each topic, and a conceptTag like EDGE_SINGLE recurs across
    // topics), so re-seeding replaces this assessment's whole item set
    // rather than trying to match and update individual rows. Only safe
    // before real attempts exist - AssessmentResponse's FK to
    // AssessmentItem restricts deletion once a participant has answered.
    await prisma.assessmentItem.deleteMany({ where: { assessmentId: assessment.id } })

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
          },
        })
      }
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
