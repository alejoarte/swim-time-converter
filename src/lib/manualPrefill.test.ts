import { describe, expect, it } from 'vitest'
import type { ParsedRow } from './parsePdf/types'
import { buildManualPrefill } from './manualPrefill'
import { swimmerKey } from './swimmerFilter'

function makeRow(overrides: Partial<ParsedRow> & Pick<ParsedRow, 'swimmerName'>): ParsedRow {
  return {
    id: 'row-1',
    eventLabel: '100 Free',
    eventId: '100-free',
    sourceCourse: 'LCM',
    rawTime: '1:00.00',
    timeCentiseconds: 6000,
    status: 'ok',
    issues: [],
    included: true,
    ...overrides,
  }
}

describe('buildManualPrefill', () => {
  it('returns null when more than one swimmer is selected', () => {
    const rows = [
      makeRow({ id: 'a', swimmerName: 'A' }),
      makeRow({ id: 'b', swimmerName: 'B' }),
    ]
    const keys = new Set(rows.map(swimmerKey))
    expect(buildManualPrefill(rows, keys, 'LCM')).toBeNull()
  })

  it('builds entries for a single swimmer with valid events', () => {
    const rows = [
      makeRow({ id: 'row-1', swimmerName: 'Andres Garcia', eventId: '100-free' }),
      makeRow({
        id: 'row-2',
        swimmerName: 'Andres Garcia',
        eventId: '200-free',
        eventLabel: '200 Free',
        rawTime: '2:10.00',
        timeCentiseconds: 13000,
      }),
      makeRow({
        id: 'row-3',
        swimmerName: 'Andres Garcia',
        eventId: '100-free',
        rawTime: '59.00',
        timeCentiseconds: 5900,
      }),
    ]
    const key = swimmerKey(rows[0])
    const prefill = buildManualPrefill(rows, new Set([key]), 'SCY')
    expect(prefill).toEqual({
      sourceCourse: 'SCY',
      entries: [
        { eventId: '100-free', rawTime: '1:00.00' },
        { eventId: '200-free', rawTime: '2:10.00' },
      ],
    })
  })

  it('returns null when swimmer has no importable rows', () => {
    const rows = [
      makeRow({
        swimmerName: 'Andres Garcia',
        eventId: null,
        rawTime: 'bad',
        timeCentiseconds: null,
      }),
    ]
    const key = swimmerKey(rows[0])
    expect(buildManualPrefill(rows, new Set([key]), 'LCM')).toBeNull()
  })
})
