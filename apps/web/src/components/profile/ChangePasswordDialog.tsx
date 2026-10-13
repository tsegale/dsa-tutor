import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { changePassword } from '@/api/auth'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'

const MIN_LENGTH = 8

/** Change password (Phase 6A). The dialog traps focus and returns it to its trigger. */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const mutation = useMutation({ mutationFn: () => changePassword(current, next) })

  function reset() {
    setCurrent('')
    setNext('')
    setConfirm('')
    setLocalError(null)
    mutation.reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset()
        onOpenChange(value)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>Change password</DialogTitle>
        {mutation.isSuccess ? (
          <>
            <DialogDescription>Your password has been changed. Use the new one next time you sign in.</DialogDescription>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (next.length < MIN_LENGTH) return setLocalError(`Use at least ${MIN_LENGTH} characters.`)
              if (next !== confirm) return setLocalError('The two new passwords do not match.')
              setLocalError(null)
              mutation.mutate()
            }}
          >
            <DialogDescription>Enter your current password, then the new one twice.</DialogDescription>
            <label className="flex flex-col gap-1 text-small text-ink">
              Current password
              <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-small text-ink">
              New password
              <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-small text-ink">
              Confirm new password
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                error={localError ?? (mutation.error instanceof Error ? mutation.error.message : null)}
              />
            </label>
            <div className="mt-2 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={mutation.isPending}>
                Change password
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
