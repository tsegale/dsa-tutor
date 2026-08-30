import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import BadgeIcon from '@/components/ui/BadgeIcon'
import { BADGE_DEFINITIONS, type BadgeTier } from '@/data/badges'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

interface BadgeAwardModalProps {
  badgeId: string | null
  onClose: () => void
}

const TIER_COLORS: Record<BadgeTier, { border: string; bg: string; icon: string; label: string }> = {
  bronze: { border: '#CD7F32', bg: '#FDF0E6', icon: '#CD7F32', label: 'Bronze' },
  silver: { border: '#A8A9AD', bg: '#F4F4F5', icon: '#71717A', label: 'Silver' },
  gold: { border: '#D4AF37', bg: '#FEF9E7', icon: '#B8860B', label: 'Gold' },
  platinum: { border: '#8E9AAF', bg: '#F0F3F8', icon: '#5B6B87', label: 'Platinum' },
}

const CONFETTI_COLORS = ['#4F46E5', '#F59E0B', '#16A34A', '#DC2626', '#7C3AED']
const CONFETTI_COUNT = 40

interface ConfettiPiece {
  id: number
  x: number
  delay: number
  color: string
  rotation: number
  size: number
}

function useConfettiPieces(active: boolean): ConfettiPiece[] {
  return useMemo(() => {
    if (!active) return []
    return Array.from({ length: CONFETTI_COUNT }, (_, id) => ({
      id,
      x: Math.random() * 100,
      delay: Math.random() * 0.4,
      color: CONFETTI_COLORS[id % CONFETTI_COLORS.length],
      rotation: Math.random() * 360,
      size: 6 + Math.random() * 6,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}

function Confetti({ active }: { active: boolean }) {
  const pieces = useConfettiPieces(active)
  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ top: '-10%', left: `${piece.x}%`, opacity: 1, rotate: 0 }}
          animate={{ top: '110%', opacity: [1, 1, 0], rotate: piece.rotation }}
          transition={{ duration: 2.5, delay: piece.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
          }}
        />
      ))}
    </div>
  )
}

export default function BadgeAwardModal({ badgeId, onClose }: BadgeAwardModalProps) {
  const { play } = useSoundEffects()
  const prefersReducedMotion = useReducedMotion()
  const badge = badgeId ? (BADGE_DEFINITIONS.find((b) => b.id === badgeId) ?? null) : null
  const tierColors = badge ? TIER_COLORS[badge.tier] : null

  useEffect(() => {
    if (badge) play('badge')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badge])

  return (
    <Dialog open={badge !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="overflow-hidden sm:max-w-sm"
      >
        {badge && tierColors && (
          <>
            <Confetti active={badge !== null && !prefersReducedMotion} />

            <div className="relative flex flex-col items-center gap-4 py-4 text-center">
              <span className="text-[11px] font-semibold tracking-wide text-secondary uppercase">
                Badge earned
              </span>

              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={
                  prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 16 }
                }
                className="flex size-20 items-center justify-center rounded-full border-4"
                style={{ borderColor: tierColors.border, backgroundColor: tierColors.bg }}
              >
                <span style={{ color: tierColors.icon }}>
                  <BadgeIcon icon={badge.icon} size={36} />
                </span>
              </motion.div>

              <div
                className="rounded-full px-3 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: tierColors.bg, color: tierColors.icon }}
              >
                {tierColors.label}
              </div>

              <DialogTitle className="text-xl">{badge.title}</DialogTitle>
              <DialogDescription>{badge.description}</DialogDescription>

              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'mt-2 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-white',
                  'hover:bg-primary-hover',
                )}
              >
                Nice!
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
