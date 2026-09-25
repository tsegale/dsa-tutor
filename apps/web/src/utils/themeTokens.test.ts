import { describe, expect, it } from 'vitest'
import hexBaseline from './hexBaseline.json'

// Regression guard for Week 1 1B.3: these literal classes cannot flip with
// the .dark theme, which is how 34 files ended up rendering white panels on
// the dark workspace. Use bg-background (page), bg-card (cards, rails,
// panels) or bg-popover (menus, tooltips, toasts, modals) instead.
// Translucent overlays such as bg-white/[0.08] are deliberate tints on a
// fixed-colour surface and stay allowed.
const LITERAL_COLOUR = /\b(bg-white|text-black|bg-gray-50|bg-slate-50)\b(?!\/)/g

// Raw hex colours (Week 1 addendum A3). Colours belong in index.css as
// tokens, where they can have a dark variant; hex in a component is how the
// dashboard ended up with light tiles and unreadable indigo text in dark.
const HEX_COLOUR = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g

/**
 * Files allowed raw hex permanently, each with the reason. Keep this list
 * short and keep the reasons: in a month nobody will remember why.
 */
const HEX_ALLOWLIST: Record<string, string> = {
  // The pathfinding grid stays a light board in both themes on purpose:
  // walls are #2d3748, and darkening the empty cells to match the dark theme
  // would make the walls - the whole content of the grid - disappear.
  'components/canvas/GridCanvas.tsx': 'light board by design; dark empty cells would hide the walls',
}

// Read as raw text through Vite, so the guard needs no Node typings in the
// app tsconfig. Test files are excluded - they may name the banned classes.
const SOURCES = import.meta.glob<string>(
  ['../components/**/*.{ts,tsx}', '../pages/**/*.{ts,tsx}', '!../**/*.test.ts'],
  { query: '?raw', import: 'default', eager: true },
)

const files = Object.entries(SOURCES).map(([path, source]) => [path.replace('../', ''), source] as const)
const baseline = hexBaseline as Record<string, number>

describe('theme tokens', () => {
  it('scans a real file set', () => {
    // An empty glob would make every guard below pass vacuously.
    expect(files.length).toBeGreaterThan(50)
  })

  it('uses no literal colour class that cannot flip with the theme', () => {
    const offenders = files.flatMap(([file, source]) =>
      source
        .split(/\r?\n/)
        .flatMap((line, index) => [...line.matchAll(LITERAL_COLOUR)].map((match) => `${file}:${index + 1} ${match[0]}`)),
    )
    expect(offenders).toEqual([])
  })
})

/**
 * A ratchet, not a ban: about 280 hex literals remain in canvas palettes
 * and brand illustrations, and converting them all before the pilot is not
 * worth the risk. hexBaseline.json freezes each file's current count. A
 * file may never gain hex, a new file may not introduce any, and when a
 * file's count drops the baseline must be lowered to lock the gain in - so
 * the total only ever goes down. To update after converting colours:
 * lower that file's number in hexBaseline.json (or remove the entry at 0).
 */
describe('hex colour ratchet', () => {
  const counts = new Map(
    files
      .filter(([file]) => !(file in HEX_ALLOWLIST))
      .map(([file, source]) => [file, source.match(HEX_COLOUR)?.length ?? 0] as const),
  )

  it('never lets a file gain raw hex colours', () => {
    const grown = [...counts]
      .filter(([file, count]) => count > (baseline[file] ?? 0))
      .map(([file, count]) => `${file}: ${count} hex (baseline ${baseline[file] ?? 0}) - use a token from index.css`)
    expect(grown).toEqual([])
  })

  it('locks in reductions: the baseline must match once a file loses hex', () => {
    const shrunk = [...counts]
      .filter(([file, count]) => file in baseline && count < baseline[file])
      .map(([file, count]) => `${file}: now ${count}, lower hexBaseline.json from ${baseline[file]}`)
    expect(shrunk).toEqual([])
  })

  it('lists no files that no longer exist', () => {
    expect(Object.keys(baseline).filter((file) => !counts.has(file))).toEqual([])
  })

  it('keeps the allowlist pointing at real files', () => {
    const known = new Set(files.map(([file]) => file))
    expect(Object.keys(HEX_ALLOWLIST).filter((file) => !known.has(file))).toEqual([])
  })
})
