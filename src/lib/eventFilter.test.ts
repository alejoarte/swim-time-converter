import { describe, expect, it } from 'vitest'
import englishSample from './parsePdf/fixtures/hytek-sample.txt?raw'
import { filterRowsByEventKeys, getUniqueEvents } from './eventFilter'
import { parsePdfText } from './parsePdf/parsePdfText'

describe('eventFilter', () => {
  it('lists unique events and filters rows by selection', () => {
    const { rows } = parsePdfText(englishSample)
    const events = getUniqueEvents(rows)
    expect(events.length).toBeGreaterThan(1)

    const firstKey = events[0].key
    const filtered = filterRowsByEventKeys(rows, new Set([firstKey]))
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every((r) => (r.eventId ?? r.eventLabel) === firstKey)).toBe(true)
  })
})
