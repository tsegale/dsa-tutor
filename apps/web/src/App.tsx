import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Showcase from '@/pages/Showcase'
import CanvasTest from '@/pages/CanvasTest'
import AlgorithmPage from '@/pages/AlgorithmPage'
import AuthPage from '@/pages/AuthPage'
import { TooltipProvider } from '@/components/ui/tooltip'

const queryClient = new QueryClient()

function RequireAuth({ children }: { children: ReactElement }) {
  const token = localStorage.getItem('dsa-tutor-token')
  if (!token) return <Navigate to="/auth" replace />
  return children
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <AlgorithmPage />
                </RequireAuth>
              }
            />
            <Route
              path="/algorithm/:algorithmName"
              element={
                <RequireAuth>
                  <AlgorithmPage />
                </RequireAuth>
              }
            />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/showcase" element={<Showcase />} />
            <Route path="/canvas-test" element={<CanvasTest />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
