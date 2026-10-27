import { Suspense, useEffect } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { getToken } from '@/api/auth'
import { fetchStudyStatus } from '@/api/study'
import { useOnboarding } from '@/hooks/useOnboarding'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { PreferencesSync } from '@/components/layout/PreferencesSync'
import { RouteFocus } from '@/components/layout/RouteFocus'
import RouteErrorBoundary from '@/components/layout/RouteErrorBoundary'
import NotFound from '@/pages/NotFound'
import { lazyWithReload } from '@/utils/chunkReload'
import { useThemeStore } from '@/store/useThemeStore'

// Route-level splitting: each page (and everything it alone depends on,
// e.g. AlgorithmPage's canvas/D3/Pyodide code) ships as its own chunk
// instead of all being bundled into the one script every visitor
// downloads before first paint.
const AuthPage = lazyWithReload(() => import('@/pages/AuthPage'))
const Home = lazyWithReload(() => import('@/pages/Home'))
const AlgorithmPage = lazyWithReload(() => import('@/pages/AlgorithmPage'))
const TrackPage = lazyWithReload(() => import('@/pages/TrackPage'))
const ProgressPage = lazyWithReload(() => import('@/pages/ProgressPage'))
const ProfilePage = lazyWithReload(() => import('@/pages/ProfilePage'))
const EducatorDashboard = lazyWithReload(() => import('@/pages/EducatorDashboard'))
const AssessmentPage = lazyWithReload(() => import('@/pages/AssessmentPage'))
const ConsentPage = lazyWithReload(() => import('@/pages/ConsentPage'))
const StudyJoinPage = lazyWithReload(() => import('@/pages/StudyJoinPage'))
const SusPage = lazyWithReload(() => import('@/pages/SusPage'))
const Showcase = lazyWithReload(() => import('@/pages/Showcase'))
const CanvasTest = lazyWithReload(() => import('@/pages/CanvasTest'))
// Was a static import even though GlobalOnboarding only ever renders it for
// an authenticated user mid-tour - that pulled its framer-motion-animated
// tree (WelcomeModal, SpotlightOverlay, OnboardingTooltip) into every page's
// eager bundle, including the unauthenticated /auth screen.
const OnboardingController = lazyWithReload(() => import('@/components/onboarding/OnboardingController'))

const queryClient = new QueryClient()

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunk">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/auth" replace />
}

// A study participant cannot reach a topic or the dashboard at all until
// they've consented, then until they've completed the pre-test - only
// /consent and /assessment/pre themselves are wrapped in RequireAuth alone,
// so this check never applies to those two routes. A non-participant
// (isParticipant: false) is unaffected; the study's curriculum lock
// (STUDY_TOPICS, enforced server-side in topic.service.ts) is a separate
// concern from this route gate.
function StudyGate({ children }: { children: ReactNode }) {
  const { data: status, isLoading } = useQuery({
    queryKey: ['study', 'status'],
    queryFn: fetchStudyStatus,
    staleTime: 60 * 1000,
  })

  if (isLoading) return null
  // consentRequired/pretestRequired answer "has this step happened yet",
  // not "is this account still an active participant" - getStudyStatus
  // keeps pretestRequired true for someone who withdrew before ever taking
  // it, since withdrawing doesn't retroactively complete it. Gating on
  // those alone re-locked a withdrawn participant into the very step they
  // just withdrew to get out of; withdrawn exits the protocol entirely; see
  // studyPhase(), which already treats it the same way for the header chip.
  if (!status?.withdrawn) {
    if (status?.consentRequired) {
      return <Navigate to="/consent" replace />
    }
    if (status?.pretestRequired) {
      return <Navigate to="/assessment/pre" replace />
    }
  }
  return <>{children}</>
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <StudyGate>{children}</StudyGate>
    </RequireAuth>
  )
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

// The theme class lives on <html> for every route, not only the algorithm
// page, so dashboards, modals and portalled menus all follow one setting.
function useApplyTheme() {
  const theme = useThemeStore((state) => state.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])
}

// Keyed on the topic: the search palette can move from one topic straight
// to another inside the workspace, and the same element would otherwise be
// reused with the previous topic's session state.
/**
 * Every route is wrapped so that a render error shows a message with the
 * navigation intact, rather than blanking the app to white. Keyed on the
 * location so that navigating away from a broken page clears the fallback.
 */
function BoundedRoutes() {
  const location = useLocation()
  return (
    <RouteErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<RouteFallback />}>
        <AppRoutes />
      </Suspense>
    </RouteErrorBoundary>
  )
}

function AlgorithmRoute() {
  const { algorithmName } = useParams<{ algorithmName: string }>()
  return <AlgorithmPage key={algorithmName} />
}

export default function App() {
  useApplyTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <BoundedRoutes />
            <GlobalOnboarding />
            <PreferencesSync />
            <RouteFocus />
          </BrowserRouter>
          {/* One toast region for the whole app, styled to the tokens. */}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function AppRoutes() {
  return (
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/track/:track"
                  element={
                    <ProtectedRoute>
                      <TrackPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/module/:number"
                  element={
                    <ProtectedRoute>
                      <TrackPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progress"
                  element={
                    <ProtectedRoute>
                      <ProgressPage />
                    </ProtectedRoute>
                  }
                />
                {/* RequireAuth alone, not ProtectedRoute: StudySection (Phase 6B)
                    renders the withdraw button here, and StudyJoinPage promises
                    "you can withdraw at any time from your profile" - a promise
                    StudyGate broke for exactly the participant most likely to
                    want it, one mid-protocol with a pretest/posttest/consent
                    still due, by bouncing them straight back to that same due
                    step before the page could render. */}
                <Route
                  path="/profile"
                  element={
                    <RequireAuth>
                      <ProfilePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/algorithm/:algorithmName"
                  element={
                    <ProtectedRoute>
                      <AlgorithmRoute />
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
                <Route
                  path="/assessment/:phase"
                  element={
                    <RequireAuth>
                      <AssessmentPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/consent"
                  element={
                    <RequireAuth>
                      <ConsentPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/study/join"
                  element={
                    <RequireAuth>
                      <StudyJoinPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/sus"
                  element={
                    <RequireAuth>
                      <SusPage />
                    </RequireAuth>
                  }
                />
                {/* Development only. CanvasTest renders a bare mode
                    switcher outside the study scaffolding, so a Classic
                    participant who wandered in would be shown the very
                    controls their condition withholds - a confound in the
                    data rather than an untidy page. In a production build
                    both addresses fall through to NotFound; their lazy
                    chunks are still emitted, but nothing can route to
                    them. */}
                {import.meta.env.DEV && <Route path="/showcase" element={<Showcase />} />}
                {import.meta.env.DEV && <Route path="/canvas-test" element={<CanvasTest />} />}
                {/* Any other address: a message rather than a blank page. */}
                <Route path="*" element={<NotFound />} />
              </Routes>
  )
}
