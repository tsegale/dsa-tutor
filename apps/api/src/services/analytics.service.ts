import { prisma } from '../lib/prisma'
import type { EducatorAnalyticsDto } from '../dtos/analytics.dto'

export async function getEducatorAnalytics(): Promise<EducatorAnalyticsDto> {
  const [totalStudents, totalSessions, interactions, students] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.session.count(),
    prisma.interaction.findMany({
      include: { session: { include: { algorithmTopic: true } } },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        sessions: {
          include: { interactions: true },
        },
      },
    }),
  ])

  const correctCount = interactions.filter((i) => i.predictionCorrect).length
  const averageCorrectRate =
    interactions.length > 0 ? Math.round((correctCount / interactions.length) * 100) : 0

  const misconceptionBreakdown: Record<string, number> = {}
  interactions.forEach((i) => {
    if (i.misconceptionCategory) {
      misconceptionBreakdown[i.misconceptionCategory] =
        (misconceptionBreakdown[i.misconceptionCategory] ?? 0) + 1
    }
  })

  const stepErrorMap: Record<string, Record<number, number>> = {}
  interactions
    .filter((i) => !i.predictionCorrect)
    .forEach((i) => {
      const algoName = i.session.algorithmTopic.displayName
      if (!stepErrorMap[algoName]) stepErrorMap[algoName] = {}
      stepErrorMap[algoName][i.stepIndex] = (stepErrorMap[algoName][i.stepIndex] ?? 0) + 1
    })

  const stepDifficultyHeatmap = Object.entries(stepErrorMap)
    .flatMap(([algorithmName, steps]) =>
      Object.entries(steps).map(([stepIndex, errorCount]) => ({
        stepIndex: parseInt(stepIndex),
        errorCount,
        algorithmName,
      })),
    )
    .sort((a, b) => b.errorCount - a.errorCount)

  const scaffoldingDistribution: Record<string, number> = {}
  interactions.forEach((i) => {
    scaffoldingDistribution[i.scaffoldingLevelAtTime] = (scaffoldingDistribution[i.scaffoldingLevelAtTime] ?? 0) + 1
  })

  const studentProgress = students.map((student) => {
    const allInteractions = student.sessions.flatMap((s) => s.interactions)
    const correct = allInteractions.filter((i) => i.predictionCorrect).length
    const rate = allInteractions.length > 0 ? Math.round((correct / allInteractions.length) * 100) : 0

    const miscCounts: Record<string, number> = {}
    allInteractions.forEach((i) => {
      if (i.misconceptionCategory) {
        miscCounts[i.misconceptionCategory] = (miscCounts[i.misconceptionCategory] ?? 0) + 1
      }
    })
    const topMisconception = Object.entries(miscCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

    const latestChallengeSession = [...student.sessions]
      .filter((s) => s.challengeExplanation)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]

    const chronological = [...allInteractions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const totalTimeSpent = allInteractions.reduce((sum, i) => sum + i.timeSpentSeconds, 0)

    return {
      userId: student.id,
      name: student.name,
      totalSessions: student.sessions.length,
      averageCorrectRate: rate,
      topMisconception,
      challengeExplanation: latestChallengeSession?.challengeExplanation ?? null,
      totalPredictions: allInteractions.length,
      correctPredictions: correct,
      hintsRequested: allInteractions.reduce((sum, i) => sum + i.hintsRequested, 0),
      misconceptionBreakdown: miscCounts,
      scaffoldingProgression: chronological.map((i) => i.scaffoldingLevelAtTime),
      feynmanScores: chronological.filter((i) => i.interactionType === 'FEYNMAN').map((i) => i.masteryScoreAtTime),
      averageTimePerStep: allInteractions.length > 0 ? totalTimeSpent / allInteractions.length : 0,
    }
  })

  return {
    totalStudents,
    totalSessions,
    averageCorrectRate,
    misconceptionBreakdown,
    stepDifficultyHeatmap,
    scaffoldingDistribution,
    studentProgress,
  }
}
