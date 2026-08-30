import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const SOUND_KEY = 'dsa-tutor-sound-enabled'

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(SOUND_KEY) === 'true')

  function toggle() {
    const next = !enabled
    localStorage.setItem(SOUND_KEY, String(next))
    setEnabled(next)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          className="rounded-md p-2 transition-colors hover:bg-surface dark:hover:bg-dark-border"
          aria-label={enabled ? 'Mute sounds' : 'Enable sounds'}
        >
          {enabled ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-muted dark:text-dark-text-secondary"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{enabled ? 'Sound on — click to mute' : 'Sound off — click to enable'}</TooltipContent>
    </Tooltip>
  )
}
