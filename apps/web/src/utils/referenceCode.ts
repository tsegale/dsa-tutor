import { PSEUDOCODE } from './pseudocode'
import { LINEAR_AND_SORT_REFERENCE_CODE } from './referenceCodeLinearSort'
import { TREES_GRAPHS_PARADIGMS_REFERENCE_CODE } from './referenceCodeTreesGraphsParadigms'
import type { LanguageSnippet, ReferenceLanguage, TopicReferenceCode } from './referenceCodeTypes'

export type { LanguageSnippet, ReferenceLanguage, TopicReferenceCode }

export const REFERENCE_CODE: Record<string, TopicReferenceCode> = Object.fromEntries(
  Object.entries({
    ...LINEAR_AND_SORT_REFERENCE_CODE,
    ...TREES_GRAPHS_PARADIGMS_REFERENCE_CODE,
  }).map(([slug, entry]) => {
    const targetLen = PSEUDOCODE[slug]?.length
    if (!targetLen) return [slug, entry]
    const trim = (s: LanguageSnippet): LanguageSnippet => ({
      lines: s.lines,
      stepToLine: s.stepToLine.slice(0, targetLen),
    })
    return [slug, { python: trim(entry.python), java: trim(entry.java), cpp: trim(entry.cpp) }]
  }),
)

export function getCodeView(
  slug: string | undefined,
  lang: ReferenceLanguage,
): { lines: string[]; activeLineFor: (pseudocodeLine: number | null | undefined) => number | null } | null {
  if (!slug) return null
  if (lang === 'pseudocode') {
    const lines = PSEUDOCODE[slug]
    if (!lines) return null
    return {
      lines,
      activeLineFor: (p) => (typeof p === 'number' && p >= 0 && p < lines.length ? p : null),
    }
  }
  const ref = REFERENCE_CODE[slug]
  if (!ref) return null
  const snippet: LanguageSnippet = ref[lang]
  return {
    lines: snippet.lines,
    activeLineFor: (p) => {
      if (typeof p !== 'number' || p < 0) return null
      if (p < snippet.stepToLine.length) return snippet.stepToLine[p] ?? null
      return Math.min(snippet.lines.length - 1, p)
    },
  }
}
