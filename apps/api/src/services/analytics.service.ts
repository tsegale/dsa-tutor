import { prisma } from '../lib/prisma'
import type { EducatorAnalyticsDto } from '../dtos/analytics.dto'
import { feynmanScoreOf, isScoredInteraction } from '../config/interactionTypes'

const LEAN_INTERACTION_SELECT = {
  stepIndex: true,
  predictionCorrect: true,
  misconceptionCategory: true,
  hintsRequested: true,
  timeSpentSeconds: true,
  scaffoldingLevelAtTime: true,
  masteryScoreAtTime: true,
  interactionType: true,
  promptKey: true,
  rubricScore: true,
  createdAt: true,
} as const

export async function getEducatorAnalytics(): Promise<EducatorAnalyticsDto> {
  // Single lean query excluding heavy JSON snapshots and feedback text blobs.
  // Demo accounts (4D.6) are visitors trying the app, not students.
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', isDemo: false },
    select: {
      id: true,
      name: true,
      sessions: {
        select: {
          id: true,
          mode: true,
          startTime: true,
          challengeExplanation: true,
          algorithmTopic: { select: { displayName: true } },
          interactions: { select: LEAN_INTERACTION_SELECT },
        },
      },
    },
  })

  const totalStudents = students.length
  // The dashboard labels these "Practice sessions completed" and "Sessions
  // completed". Every topic opens in Demo, so counting all sessions counted
  // each page visit; only the modes where a student answers anything count.
  const practiceSessionCount = (sessions: Array<{ mode: string }>) =>
    sessions.filter((s) => s.mode === 'PRACTICE' || s.mode === 'HANDS_ON').length
  const totalSessions = students.reduce((sum, s) => sum + practiceSessionCount(s.sessions), 0)

  const stepErrorMap: Record<string, Record<number, number>> = {}
  const misconceptionBreakdown: Record<string, number> = {}
  const scaffoldingDistribution: Record<string, number> = {}
  let totalScoredCount = 0
  let totalCorrectCount = 0

  const studentProgress = students.map((student) => {
    const loggedByStudent = student.sessions.flatMap((s) =>
      s.interactions.map((interaction) => ({ ...interaction, algoDisplayName: s.algorithmTopic.displayName })),
    )
    const allInteractions = loggedByStudent.filter(isScoredInteraction)
    const correct = allInteractions.filter((i) => i.predictionCorrect).length
    const rate = allInteractions.length > 0 ? Math.round((correct / allInteractions.length) * 100) : 0

    totalScoredCount += allInteractions.length
    totalCorrectCount += correct

    const miscCounts: Record<string, number> = {}
    for (const i of allInteractions) {
      scaffoldingDistribution[i.scaffoldingLevelAtTime] =
        (scaffoldingDistribution[i.scaffoldingLevelAtTime] ?? 0) + 1
      if (i.misconceptionCategory) {
        miscCounts[i.misconceptionCategory] = (miscCounts[i.misconceptionCategory] ?? 0) + 1
        misconceptionBreakdown[i.misconceptionCategory] =
          (misconceptionBreakdown[i.misconceptionCategory] ?? 0) + 1
      }
      if (!i.predictionCorrect) {
        const algoName = i.algoDisplayName
        if (!stepErrorMap[algoName]) stepErrorMap[algoName] = {}
        stepErrorMap[algoName][i.stepIndex] = (stepErrorMap[algoName][i.stepIndex] ?? 0) + 1
      }
    }

    const topMisconception = Object.entries(miscCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

    const latestChallengeSession = [...student.sessions]
      .filter((s) => s.challengeExplanation)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]

    const chronological = [...allInteractions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const totalTimeSpent = allInteractions.reduce((sum, i) => sum + i.timeSpentSeconds, 0)

    return {
      userId: student.id,
      name: student.name,
      totalSessions: practiceSessionCount(student.sessions),
      averageCorrectRate: rate,
      topMisconception,
      challengeExplanation: latestChallengeSession?.challengeExplanation ?? null,
      totalPredictions: allInteractions.length,
      correctPredictions: correct,
      hintsRequested: allInteractions.reduce((sum, i) => sum + i.hintsRequested, 0),
      misconceptionBreakdown: miscCounts,
      scaffoldingProgression: chronological.map((i) => i.scaffoldingLevelAtTime),
      feynmanScores: [...loggedByStudent]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .filter((i) => i.interactionType === 'FEYNMAN')
        .flatMap((i) => {
          const score = feynmanScoreOf(i)
          return score === null ? [] : [score]
        }),
      averageTimePerStep: allInteractions.length > 0 ? totalTimeSpent / allInteractions.length : 0,
    }
  })

  const averageCorrectRate =
    totalScoredCount > 0 ? Math.round((totalCorrectCount / totalScoredCount) * 100) : 0

  const stepDifficultyHeatmap = Object.entries(stepErrorMap)
    .flatMap(([algorithmName, steps]) =>
      Object.entries(steps).map(([stepIndex, errorCount]) => ({
        stepIndex: parseInt(stepIndex, 10),
        errorCount,
        algorithmName,
      })),
    )
    .sort((a, b) => b.errorCount - a.errorCount)

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
