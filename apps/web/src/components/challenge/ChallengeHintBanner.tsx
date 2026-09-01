import { useAlgorithmStore } from '@/store/useAlgorithmStore'

function LightbulbIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.4.3.5.8.5 1.3V16h6v-.8c0-.5.1-1 .5-1.3A6 6 0 0 0 12 3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  )
}

export default function ChallengeHintBanner() {
  const challengeHint = useAlgorithmStore((state) => state.challengeHint)
  const setChallengeHint = useAlgorithmStore((state) => state.setChallengeHint)

  if (!challengeHint) return null

  return (
    <div className="absolute top-4 left-1/2 z-20 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-md border border-secondary bg-secondary-light px-3 py-2 text-secondary shadow-md">
      <LightbulbIcon />
      <p className="text-[13px] italic">{challengeHint}</p>
      <button
        type="button"
        onClick={() => setChallengeHint(null)}
        aria-label="Dismiss hint"
        className="ml-1 shrink-0 text-secondary/70 hover:text-secondary"
      >
        <CloseIcon />
      </button>
    </div>
  )
}
