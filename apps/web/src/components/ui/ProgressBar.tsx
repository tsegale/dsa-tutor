import { motion } from 'framer-motion'
import { useAlgorithmStore, selectProgressPercent } from '@/store/useAlgorithmStore'

export default function ProgressBar() {
  const progressPercent = useAlgorithmStore(selectProgressPercent)

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
      <motion.div
        className="h-full rounded-full bg-primary"
        animate={{ width: `${progressPercent}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}
