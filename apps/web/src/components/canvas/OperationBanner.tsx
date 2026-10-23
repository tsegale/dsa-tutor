import type { OperationLabel } from '@/utils/operationLabel'

/**
 * What the run is doing, stated on the canvas itself.
 *
 * Every structure canvas showed the structure and its counters and never
 * named the operation or what made that structure different from the one
 * before it. One component so the five canvases cannot drift into five
 * different treatments of the same two lines.
 *
 * Rendered inside each canvas's own header column, in normal flow, rather
 * than positioned at an offset: the first attempt was absolutely placed
 * and landed on the tallest bar's value label.
 */
export default function OperationBanner({ label }: { label: OperationLabel | null }) {
  if (!label) return null
  return (
    <div className="max-w-[72%]">
      <p className="text-small font-semibold text-ink">{label.headline}</p>
      <p className="text-micro text-ink-2">{label.detail}</p>
    </div>
  )
}
