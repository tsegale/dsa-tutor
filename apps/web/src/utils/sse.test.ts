import { describe, expect, it } from 'vitest'
import { parseSseEvents } from './sse'

describe('parseSseEvents', () => {
  it('parses complete events and keeps the incomplete tail', () => {
    const { events, rest } = parseSseEvents('event: delta\ndata: {"text":"a"}\n\nevent: fin')
    expect(events).toEqual([{ event: 'delta', data: '{"text":"a"}' }])
    expect(rest).toBe('event: fin')
  })

  it('reassembles an event split across chunks', () => {
    const first = parseSseEvents('event: final\ndata: {"ok"')
    expect(first.events).toEqual([])
    const second = parseSseEvents(first.rest + ':true}\n\n')
    expect(second.events).toEqual([{ event: 'final', data: '{"ok":true}' }])
    expect(second.rest).toBe('')
  })

  it('handles CRLF line endings, multi-line data and comments', () => {
    const { events } = parseSseEvents(': keep-alive\r\n\r\nevent: delta\r\ndata: line1\r\ndata: line2\r\n\r\n')
    expect(events).toEqual([{ event: 'delta', data: 'line1\nline2' }])
  })

  it('defaults the event name to message', () => {
    expect(parseSseEvents('data: x\n\n').events).toEqual([{ event: 'message', data: 'x' }])
  })
})
