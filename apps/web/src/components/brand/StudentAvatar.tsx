interface StudentAvatarProps {
  initials?: string
  size?: number
  className?: string
}

export default function StudentAvatar({ initials, size = 52, className = '' }: StudentAvatarProps) {
  if (initials) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#1d9e75',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.3,
          fontWeight: 500,
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className} aria-label="Student" role="img">
      <circle cx="26" cy="26" r="26" fill="#1d9e75" />
      <circle cx="26" cy="20" r="9" fill="#9fe1cb" />
      <ellipse cx="26" cy="42" rx="14" ry="10" fill="#9fe1cb" />
      <circle cx="26" cy="20" r="6" fill="#085041" />
      <path d="M22 19 Q26 23 30 19" stroke="#9fe1cb" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}
