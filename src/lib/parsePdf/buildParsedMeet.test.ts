import { describe, expect, it } from 'vitest'
import englishSample from './fixtures/hytek-sample.txt?raw'
import { buildParsedMeet } from './buildParsedMeet'
import { parsePdfText } from './parsePdfText'

describe('buildParsedMeet', () => {
  it('groups rows by event and heat', () => {
    const { rows } = parsePdfText(englishSample)
    const meet = buildParsedMeet(rows)

    expect(meet.events.length).toBeGreaterThan(1)
    const firstEvent = meet.events[0]
    expect(firstEvent.eventLabel).toBeTruthy()
    expect(firstEvent.heats.length).toBeGreaterThan(0)
    expect(firstEvent.heats[0].rows.length).toBeGreaterThan(0)

    const totalRows = meet.events.reduce(
      (sum, e) => sum + e.heats.reduce((hSum, h) => hSum + h.rows.length, 0),
      0,
    )
    expect(totalRows).toBe(rows.length)
  })
})
