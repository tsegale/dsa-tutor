import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { getToken } from '@/api/auth'
import { useOnboarding } from '@/hooks/useOnboarding'
import { TooltipProvider } from '@/components/ui/tooltip'
import OnboardingController from '@/components/onboarding/OnboardingController'
import AuthPage from '@/pages/AuthPage'
import Dashboard from '@/pages/Dashboard'
import AlgorithmPage from '@/pages/AlgorithmPage'
import Showcase from '@/pages/Showcase'
import CanvasTest from '@/pages/CanvasTest'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/auth" replace />
}

// Mounted once, alongside the router's routes rather than inside any
// single page, so the walkthrough survives the mid-tour navigation
// from the dashboard to the algorithm page (steps 3-5 of the tour).
// If it lived inside Dashboard.tsx as originally sketched, navigating
// away would unmount Dashboard - and the controller with it - before
// those steps could ever render.
function GlobalOnboarding() {
  const { user } = useAuth()
  const { showOnboarding, completeOnboarding } = useOnboarding()

  if (!user || !showOnboarding) return null
  return <OnboardingController onComplete={completeOnboarding} />
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
            <GlobalOnboarding />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
