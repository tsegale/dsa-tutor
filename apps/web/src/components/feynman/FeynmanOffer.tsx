import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Feynman mode's offer when a Practice run reaches its final step (Phase
 * 8A): inline where the predictions appear, never a modal, so finishing a
 * run never costs unplanned time. Amber, because the system is asking
 * something. Past the session's share of the budget it drops the emphasis
 * (a plain rule, a secondary button) but is still offered. Later only hides
 * it: Feynman mode stays open from the left panel.
 */
export function FeynmanOffer({ emphasis, onOpen, onLater }: { emphasis: boolean; onOpen: () => void; onLater: () => void }) {
  return (
    <section
      aria-label="Explain it back"
      className={cn(
        'relative z-20 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-t-2 bg-card px-[14px] py-3',
        emphasis ? 'border-t-secondary' : 'border-t-rule',
      )}
    >
      <p className="min-w-0 flex-1 text-body text-ink">You traced the full execution. Now explain it in your own words.</p>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={onLater}>
          Later
        </Button>
        <Button variant={emphasis ? 'primary' : 'secondary'} size="sm" onClick={onOpen}>
          Open Feynman mode
        </Button>
      </div>
    </section>
  )
}
