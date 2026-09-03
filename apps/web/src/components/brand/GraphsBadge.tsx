interface GraphsBadgeProps {
  size?: number
  className?: string
}

export default function GraphsBadge({ size = 52, className = '' }: GraphsBadgeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className} aria-label="Graphs track" role="img">
      <rect width="52" height="52" rx="12" fill="#f3f0fe" />
      <circle cx="8" cy="10" r="6" fill="#7f77dd" />
      <circle cx="44" cy="10" r="6" fill="#7f77dd" />
      <circle cx="26" cy="42" r="6" fill="#534ab7" />
      <circle cx="8" cy="38" r="4" fill="#afa9ec" />
      <circle cx="44" cy="38" r="4" fill="#afa9ec" />
      <line x1="14" y1="10" x2="38" y2="10" stroke="#534ab7" strokeWidth="1.5" />
      <line x1="10" y1="15" x2="24" y2="37" stroke="#534ab7" strokeWidth="1.5" />
      <line x1="42" y1="15" x2="28" y2="37" stroke="#534ab7" strokeWidth="1.5" />
      <line x1="8" y1="16" x2="8" y2="34" stroke="#afa9ec" strokeWidth="1.5" />
      <line x1="44" y1="16" x2="44" y2="34" stroke="#afa9ec" strokeWidth="1.5" />
      <line x1="12" y1="40" x2="20" y2="42" stroke="#afa9ec" strokeWidth="1.5" />
      <line x1="40" y1="40" x2="32" y2="42" stroke="#afa9ec" strokeWidth="1.5" />
    </svg>
  )
}
