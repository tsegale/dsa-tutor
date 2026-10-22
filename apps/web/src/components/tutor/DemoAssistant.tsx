import { useEffect, useRef, useState } from 'react'
import { askTutor } from '@/api/ask'
import { askStateFrom, sendableHistory, type Exchange } from '@/utils/askPayload'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { AITutorAvatar } from '@/components/brand'

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
 *
 * It reads as a conversation: the question in the learner's own bubble,
 * the answer in the tutor's, at --text-body rather than the 12px it used
 * to be. The two used to be undifferentiated paragraphs one above the
 * other, so a wall of prose arrived with nothing saying who was speaking -
 * and the answer, which is the whole reason the tab exists, was set in the
 * smallest size in the system.
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

/** The tutor's side of the conversation: one shape for the answer, the
 *  waiting state and the error, so nothing jumps as a reply arrives. */
function TutorBubble({ children, tone = 'ai' }: { children: React.ReactNode; tone?: 'ai' | 'error' }) {
  return (
    <div className="flex items-start gap-2">
      <AITutorAvatar size={26} className="mt-0.5 shrink-0 rounded-md" />
      <div
        className={
          tone === 'error'
            ? 'min-w-0 flex-1 rounded-md rounded-tl-sm border-l-4 border-error bg-error-light px-3 py-2'
            : 'min-w-0 flex-1 rounded-md rounded-tl-sm border-l-4 border-ai bg-ai-light px-3 py-2'
        }
      >
        {children}
      </div>
    </div>
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
      <div className="flex shrink-0 items-start gap-2.5 rounded-md border border-rule bg-surface-sunk p-2.5">
        <AITutorAvatar size={30} className="shrink-0 rounded-md" />
        <div className="min-w-0">
          <h3 className="text-small font-semibold text-ink">Ask about this algorithm</h3>
          <p className="mt-0.5 text-micro text-ink-2">
            Demo mode: ask anything and I will explain it. Practice mode asks you the questions instead.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {exchanges.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-micro font-bold tracking-wide text-ink-2 uppercase">Try one of these</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="group flex items-center justify-between gap-2 rounded-md border border-rule bg-surface px-3 py-2 text-left text-small text-ink transition-colors duration-quick hover:border-ai hover:bg-ai-light"
              >
                <span className="min-w-0">{suggestion}</span>
                <span className="shrink-0 text-ink-2 transition-colors group-hover:text-ai">
                  <SendIcon />
                </span>
              </button>
            ))}
          </div>
        ) : (
          exchanges.map((exchange, index) => (
            <article key={`${index}-${exchange.question}`} className="flex flex-col gap-2">
              {/* The learner's own words, set apart from the reply so a long
                  answer never reads as a continuation of the question. */}
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-md rounded-tr-sm bg-surface-sunk px-3 py-1.5 text-small text-ink">
                  <span className="sr-only">You asked: </span>
                  {exchange.question}
                </p>
              </div>

              {exchange.error ? (
                <TutorBubble tone="error">
                  <p className="text-small text-ink">{exchange.error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setExchanges((previous) => previous.slice(0, index))
                      send(exchange.question)
                    }}
                    className="mt-1 text-small font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Try again
                  </button>
                </TutorBubble>
              ) : exchange.answer === null ? (
                <TutorBubble>
                  <p className="flex items-center gap-1.5 text-small text-ai-foreground">
                    <SpinnerIcon />
                    Thinking
                  </p>
                </TutorBubble>
              ) : (
                <TutorBubble>
                  {/* --text-body, not the 12px this used to be: it is the
                      explanation the tab exists to deliver. */}
                  <p className="whitespace-pre-wrap text-body text-ai-foreground">{exchange.answer}</p>
                  {exchange.fallback && (
                    <p className="mt-1.5 border-t border-ai/20 pt-1.5 text-micro text-ink-2">
                      Written answer, not a tutor reply: the service could not be reached.
                    </p>
                  )}
                </TutorBubble>
              )}
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex shrink-0 items-center gap-2 border-t border-rule pt-2.5"
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
          className="min-w-0 flex-1 rounded-md border border-rule bg-surface px-3 py-2 text-small text-ink outline-none transition-colors placeholder:text-ink-2 focus:border-ai"
        />
        <button
          type="submit"
          disabled={pending || draft.trim().length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-ai px-3 py-2 text-small font-medium text-ai-contrast transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <SpinnerIcon /> : <SendIcon />}
          {pending ? 'Asking' : 'Ask'}
        </button>
      </form>
    </div>
  )
}
