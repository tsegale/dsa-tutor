/** LOW scaffolding shows a one-sentence mistake analysis only. */
export function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/)
  return match ? match[0].trim() : text.trim()
}
