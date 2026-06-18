import { describe, expect, it } from 'vitest'
import { getEventById } from '../data/events'
import {
  CLASSICAL_FACTOR_DISTANCE_FREE,
  CLASSICAL_FACTOR_STANDARD,
  convertCentiseconds,
  convertEntry,
  getFFactor,
  getFIncre,
} from './convert'
import { formatTime, parseTime } from './timeParse'

const hundredFree = getEventById('100-free')!
const fiveHundredFree = getEventById('400-500-free')!
const fourHundredIm = getEventById('400-im')!

describe('getFFactor', () => {
  it('returns 1.0 for SCM ↔ LCM', () => {
    expect(getFFactor('SCM', 'LCM', hundredFree)).toBe(1.0)
    expect(getFFactor('LCM', 'SCM', hundredFree)).toBe(1.0)
  })

  it('uses distance free factor for 500/1000 yard events on SCY↔LCM', () => {
    expect(getFFactor('SCY', 'LCM', fiveHundredFree)).toBe(CLASSICAL_FACTOR_DISTANCE_FREE)
  })

  it('uses standard factor for sprint events', () => {
    expect(getFFactor('SCY', 'LCM', hundredFree)).toBe(CLASSICAL_FACTOR_STANDARD)
  })
})

describe('getFIncre', () => {
  it('returns 0 for SCY ↔ SCM', () => {
    expect(getFIncre('SCY', 'SCM', hundredFree)).toBe(0)
    expect(getFIncre('SCM', 'SCY', hundredFree)).toBe(0)
  })

  it('uses medley increment for 400 IM SCY↔LCM', () => {
    expect(getFIncre('SCY', 'LCM', fourHundredIm)).toBe(640)
  })
})

describe('convertCentiseconds', () => {
  it('converts SCY 100 Free 1:02.34 to LCM ~1:10.80', () => {
    const source = parseTime('1:02.34')!
    const lcm = convertCentiseconds(source, 'SCY', 'LCM', hundredFree)
    expect(formatTime(lcm)).toBe('1:10.80')
  })

  it('returns same value when source and target course match', () => {
    const source = 6234
    expect(convertCentiseconds(source, 'SCY', 'SCY', hundredFree)).toBe(source)
  })

  it('converts via LCM when going SCY → SCM', () => {
    const source = parseTime('1:02.34')!
    const scm = convertCentiseconds(source, 'SCY', 'SCM', hundredFree)
    expect(scm).toBeGreaterThan(source)
    expect(formatTime(scm)).toMatch(/^\d/)
  })
})

describe('convertEntry', () => {
  it('fills all three course columns from SCY source', () => {
    const source = parseTime('1:02.34')!
    const result = convertEntry(hundredFree, 'SCY', source)

    expect(result.eventId).toBe('100-free')
    expect(result.sourceCourse).toBe('SCY')
    expect(result.SCY).toBe(source)
    expect(result.LCM).toBeGreaterThan(result.SCY)
    expect(result.SCM).toBeGreaterThan(result.SCY)
  })
})
