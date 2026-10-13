import { useId } from 'react'
import type { LearningPreferences } from '@dsa-tutor/types'
import { usePreferencesStore } from '@/store/usePreferencesStore'
import { useSavePreferences } from '@/hooks/useSavePreferences'
import { cn } from '@/lib/utils'

// Learning preferences (Phase 6D). Each control says in one plain line what
// it changes, and saves as soon as it changes. A participant's learning
// settings are fixed for the study, so they see one line and nothing to set.

type Option<V> = { value: V; label: string }

function Choice<V extends string | number | boolean | null>({
  legend,
  help,
  value,
  options,
  onChange,
}: {
  legend: string
  help: string
  value: V
  options: Option<V>[]
  onChange: (value: V) => void
}) {
  const name = useId()
  const helpId = `${name}-help`
  return (
    <fieldset aria-describedby={helpId} className="flex flex-col gap-2 border-t border-rule py-4 first:border-t-0 first:pt-0">
      <legend className="float-left w-full text-small font-medium text-ink">{legend}</legend>
      <p id={helpId} className="clear-left text-small text-ink-2">
        {help}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = option.value === value
          return (
            <label
              key={String(option.value)}
              className={cn(
                'inline-flex h-8 cursor-pointer items-center rounded-sm border px-3 text-small transition-colors duration-quick has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                checked ? 'border-brand bg-brand-soft font-medium text-ink' : 'border-rule-strong text-ink-2 hover:border-ink-2 hover:text-ink'
              )}
            >
              <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(option.value)} />
              {option.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function PreferencesSection() {
  const saved = usePreferencesStore((state) => state.saved)
  const participant = usePreferencesStore((state) => state.participant)
  const save = useSavePreferences()
  const set =
    <K extends keyof LearningPreferences>(key: K) =>
    (value: LearningPreferences[K]) => {
      const patch: Partial<LearningPreferences> = {}
      patch[key] = value
      save.mutate(patch)
    }

  return (
    <section aria-labelledby="profile-preferences" className="rounded-md border border-rule bg-surface p-card">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="profile-preferences" className="text-h3 text-ink">
          Learning preferences
        </h2>
        {!participant && (
          <p role="status" className="text-micro text-ink-2">
            {save.isPending ? 'Saving' : save.isSuccess ? 'Saved' : ''}
          </p>
        )}
      </div>

      {participant ? (
        <p className="mt-3 text-small text-ink-2">Learning settings are fixed during the study so results stay comparable.</p>
      ) : (
        <div className="mt-4">
          {save.isError && (
            <p role="alert" className="mb-3 text-small text-error">
              That change was not saved. Check your connection and try again.
            </p>
          )}
          <Choice
            legend="Scaffolding intensity"
            help="How much help the tutor gives. Adaptive adjusts it to your answers, giving less as you improve; the other two keep it fixed."
            value={saved.scaffolding}
            options={[
              { value: 'ADAPTIVE', label: 'Adaptive' },
              { value: 'FULL', label: 'Always full support' },
              { value: 'MINIMAL', label: 'Minimal' },
            ]}
            onChange={set('scaffolding')}
          />
          <Choice
            legend="Proactive hint delay"
            help="At full support, how long the tutor waits before offering a hint you did not ask for."
            value={saved.hintDelaySeconds}
            options={[
              { value: 15, label: '15 seconds' },
              { value: 25, label: '25 seconds' },
              { value: 40, label: '40 seconds' },
              { value: null, label: 'Off' },
            ]}
            onChange={set('hintDelaySeconds')}
          />
          <Choice
            legend="Sound effects"
            help="Short sounds for right and wrong answers and for finishing a run."
            value={saved.sound}
            options={[
              { value: true, label: 'On' },
              { value: false, label: 'Off' },
            ]}
            onChange={set('sound')}
          />
          <Choice
            legend="Reduced motion"
            help="Fewer animations: steps change instantly instead of sliding."
            value={saved.reducedMotion}
            options={[
              { value: 'SYSTEM', label: 'Follow system' },
              { value: 'ALWAYS', label: 'Always reduce' },
            ]}
            onChange={set('reducedMotion')}
          />
          <Choice
            legend="Theme"
            help="Light or dark colours, or match the setting on your device."
            value={saved.theme}
            options={[
              { value: 'LIGHT', label: 'Light' },
              { value: 'DARK', label: 'Dark' },
              { value: 'SYSTEM', label: 'Follow system' },
            ]}
            onChange={set('theme')}
          />
        </div>
      )}
    </section>
  )
}
