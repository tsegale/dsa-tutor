import type { BadgeIconType } from '@/data/badges'

interface BadgeIconProps {
  icon: BadgeIconType
  size?: number
  className?: string
}

function FootstepsIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <ellipse cx="8" cy="6" rx="2.5" ry="3.5" transform="rotate(-15 8 6)" />
      <ellipse cx="16" cy="13" rx="2.5" ry="3.5" transform="rotate(15 16 13)" />
      <ellipse cx="7" cy="16" rx="2" ry="3" transform="rotate(-10 7 16)" />
      <ellipse cx="17" cy="21" rx="2" ry="2.5" transform="rotate(10 17 21)" />
    </svg>
  )
}

function BarsIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="3" y="14" width="4" height="7" rx="1" />
      <rect x="10" y="9" width="4" height="12" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

function NodeIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      <line x1="6" y1="6" x2="12" y2="12" strokeLinecap="round" />
      <line x1="18" y1="6" x2="12" y2="12" strokeLinecap="round" />
      <line x1="6" y1="18" x2="12" y2="12" strokeLinecap="round" />
      <circle cx="6" cy="6" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="6" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="6" cy="18" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LightbulbOffIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      <path d="M9 18h6" strokeLinecap="round" />
      <path d="M10 21h4" strokeLinecap="round" />
      <path d="M8.5 14.5A5.5 5.5 0 0 1 6.5 9a5.5 5.5 0 0 1 11 0c0 1.6-.6 2.7-1.6 3.8" strokeLinecap="round" />
      <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" />
    </svg>
  )
}

function FlameIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2c1 3-2 4.5-2 7.5A4.5 4.5 0 0 0 12 14a2.5 2.5 0 0 0 2.5-2.5c0-.9-.4-1.4-.8-1.9 2.3 1.2 3.8 3.6 3.8 6.4a5.5 5.5 0 0 1-11 0C6.5 12 8 9.5 8 7c0-2 1.5-3.8 4-5Z" />
    </svg>
  )
}

function TrophyIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 5H5a2 2 0 0 0 0 4h3M16 5h3a2 2 0 0 1 0 4h-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14v3M9 21h6M9.5 17.5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ICON_COMPONENTS: Record<BadgeIconType, typeof FootstepsIcon> = {
  footsteps: FootstepsIcon,
  bars: BarsIcon,
  node: NodeIcon,
  'lightbulb-off': LightbulbOffIcon,
  flame: FlameIcon,
  trophy: TrophyIcon,
}

export default function BadgeIcon({ icon, size = 24, className }: BadgeIconProps) {
  const IconComponent = ICON_COMPONENTS[icon]
  return <IconComponent size={size} className={className} />
}
