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

// Design Phase 1B: brand colour never appears inside a canvas. Canvas colour
// means algorithm state and nothing else; brand means "you can interact with
// this". Covers the brand tokens, every utility built on them (primary is the
// shadcn alias of brand), and the indigo/violet hexes the brand replaced.
// text-text-primary and dark-text-primary are ink, not brand, and do not match.
const BRAND_IN_CANVAS = [
  /--brand\b|brand-soft|brand-hover/,
  /var\(--(?:color-)?(?:primary|accent|ring|tone-indigo[\w-]*)\)/,
  /(?<![\w-])(?:[a-z-]+:)*(?:bg|text|border|ring|fill|stroke|outline|from|via|to|shadow|decoration|caret|accent|divide|placeholder)-(?:brand(?:-[\w]+)?|primary(?:-(?:light|hover|foreground))?|dark-primary|tone-indigo[\w-]*|accent(?:-foreground)?)(?![\w-])/,
  /#(?:4538d4|3a2ebd|eeebfb|7c6cf0|9385f4|1e1b3a|4f46e5|4338ca|3730a3|6366f1|585ce8|7c3aed)\b/i,
  /rgba?\(\s*(?:55,\s*48,\s*163|79,\s*70,\s*229|124,\s*58,\s*237)\b/,
]

const CANVAS_SOURCES = import.meta.glob<string>(['../components/canvas/**/*.{ts,tsx}', '!../**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('canvas colour', () => {
  const canvasFiles = Object.entries(CANVAS_SOURCES).map(([path, source]) => [path.replace('../', ''), source] as const)

  it('scans the canvas folder', () => {
    expect(canvasFiles.length).toBeGreaterThan(15)
  })

  it('never uses a brand colour inside a canvas', () => {
    const offenders = canvasFiles.flatMap(([file, source]) =>
      source.split(/\r?\n/).flatMap((line, index) =>
        BRAND_IN_CANVAS.flatMap((pattern) => {
          const match = pattern.exec(line)
          return match ? [`${file}:${index + 1} ${match[0]} - use a --state-* token`] : []
        }),
      ),
    )
    expect(offenders).toEqual([])
  })

  it('catches the patterns it claims to', () => {
    const hits = (line: string) => BRAND_IN_CANVAS.some((pattern) => pattern.test(line))
    for (const bad of ["'bg-primary'", 'dark:text-dark-primary', 'fill-primary', 'bg-brand-soft', 'stroke="#3730a3"', "'rgba(55, 48, 163, 0.6)'", 'var(--color-primary)']) {
      expect(hits(bad), bad).toBe(true)
    }
    for (const ok of ['text-text-primary', 'dark:text-dark-text-primary', 'fill-text-primary', 'bg-state-current', 'var(--state-swap)']) {
      expect(hits(ok), ok).toBe(false)
    }
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
