import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * A small binary search, running, on the sign-in page.
 *
 * The page has one job before anyone has an account: show that this is a
 * working engine rather than a landing page. Three marketing bullets claimed
 * that; a trace demonstrates it in about four seconds, which is roughly how
 * long a panel member looks at a login screen.
 *
 * Monospace throughout, because every line of it is data. No brand colour:
 * the design rule is that brand never appears inside a canvas, and this is
 * a canvas in everything but name. Colours are the --ink / --paper pair, so
 * the panel inverts with the theme the way the tooltip already does, rather
 * than being pinned dark with a literal that utils/themeTokens.test.ts
 * rightly rejects.
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
      out.push({ lo, hi, mid, verdict: `arr[${mid}] = ${value}, found`, done: true })
      break
    }
    if (value < TARGET) {
      out.push({ lo, hi, mid, verdict: `arr[${mid}] = ${value} < ${TARGET}, go right` })
      lo = mid + 1
    } else {
      out.push({ lo, hi, mid, verdict: `arr[${mid}] = ${value} > ${TARGET}, go left` })
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
    // Reduced motion gets the solved state outright: a loop that restarts
    // every few seconds in the corner of the eye is exactly what that
    // preference is asking not to see.
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
    <figure className="flex flex-col gap-3" aria-label={`Binary search for ${TARGET}: ${frame.verdict}`}>
      <figcaption className="font-mono text-[11px] tracking-[0.02em] text-paper/45">
        binary search, target {TARGET}
      </figcaption>

      <div className="flex gap-1" aria-hidden="true">
        {DATA.map((value, position) => {
          const inRange = position >= frame.lo && position <= frame.hi
          const isMid = position === frame.mid
          return (
            <div
              key={position}
              className={[
                'flex h-9 flex-1 items-center justify-center rounded-[3px] font-mono text-[12px] transition-all duration-300',
                isMid
                  ? 'bg-paper text-ink'
                  : inRange
                    ? 'bg-paper/[0.14] text-paper/80'
                    : 'bg-paper/[0.04] text-paper/25',
                isMid && frame.done ? 'ring-2 ring-paper/60' : '',
              ].join(' ')}
            >
              {value}
            </div>
          )
        })}
      </div>

      {/* Fixed height: the verdict lines differ in length, and a box that
          resizes each step makes the whole panel twitch. */}
      <p className="flex h-5 items-center font-mono text-[11px] text-paper/70" aria-hidden="true">
        {frame.verdict}
      </p>
    </figure>
  )
}
