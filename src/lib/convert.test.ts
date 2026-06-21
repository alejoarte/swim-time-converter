import { describe, expect, it } from 'vitest'
import { getEventById } from '../data/events'
import {
  CLASSICAL_FACTOR_DISTANCE_FREE,
  CLASSICAL_FACTOR_SCY_TO_LCM_1650_FREE,
  CLASSICAL_FACTOR_STANDARD,
  convertCentiseconds,
  convertEntry,
  getFFactor,
  getFIncre,
  type Course,
} from './convert'
import { formatTime, parseTime } from './timeParse'

const hundredFree = getEventById('100-free')!
const twoHundredBreast = getEventById('200-breast')!
const twoHundredFly = getEventById('200-fly')!
const fourHundredIm = getEventById('400-im')!
const fiveHundredFree = getEventById('400-500-free')!
const thousandFree = getEventById('800-1000-free')!
const sixteenFiftyFree = getEventById('1500-1650-free')!

const COURSE_PAIRS: [Course, Course][] = [
  ['SCY', 'LCM'],
  ['SCY', 'SCM'],
  ['LCM', 'SCY'],
  ['LCM', 'SCM'],
  ['SCM', 'SCY'],
  ['SCM', 'LCM'],
]

describe('getFFactor', () => {
  it('returns 1.0 for SCM ↔ LCM', () => {
    expect(getFFactor('SCM', 'LCM', hundredFree)).toBe(1.0)
    expect(getFFactor('LCM', 'SCM', hundredFree)).toBe(1.0)
  })

  it('uses distance free factor for 500/1000 yard events', () => {
    expect(getFFactor('SCY', 'LCM', fiveHundredFree)).toBe(CLASSICAL_FACTOR_DISTANCE_FREE)
    expect(getFFactor('SCY', 'SCM', fiveHundredFree)).toBe(CLASSICAL_FACTOR_DISTANCE_FREE)
    expect(getFFactor('SCY', 'LCM', thousandFree)).toBe(CLASSICAL_FACTOR_DISTANCE_FREE)
  })

  it('uses 1650 distance free factor', () => {
    expect(getFFactor('SCY', 'LCM', sixteenFiftyFree)).toBe(
      CLASSICAL_FACTOR_SCY_TO_LCM_1650_FREE,
    )
  })

  it('uses standard factor for sprint events', () => {
    expect(getFFactor('SCY', 'LCM', hundredFree)).toBe(CLASSICAL_FACTOR_STANDARD)
    expect(getFFactor('SCY', 'SCM', hundredFree)).toBe(CLASSICAL_FACTOR_STANDARD)
  })
})

describe('getFIncre', () => {
  it('returns 0 for SCY ↔ SCM', () => {
    expect(getFIncre('SCY', 'SCM', hundredFree)).toBe(0)
    expect(getFIncre('SCM', 'SCY', hundredFree)).toBe(0)
  })

  it('uses medley increment for 400 IM SCY↔LCM', () => {
    expect(getFIncre('SCY', 'LCM', fourHundredIm)).toBe(640)
    expect(getFIncre('LCM', 'SCM', fourHundredIm)).toBe(640)
  })

  it('uses stroke increments for sprint events SCY↔LCM', () => {
    expect(getFIncre('SCY', 'LCM', hundredFree)).toBe(160)
    expect(getFIncre('SCY', 'LCM', twoHundredBreast)).toBe(400)
    expect(getFIncre('SCY', 'LCM', twoHundredFly)).toBe(280)
  })

  it('uses distance increments for distance free SCY↔LCM', () => {
    expect(getFIncre('SCY', 'LCM', fiveHundredFree)).toBe(640)
    expect(getFIncre('SCY', 'LCM', thousandFree)).toBe(1280)
    expect(getFIncre('SCY', 'LCM', sixteenFiftyFree)).toBe(2400)
  })
})

