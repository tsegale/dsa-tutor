interface AITutorAvatarProps {
  size?: number
  className?: string
}

export default function AITutorAvatar({ size = 52, className = '' }: AITutorAvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className} aria-label="AI Tutor" role="img">
      <rect width="52" height="52" rx="14" fill="#1e1b4b" />
      <rect x="2" y="2" width="48" height="48" rx="12" fill="#1e1b4b" stroke="#4f46e5" strokeWidth="1.5" />
      <rect x="10" y="18" width="32" height="22" rx="8" fill="#312e81" />
      <circle cx="19" cy="29" r="4" fill="#22d3ee" />
      <circle cx="19" cy="29" r="2" fill="#0e7490" />
      <circle cx="33" cy="29" r="4" fill="#22d3ee" />
      <circle cx="33" cy="29" r="2" fill="#0e7490" />
      <path d="M22 35h8" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 10 Q26 6 30 10" stroke="#818cf8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <line x1="26" y1="10" x2="26" y2="18" stroke="#818cf8" strokeWidth="1.5" />
      <circle cx="44" cy="8" r="4" fill="#7c3aed" />
      <circle cx="44" cy="8" r="6" fill="none" stroke="#7c3aed" strokeWidth="1" opacity={0.5} />
    </svg>
  )
}
