import { ScaffoldingLevel } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'

const STYLES: Partial<Record<ScaffoldingLevel, string>> = {
  [ScaffoldingLevel.HIGH]: 'border border-primary bg-primary text-white',
  [ScaffoldingLevel.MEDIUM]: 'border border-primary bg-transparent text-primary',
  [ScaffoldingLevel.LOW]: 'border border-muted bg-transparent text-text-muted',
}

export default function ScaffoldingBadge() {
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)

  if (scaffoldingLevel === ScaffoldingLevel.NONE) return null

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[scaffoldingLevel]}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2 4 5v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5l-8-3z" />
      </svg>
      {scaffoldingLevel}
    </span>
  )
}
