import { describe, expect, it } from 'vitest'
import { getEventById } from '../data/events'
import { convertCentiseconds } from './convert'
import {
  EMPTY_TIME_PARTS,
  formatTime,
  getTimePartsError,
  isTimePartsEmpty,
  isValidTimeParts,
  normalizeTimeParts,
  parseTime,
  partsToCentiseconds,
  type TimeParts,
} from './timeParse'

describe('timeParse', () => {
  it('parses MM:SS.hh format', () => {
    expect(parseTime('1:02.34')).toBe(6234)
    expect(parseTime('0:52.10')).toBe(5210)
  })

  it('parses SS.hh format', () => {
    expect(parseTime('52.10')).toBe(5210)
    expect(parseTime('83.45')).toBe(8345)
  })

  it('parses times without hundredths', () => {
    expect(parseTime('1:23')).toBe(8300)
  })

  it('parses comma decimal separators', () => {
    expect(parseTime('59,24')).toBe(5924)
    expect(parseTime('5:33,02')).toBe(33302)
    expect(parseTime('37,30')).toBe(3730)
  })

  it('rejects invalid input', () => {
    expect(parseTime('')).toBeNull()
    expect(parseTime('abc')).toBeNull()
    expect(parseTime('1:62.00')).toBeNull()
  })

  it('formats centiseconds back to display time', () => {
    expect(formatTime(6234)).toBe('1:02.34')
    expect(formatTime(5210)).toBe('52.10')
  })
})

describe('timeParts', () => {
  it('converts parts to centiseconds', () => {
    expect(partsToCentiseconds({ minutes: '', seconds: '52', hundredths: '10' })).toBe(
      5210,
    )
    expect(partsToCentiseconds({ minutes: '1', seconds: '02', hundredths: '34' })).toBe(
      6234,
    )
  })

  it('treats empty fields as zero when at least one part is given', () => {
    expect(partsToCentiseconds({ minutes: '', seconds: '52', hundredths: '' })).toBe(
      5200,
    )
    expect(partsToCentiseconds({ minutes: '0', seconds: '52', hundredths: '10' })).toBe(
      5210,
    )
    expect(partsToCentiseconds({ minutes: '1', seconds: '', hundredths: '' })).toBe(6000)
    expect(partsToCentiseconds({ minutes: '', seconds: '', hundredths: '34' })).toBe(34)
  })

  it('rejects invalid parts', () => {
    expect(partsToCentiseconds(EMPTY_TIME_PARTS)).toBeNull()
    expect(partsToCentiseconds({ minutes: '', seconds: '62', hundredths: '00' })).toBeNull()
    expect(partsToCentiseconds({ minutes: '', seconds: '52', hundredths: '100' })).toBeNull()
    expect(partsToCentiseconds({ minutes: 'x', seconds: '52', hundredths: '10' })).toBeNull()
  })

  it('validates and normalizes parts', () => {
    const parts: TimeParts = { minutes: '1', seconds: '2', hundredths: '5' }
    expect(isValidTimeParts(parts)).toBe(true)
    expect(normalizeTimeParts(parts)).toEqual({
      minutes: '1',
      seconds: '02',
      hundredths: '05',
    })
    expect(normalizeTimeParts({ minutes: '', seconds: '52', hundredths: '' })).toEqual({
      minutes: '0',
      seconds: '52',
      hundredths: '00',
    })
    expect(normalizeTimeParts(EMPTY_TIME_PARTS)).toEqual(EMPTY_TIME_PARTS)
    expect(isTimePartsEmpty(EMPTY_TIME_PARTS)).toBe(true)
  })

  it('returns specific errors', () => {
    expect(getTimePartsError(EMPTY_TIME_PARTS)).toBe('empty')
    expect(getTimePartsError({ minutes: '1', seconds: '', hundredths: '' })).toBeNull()
    expect(getTimePartsError({ minutes: '', seconds: '62', hundredths: '' })).toBe(
      'seconds_range',
    )
    expect(getTimePartsError({ minutes: '', seconds: '52', hundredths: '100' })).toBe(
      'hundredths_range',
    )
  })
})

describe('convertCentiseconds', () => {
  it('returns same time when courses match', () => {
    const event = getEventById('100-free')!
    expect(convertCentiseconds(6234, 'SCY', 'SCY', event)).toBe(6234)
  })

  it('converts 100 Free SCY to LCM with Classical factors', () => {
    const event = getEventById('100-free')!
    const result = convertCentiseconds(6234, 'SCY', 'LCM', event)
    // 6234 * 1.11 + 160 = 7079.74 → 1:10.80
    expect(formatTime(result)).toBe('1:10.80')
  })

  it('converts 100 Free SCY to SCM with flat 1.11 factor', () => {
    const event = getEventById('100-free')!
    const result = convertCentiseconds(6234, 'SCY', 'SCM', event)
    // 6234 * 1.11 = 6919.74 → 1:09.20
    expect(formatTime(result)).toBe('1:09.20')
  })

  it('converts 50 Fly SCY to LCM', () => {
    const event = getEventById('50-fly')!
    const result = convertCentiseconds(2500, 'SCY', 'LCM', event)
    // 2500 * 1.11 + 70 = 2845 → 28.45
    expect(formatTime(result)).toBe('28.45')
  })

  it('round-trips SCY → LCM → SCY approximately', () => {
    const event = getEventById('200-free')!
    const original = 9500
    const lcm = convertCentiseconds(original, 'SCY', 'LCM', event)
    const back = convertCentiseconds(lcm, 'LCM', 'SCY', event)
    expect(Math.abs(back - original)).toBeLessThanOrEqual(2)
  })

  it('converts 400 IM SCY to LCM', () => {
    const event = getEventById('400-im')!
    const result = convertCentiseconds(30000, 'SCY', 'LCM', event)
    // 30000 * 0.8925 + 640 = 27415 → 4:34.15
    expect(formatTime(result)).toBe('4:34.15')
  })
})
