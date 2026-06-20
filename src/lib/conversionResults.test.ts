import { describe, expect, it } from 'vitest'
import { buildConversionResults, hasAnyTimeEntry } from './conversionResults'
import { EMPTY_TIME_PARTS } from './timeParse'

describe('buildConversionResults', () => {
  it('returns null when no events are selected', () => {
    expect(buildConversionResults([], {}, 'SCY')).toBeNull()
  })

  it('returns null when a selected event has an invalid time', () => {
    expect(
      buildConversionResults(['100-free'], { '100-free': { minutes: '', seconds: '62', hundredths: '' } }, 'SCY'),
    ).toBeNull()
  })

  it('builds conversion rows for valid entries', () => {
    const results = buildConversionResults(
      ['100-free'],
      { '100-free': { minutes: '1', seconds: '02', hundredths: '34' } },
      'SCY',
    )

    expect(results).toHaveLength(1)
    expect(results?.[0]?.eventId).toBe('100-free')
    expect(results?.[0]?.LCM).toBeGreaterThan(results?.[0]?.SCY ?? 0)
  })
})

describe('hasAnyTimeEntry', () => {
  it('detects partially entered times', () => {
    expect(
      hasAnyTimeEntry(['100-free'], {
        '100-free': { minutes: '', seconds: '45', hundredths: '' },
      }),
    ).toBe(true)
    expect(hasAnyTimeEntry(['100-free'], { '100-free': EMPTY_TIME_PARTS })).toBe(false)
  })
})
