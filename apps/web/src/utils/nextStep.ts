import { TOPIC_COMPLETE, moduleLabel, placeOfTopic } from '@/config/curriculum'
import type { LearningPlan, SyllabusTopic } from './syllabus'
import type { LastPosition } from './lastPosition'
import { relativeDay } from './curriculum'

// Home's one answer to "what next" (Phase 5A), read from the one learning
// plan (planNext) so the banner, the module sections and the rail cannot
// disagree. This only words the plan's answer; it never picks a topic.

export type NextStep =
  | {
      kind: 'resume'
      entry: SyllabusTopic
      eyebrow: string
      action: string
      /** Where the learner stopped, when this device recorded it. */
      position: { step: number; total: number } | null
      reasoning: string
    }
  | { kind: 'start' | 'next'; entry: SyllabusTopic; eyebrow: string; action: string; reasoning: string }
  | { kind: 'done' }

/** relativeDay, readable after "You last worked on this": "today", "3 days ago", "on 2 Oct". */
export function whenPhrase(iso: string, now: Date): string {
  const day = relativeDay(iso, now)
  return /^(today|yesterday)$|ago$/.test(day) ? day : `on ${day}`
}

export function nextStep(plan: LearningPlan, position: LastPosition | null, now: Date = new Date()): NextStep {
  if (plan.continue) {
    const { entry, startTime } = plan.continue
    const name = entry.topic.displayName
    const here = position && position.topic === entry.topic.name ? position : null
    const reasoning = here
      ? `You last worked on this ${whenPhrase(here.at, now)} and are ${Math.round((here.step / here.total) * 100)}% through.`
      : `You last worked on this ${whenPhrase(startTime, now)}, and your mastery is ${entry.topic.masteryPercent}%.`
    return {
      kind: 'resume',
      entry,
      eyebrow: 'Resume where you left off',
      action: `Resume ${name}`,
      position: here ? { step: here.step, total: here.total } : null,
      reasoning,
    }
  }

  const entry = plan.recommended
  if (!entry) return { kind: 'done' }
  const name = entry.topic.displayName
  const started = entry.topic.masteryPercent > 0

  if (!plan.furthest) {
    const place = placeOfTopic(entry.topic.name)
    const where = place ? moduleLabel(place.module) : 'the curriculum'
    return {
      kind: 'start',
      entry,
      eyebrow: 'Start here',
      action: `Begin ${name}`,
      reasoning: place?.index === 0 ? `It is the first topic in ${where}, and what follows builds on it.` : `It is the first topic open to you in ${where}.`,
    }
  }

  const furthest = plan.furthest
  return {
    kind: 'next',
    entry,
    eyebrow: 'Next up',
    action: started ? `Continue ${name}` : `Begin ${name}`,
    reasoning:
      furthest.topic.name === entry.topic.name
        ? `You have started it and your mastery is ${entry.topic.masteryPercent}%; it completes at ${TOPIC_COMPLETE}%.`
        : `It comes next after ${furthest.number} ${furthest.topic.displayName}, the furthest you have reached.`,
  }
}
