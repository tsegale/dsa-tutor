import { cn } from '@/lib/utils'

export interface TileOption {
  id: string
  label: string
  description?: string
}

interface TileGridProps {
  prompt: string
  options: TileOption[]
  onSelect: (optionId: string) => void
  selectedId: string | null
  submissionState: 'idle' | 'correct' | 'incorrect'
  /** HIGH scaffolding only: lightly primes attention toward this option without revealing it as "correct". */
  primedOptionId?: string | null
}

export default function TileGrid({
  prompt,
  options,
  onSelect,
  selectedId,
  submissionState,
  primedOptionId,
}: TileGridProps) {
  const columns = options.length === 4 ? 'grid-cols-2' : 'grid-cols-1'
  const locked = submissionState === 'correct'

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <p className="font-sans text-[15px] font-medium text-text-primary dark:text-dark-text-primary">{prompt}</p>
      <div className={cn('grid gap-2', columns)}>
        {options.map((option) => {
          const isSelected = option.id === selectedId
          const isPrimed = !isSelected && option.id === primedOptionId
          return (
            <button
              key={option.id}
              type="button"
              disabled={locked}
              onClick={() => onSelect(option.id)}
              className={cn(
                'min-h-[72px] rounded-md border p-4 text-left transition-colors duration-300',
                isSelected
                  ? 'border-secondary bg-secondary-light text-text-primary dark:bg-secondary/20 dark:text-dark-text-primary'
                  : isPrimed
                    ? 'border-border bg-secondary-light/40 text-text-primary dark:bg-secondary/10 dark:text-dark-text-primary'
                    : 'border-border bg-white text-text-primary dark:bg-dark-background dark:text-dark-text-primary',
              )}
            >
              <div className="text-sm font-medium">{option.label}</div>
              {option.description && (
                <div className="mt-0.5 text-xs text-text-secondary dark:text-dark-text-secondary">
                  {option.description}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
