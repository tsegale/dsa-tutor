import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { getToken } from '@/api/auth'
import { useOnboarding } from '@/hooks/useOnboarding'
import { TooltipProvider } from '@/components/ui/tooltip'

// Route-level splitting: each page (and everything it alone depends on,
// e.g. AlgorithmPage's canvas/D3/Pyodide code) ships as its own chunk
// instead of all being bundled into the one script every visitor
// downloads before first paint.
const AuthPage = lazy(() => import('@/pages/AuthPage'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const AlgorithmPage = lazy(() => import('@/pages/AlgorithmPage'))
const EducatorDashboard = lazy(() => import('@/pages/EducatorDashboard'))
const Showcase = lazy(() => import('@/pages/Showcase'))
const CanvasTest = lazy(() => import('@/pages/CanvasTest'))
// Was a static import even though GlobalOnboarding only ever renders it for
// an authenticated user mid-tour - that pulled its framer-motion-animated
// tree (WelcomeModal, SpotlightOverlay, OnboardingTooltip) into every page's
// eager bundle, including the unauthenticated /auth screen.
const OnboardingController = lazy(() => import('@/components/onboarding/OnboardingController'))

const queryClient = new QueryClient()

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

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
  return (
    <Suspense fallback={null}>
      <OnboardingController onComplete={completeOnboarding} />
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
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
                <Route
                  path="/educator"
                  element={
                    <ProtectedRoute>
                      <EducatorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/showcase" element={<Showcase />} />
                <Route path="/canvas-test" element={<CanvasTest />} />
              </Routes>
            </Suspense>
            <GlobalOnboarding />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
