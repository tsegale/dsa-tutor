import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ValueInputProps {
  prompt: string
  onValueChange: (value: string) => void
  value: string
  submissionState: 'idle' | 'correct' | 'incorrect'
  onSubmit?: () => void
}

export default function ValueInput({
  prompt,
  onValueChange,
  value,
  submissionState,
  onSubmit,
}: ValueInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <p className="font-sans text-[15px] font-medium text-text-primary dark:text-dark-text-primary">{prompt}</p>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onSubmit?.()
            return
          }
          const allowed = /^[0-9-]$/
          if (
            event.key.length === 1 &&
            !allowed.test(event.key) &&
            !event.ctrlKey &&
            !event.metaKey
          ) {
            event.preventDefault()
          }
        }}
        className={cn(
          'w-full rounded-md border-2 px-3 py-2 text-center font-mono text-lg text-text-primary outline-none transition-colors duration-300 dark:text-dark-text-primary',
          submissionState === 'correct' && 'border-success',
          submissionState === 'incorrect' && 'border-error',
          submissionState === 'idle' && 'border-border focus:border-text-muted dark:focus:border-dark-text-secondary',
        )}
      />
    </div>
  )
}
