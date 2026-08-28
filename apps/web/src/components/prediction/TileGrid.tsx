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
}

export default function TileGrid({ prompt, options, onSelect, selectedId, submissionState }: TileGridProps) {
  const columns = options.length === 4 ? 'grid-cols-2' : 'grid-cols-1'
  const locked = submissionState === 'correct'

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <p className="font-sans text-[15px] font-medium text-text-primary">{prompt}</p>
      <div className={cn('grid gap-2', columns)}>
        {options.map((option) => {
          const isSelected = option.id === selectedId
          return (
            <button
              key={option.id}
              type="button"
              disabled={locked}
              onClick={() => onSelect(option.id)}
              className={cn(
                'min-h-[72px] rounded-md border p-4 text-left transition-colors duration-100',
                isSelected
                  ? 'border-secondary bg-secondary-light text-text-primary'
                  : 'border-border bg-white text-text-primary',
              )}
            >
              <div className="text-sm font-medium">{option.label}</div>
              {option.description && (
                <div className="mt-0.5 text-xs text-text-secondary">{option.description}</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
