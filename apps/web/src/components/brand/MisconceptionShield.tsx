interface MisconceptionShieldProps {
  count?: number
  size?: number
  className?: string
}

export default function MisconceptionShield({ count = 0, size = 52, className = '' }: MisconceptionShieldProps) {
  return (
    <div className={`relative inline-flex ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        aria-label={`${count} misconception${count !== 1 ? 's' : ''}`}
        role="img"
      >
        <rect width="52" height="52" rx="12" fill="#fcebeb" />
        <path d="M26 6 L8 16 L8 32 Q8 42 26 48 Q44 42 44 32 L44 16 Z" fill="#fef2f2" stroke="#e24b4a" strokeWidth="1.5" />
        <rect x="23" y="18" width="6" height="14" rx="3" fill="#e24b4a" />
        <circle cx="26" cy="37" r="3" fill="#e24b4a" />
      </svg>
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            background: '#e24b4a',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid white',
          }}
        >
          {count}
        </span>
      )}
    </div>
  )
}
