interface EmptyStateIllustrationProps {
  size?: number
  className?: string
}

export default function EmptyStateIllustration({ size = 80, className = '' }: EmptyStateIllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      aria-label="Empty state, start your first session"
      role="img"
    >
      <circle cx="40" cy="40" r="36" fill="#eef2ff" stroke="#c7d2fe" strokeWidth="1" />
      <rect x="22" y="55" width="10" height="18" rx="2" fill="#3730a3" opacity={0.9} />
      <rect x="35" y="42" width="10" height="31" rx="2" fill="#4f46e5" />
      <rect x="48" y="32" width="10" height="41" rx="2" fill="#6366f1" />
      <circle cx="40" cy="22" r="6" fill="#818cf8" />
      <path d="M34 24 Q40 16 46 24" stroke="#a5b4fc" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="56" cy="16" r="4" fill="#7c3aed" />
      <path d="M54 14 L58 18 M58 14 L54 18" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
