import { prisma } from '../lib/prisma'
import { STUDY_TOPICS } from '../config/studyTopics'
import { isActiveParticipant } from './study.service'
import type { TopicDto } from '../dtos/topic.dto'

export async function getAllTopics(userId: string): Promise<TopicDto[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { participantCode: true, consentAt: true, withdrawnAt: true },
  })
  // An active study participant only ever sees the three instrumented
  // topics - everyone else (non-participants, participants who haven't
  // consented yet, and withdrawn participants) sees the full catalogue.
  const restrictToStudyTopics = isActiveParticipant(user ?? { participantCode: null, consentAt: null, withdrawnAt: null })

  const [topics, interactions] = await Promise.all([
    prisma.algorithmTopic.findMany({
      where: restrictToStudyTopics ? { name: { in: [...STUDY_TOPICS] } } : undefined,
      orderBy: [{ track: 'asc' }, { order: 'asc' }],
    }),
    prisma.interaction.findMany({
      where: { session: { userId, mode: 'PRACTICE' } },
      select: { predictionCorrect: true, session: { select: { algorithmTopicId: true } } },
    }),
  ])

  const interactionsByTopicId = new Map<string, typeof interactions>()
  for (const interaction of interactions) {
    const topicId = interaction.session.algorithmTopicId
    const existing = interactionsByTopicId.get(topicId)
    if (existing) {
      existing.push(interaction)
    } else {
      interactionsByTopicId.set(topicId, [interaction])
    }
  }

  return topics.map((topic) => {
    const topicInteractions = interactionsByTopicId.get(topic.id) ?? []
    const correct = topicInteractions.filter((i) => i.predictionCorrect).length
    const masteryPercent =
      topicInteractions.length > 0 ? Math.round((correct / topicInteractions.length) * 100) : 0

    return {
      id: topic.id,
      name: topic.name,
      displayName: topic.displayName,
      track: topic.track,
      difficulty: topic.difficulty,
      description: topic.description,
      estimatedMinutes: topic.estimatedMinutes,
      isLocked: topic.isLocked,
      masteryPercent,
    }
  })
}
