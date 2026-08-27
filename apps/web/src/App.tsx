import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Button } from '@/components/ui/button'
import { AlgorithmMode } from '@dsa-tutor/types'
import Showcase from '@/pages/Showcase'
import CanvasTest from '@/pages/CanvasTest'
import { TooltipProvider } from '@/components/ui/tooltip'

const queryClient = new QueryClient()

function DsaTutorShell() {
  const { algorithmName, mode, sessionXP, setMode } = useAlgorithmStore()

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-xl w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl"
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          Interactive DSA Tutor
        </h1>
        <p className="mt-2 text-slate-400">
          Currently studying{' '}
          <span className="font-mono text-emerald-400">{algorithmName}</span>
        </p>

        <div className="mt-6 flex items-center gap-3">
          {[AlgorithmMode.DEMO, AlgorithmMode.PRACTICE].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={clsx(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                mode === m
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
              )}
            >
              {m}
            </button>
          ))}
          <span className="ml-auto text-sm text-slate-400">
            XP: <span className="text-slate-100">{sessionXP}</span>
          </span>
        </div>

        <Button className="mt-6 w-full" size="lg">
          Start Bubble Sort walkthrough
        </Button>
      </motion.div>
    </main>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DsaTutorShell />} />
            <Route path="/showcase" element={<Showcase />} />
            <Route path="/canvas-test" element={<CanvasTest />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
