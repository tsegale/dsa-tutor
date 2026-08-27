import { useEffect } from 'react'
import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'

const THEME_STORAGE_KEY = 'dsa-tutor-theme'

interface UseKeyboardShortcutsConfig {
  onTabChange: (tab: number) => void
  onShortcutsModalOpen: () => void
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function useKeyboardShortcuts({ onTabChange, onShortcutsModalOpen }: UseKeyboardShortcutsConfig) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && TYPING_TAGS.has(target.tagName)) return

      const store = useAlgorithmStore.getState()

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          if (store.isPlaying) store.stopPlayback()
          else store.startPlayback()
          break
        case 'ArrowRight':
          store.stepForward()
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
          store.setMode(AlgorithmMode.DEMO)
          break
        case 'KeyP':
          store.setMode(AlgorithmMode.PRACTICE)
          break
        case 'KeyT': {
          const isDark = document.documentElement.classList.toggle('dark')
          localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light')
          break
        }
        case 'Digit1':
          onTabChange(1)
          break
        case 'Digit2':
          onTabChange(2)
          break
        case 'Digit3':
          onTabChange(3)
          break
        case 'Slash':
          if (event.shiftKey) {
            event.preventDefault()
            onShortcutsModalOpen()
          }
          break
        case 'Escape':
          // Radix's Dialog already closes on Escape natively; this only
          // needs to handle exiting focus mode.
          if (store.focusModeActive) store.toggleFocusMode()
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
  }, [onTabChange, onShortcutsModalOpen])
}
