import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SpotlightOverlay from './SpotlightOverlay'
import OnboardingTooltip from './OnboardingTooltip'
import { ONBOARDING_STEPS } from './onboardingSteps'

interface OnboardingControllerProps {
  onComplete: () => void
}

// How long to wait, after the route actually changes, before revealing
// the next step - gives the new page's layout a moment to finish
// mounting so the spotlight measures real, settled element positions.
const POST_NAVIGATION_SETTLE_MS = 300

export default function OnboardingController({ onComplete }: OnboardingControllerProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  // While true, neither the spotlight nor the tooltip render - target and
  // content must always update together (see remediation doc 9.7). The
  // previous implementation advanced currentStepIndex on a fixed timer
  // that started at the same time as the navigation, so for that whole
  // window the OLD step's title/description stayed on screen while the
  // spotlight had already lost its target on the page being left, and
  // then silently re-measured a stale cutout rect after landing on the
  // new page instead of the element the new step actually describes.
  const [isTransitioning, setIsTransitioning] = useState(false)
  const pendingStepIndexRef = useRef<number | null>(null)

  const currentStep = ONBOARDING_STEPS[currentStepIndex]
  const currentTargetRef = useRef<HTMLElement | null>(null)
  // Assigned synchronously during render (not in an effect) so that by
  // the time SpotlightOverlay/OnboardingTooltip mount for this step,
  // .current already points at the right element - avoids a child
  // effect reading a stale value before this component's own effect
  // (which runs after children's, in React's commit order) could set it.
  currentTargetRef.current = isTransitioning ? null : document.getElementById(currentStep.targetId)

  // Fires once the route has actually changed to the page the pending
  // step needs, rather than trusting a fixed delay to have been "enough
  // time" for a navigation that may not even have started yet.
  useEffect(() => {
    if (pendingStepIndexRef.current === null) return
    const pendingIndex = pendingStepIndexRef.current
    const pendingStep = ONBOARDING_STEPS[pendingIndex]
    const onAlgorithmPage = location.pathname.startsWith('/algorithm/')
    if (pendingStep.requiresAlgorithmPage && !onAlgorithmPage) return

    pendingStepIndexRef.current = null
    const timer = setTimeout(() => {
      setCurrentStepIndex(pendingIndex)
      setIsTransitioning(false)
    }, POST_NAVIGATION_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [location.pathname])

  function handleNext() {
    if (currentStepIndex === ONBOARDING_STEPS.length - 1) {
      onComplete()
      return
    }

    const nextIndex = currentStepIndex + 1
    const nextStep = ONBOARDING_STEPS[nextIndex]
    const onDashboard = location.pathname === '/'

    if (nextStep.requiresAlgorithmPage && onDashboard) {
      setIsTransitioning(true)
      pendingStepIndexRef.current = nextIndex
      navigate('/algorithm/bubble-sort')
    } else {
      setCurrentStepIndex(nextIndex)
    }
  }

  function handleSkip() {
    onComplete()
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        handleNext()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        handleSkip()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, location.pathname])

  if (isTransitioning) return null

  return (
    <>
      <SpotlightOverlay key={`spotlight-${currentStep.id}`} targetRef={currentTargetRef} visible padding={12} />
      <OnboardingTooltip
        step={currentStep.id}
        totalSteps={ONBOARDING_STEPS.length}
        title={currentStep.title}
        description={currentStep.description}
        position={currentStep.position}
        targetRef={currentTargetRef}
        onNext={handleNext}
        onSkip={handleSkip}
        isLastStep={currentStepIndex === ONBOARDING_STEPS.length - 1}
      />
    </>
  )
}
