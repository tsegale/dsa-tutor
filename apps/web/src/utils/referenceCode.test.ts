import { describe, expect, it } from 'vitest'
import { PSEUDOCODE } from './pseudocode'
import { REFERENCE_CODE, getCodeView, type ReferenceLanguage } from './referenceCode'

const CODED_LANGUAGES: ReferenceLanguage[] = ['python', 'java', 'cpp']

describe('Multi-language reference code coverage', () => {
  it('provides Python, Java, and C++ snippets aligned to every topic in PSEUDOCODE', () => {
    const slugs = Object.keys(PSEUDOCODE)
    expect(slugs.length).toBeGreaterThanOrEqual(73)

    for (const slug of slugs) {
      const pseudoLines = PSEUDOCODE[slug]!
      const ref = REFERENCE_CODE[slug]
      expect(ref, `missing REFERENCE_CODE for ${slug}`).toBeDefined()

      for (const lang of CODED_LANGUAGES) {
        const snippet = ref![lang as 'python' | 'java' | 'cpp']
        expect(snippet.lines.length, `${slug}/${lang} lines`).toBeGreaterThanOrEqual(3)
        expect(snippet.stepToLine.length, `${slug}/${lang} stepToLine length vs pseudocode`).toBe(pseudoLines.length)

        for (let step = 0; step < pseudoLines.length; step++) {
          const view = getCodeView(slug, lang)
          const mapped = view?.activeLineFor(step) ?? null
          expect(mapped, `${slug}/${lang} step ${step}`).not.toBeNull()
          expect(mapped!).toBeGreaterThanOrEqual(0)
          expect(mapped!).toBeLessThan(snippet.lines.length)
        }

        for (const line of snippet.lines) {
          expect(line, `${slug}/${lang} em/en dash forbidden`).not.toMatch(/[\u2013\u2014]/)
        }
      }
    }
  })
})
