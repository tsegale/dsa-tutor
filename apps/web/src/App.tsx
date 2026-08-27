import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Showcase from '@/pages/Showcase'
import CanvasTest from '@/pages/CanvasTest'
import AlgorithmPage from '@/pages/AlgorithmPage'
import { TooltipProvider } from '@/components/ui/tooltip'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AlgorithmPage />} />
            <Route path="/algorithm/:algorithmName" element={<AlgorithmPage />} />
            <Route path="/showcase" element={<Showcase />} />
            <Route path="/canvas-test" element={<CanvasTest />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
