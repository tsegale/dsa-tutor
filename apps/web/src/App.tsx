import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { getToken } from '@/api/auth'
import { TooltipProvider } from '@/components/ui/tooltip'
import AuthPage from '@/pages/AuthPage'
import Dashboard from '@/pages/Dashboard'
import AlgorithmPage from '@/pages/AlgorithmPage'
import Showcase from '@/pages/Showcase'
import CanvasTest from '@/pages/CanvasTest'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/algorithm/:algorithmName"
                element={
                  <ProtectedRoute>
                    <AlgorithmPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/showcase" element={<Showcase />} />
              <Route path="/canvas-test" element={<CanvasTest />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
