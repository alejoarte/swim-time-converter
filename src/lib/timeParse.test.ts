import { describe, expect, it } from 'vitest'
import {
  centisecondsToTimeParts,
  formatTime,
  getTimePartsError,
  isValidTimeInput,
  normalizeTimeString,
  parseTime,
  partsToCentiseconds,
  rawTimeToTimeParts,
} from './timeParse'

describe('normalizeTimeString', () => {
  it('replaces comma decimals with dots', () => {
    expect(normalizeTimeString('59,24')).toBe('59.24')
  })
})

describe('parseTime', () => {
  it('parses MM:SS.hh format', () => {
    expect(parseTime('1:02.34')).toBe(6234)
  })

  it('parses comma decimal times', () => {
    expect(parseTime('59,24')).toBe(5924)
  })

  it('parses SS.hh format', () => {
    expect(parseTime('59.24')).toBe(5924)
  })

  it('rejects invalid seconds in colon format', () => {
    expect(parseTime('1:62.00')).toBeNull()
  })

  it('returns null for empty or invalid input', () => {
    expect(parseTime('')).toBeNull()
    expect(parseTime('abc')).toBeNull()
  })
})

describe('formatTime', () => {
  it('formats centiseconds as MM:SS.hh', () => {
    expect(formatTime(6234)).toBe('1:02.34')
  })

  it('formats sub-minute times as SS.hh', () => {
    expect(formatTime(5924)).toBe('59.24')
  })
})

describe('centisecondsToTimeParts', () => {
  it('splits times with minutes', () => {
    expect(centisecondsToTimeParts(6234)).toEqual({
      minutes: '1',
      seconds: '02',
      hundredths: '34',
    })
  })

  it('omits minutes for sub-minute times', () => {
    expect(centisecondsToTimeParts(5924)).toEqual({
      minutes: '',
      seconds: '59',
      hundredths: '24',
    })
  })
})

describe('rawTimeToTimeParts', () => {
  it('round-trips parsed string input', () => {
    expect(rawTimeToTimeParts('1:02.34')).toEqual({
      minutes: '1',
      seconds: '02',
      hundredths: '34',
    })
  })
})

describe('partsToCentiseconds', () => {
  it('converts valid parts to centiseconds', () => {
    expect(partsToCentiseconds({ minutes: '1', seconds: '02', hundredths: '34' })).toBe(
      6234,
    )
  })

  it('returns null for empty parts', () => {
    expect(partsToCentiseconds({ minutes: '', seconds: '', hundredths: '' })).toBeNull()
  })

  it('returns null when seconds are out of range', () => {
    expect(
      partsToCentiseconds({ minutes: '', seconds: '60', hundredths: '00' }),
    ).toBeNull()
  })
})

describe('isValidTimeInput', () => {
  it('accepts valid times and rejects invalid ones', () => {
    expect(isValidTimeInput('1:02.34')).toBe(true)
    expect(isValidTimeInput('not-a-time')).toBe(false)
  })
})

describe('getTimePartsError', () => {
  it('reports empty input', () => {
    expect(getTimePartsError({ minutes: '', seconds: '', hundredths: '' })).toBe('empty')
  })

  it('returns null for valid parts', () => {
    expect(
      getTimePartsError({ minutes: '1', seconds: '02', hundredths: '34' }),
    ).toBeNull()
  })
})
