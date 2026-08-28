import { prisma } from '../lib/prisma'
import type { TopicDto } from '../dtos/topic.dto'

export async function getAllTopics(userId: string): Promise<TopicDto[]> {
  const topics = await prisma.algorithmTopic.findMany({
    orderBy: [{ track: 'asc' }, { difficulty: 'asc' }],
  })

  return Promise.all(
    topics.map(async (topic) => {
      const interactions = await prisma.interaction.findMany({
        where: {
          session: { userId, algorithmTopicId: topic.id, mode: 'PRACTICE' },
        },
      })
      const correct = interactions.filter((i) => i.predictionCorrect).length
      const masteryPercent =
        interactions.length > 0 ? Math.round((correct / interactions.length) * 100) : 0

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
    }),
  )
}
