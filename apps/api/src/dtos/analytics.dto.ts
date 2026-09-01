export interface EducatorAnalyticsDto {
  totalStudents: number
  totalSessions: number
  averageCorrectRate: number
  misconceptionBreakdown: Record<string, number>
  stepDifficultyHeatmap: Array<{
    stepIndex: number
    errorCount: number
    algorithmName: string
  }>
  studentProgress: Array<{
    userId: string
    name: string
    totalSessions: number
    averageCorrectRate: number
    topMisconception: string | null
    challengeExplanation: string | null
  }>
}
