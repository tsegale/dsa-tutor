import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * A small binary search, running, on the sign-in page.
 *
 * The page has one job before anyone has an account: show that this is a
 * working engine rather than a landing page. Three marketing bullets claimed
 * that; a trace demonstrates it in about four seconds, which is roughly how
 * long a panel member looks at a login screen.
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
      className="flex flex-col gap-3 rounded-md border border-paper/15 bg-paper/[0.06] p-4"
      aria-label={`Binary search for ${TARGET}: ${frame.verdict}`}
    >
      <div className="flex items-center justify-between border-b border-paper/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="size-2 rounded-full bg-state-swap opacity-80" />
            <span className="size-2 rounded-full bg-state-compare opacity-80" />
            <span className="size-2 rounded-full bg-state-sorted opacity-80" />
          </span>
          <figcaption className="font-mono text-[11px] font-semibold tracking-[0.02em] text-paper/80">
            binary_search(arr, target={TARGET})
          </figcaption>
        </div>
        <span
          aria-hidden="true"
          className="rounded-full border border-paper/15 bg-paper/[0.08] px-2 py-0.5 font-mono text-[10px] text-paper/75"
        >
          Step {index + 1} of {FRAMES.length}
        </span>
      </div>

      <div className="flex gap-1.5 pt-1" aria-hidden="true">
        {DATA.map((value, position) => {
          const inRange = position >= frame.lo && position <= frame.hi
          const isMid = position === frame.mid
          const isLo = position === frame.lo
          const isHi = position === frame.hi
          return (
            <div key={position} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={[
                  'flex h-10 w-full items-center justify-center rounded-sm border font-mono text-[12px] font-bold transition-all duration-300',
                  isMid && frame.done
                    ? 'border-state-sorted bg-state-sorted text-state-sorted-ink shadow-sm'
                    : isMid
                      ? 'border-state-compare bg-state-compare text-state-compare-ink shadow-sm'
                      : inRange
                        ? 'border-paper/25 bg-paper/[0.14] text-paper'
                        : 'border-paper/5 bg-paper/[0.03] text-paper/25',
                ].join(' ')}
              >
                {value}
              </div>
              <span
                className={[
                  'h-3.5 font-mono text-[9px] font-bold',
                  isMid
                    ? frame.done
                      ? 'text-state-sorted'
                      : 'text-state-compare'
                    : isLo || isHi
                      ? 'text-paper/70'
                      : 'text-transparent',
                ].join(' ')}
              >
                {isMid ? 'mid' : isLo ? 'lo' : isHi ? 'hi' : '·'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Fixed height: the verdict lines differ in length, and a box that
          resizes each step makes the whole panel twitch. */}
      <div
        className="flex h-7 items-center gap-2 rounded-sm border border-paper/10 bg-paper/[0.05] px-2.5 font-mono text-[11px] text-paper/85"
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
