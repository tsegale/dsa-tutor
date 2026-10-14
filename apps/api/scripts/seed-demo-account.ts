import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { buildDemoProgress, demoMasteryRows } from '../src/data/demoProgress'
import { computeMastery, meetsEveryCriterion } from '../src/config/mastery'

// The showcase demo account (Phase 3.1E): a signed-in learner with realistic
// progress across the curriculum, for walkthroughs and screenshots.
//
// It is an isDemo account with no participantCode, so it is excluded from
// every research export (they require a participantCode and consent), from
// educator analytics (isDemo filter), and from study enrolment. Running the
// script again resets the account's progress to the seeded state.
//
// Usage: DEMO_SEED_EMAIL=... DEMO_SEED_PASSWORD=... pnpm --filter api seed-demo-account

const prisma = new PrismaClient()

async function main() {
  const email = process.env.DEMO_SEED_EMAIL
  const password = process.env.DEMO_SEED_PASSWORD
  const name = process.env.DEMO_SEED_NAME ?? 'Demo learner'

  if (!email || !password) {
    console.error('DEMO_SEED_EMAIL and DEMO_SEED_PASSWORD must both be set. Nothing seeded.')
    process.exitCode = 1
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && (!existing.isDemo || existing.participantCode !== null || existing.role !== 'STUDENT')) {
    console.error(`${email} belongs to a real account (not a demo student). Nothing seeded.`)
    process.exitCode = 1
    return
  }

  const now = new Date()
  const sessions = buildDemoProgress(now)
  const topics = await prisma.algorithmTopic.findMany({
    where: { name: { in: sessions.map((s) => s.topic) } },
    select: { id: true, name: true },
  })
  const topicId = new Map(topics.map((t) => [t.name, t.id]))
  const missing = sessions.map((s) => s.topic).filter((topic) => !topicId.has(topic))
  if (missing.length > 0) {
    console.error(`Topics not in the database (run the seed first): ${missing.join(', ')}. Nothing seeded.`)
    process.exitCode = 1
    return
  }

  const correct = sessions.reduce((sum, s) => sum + s.interactions.filter((i) => i.predictionCorrect).length, 0)
  // The mastery rubric per topic, as the api stores it after each write
  // (services/mastery.service.ts), so TopicMastery matches what the
  // account shows.
  const masteries = sessions.map((session) => {
    const rows = demoMasteryRows(session)
    const mastery = computeMastery(session.topic, rows, null)
    return { session, mastery, masteredAt: meetsEveryCriterion(mastery) ? (rows.at(-1)?.createdAt ?? now) : null }
  })
  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { passwordHash, name } })
      : await tx.user.create({ data: { email, passwordHash, name, role: 'STUDENT', isDemo: true } })

    // Reset: everything the account wrote since the last seed.
    await tx.misconceptionRating.deleteMany({ where: { interaction: { session: { userId: user.id } } } })
    await tx.interaction.deleteMany({ where: { session: { userId: user.id } } })
    await tx.session.deleteMany({ where: { userId: user.id } })
    await tx.remediation.deleteMany({ where: { event: { userId: user.id } } })
    await tx.misconceptionProbe.deleteMany({ where: { event: { userId: user.id } } })
    await tx.misconceptionEvent.deleteMany({ where: { userId: user.id } })
    await tx.assessmentResponse.deleteMany({ where: { attempt: { userId: user.id } } })
    await tx.assessmentAttempt.deleteMany({ where: { userId: user.id } })
    await tx.userBadge.deleteMany({ where: { userId: user.id } })
    await tx.topicMastery.deleteMany({ where: { userId: user.id } })

    // Two queries per session (the session, then its answers in one insert):
    // run from far away, a nested create's one-query-per-row outlasts the
    // transaction timeout.
    for (const session of sessions) {
      const created = await tx.session.create({
        select: { id: true },
        data: {
          userId: user.id,
          algorithmTopicId: topicId.get(session.topic)!,
          mode: 'PRACTICE',
          scaffoldingLevel: session.finalLevel,
          startTime: session.startTime,
          endTime: session.endTime,
          completed: session.completed,
          reachedFinalStep: session.reachedFinalStep,
          wallClockSeconds: session.activeSeconds,
          activeSeconds: session.activeSeconds,
        },
      })
      await tx.interaction.createMany({
        data: [
          ...session.interactions.map((interaction) => ({
            ...interaction,
            sessionId: created.id,
            interactionType: 'PREDICTION',
          })),
          ...session.extras.map((extra) => ({
            ...extra,
            sessionId: created.id,
            misconceptionCategory: null,
            predictionSubmitted: null,
            hintsRequested: 0,
            scaffoldingLevelAtTime: session.finalLevel,
          })),
        ],
      })
    }

    await tx.topicMastery.createMany({
      data: masteries.map(({ session, mastery, masteredAt }) => {
        const answered = session.interactions.length
        const right = session.interactions.filter((i) => i.predictionCorrect).length
        const percent = Math.round((right / answered) * 100)
        return {
          userId: user.id,
          algorithmTopicId: topicId.get(session.topic)!,
          overallScore: percent,
          conceptualScore: percent,
          proceduralScore: percent,
          totalPredictions: answered,
          correctPredictions: right,
          lastPracticedAt: session.endTime ?? session.startTime,
          criteriaMet: mastery.criteria.map((criterion) => ({ ...criterion })),
          masteredAt,
        }
      }),
    })

    await tx.user.update({
      where: { id: user.id },
      data: { xpTotal: correct * 10, streakCount: 4, lastActiveDate: now },
    })
  }, { maxWait: 20_000, timeout: 180_000 })

  const count = (status: string) => masteries.filter(({ mastery, masteredAt }) => (masteredAt ? 'MASTERED' : mastery.status) === status).length
  console.log(
    `Demo account seeded: ${email} (${sessions.length} topics started, ${correct} correct predictions; ` +
      `${count('MASTERED')} mastered, ${count('PROFICIENT')} proficient, ${count('IN_PROGRESS')} in progress)`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
