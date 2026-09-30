// Below 768px the workspace and dashboards cannot lay out legibly, so they
// say so plainly instead of rendering a squeezed, cut-off page (4B.6).
export default function LargerScreenNotice({ reason }: { reason: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <span className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">DSA Tutor needs a larger screen</span>
      <p className="max-w-xs text-sm text-text-muted dark:text-dark-text-secondary">
        {reason} Please switch to a tablet, laptop, or desktop to continue.
      </p>
    </div>
  )
}
