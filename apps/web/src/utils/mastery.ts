import type { AlgorithmSnapshot, MasteryCriterion, MasteryCriterionId, MasteryStatus, TopicMastery } from '@dsa-tutor/types'
import { rngFrom } from './challengeGenerators'

/** A topic with nothing logged yet: what the api returns before any answer. */
export const EMPTY_MASTERY: TopicMastery = {
  status: 'NOT_STARTED',
  criteria: [
    { id: 'ACCURACY', applicable: true, met: false, value: null, threshold: 85, attempts: 0 },
    { id: 'BREADTH', applicable: true, met: false, value: 0, threshold: 3, attempts: 0 },
    { id: 'FEYNMAN', applicable: false, met: false, value: null, threshold: 80, attempts: 0 },
    { id: 'CHALLENGE', applicable: false, met: false, value: null, threshold: 1, attempts: 0 },
  ],
  hintsPerStep: null,
  missedJunctionTypes: [],
  masteredAt: null,
}

const hashCache = new WeakMap<readonly AlgorithmSnapshot[], string>()

/**
 * A short hash of a run's starting state (its first snapshot), logged on
 * each answer so the breadth criterion can count distinct inputs. It works
 * for every structure - array, search target, tree, graph - because it reads
 * the state, not an input format. FNV-1a, 32 bits: identifies inputs, not a
 * security hash. Cached per snapshot array, which is immutable.
 */
export function inputHashOf(snapshots: readonly AlgorithmSnapshot[]): string | null {
  if (snapshots.length === 0) return null
  const cached = hashCache.get(snapshots)
  if (cached) return cached
  const text = JSON.stringify(snapshots[0].dataStructureState) ?? ''
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0')
  hashCache.set(snapshots, hex)
  return hex
}

/**
 * A challenge run is passed at this first-attempt accuracy on its junctions.
 * Mirrors MASTERY_RUBRIC.challengePassAccuracy (apps/api config/mastery.ts),
 * which mastery.test.ts there checks.
 */
export const CHALLENGE_PASS_ACCURACY = 85

/** Fewer first attempts than this and accuracy is not yet judged. Mirrors MASTERY_RUBRIC.accuracyMinAttempts. */
export const ACCURACY_MIN_ATTEMPTS = 10

export const MASTERY_STATUS_LABEL: Record<MasteryStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  PROFICIENT: 'Proficient',
  MASTERED: 'Mastered',
}

export const CRITERION_LABEL: Record<MasteryCriterionId, string> = {
  ACCURACY: 'First-attempt accuracy',
  BREADTH: 'Different inputs',
  FEYNMAN: 'Feynman explanation',
  CHALLENGE: 'Edge-case challenge',
}

export interface CriterionView {
  id: MasteryCriterionId
  label: string
  /** The current value, as data (shown in mono). */
  value: string
  /** What meets it, as data. */
  threshold: string
  met: boolean
  /** The one action that would meet it. Null once met: no criterion is shown unmet without one. */
  action: string | null
}

/** How one applicable criterion reads on the mastery panel. */
export function criterionView(criterion: MasteryCriterion): CriterionView {
  const base = { id: criterion.id, label: CRITERION_LABEL[criterion.id], met: criterion.met }
  switch (criterion.id) {
    case 'ACCURACY': {
      const { value, attempts, threshold } = criterion
      let action: string | null = null
      if (!criterion.met) {
        if (attempts === 0) action = 'Answer junctions in Practice mode (no first attempts yet)'
        else if (attempts < ACCURACY_MIN_ATTEMPTS)
          action = `Answer ${ACCURACY_MIN_ATTEMPTS - attempts} more junctions in Practice mode (${attempts} of ${ACCURACY_MIN_ATTEMPTS})`
        else action = `Practise again to reach ${threshold}% right first time (now ${value}% over your last ${attempts})`
      }
      return { ...base, value: value === null ? '-' : `${value}%`, threshold: `${threshold}%`, action }
    }
    case 'BREADTH':
      return {
        ...base,
        value: String(criterion.value ?? 0),
        threshold: String(criterion.threshold),
        action: criterion.met ? null : `Practise on a different input (${criterion.value ?? 0} of ${criterion.threshold})`,
      }
    case 'FEYNMAN': {
      let action: string | null = null
      if (!criterion.met) {
        if (criterion.attempts === 0) action = 'Explain this algorithm in Feynman Mode (not yet attempted)'
        else if (criterion.value === null) action = 'Explain it again in Feynman Mode (last one was not graded)'
        else action = `Explain it again in Feynman Mode (best ${criterion.value}, needs ${criterion.threshold})`
      }
      return { ...base, value: criterion.value === null ? '-' : String(criterion.value), threshold: String(criterion.threshold), action }
    }
    case 'CHALLENGE':
      return {
        ...base,
        value: String(criterion.value ?? 0),
        threshold: String(criterion.threshold),
        action: criterion.met
          ? null
          : criterion.attempts === 0
            ? 'Take an AI Challenge on this topic (not yet attempted)'
            : `Pass an AI Challenge, ${CHALLENGE_PASS_ACCURACY}% right first time (${criterion.attempts} tried)`,
      }
  }
}

