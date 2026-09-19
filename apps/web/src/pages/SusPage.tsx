import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { submitSus } from '@/api/study'
import { Button } from '@/components/ui/button'
import { DSATutorLogo } from '@/components/brand'

// The standard 10-item System Usability Scale (Brooke, 1986), verbatim -
// this is a public, standard instrument, unlike the pre/post-test item
// bank, so there is no contamination concern in keeping it client-side.
const SUS_ITEMS = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to be able to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.',
]

const LIKERT_SCALE = [1, 2, 3, 4, 5]

export default function SusPage() {
  const navigate = useNavigate()
  const [responses, setResponses] = useState<Array<number | null>>(Array(10).fill(null))

  const submitMutation = useMutation({
    mutationFn: () => submitSus(responses as number[]),
    onSuccess: () => navigate('/', { replace: true }),
  })

  const canSubmit = responses.every((r) => r !== null)

  function setResponse(index: number, value: number) {
    setResponses((prev) => prev.map((r, i) => (i === index ? value : r)))
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-16 items-center border-b border-border bg-white px-6">
        <DSATutorLogo variant="dark" showTagline={false} />
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-2 text-xl font-bold text-text-primary">One last thing: usability survey</h1>
        <p className="mb-8 text-sm text-text-secondary">
          Ten standard statements about the platform. For each, choose how much you agree, from strongly
          disagree to strongly agree.
        </p>

        <div className="flex flex-col gap-6">
          {SUS_ITEMS.map((statement, index) => (
            <div key={statement} className="rounded-md border border-border bg-white p-4">
              <p className="mb-3 text-sm font-medium text-text-primary">
                {index + 1}. {statement}
              </p>
              <div className="flex gap-1.5">
                {LIKERT_SCALE.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setResponse(index, value)}
                    aria-pressed={responses[index] === value}
                    className={`flex h-9 flex-1 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                      responses[index] === value
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-white text-text-primary hover:border-primary'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs text-text-muted">
                <span>Strongly disagree</span>
                <span>Strongly agree</span>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!canSubmit || submitMutation.isPending}
          className="mt-8"
        >
          Submit
        </Button>
      </main>
    </div>
  )
}
