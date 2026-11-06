export type ReferenceLanguage = 'pseudocode' | 'python' | 'java' | 'cpp'

export interface LanguageSnippet {
  lines: string[]
  /** Maps each 0-based pseudocodeLine index to a 0-based line index in `lines`. */
  stepToLine: number[]
}

export interface TopicReferenceCode {
  python: LanguageSnippet
  java: LanguageSnippet
  cpp: LanguageSnippet
}

/** Prepends a function/class signature at line 0 so pseudocodeLine `p` maps to `p + 1`. */
export function fn(sig: string, body: string[], footer: string[] = []): LanguageSnippet {
  return {
    lines: [sig, ...body, ...footer],
    stepToLine: body.map((_, i) => i + 1),
  }
}

/** Maps pseudocodeLine `p` directly to `p` when line 0 of pseudocode is itself the signature. */
export function direct(body: string[], footer: string[] = []): LanguageSnippet {
  return {
    lines: [...body, ...footer],
    stepToLine: body.map((_, i) => i),
  }
}
