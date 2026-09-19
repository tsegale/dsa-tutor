import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { TopicDto } from '@dsa-tutor/types'
import MasteryRing from '@/components/ui/MasteryRing'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function CompetencyBadge({ topic }: { topic: TopicDto }) {
  // "Full guidance" (HIGH scaffolding) is the account default for a
  // never-started topic - showing it on all 67 never-started cards on a
  // fresh account carries no information (see remediation doc 9.4). Only
  // render a badge once the learner's scaffolding has actually moved away
  // from that default in either direction.
  if (topic.isLocked) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }}
      >
        Locked
      </span>
    )
  }
  if (topic.masteryPercent === 0) return null

  const style =
    topic.masteryPercent >= 80
      ? { label: 'Independent mastery', bg: '#eaf3de', color: '#3b6d11' }
      : { label: 'Fading scaffolding', bg: '#faeeda', color: '#854f0b' }

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  )
}

interface AlgorithmCardProps {
  topic: TopicDto
  onStart: (topicName: string, mode: 'DEMO' | 'PRACTICE') => void
}

// Tracks which mastered topics have already played their completion
// flash this page load, so it fires once per topic per session rather
// than replaying on every re-render.
const masteryFlashShown = new Set<string>()

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#EAB308" stroke="#EAB308" strokeWidth={1}>
      <path d="M12 2l2.9 6.5 7.1.7-5.4 4.7 1.6 7-6.2-3.7L6 21l1.6-7-5.4-4.7 7.1-.7L12 2Z" strokeLinejoin="round" />
    </svg>
  )
}

export default function AlgorithmCard({ topic, onStart }: AlgorithmCardProps) {
  const isMastered = topic.masteryPercent >= 80
  const [showFlash, setShowFlash] = useState(false)
  const hasCheckedFlash = useRef(false)

  useEffect(() => {
    if (!isMastered || hasCheckedFlash.current) return
    hasCheckedFlash.current = true
    if (!masteryFlashShown.has(topic.name)) {
      masteryFlashShown.add(topic.name)
      setShowFlash(true)
      const timeout = setTimeout(() => setShowFlash(false), 900)
      return () => clearTimeout(timeout)
    }
  }, [isMastered, topic.name])

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.15)' }}
      transition={{ duration: 0.15, ease: 'easeIn' }}
      className="group relative flex h-[200px] w-[220px] shrink-0 flex-col overflow-hidden rounded-md border border-border bg-white p-4 shadow-sm"
    >
      {isMastered && (
        <span className="absolute top-2 right-2">
          <StarIcon />
        </span>
      )}

      <div className="flex items-start justify-between">
        <CompetencyBadge topic={topic} />
        <div className="relative">
          <MasteryRing progress={topic.masteryPercent / 100} size={44} />
          {showFlash && (
            <motion.span
              className="absolute inset-0 rounded-full ring-2 ring-yellow-400"
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 1, 0], scale: [1, 1.35, 1.6] }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          )}
        </div>
      </div>

      <div className="mt-2 flex-1">
        <h3 className="text-base font-bold text-primary">{topic.displayName}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-text-muted">{topic.description}</p>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-text-muted">
          <ClockIcon />
          <span>{topic.estimatedMinutes} min</span>
        </div>
      </div>

      {topic.isLocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-border py-2 text-sm font-medium text-text-muted"
            >
              <LockIcon />
              Locked
            </button>
          </TooltipTrigger>
          <TooltipContent>Complete prior topics in this track to unlock</TooltipContent>
        </Tooltip>
      ) : topic.masteryPercent === 0 ? (
        <button
          type="button"
          onClick={() => onStart(topic.name, 'PRACTICE')}
          aria-label={`Start learning ${topic.displayName}`}
          className={cn(
            'w-full rounded-md border-[1.5px] border-[#3730a3] py-2 text-sm font-medium text-[#3730a3] transition-opacity',
            'opacity-90 group-hover:opacity-100',
          )}
        >
          Start learning
        </button>
      ) : topic.masteryPercent < 80 ? (
        <div className={cn('flex gap-2 transition-opacity', 'opacity-80 group-hover:opacity-100')}>
          <button
            type="button"
            onClick={() => onStart(topic.name, 'PRACTICE')}
            aria-label={`Practice ${topic.displayName}`}
            className="flex-1 rounded-md bg-[#3730a3] py-2 text-sm font-medium text-white"
          >
            Practice
          </button>
          <button
            type="button"
            onClick={() => onStart(topic.name, 'DEMO')}
            aria-label={`Demo ${topic.displayName}`}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-text-primary"
          >
            Demo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onStart(topic.name, 'PRACTICE')}
          aria-label={`Practice ${topic.displayName} again`}
          className="w-full rounded-md bg-[#3730a3] py-2 text-sm font-medium text-white"
        >
          Practice again
        </button>
      )}
    </motion.div>
  )
}