export interface MasteryBreakdown {
  mastered: number
  proficient: number
  started: number
  /** Per criterion, over started topics that offer it. */
  criteria: Array<{ id: MasteryCriterionId; label: string; met: number; total: number }>
  /** The criterion most often unmet, by share, or null with nothing to compare. */
  mostMissed: MasteryCriterionId | null
}

/** The profile's view across every topic: how many are mastered, and which criterion is most often missing. */
export function masteryBreakdown(topics: ReadonlyArray<{ mastery: TopicMastery }>): MasteryBreakdown {
  const started = topics.filter((topic) => topic.mastery.status !== 'NOT_STARTED')
  const ids: MasteryCriterionId[] = ['ACCURACY', 'BREADTH', 'FEYNMAN', 'CHALLENGE']
  const criteria = ids.map((id) => {
    const offered = started.map((topic) => topic.mastery.criteria.find((c) => c.id === id)).filter((c) => c?.applicable)
    return { id, label: CRITERION_LABEL[id], met: offered.filter((c) => c!.met).length, total: offered.length }
  })
  let mostMissed: MasteryCriterionId | null = null
  let worst = 0
  for (const criterion of criteria) {
    const missedShare = criterion.total > 0 ? (criterion.total - criterion.met) / criterion.total : 0
    if (missedShare > worst) {
      worst = missedShare
      mostMissed = criterion.id
    }
  }
  return {
    mastered: topics.filter((topic) => topic.mastery.status === 'MASTERED').length,
    proficient: topics.filter((topic) => topic.mastery.status === 'PROFICIENT').length,
    started: started.length,
    criteria,
    mostMissed,
  }
}

export type MasteryOfferKind = 'FOCUSED_RUN' | 'PRACTISE_AGAIN' | 'NEW_INPUT' | 'FEYNMAN' | 'CHALLENGE'

export interface MasteryOffer {
  kind: MasteryOfferKind
  criterion: MasteryCriterionId
  label: string
  detail: string
}

/** 'SWAP_DECISION' -> 'swap decision'. */
export const junctionTypeName = (type: string) => type.toLowerCase().replace(/_/g, ' ')

/**
 * The one remediation offer for a topic (Phase 7E): the first unmet
 * criterion it offers, in rubric order, turned into a single action. Never
 * a list: the panel lists the criteria, this picks what to do next. Null
 * before the topic is started and once it is mastered.
 */
export function nextMasteryOffer(mastery: TopicMastery): MasteryOffer | null {
  if (mastery.status === 'NOT_STARTED' || mastery.status === 'MASTERED') return null
  const criterion = mastery.criteria.find((c) => c.applicable && !c.met)
  if (!criterion) return null
  switch (criterion.id) {
    case 'ACCURACY': {
      const missed = mastery.missedJunctionTypes
      if (missed.length > 0) {
        const names = missed.slice(0, 2).map(junctionTypeName).join(' and ')
        return { kind: 'FOCUSED_RUN', criterion: criterion.id, label: 'Practise the steps you missed', detail: `Asks every ${names} step, none shown as a worked example` }
      }
      const needed = Math.max(ACCURACY_MIN_ATTEMPTS - criterion.attempts, 1)
      return { kind: 'PRACTISE_AGAIN', criterion: criterion.id, label: 'Practise again from the start', detail: `${needed} more first ${needed === 1 ? 'attempt' : 'attempts'} to go` }
    }
    case 'BREADTH':
      return { kind: 'NEW_INPUT', criterion: criterion.id, label: 'Try a new input', detail: `${criterion.value ?? 0} of ${criterion.threshold} different inputs so far` }
    case 'FEYNMAN':
      return {
        kind: 'FEYNMAN',
        criterion: criterion.id,
        label: 'Explain it in Feynman Mode',
        detail: criterion.value === null ? `Scores ${criterion.threshold} or more to count` : `Best so far ${criterion.value}, needs ${criterion.threshold}`,
      }
    case 'CHALLENGE':
      return {
        kind: 'CHALLENGE',
        criterion: criterion.id,
        label: 'Start an AI Challenge',
        detail: `An edge-case input; pass with ${CHALLENGE_PASS_ACCURACY}% right first time`,
      }
  }
}

// Topics whose engines expect a sorted array.
const SORTED_INPUT_TOPICS = new Set(['binary-search', 'jump-search', 'interpolation-search', 'exponential-search'])

/**
 * A new practice input for the breadth offer, built from a seed, never by a
 * model (the same seeded generator as the AI Challenge cases). The seed is
 * the topic and how many inputs it has been practised on, so the next
 * suggestion moves on once one is used. Same length as the topic's default
 * input, distinct values 1-30.
 */
export function masteryPracticeInput(topicSlug: string, defaultLength: number, inputsSoFar: number): number[] {
  let seed = 0x9e3779b9 ^ inputsSoFar
  for (let i = 0; i < topicSlug.length; i++) seed = Math.imul(seed ^ topicSlug.charCodeAt(i), 0x01000193)
  const random = rngFrom(seed)
  const length = Math.max(defaultLength, 2)
  const values = new Set<number>()
  while (values.size < length) values.add(1 + Math.floor(random() * 30))
  const array = [...values]
  return SORTED_INPUT_TOPICS.has(topicSlug) ? array.sort((a, b) => a - b) : array
}
