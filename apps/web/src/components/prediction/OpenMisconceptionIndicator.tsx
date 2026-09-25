import { getStudentLanguageLabel } from '@/utils/misconceptionProbes'

interface OpenMisconceptionIndicatorProps {
  category: string
}

// Non-blocking - never covers the canvas or interrupts a prediction, just
// names the concept in plain language (never the internal category
// string) so the student knows the platform is still checking on it.
export default function OpenMisconceptionIndicator({ category }: OpenMisconceptionIndicatorProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full border border-secondary/40 bg-popover px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm">
      <span className="size-1.5 shrink-0 rounded-full bg-secondary" />
      working on: {getStudentLanguageLabel(category)}
    </div>
  )
}
