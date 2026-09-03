interface SortingBadgeProps {
  size?: number
  className?: string
}

export default function SortingBadge({ size = 52, className = '' }: SortingBadgeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className} aria-label="Sorting track" role="img">
      <rect width="52" height="52" rx="12" fill="#eef2ff" />
      <rect x="8" y="30" width="8" height="14" rx="2" fill="#3730a3" />
      <rect x="20" y="22" width="8" height="22" rx="2" fill="#4f46e5" />
      <rect x="32" y="14" width="8" height="30" rx="2" fill="#818cf8" />
      <defs>
        <marker id="sort-arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M1 1L7 4L1 7" fill="none" stroke="#3730a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <path
        d="M14 18 L20 12 L26 15"
        stroke="#3730a3"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#sort-arr)"
      />
    </svg>
  )
}
