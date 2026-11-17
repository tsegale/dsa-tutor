import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * A small binary search, running, on the sign-in page.
 */

const DATA = [1, 3, 5, 7, 9, 11, 13, 15]
const TARGET = 13

interface Frame {
  lo: number
  hi: number
  mid: number
  verdict: string
  done?: boolean
}

/** Precomputed, because the point is the shape of the search, not a race. */
function frames(): Frame[] {
  const out: Frame[] = []
  let lo = 0
  let hi = DATA.length - 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const value = DATA[mid]
    if (value === TARGET) {
      out.push({ lo, hi, mid, verdict: `arr[${mid}] = ${value} == ${TARGET} (Target found!)`, done: true })
      break
    }
    if (value < TARGET) {
      out.push({ lo, hi, mid, verdict: `arr[${mid}] = ${value} < ${TARGET} → discard left half` })
      lo = mid + 1
    } else {
      out.push({ lo, hi, mid, verdict: `arr[${mid}] = ${value} > ${TARGET} → discard right half` })
      hi = mid - 1
    }
  }
  return out
}

const FRAMES = frames()
const STEP_MS = 1100
const HOLD_MS = 2200

export default function AuthTrace() {
  const reducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reducedMotion) {
      setIndex(FRAMES.length - 1)
      return
    }
    const last = index === FRAMES.length - 1
    const timer = setTimeout(() => setIndex(last ? 0 : index + 1), last ? HOLD_MS : STEP_MS)
    return () => clearTimeout(timer)
  }, [index, reducedMotion])

  const frame = FRAMES[index]

  return (
    <figure
      className="flex flex-col gap-2.5 overflow-hidden rounded-md border border-rule bg-surface shadow-e1"
      aria-label={`Binary search for ${TARGET}: ${frame.verdict}`}
    >
      <div className="flex items-center justify-between border-b border-rule bg-surface-sunk/70 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="size-2 rounded-full bg-state-swap opacity-80" />
            <span className="size-2 rounded-full bg-state-compare opacity-80" />
            <span className="size-2 rounded-full bg-state-sorted opacity-80" />
          </span>
          <figcaption className="font-mono text-[11px] font-semibold tracking-[0.02em] text-ink">
            binary_search(arr, target={TARGET})
          </figcaption>
        </div>
        <span
          aria-hidden="true"
          className="rounded-full border border-rule bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-ink-2"
        >
          Step {index + 1} of {FRAMES.length}
        </span>
      </div>

      <div className="flex gap-1.5 px-3 pt-0.5" aria-hidden="true">
        {DATA.map((value, position) => {
          const inRange = position >= frame.lo && position <= frame.hi
          const isMid = position === frame.mid
          const isLo = position === frame.lo
          const isHi = position === frame.hi
          return (
            <div key={position} className="flex flex-1 flex-col items-center gap-0.5">
              <div
                className="flex h-8 w-full items-center justify-center rounded-sm border font-mono text-[12px] font-bold transition-all duration-300"
                style={
                  isMid && frame.done
                    ? {
                        backgroundColor: 'var(--tone-emerald-bg)',
                        borderColor: 'var(--state-sorted)',
                        color: 'var(--tone-emerald-fg)',
                      }
                    : isMid
                      ? {
                          backgroundColor: 'var(--tone-amber-bg)',
                          borderColor: 'var(--state-compare)',
                          color: 'var(--tone-amber-fg)',
                        }
                      : inRange
                        ? {
                            backgroundColor: 'var(--tone-sky-bg)',
                            borderColor: 'var(--tone-sky-border)',
                            color: 'var(--ink)',
                          }
                        : {
                            backgroundColor: 'var(--surface-sunk)',
                            borderColor: 'var(--rule)',
                            color: 'var(--ink-3)',
                            opacity: 0.55,
                          }
                }
              >
                {value}
              </div>
              <span
                className={[
                  'h-3 font-mono text-[9px] font-bold leading-none',
                  isMid
                    ? frame.done
                      ? 'text-state-sorted'
                      : 'text-state-compare'
                    : isLo || isHi
                      ? 'text-state-current'
                      : 'text-transparent',
                ].join(' ')}
              >
                {isMid ? 'mid' : isLo ? 'lo' : isHi ? 'hi' : '·'}
              </span>
            </div>
          )
        })}
      </div>

      <div
        className="mx-3 mb-2.5 flex h-6 items-center gap-2 rounded-sm border border-rule bg-surface-sunk px-2.5 font-mono text-[11px] text-ink"
        aria-hidden="true"
      >
        <span
          className={[
            'size-2 shrink-0 rounded-full',
            frame.done ? 'bg-state-sorted' : 'bg-state-compare',
          ].join(' ')}
        />
        <span className="truncate">{frame.verdict}</span>
      </div>
    </figure>
  )
}
