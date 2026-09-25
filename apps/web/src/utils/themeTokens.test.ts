import { describe, expect, it } from 'vitest'

// Regression guard for Week 1 1B.3: these literal classes cannot flip with
// the .dark theme, which is how 34 files ended up rendering white panels on
// the dark workspace. Use bg-background (page), bg-card (cards, rails,
// panels) or bg-popover (menus, tooltips, toasts, modals) instead.
// Translucent overlays such as bg-white/[0.08] are deliberate tints on a
// fixed-colour surface and stay allowed.
const LITERAL_COLOUR = /\b(bg-white|text-black|bg-gray-50|bg-slate-50)\b(?!\/)/g

// Read as raw text through Vite, so the guard needs no Node typings in the
// app tsconfig. Test files are excluded - they may name the banned classes.
const SOURCES = import.meta.glob<string>(
  ['../components/**/*.{ts,tsx}', '../pages/**/*.{ts,tsx}', '!../**/*.test.ts'],
  { query: '?raw', import: 'default', eager: true },
)

describe('theme tokens', () => {
  const files = Object.entries(SOURCES)

  it('scans a real file set', () => {
    // An empty glob would make the guard below pass vacuously.
    expect(files.length).toBeGreaterThan(50)
  })

  it('uses no literal colour class that cannot flip with the theme', () => {
    const offenders = files.flatMap(([file, source]) =>
      source
        .split(/\r?\n/)
        .flatMap((line, index) =>
          [...line.matchAll(LITERAL_COLOUR)].map((match) => `${file.replace('../', '')}:${index + 1} ${match[0]}`),
        ),
    )
    expect(offenders).toEqual([])
  })
})
