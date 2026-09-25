export interface SseEvent {
  event: string
  data: string
}

/**
 * Splits a growing server-sent-events buffer into complete events. Returns
 * the parsed events plus whatever trailing text is not yet a complete
 * event, to be prepended to the next chunk. Handles \r\n line endings and
 * multi-line data fields per the SSE spec; comment lines are ignored.
 */
export function parseSseEvents(buffer: string): { events: SseEvent[]; rest: string } {
  const normalised = buffer.replace(/\r\n/g, '\n')
  const blocks = normalised.split('\n\n')
  const rest = blocks.pop() ?? ''
  const events: SseEvent[] = []
  for (const block of blocks) {
    let event = 'message'
    const data: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith(':') || line === '') continue
      const colon = line.indexOf(':')
      const field = colon === -1 ? line : line.slice(0, colon)
      const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '')
      if (field === 'event') event = value
      else if (field === 'data') data.push(value)
    }
    if (data.length > 0) events.push({ event, data: data.join('\n') })
  }
  return { events, rest }
}
