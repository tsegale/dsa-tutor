import { useRef, useCallback } from 'react'

type SoundType = 'correct' | 'incorrect' | 'badge' | 'xp' | 'levelup'

const SOUND_ENABLED_KEY = 'dsa-tutor-sound-enabled'

function createAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    return new AudioContextClass()
  } catch {
    return null
  }
}

function playCorrectSound(ctx: AudioContext) {
  // Short major chord: C5 + E5 + G5, 0.4 seconds
  const frequencies = [523.25, 659.25, 783.99]
  const now = ctx.currentTime
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.12 / (i + 1), now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    osc.start(now)
    osc.stop(now + 0.4)
  })
}

function playIncorrectSound(ctx: AudioContext) {
  // Gentle descending two-note: E4 then D4, 0.3 seconds total
  const now = ctx.currentTime
  ;[329.63, 293.66].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    const start = now + i * 0.15
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.1, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13)
    osc.start(start)
    osc.stop(start + 0.15)
  })
}

function playBadgeSound(ctx: AudioContext) {
  // Ascending arpeggio: C5, E5, G5, C6
  const frequencies = [523.25, 659.25, 783.99, 1046.5]
  const now = ctx.currentTime
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    const start = now + i * 0.1
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
    osc.start(start)
    osc.stop(start + 0.3)
  })
}

function playXPSound(ctx: AudioContext) {
  // Single soft chime: A5
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 880
  osc.type = 'sine'
  const now = ctx.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.08, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
  osc.start(now)
  osc.stop(now + 0.25)
}

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null)

  const isEnabled = useCallback(() => {
    return localStorage.getItem(SOUND_ENABLED_KEY) === 'true'
  }, [])

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = createAudioContext()
    }
    if (ctxRef.current?.state === 'suspended') {
      void ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const play = useCallback(
    (sound: SoundType) => {
      if (!isEnabled()) return
      const ctx = getContext()
      if (!ctx) return
      try {
        switch (sound) {
          case 'correct':
            playCorrectSound(ctx)
            break
          case 'incorrect':
            playIncorrectSound(ctx)
            break
          case 'badge':
            playBadgeSound(ctx)
            break
          case 'xp':
            playXPSound(ctx)
            break
          case 'levelup':
            playBadgeSound(ctx)
            break
        }
      } catch (err) {
        console.warn('Sound playback failed:', err)
      }
    },
    [isEnabled, getContext],
  )

  return { play, isEnabled }
}
