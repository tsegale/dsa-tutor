import { motion } from 'framer-motion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface WelcomeModalProps {
  userName: string
  onStartTour: () => void
  onSkip: () => void
}

function BarChartSearchIllustration() {
  return (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none">
      <rect x="8" y="70" width="20" height="38" rx="3" fill="#4F46E5" />
      <rect x="36" y="50" width="20" height="58" rx="3" fill="#F59E0B" />
      <rect x="64" y="30" width="20" height="78" rx="3" fill="#4F46E5" />
      <rect x="92" y="58" width="20" height="50" rx="3" fill="#F59E0B" />
      <circle cx="98" cy="46" r="24" fill="white" stroke="#4F46E5" strokeWidth={4} />
      <line x1="115" y1="63" x2="132" y2="80" stroke="#4F46E5" strokeWidth={5} strokeLinecap="round" />
    </svg>
  )
}

export default function WelcomeModal({ userName, onStartTour, onSkip }: WelcomeModalProps) {
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="sm:max-w-md"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.25 }}
          className="flex flex-col items-center gap-4 py-2 text-center"
        >
          <BarChartSearchIllustration />

          <h2 className="text-2xl font-bold text-primary">Welcome, {userName}</h2>

          <p className="text-sm text-text-secondary">
            DSA Tutor teaches algorithms by requiring you to predict each step - not just watch. Let us
            show you around before you start.
          </p>

          <div className="mt-2 flex w-full gap-3">
            <Button variant="ghost" onClick={onSkip} className="flex-1">
              Skip for now
            </Button>
            <Button onClick={onStartTour} className="flex-1">
              Take the tour
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
