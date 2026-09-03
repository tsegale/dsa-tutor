interface EducatorAvatarProps {
  size?: number
  className?: string
}

export default function EducatorAvatar({ size = 52, className = '' }: EducatorAvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className} aria-label="Educator" role="img">
      <circle cx="26" cy="26" r="26" fill="#854f0b" />
      <rect x="12" y="22" width="28" height="3" rx="1.5" fill="#faeeda" />
      <polygon points="26,14 10,22 42,22" fill="#fac775" />
      <rect x="20" y="25" width="12" height="10" rx="2" fill="#faeeda" />
      <rect x="34" y="28" width="3" height="12" rx="1.5" fill="#fac775" />
      <ellipse cx="35.5" cy="41" rx="4" ry="2" fill="#fac775" />
    </svg>
  )
}
