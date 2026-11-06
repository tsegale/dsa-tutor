import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRaterQueue, submitBlindRating } from '@/api/research'
import { cn } from '@/lib/utils'

function formatCategory(key: string): string {
  return key
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function BlindRaterQueue() {
  const queryClient = useQueryClient()
  const [includePilot, setIncludePilot] = useState(true)
  const [raterCode, setRaterCode] = useState('R1')
  const [onlyUnrated, setOnlyUnrated] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedLabel, setSelectedLabel] = useState<string>('')
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({})

  const { data, isLoading, isError } = useQuery({
    queryKey: ['research', 'rater-queue', includePilot],
    queryFn: () => getRaterQueue(includePilot),
  })

  const items = data?.items ?? []
  const taxonomy = data?.taxonomy ?? []
  const agreement = data?.agreement

  const filteredItems = onlyUnrated
    ? items.filter((item) => !item.ratings[raterCode])
    : items

  const clampedIndex = filteredItems.length > 0 ? Math.min(activeIndex, filteredItems.length - 1) : 0
  const currentItem = filteredItems[clampedIndex] ?? null
  const existingRatingForRater = currentItem?.ratings[raterCode] ?? null
  const isRevealed = Boolean(
    currentItem && (existingRatingForRater || revealedIds[currentItem.interactionId]),
  )

  const submitMutation = useMutation({
    mutationFn: async ({
      interactionId,
      code,
      label,
    }: {
      interactionId: string
      code: string
      label: string
    }) => submitBlindRating(interactionId, code, label),
    onSuccess: (_res, variables) => {
      setRevealedIds((prev) => ({ ...prev, [variables.interactionId]: true }))
      void queryClient.invalidateQueries({ queryKey: ['research', 'rater-queue'] })
    },
  })

  function handleSelectItem(nextIdx: number) {
    setActiveIndex(nextIdx)
    const nextItem = filteredItems[nextIdx]
    setSelectedLabel(nextItem?.ratings[raterCode] ?? '')
  }

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-md border border-border bg-card" />
  }

  if (isError || !data) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm text-text-muted">
        Unable to load the blind rater queue right now.
      </div>
    )
  }

  const ratedByCurrentRater = items.filter((it) => Boolean(it.ratings[raterCode])).length

  return (
    <div id="blind-rater-queue" className="space-y-4">
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-base font-bold text-text-primary">
              In-App Blind Human Rater Queue &amp; Cohen&apos;s Kappa Workbench
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Rate sampled incorrect student predictions while blinded to AI and rule labels to compute unbiased inter-rater reliability (Cohen&apos;s kappa).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span>Rater ID:</span>
              <select
                aria-label="Select rater code"
                value={raterCode}
                onChange={(e) => {
                  const nextRater = e.target.value
                  setRaterCode(nextRater)
                  setSelectedLabel(currentItem?.ratings[nextRater] ?? '')
                }}
                className="rounded border border-border bg-surface-sunk px-2 py-1 font-mono text-xs font-semibold text-text-primary outline-none"
              >
                <option value="R1">R1 (Primary Rater)</option>
                <option value="R2">R2 (Secondary Rater)</option>
                <option value="R3">R3 (Adjudicator)</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5 rounded border border-border bg-surface-sunk px-2.5 py-1 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={includePilot}
                onChange={(e) => setIncludePilot(e.target.checked)}
                className="size-3.5 rounded border-border"
              />
              Include pilot/class data
            </label>

            <button
              type="button"
              onClick={() => downloadMarkdown(data.markdown, 'cohens-kappa-agreement-report.md')}
              className="rounded border border-border bg-surface-sunk px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-card"
            >
              Download Kappa Report (.md)
            </button>
          </div>
        </div>

        {/* Live Agreement Summary */}
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Live Agreement Matrix ({agreement?.itemCount ?? 0} rated interactions across{' '}
              {agreement?.raters.length ? agreement.raters.join(', ') : 'no raters yet'})
            </span>
            <span className="font-mono text-xs text-text-secondary">
              {raterCode} Progress: {ratedByCurrentRater} / {items.length} rated
            </span>
          </div>

          {agreement && agreement.comparisons.length > 0 ? (
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-surface-sunk text-text-muted">
                  <tr>
                    <th className="px-3 py-2">Comparison</th>
                    <th className="px-3 py-2">Sample (n)</th>
                    <th className="px-3 py-2">Observed Agreement (Po)</th>
                    <th className="px-3 py-2">Chance Agreement (Pe)</th>
                    <th className="px-3 py-2">Cohen&apos;s Kappa</th>
                  </tr>
                </thead>
                <tbody>
                  {agreement.comparisons.map((comp) => {
                    const kVal = comp.kappa.kappa
                    return (
                      <tr key={comp.name} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-mono font-medium text-text-primary">{comp.name}</td>
                        <td className="px-3 py-2 font-mono">{comp.kappa.n}</td>
                        <td className="px-3 py-2 font-mono">
                          {(comp.kappa.observedAgreement * 100).toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 font-mono text-text-muted">
                          {(comp.kappa.expectedAgreement * 100).toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold">
                          {kVal === null ? (
                            <span className="text-text-muted">n/a (single category)</span>
                          ) : (
                            <span className={cn(kVal >= 0.6 ? 'text-success' : 'text-secondary')}>
                              {kVal.toFixed(3)}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded border border-dashed border-border bg-surface-sunk px-4 py-3 text-xs text-text-muted">
              No human ratings recorded yet. Submit a blind rating below to compute live Cohen&apos;s kappa against AI and rule-based misconception detectors.
            </div>
          )}
        </div>

        {/* Blind Rater Queue Card */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary">
                Queue Item {filteredItems.length > 0 ? clampedIndex + 1 : 0} of {filteredItems.length}
              </span>
              <label className="flex items-center gap-1.5 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={onlyUnrated}
                  onChange={(e) => {
                    setOnlyUnrated(e.target.checked)
                    setActiveIndex(0)
                  }}
                  className="size-3.5 rounded border-border"
                />
                Show only unrated by {raterCode}
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={clampedIndex <= 0}
                onClick={() => handleSelectItem(Math.max(0, clampedIndex - 1))}
                className="rounded border border-border px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-surface-sunk disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={clampedIndex >= filteredItems.length - 1}
                onClick={() => handleSelectItem(Math.min(filteredItems.length - 1, clampedIndex + 1))}
                className="rounded border border-border px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-surface-sunk disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

          {!currentItem ? (
            <div className="rounded border border-border bg-surface-sunk p-6 text-center text-xs text-text-muted">
              No incorrect interactions match the current queue filter.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2.5 rounded-md border border-border bg-surface-sunk p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded bg-card px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    {currentItem.algorithm} - Step {currentItem.stepIndex}
                  </span>
                  <span className="font-mono text-[11px] text-text-muted">
                    Participant: {currentItem.participantCode} | {currentItem.junctionType} ({currentItem.junctionDifficulty})
                  </span>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Student Incorrect Prediction
                  </p>
                  <p className="mt-0.5 rounded border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-text-primary">
                    {currentItem.studentAnswer}
                  </p>
                </div>

                {currentItem.serialisedState && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      Data Structure Snapshot at Submission
                    </p>
                    <pre className="mt-0.5 max-h-28 overflow-auto rounded border border-border bg-card p-2 font-mono text-[11px] text-text-secondary">
                      {currentItem.serialisedState.slice(0, 500)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between space-y-3 rounded-md border border-border bg-surface-sunk p-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="blind-rater-taxonomy-select"
                      className="text-xs font-semibold text-text-primary"
                    >
                      Assign Misconception Label ({raterCode})
                    </label>
                    {existingRatingForRater && (
                      <span className="rounded-full bg-card px-2 py-0.5 font-mono text-[11px] text-success">
                        Saved: {existingRatingForRater}
                      </span>
                    )}
                  </div>

                  <select
                    id="blind-rater-taxonomy-select"
                    value={selectedLabel || existingRatingForRater || ''}
                    onChange={(e) => setSelectedLabel(e.target.value)}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-xs text-text-primary outline-none"
                  >
                    <option value="">-- Select taxonomy category --</option>
                    {taxonomy.map((label) => (
                      <option key={label} value={label}>
                        {label} ({formatCategory(label)})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={
                        submitMutation.isPending || !(selectedLabel || existingRatingForRater)
                      }
                      onClick={() => {
                        const chosen = selectedLabel || existingRatingForRater
                        if (!chosen) return
                        submitMutation.mutate({
                          interactionId: currentItem.interactionId,
                          code: raterCode,
                          label: chosen,
                        })
                      }}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitMutation.isPending ? 'Saving Rating...' : 'Submit Blind Rating'}
                    </button>

                    {isRevealed && clampedIndex < filteredItems.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleSelectItem(clampedIndex + 1)}
                        className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-sunk"
                      >
                        Next Item
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded border border-border bg-card p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Detector Labels (Blinded Until Rated)
                  </p>
                  {isRevealed ? (
                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-text-muted">Rule Label: </span>
                        <span className="font-mono font-semibold text-text-primary">
                          {currentItem.ruleLabel ?? 'NONE'}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">AI Label: </span>
                        <span className="font-mono font-semibold text-text-primary">
                          {currentItem.aiLabel ?? 'NONE'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs italic text-text-muted">
                      Hidden while rating is in progress to prevent anchoring bias.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