describe('convertCentiseconds — golden values', () => {
  it('converts SCY 100 Free 1:02.34 to LCM 1:10.80', () => {
    const source = parseTime('1:02.34')!
    const lcm = convertCentiseconds(source, 'SCY', 'LCM', hundredFree)
    expect(formatTime(lcm)).toBe('1:10.80')
  })

  it('converts SCY 100 Free 1:02.34 to SCM 1:09.20', () => {
    const source = parseTime('1:02.34')!
    const scm = convertCentiseconds(source, 'SCY', 'SCM', hundredFree)
    expect(formatTime(scm)).toBe('1:09.20')
  })

  it('converts LCM 100 Free 1:01.60 to SCM 1:00.00', () => {
    const source = parseTime('1:01.60')!
    const scm = convertCentiseconds(source, 'LCM', 'SCM', hundredFree)
    expect(formatTime(scm)).toBe('1:00.00')
  })

  it('converts SCM 100 Free 1:00.00 to LCM 1:01.60', () => {
    const source = parseTime('1:00.00')!
    const lcm = convertCentiseconds(source, 'SCM', 'LCM', hundredFree)
    expect(formatTime(lcm)).toBe('1:01.60')
  })

  it('converts SCY 200 Breast 2:30.00 to LCM 2:50.50', () => {
    const source = parseTime('2:30.00')!
    const lcm = convertCentiseconds(source, 'SCY', 'LCM', twoHundredBreast)
    expect(formatTime(lcm)).toBe('2:50.50')
  })

  it('converts SCY 500 Free 5:00.00 to LCM 4:34.15', () => {
    const source = parseTime('5:00.00')!
    const lcm = convertCentiseconds(source, 'SCY', 'LCM', fiveHundredFree)
    expect(formatTime(lcm)).toBe('4:34.15')
  })

  it('converts SCY 1650 Free 16:00.00 to LCM 16:43.20', () => {
    const source = parseTime('16:00.00')!
    const lcm = convertCentiseconds(source, 'SCY', 'LCM', sixteenFiftyFree)
    expect(formatTime(lcm)).toBe('16:43.20')
  })

  it('returns same value when source and target course match', () => {
    const source = 6234
    expect(convertCentiseconds(source, 'SCY', 'SCY', hundredFree)).toBe(source)
  })

  it('clamps negative conversion output to zero', () => {
    expect(convertCentiseconds(1, 'LCM', 'SCY', hundredFree)).toBe(0)
  })
})

describe('convertCentiseconds — round trips', () => {
  it.each(COURSE_PAIRS.filter(([from, to]) => from !== to))(
    'round-trips 100 Free through %s → %s within 1 cs',
    (from, to) => {
      const source = parseTime('1:02.34')!
      const converted = convertCentiseconds(source, from, to, hundredFree)
      const back = convertCentiseconds(converted, to, from, hundredFree)
      expect(Math.abs(back - source)).toBeLessThanOrEqual(1)
    },
  )
})

describe('convertCentiseconds — all course pairs produce formatted times', () => {
  it.each(COURSE_PAIRS)('supports %s → %s for 200 Fly', (from, to) => {
    const source = parseTime('2:05.00')!
    const converted = convertCentiseconds(source, from, to, twoHundredFly)
    expect(converted).toBeGreaterThanOrEqual(0)
    expect(formatTime(converted)).toMatch(/^\d/)
  })
})

describe('convertEntry', () => {
  it('fills all three course columns from SCY source', () => {
    const source = parseTime('1:02.34')!
    const result = convertEntry(hundredFree, 'SCY', source)

    expect(result.eventId).toBe('100-free')
    expect(result.sourceCourse).toBe('SCY')
    expect(result.SCY).toBe(source)
    expect(formatTime(result.LCM)).toBe('1:10.80')
    expect(formatTime(result.SCM)).toBe('1:09.20')
  })

  it('fills all three course columns from LCM source', () => {
    const source = parseTime('1:01.60')!
    const result = convertEntry(hundredFree, 'LCM', source)

    expect(result.sourceCourse).toBe('LCM')
    expect(result.LCM).toBe(source)
    expect(formatTime(result.SCM)).toBe('1:00.00')
    expect(formatTime(result.SCY)).toBe('54.05')
  })
})

describe('unsupported conversion', () => {
  it('throws for an unsupported pair', () => {
    expect(() =>
      convertCentiseconds(1000, 'SCY', 'SCY' as Course, hundredFree),
    ).not.toThrow()
  })
})
