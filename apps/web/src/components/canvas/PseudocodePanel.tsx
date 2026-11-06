import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { cn } from '@/lib/utils'
import { getCodeView, type ReferenceLanguage } from '@/utils/referenceCode'

const LANG_STORAGE_KEY = 'dsa-tutor-reference-lang'

const LANGUAGES: ReadonlyArray<{ id: ReferenceLanguage; label: string }> = [
  { id: 'pseudocode', label: 'Pseudocode' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
]

function readStoredLanguage(): ReferenceLanguage {
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY)
    if (raw === 'pseudocode' || raw === 'python' || raw === 'java' || raw === 'cpp') return raw
  } catch {
    // Ignore blocked storage
  }
  return 'pseudocode'
}

function renderHighlightedLine(line: string, hoveredVar: string | null): ReactNode {
  if (!hoveredVar || !/^[A-Za-z_]\w*$/.test(hoveredVar)) return line
  const regex = new RegExp(`(\\b${hoveredVar}\\b)`, 'g')
  const parts = line.split(regex)
  if (parts.length <= 1) return line
  return parts.map((part, idx) =>
    part === hoveredVar ? (
      <mark
        key={idx}
        className="rounded bg-[color-mix(in_srgb,var(--state-current)_18%,transparent)] px-0.5 font-semibold text-state-current"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export default function PseudocodePanel() {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const hoveredVar = useAlgorithmStore((state) => state.hoveredVar)
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const [lang, setLang] = useState<ReferenceLanguage>(readStoredLanguage)
  const [copied, setCopied] = useState(false)

  function handleSelectLanguage(next: ReferenceLanguage) {
    setLang(next)
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next)
    } catch {
      // Ignore blocked storage
    }
  }

  const codeView = getCodeView(algorithmSlug, lang) ?? getCodeView(algorithmSlug, 'pseudocode')

  if (!codeView) {
    return (
      <div
        className="flex h-full flex-col overflow-x-hidden rounded-md border border-border bg-card"
        style={{ width: '100%' }}
      >
        <div className="border-b border-border px-4 py-2">
          <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Reference Code</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-center">
          <span className="text-sm text-text-muted dark:text-dark-text-secondary">
            No reference code available for this algorithm yet.
          </span>
        </div>
      </div>
    )
  }

  const activeLine = codeView.activeLineFor(snapshot?.pseudocodeLine)

  function handleCopy() {
    if (!codeView) return
    void navigator.clipboard?.writeText(codeView.lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div
      className="flex h-full flex-col overflow-x-hidden rounded-md border border-border bg-card"
      style={{ width: '100%' }}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Reference Code</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-text-muted transition-colors hover:bg-surface-sunk hover:text-text-primary dark:border-dark-border dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Reference implementation language"
        className="flex items-center gap-1 border-b border-border bg-surface-sunk/50 px-2 py-1 text-[11px] dark:border-dark-border"
      >
        {LANGUAGES.map((option) => {
          const selected = lang === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => handleSelectLanguage(option.id)}
              className={cn(
                'rounded px-2 py-0.5 font-medium transition-colors',
                selected
                  ? 'bg-card font-semibold text-text-primary shadow-sm ring-1 ring-state-current/60 dark:border-dark-border dark:text-dark-text-primary'
                  : 'text-text-muted hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-2 font-mono">
        {codeView.lines.map((line, index) => {
          const isActive = index === activeLine
          return (
            <div key={index} className="relative flex py-1" style={{ lineHeight: 1.7, width: 'max-content', minWidth: '100%' }}>
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 border-l-[3px] border-state-current bg-[color-mix(in_srgb,var(--state-current)_10%,transparent)]"
                  />
                )}
              </AnimatePresence>
              <span className="relative w-6 shrink-0 pl-1.5 text-right text-[10px] text-text-muted select-none">
                {index + 1}
              </span>
              <span
                className={cn(
                  'relative min-w-0 flex-1 pl-2.5 text-[11px]',
                  isActive
                    ? 'font-medium text-text-primary dark:text-dark-text-primary'
                    : 'font-normal text-text-primary dark:text-dark-text-primary',
                )}
                style={{ whiteSpace: 'pre', overflow: 'visible' }}
              >
                {renderHighlightedLine(line, hoveredVar)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
