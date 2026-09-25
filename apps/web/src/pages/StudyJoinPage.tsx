import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { enrolInStudy } from '@/api/study'
import { Button } from '@/components/ui/button'
import { DSATutorLogo } from '@/components/brand'

const inputClassName =
  'w-full rounded-md border-2 border-border px-3 py-2 text-sm outline-none transition-colors focus:border-text-muted'

export default function StudyJoinPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')

  const enrolMutation = useMutation({
    mutationFn: () => enrolInStudy(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', 'status'] })
      navigate('/consent', { replace: true })
    },
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!code.trim()) return
    enrolMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-16 items-center border-b border-border bg-card px-6">
        <DSATutorLogo variant="dark" showTagline={false} />
      </header>

      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="mb-2 text-xl font-bold text-text-primary">Join the study</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Enter the code your researcher gave you to take part in the study.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="study-code" className="text-sm font-medium text-text-primary">
              Study code
            </label>
            <input
              id="study-code"
              type="text"
              required
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={inputClassName}
            />
          </div>

          {enrolMutation.isError && (
            <p className="text-sm text-error">
              {enrolMutation.error instanceof Error ? enrolMutation.error.message : 'Could not join the study.'}
            </p>
          )}

          <Button type="submit" disabled={!code.trim() || enrolMutation.isPending}>
            {enrolMutation.isPending ? 'Joining...' : 'Join'}
          </Button>
        </form>
      </main>
    </div>
  )
}
