import { useEffect } from 'react'
import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore, selectIsUnansweredJunction } from '@/store/useAlgorithmStore'
import { useOnboardingStore } from './useOnboarding'
import { useThemeStore } from '@/store/useThemeStore'

interface UseKeyboardShortcutsConfig {
  onTabChange: (tab: number) => void
  onShortcutsModalOpen: () => void
  practiceEnabled?: boolean
  handsOnEnabled?: boolean
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
const INTERACTIVE_SELECTOR = 'button, a, [role="button"], [role="tab"], [role="radio"], summary'

export function useKeyboardShortcuts({
  onTabChange,
  onShortcutsModalOpen,
  practiceEnabled = true,
  handsOnEnabled = true,
}: UseKeyboardShortcutsConfig) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // The onboarding walkthrough owns ArrowRight/Enter/Escape while
      // it's active; let its own listener handle them instead.
      if (useOnboardingStore.getState().showOnboarding) return

      const target = event.target as HTMLElement | null
      // contenteditable covers the Code Mode editor (CodeMirror), where
      // Space and letters are code, not shortcuts.
      if (target && (TYPING_TAGS.has(target.tagName) || target.isContentEditable)) return

      const store = useAlgorithmStore.getState()
      const atUnansweredJunction = selectIsUnansweredJunction(store)

      switch (event.code) {
        case 'Space': {
          // Never hijack Space when a button, link, tab, or radio has focus.
          if (target?.closest(INTERACTIVE_SELECTOR)) return
          event.preventDefault()
          if (store.isPlaying || store.autoAdvancing) {
            store.stopPlayback()
          } else if (store.snapshotArray.length > 0 && store.stepIndex >= store.snapshotArray.length - 1) {
            store.resetAlgorithm()
            if (store.snapshotArray.length > 1 && !selectIsUnansweredJunction(useAlgorithmStore.getState())) {
              store.startPlayback()
            }
          } else if (!atUnansweredJunction) {
            store.startPlayback()
          }
          break
        }
        case 'ArrowRight':
          if (!atUnansweredJunction) store.stepForward()
          break
        case 'ArrowLeft':
          store.stepBackward()
          break
        case 'KeyR':
          store.resetAlgorithm()
          break
        case 'KeyF':
          store.toggleFocusMode()
          break
        case 'KeyD':
          if (!store.classicMode) store.setMode(AlgorithmMode.DEMO)
          break
        case 'KeyP':
          if (!store.classicMode && practiceEnabled) store.setMode(AlgorithmMode.PRACTICE)
          break
        case 'KeyO':
          if (!store.classicMode && handsOnEnabled) store.setMode(AlgorithmMode.HANDS_ON)
          break
        case 'KeyT':
          useThemeStore.getState().toggleTheme()
          break
        // Digits follow the tabs' visual order, not their internal ids:
        // Theory sits first in the strip but carries id 0.
        case 'Digit1':
          onTabChange(0)
          break
        case 'Digit2':
          onTabChange(1)
          break
        case 'Digit3':
          onTabChange(2)
          break
        case 'Digit4':
          onTabChange(3)
          break
        case 'Digit5':
          onTabChange(4)
          break
        case 'Slash':
          if (event.shiftKey) {
            event.preventDefault()
            onShortcutsModalOpen()
          }
          break
        case 'Escape':
          // Radix's Dialog already closes on Escape natively; this only
          // needs to handle exiting focus mode. The hint bubble listens
          // for this same event to dismiss itself.
          if (store.focusModeActive) store.toggleFocusMode()
          window.dispatchEvent(new CustomEvent('dsa-tutor:escape'))
          break
        case 'KeyH':
          window.dispatchEvent(new CustomEvent('request-hint'))
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onTabChange, onShortcutsModalOpen, practiceEnabled, handsOnEnabled])
}
