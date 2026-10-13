export interface LearnerAnalyticsDto {
  summary: {
    /** Mean topic mastery over unlocked topics, as Home shows it. */
    masteryIndex: number
    topicsTotal: number
    topicsStarted: number
    topicsCompleted: number
    topicsMastered: number
    /** Sum of Session.activeSeconds. */
    practiceSeconds: number
    predictions: number
    correctPredictions: number
    /** 0-100, or null with no predictions. */
    accuracy: number | null
    hintsUsed: number
    /** Hints per prediction, or null with no predictions. */
    hintsPerPrediction: number | null
  }
  /**
   * The scaffolding trajectory, one entry per session with answered
   * predictions, newest first. masteryScoreAtTime is scored within a session,
   * so each session is its own line: chaining them would restart at every
   * session boundary and hide the fading the chart exists to show.
   */
  trajectory: Array<{ sessionId: string; topic: string; startTime: string; points: Array<{ score: number; level: string }> }>
  /** One row per track, which the web maps to its module. */
  modules: Array<{ track: string; topics: number; complete: number; meanMastery: number }>
  misconceptions: Array<{ category: string; detected: number; resolved: number; open: number }>
  recentSessions: Array<{ id: string; topic: string; mode: string; startTime: string; activeSeconds: number | null; predictions: number; correct: number }>
}
