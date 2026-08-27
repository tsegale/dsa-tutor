import { useState } from 'react'
import type { ReactNode } from 'react'
import { Difficulty } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import MasteryRing from '@/components/ui/MasteryRing'
import XPToast from '@/components/ui/XPToast'
import DifficultyTag from '@/components/ui/DifficultyTag'
import ModeToggle from '@/components/ui/ModeToggle'
import ProgressBar from '@/components/ui/ProgressBar'
import ScaffoldingBadge from '@/components/ui/ScaffoldingBadge'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <div className="flex flex-wrap items-center gap-6">{children}</div>
    </section>
  )
}

export default function Showcase() {
  const [xpVisible, setXpVisible] = useState(false)
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const stepBackward = useAlgorithmStore((state) => state.stepBackward)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-text-primary">Component Showcase</h1>

      <Section title="MasteryRing">
        <MasteryRing progress={0} />
        <MasteryRing progress={0.45} />
        <MasteryRing progress={0.75} />
        <MasteryRing progress={1} />
      </Section>

      <Section title="XPToast">
        <button
          type="button"
          onClick={() => setXpVisible(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Trigger +50 XP toast
        </button>
        <XPToast amount={50} visible={xpVisible} onComplete={() => setXpVisible(false)} />
      </Section>

      <Section title="DifficultyTag">
        <DifficultyTag difficulty={Difficulty.BEGINNER} />
        <DifficultyTag difficulty={Difficulty.INTERMEDIATE} />
        <DifficultyTag difficulty={Difficulty.ADVANCED} />
      </Section>

      <Section title="ModeToggle">
        <ModeToggle />
      </Section>

      <Section title="ProgressBar">
        <div className="flex w-full flex-col gap-3">
          <ProgressBar />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={stepBackward}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-primary-light"
            >
              Step back
            </button>
            <button
              type="button"
              onClick={stepForward}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-primary-light"
            >
              Step forward
            </button>
          </div>
        </div>
      </Section>

      <Section title="ScaffoldingBadge">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1 text-xs text-text-muted">
              Live (connected to the store, currently HIGH by default)
            </p>
            <ScaffoldingBadge />
          </div>
          <div>
            {/* ScaffoldingBadge takes no props by spec (always reads the live
                store), so the other three levels are previewed here with the
                same markup rather than by adding an override prop. */}
            <p className="mb-1 text-xs text-text-muted">Static previews of all four levels</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-2.5 py-0.5 text-xs font-medium text-white">
                HIGH
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-transparent px-2.5 py-0.5 text-xs font-medium text-primary">
                MEDIUM
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-muted bg-transparent px-2.5 py-0.5 text-xs font-medium text-text-muted">
                LOW
              </span>
              <span className="text-xs text-text-muted">NONE (renders nothing)</span>
            </div>
          </div>
        </div>
      </Section>
    </main>
  )
}
