import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Space', action: 'Play / Pause' },
  { keys: '→', action: 'Step Forward' },
  { keys: '←', action: 'Step Backward' },
  { keys: 'R', action: 'Reset' },
  { keys: 'H', action: 'Request Hint' },
  { keys: 'F', action: 'Toggle Focus Mode' },
  { keys: 'D', action: 'Switch to Demo Mode' },
  { keys: 'P', action: 'Switch to Practice Mode' },
  { keys: 'T', action: 'Toggle Dark / Light Theme' },
  { keys: '1', action: 'Explanation Tab' },
  { keys: '2', action: 'Pseudocode Tab' },
  { keys: '3', action: 'Complexity Tab' },
  { keys: '?', action: 'Open This Modal' },
  { keys: 'Escape', action: 'Close Modal / Dismiss Hint' },
]

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.action} className="flex items-center gap-3">
              <kbd className="rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-text-primary">
                {shortcut.keys}
              </kbd>
              <span className="text-sm text-text-secondary">{shortcut.action}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
