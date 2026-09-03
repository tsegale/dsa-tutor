interface TreesBadgeProps {
  size?: number
  className?: string
}

export default function TreesBadge({ size = 52, className = '' }: TreesBadgeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className} aria-label="Trees track" role="img">
      <rect width="52" height="52" rx="12" fill="#e1f5ee" />
      <circle cx="26" cy="10" r="6" fill="#1d9e75" />
      <circle cx="14" cy="32" r="6" fill="#5dcaa5" />
      <circle cx="38" cy="32" r="6" fill="#5dcaa5" />
      <circle cx="8" cy="46" r="4" fill="#9fe1cb" />
      <circle cx="20" cy="46" r="4" fill="#9fe1cb" />
      <circle cx="32" cy="46" r="4" fill="#9fe1cb" />
      <circle cx="44" cy="46" r="4" fill="#9fe1cb" />
      <line x1="26" y1="16" x2="16" y2="26" stroke="#0f6e56" strokeWidth="1.5" />
      <line x1="26" y1="16" x2="36" y2="26" stroke="#0f6e56" strokeWidth="1.5" />
      <line x1="14" y1="38" x2="10" y2="42" stroke="#0f6e56" strokeWidth="1.5" />
      <line x1="14" y1="38" x2="18" y2="42" stroke="#0f6e56" strokeWidth="1.5" />
      <line x1="38" y1="38" x2="34" y2="42" stroke="#0f6e56" strokeWidth="1.5" />
      <line x1="38" y1="38" x2="42" y2="42" stroke="#0f6e56" strokeWidth="1.5" />
    </svg>
  )
}
