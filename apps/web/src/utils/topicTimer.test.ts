import { describe, expect, it } from 'vitest'
import { createTopicTimer } from './topicTimer'

describe('createTopicTimer', () => {
  it('counts wall-clock from the start and active time only while visible', () => {
    const timer = createTopicTimer(0, true)
    timer.setVisible(false, 60_000) // 60s active
    timer.setVisible(true, 300_000) // 240s hidden
    expect(timer.read(330_000)).toEqual({ wallClockSeconds: 330, activeSeconds: 90 })
  })

  it('starts hidden when the page opened in a background tab', () => {
    const timer = createTopicTimer(0, false)
    timer.setVisible(true, 10_000)
    expect(timer.read(40_000)).toEqual({ wallClockSeconds: 40, activeSeconds: 30 })
  })

  it('ignores repeated visibility events and never goes negative', () => {
    const timer = createTopicTimer(1_000, true)
    timer.setVisible(true, 5_000)
    timer.setVisible(false, 11_000)
    timer.setVisible(false, 20_000)
    expect(timer.read(21_000)).toEqual({ wallClockSeconds: 20, activeSeconds: 10 })
    expect(timer.read(0)).toEqual({ wallClockSeconds: 0, activeSeconds: 10 })
  })
})
