import { useId } from 'react'

interface DSATutorLogoProps {
  variant?: 'dark' | 'white'
  className?: string
  showTagline?: boolean
}

export default function DSATutorLogo({ variant = 'dark', className = '', showTagline = true }: DSATutorLogoProps) {
  const titleId = useId()
  const textColor = variant === 'white' ? '#fff' : '#1e293b'
  const accentColor = variant === 'white' ? '#a5b4fc' : '#3730a3'
  const taglineColor = variant === 'white' ? 'rgba(255,255,255,0.5)' : '#94a3b8'
  const iconBg = variant === 'white' ? 'rgba(255,255,255,0.2)' : '#3730a3'
  const iconStroke = variant === 'white' ? 'rgba(255,255,255,0.3)' : 'transparent'
  const nodeMain = variant === 'white' ? 'rgba(255,255,255,0.9)' : '#818cf8'
  const nodeSub = variant === 'white' ? 'rgba(255,255,255,0.7)' : '#a5b4fc'
  const edgeColor = variant === 'white' ? 'rgba(255,255,255,0.5)' : '#c7d2fe'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" role="img" aria-labelledby={titleId}>
        <title id={titleId}>DSA Tutor - AI Scaffolding Engine</title>
        <rect width="40" height="40" rx="10" fill={iconBg} stroke={iconStroke} strokeWidth="1" />
        <circle cx="8" cy="20" r="3.5" fill={nodeMain} />
        <circle cx="20" cy="10" r="3.5" fill={nodeSub} />
        <circle cx="20" cy="30" r="3.5" fill={nodeSub} />
        <circle cx="32" cy="20" r="3.5" fill={nodeMain} />
        <line x1="11" y1="18" x2="17" y2="13" stroke={edgeColor} strokeWidth="1.5" />
        <line x1="11" y1="22" x2="17" y2="27" stroke={edgeColor} strokeWidth="1.5" />
        <line x1="23" y1="11" x2="29" y2="18" stroke={edgeColor} strokeWidth="1.5" />
        <line x1="23" y1="29" x2="29" y2="22" stroke={edgeColor} strokeWidth="1.5" />
        <circle cx="35" cy="6" r="3" fill="#7c3aed" />
        <circle cx="35" cy="6" r="5" fill="none" stroke="#7c3aed" strokeWidth="1" opacity={0.4} />
      </svg>
      <div className="flex flex-col">
        <span style={{ fontSize: 18, fontWeight: 700, color: textColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
          DSA<span style={{ color: accentColor }}>Tutor</span>
        </span>
        {showTagline && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: taglineColor,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            AI Scaffolding Engine
          </span>
        )}
      </div>
    </div>
  )
}
