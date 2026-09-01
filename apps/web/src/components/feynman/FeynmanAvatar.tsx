type FeynmanExpression = 'confused' | 'thinking' | 'happy' | 'neutral'

interface FeynmanAvatarProps {
  expression: FeynmanExpression
  size?: number
}

/** A simple confused-peer face: two dot eyes, a mouth that changes with expression/score. */
export default function FeynmanAvatar({ expression, size = 56 }: FeynmanAvatarProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-secondary-light text-secondary"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="11" cy="13" r="2" fill="currentColor" />
        <circle cx="21" cy="13" r="2" fill="currentColor" />

        {expression === 'thinking' && (
          <path d="M18 8 L24 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        )}

        {expression === 'happy' && (
          <path d="M9 19 Q16 26 23 19" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
        )}
        {expression === 'neutral' && <path d="M9 21 L23 21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
        {(expression === 'confused' || expression === 'thinking') && (
          <path
            d="M7 20 Q11 16 15 20 Q19 24 25 20"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  )
}
