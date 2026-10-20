import { useEffect, useRef, useState } from 'react'
import { askTutor } from '@/api/ask'
import { askStateFrom, sendableHistory, type Exchange } from '@/utils/askPayload'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Button } from '@/components/ui/button'

/**
 * Demo mode's AI Tutor tab.
 *
 * Before this, Demo mode's AI Tutor tab was empty: every box in it needs a
 * prediction to have been answered, and Demo mode has no predictions. So a
 * student (or a panel member clicking around) opened the tab and found
 * nothing.
 *
 * This is a plain assistant, not a tutor in the Socratic sense. It answers
 * what it is asked. The questioning, the hint ladder and the mistake
 * analysis all belong to Practice mode, which renders its own content in
 * this same tab. Classic mode never renders this at all: it is the study's
 * control condition and has no AI surface.
 *
 * The opening state is three suggested questions rather than a bare text
 * box, because a blank prompt in a 280px panel tells a beginner nothing
 * about what the thing is for.
 */

const SUGGESTIONS = [
  'What is this algorithm doing?',
  'Why is this step necessary?',
  'Where would this be slow?',
] as const

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} opacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

export default function DemoAssistant() {
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const snapshot = useAlgorithmStore((state) => state.snapshotArray[state.stepIndex] ?? null)

  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // A new topic is a new conversation: carrying Bubble Sort's answers into
  // Dijkstra would be worse than starting over.
  useEffect(() => {
    setExchanges([])
    setDraft('')
  }, [algorithmName])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [exchanges])

  async function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed || pending) return

    // What was asked and answered BEFORE this turn; see utils/askPayload.
    const history = sendableHistory(exchanges)

    setDraft('')
    setPending(true)
    setExchanges((previous) => [...previous, { question: trimmed, answer: null }])

    try {
      const result = await askTutor({
        algorithmName,
        question: trimmed,
        stepIndex,
        currentState: askStateFrom(snapshot),
        conversation: history,
      })
      setExchanges((previous) =>
        previous.map((exchange, index) =>
          index === previous.length - 1
            ? { ...exchange, answer: result.answer, fallback: !result.aiGenerated }
            : exchange,
        ),
      )
    } catch {
      // A dropped connection and a 502 look the same from here, and the
      // difference does not change what the student can do about it.
      setExchanges((previous) =>
        previous.map((exchange, index) =>
          index === previous.length - 1
            ? { ...exchange, error: 'That did not get through. Check your connection and ask again.' }
            : exchange,
        ),
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
          Ask about this algorithm
        </h3>
        <p className="text-xs text-text-muted dark:text-dark-text-secondary">
          Demo mode. Ask anything and I will explain it. Switch to Practice when you want to be
          asked questions instead.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {exchanges.length === 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-micro text-text-muted dark:text-dark-text-secondary">Try one of these</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="rounded-md border border-border px-2.5 py-1.5 text-left text-xs text-text-primary transition-colors hover:bg-surface-sunk dark:text-dark-text-primary dark:hover:bg-dark-border"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          exchanges.map((exchange, index) => (
            <article key={`${index}-${exchange.question}`} className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-text-primary dark:text-dark-text-primary">
                {exchange.question}
              </p>
              {exchange.error ? (
                <div className="flex flex-col items-start gap-1.5">
                  <p className="text-xs text-error">{exchange.error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setExchanges((previous) => previous.slice(0, index))
                      send(exchange.question)
                    }}
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : exchange.answer === null ? (
                <p className="flex items-center gap-1.5 text-xs text-text-muted dark:text-dark-text-secondary">
                  <SpinnerIcon />
                  Thinking
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-text-secondary dark:text-dark-text-secondary">
                    {exchange.answer}
                  </p>
                  {exchange.fallback && (
                    <p className="text-micro text-text-muted dark:text-dark-text-secondary">
                      Written answer, not a tutor reply: the service could not be reached.
                    </p>
                  )}
                </div>
              )}
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex shrink-0 flex-col gap-2 border-t-[0.5px] border-border pt-2.5"
        onSubmit={(event) => {
          event.preventDefault()
          send(draft)
        }}
      >
        <label htmlFor="demo-assistant-question" className="sr-only">
          Ask a question about this algorithm
        </label>
        <input
          id="demo-assistant-question"
          type="text"
          value={draft}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask a question"
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text-primary outline-none focus:border-primary dark:text-dark-text-primary"
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={pending || draft.trim().length === 0}
          className="justify-center gap-1.5"
        >
          {pending ? <SpinnerIcon /> : <SendIcon />}
          {pending ? 'Asking' : 'Ask'}
        </Button>
      </form>
    </div>
  )
}
