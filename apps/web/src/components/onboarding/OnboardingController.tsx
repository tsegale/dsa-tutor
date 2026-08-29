import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SpotlightOverlay from './SpotlightOverlay'
import OnboardingTooltip from './OnboardingTooltip'
import { ONBOARDING_STEPS } from './onboardingSteps'

interface OnboardingControllerProps {
  onComplete: () => void
}

const NAVIGATION_SETTLE_MS = 500

export default function OnboardingController({ onComplete }: OnboardingControllerProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const currentStep = ONBOARDING_STEPS[currentStepIndex]
  const currentTargetRef = useRef<HTMLElement | null>(null)
  // Assigned synchronously during render (not in an effect) so that by
  // the time SpotlightOverlay/OnboardingTooltip mount for this step,
  // .current already points at the right element - avoids a child
  // effect reading a stale value before this component's own effect
  // (which runs after children's, in React's commit order) could set it.
  currentTargetRef.current = document.getElementById(currentStep.targetId)

  function handleNext() {
    if (currentStepIndex === ONBOARDING_STEPS.length - 1) {
      onComplete()
      return
    }

    const nextIndex = currentStepIndex + 1
    const nextStep = ONBOARDING_STEPS[nextIndex]
    const onDashboard = location.pathname === '/'

    if (nextStep.requiresAlgorithmPage && onDashboard) {
      navigate('/algorithm/bubble-sort')
      setTimeout(() => setCurrentStepIndex(nextIndex), NAVIGATION_SETTLE_MS)
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
