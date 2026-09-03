interface AuthIllustrationProps {
  className?: string
}

export default function AuthIllustration({ className = '' }: AuthIllustrationProps) {
  return (
    <svg
      width="100%"
      viewBox="0 0 320 100"
      fill="none"
      className={className}
      aria-label="Array bars with cursor interaction illustration"
      role="img"
    >
      <rect x="20" y="70" width="20" height="25" rx="3" fill="#4f46e5" opacity={0.9} />
      <rect x="48" y="50" width="20" height="45" rx="3" fill="#6366f1" opacity={0.85} />
      <rect x="76" y="30" width="20" height="65" rx="3" fill="#818cf8" />
      <rect x="104" y="55" width="20" height="40" rx="3" fill="#6366f1" opacity={0.7} />
      <rect x="132" y="40" width="20" height="55" rx="3" fill="#4f46e5" opacity={0.6} />
      <rect x="76" y="26" width="20" height="8" rx="2" fill="#22d3ee" />
      <circle cx="86" cy="22" r="5" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
      <polygon points="96,30 106,25 101,35" fill="#22d3ee" />
      <text x="160" y="35" fontFamily="system-ui" fontSize={14} fontWeight={700} fill="#3730a3">
        Active state
      </text>
      <text x="160" y="52" fontFamily="system-ui" fontSize={11} fill="#6366f1">
        Drag. Swap. Execute.
      </text>
      <text x="160" y="68" fontFamily="system-ui" fontSize={11} fill="#6366f1">
        Predict the next step
      </text>
      <text x="160" y="84" fontFamily="system-ui" fontSize={11} fill="#6366f1">
        before it runs.
      </text>
    </svg>
  )
}
