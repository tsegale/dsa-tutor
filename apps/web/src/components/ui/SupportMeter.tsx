import { cn } from '@/lib/utils'

/**
 * The four-segment support meter (Phase 4C), shared by the header chip and
 * the profile. --ink-2 on --rule-strong, deliberately neither brand (brand
 * means interactive) nor a canvas state colour (those mean algorithm state).
 */
export function SupportMeter({ filled, className }: { filled: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex items-end gap-0.5', className)}>
      {[0, 1, 2, 3].map((index) => (
        <span key={index} className={cn('h-3 w-1 rounded-[1px]', index < filled ? 'bg-ink-2' : 'bg-rule-strong')} />
      ))}
    </span>
  )
}
