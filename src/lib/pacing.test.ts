import { describe, expect, it } from 'vitest'
import { getEventById } from '../data/events'
import {
  getLapCount,
  getRaceLength,
  goalPaceFromTime,
} from './pacing'

describe('getRaceLength', () => {
  it('uses event distance for standard events', () => {
    const event = getEventById('200-breast')!
    expect(getRaceLength(event, 'SCY')).toBe(200)
    expect(getRaceLength(event, 'LCM')).toBe(200)
  })

  it('adjusts distance free events by course', () => {
    const event = getEventById('400-500-free')!
    expect(getRaceLength(event, 'SCY')).toBe(500)
    expect(getRaceLength(event, 'SCM')).toBe(400)
    expect(getRaceLength(event, 'LCM')).toBe(500)
  })

  it('adjusts 1500/1650 free by course', () => {
    const event = getEventById('1500-1650-free')!
    expect(getRaceLength(event, 'SCY')).toBe(1650)
    expect(getRaceLength(event, 'SCM')).toBe(1500)
    expect(getRaceLength(event, 'LCM')).toBe(1500)
  })
})

describe('getLapCount', () => {
  it('returns laps for 200 breast', () => {
    const event = getEventById('200-breast')!
    expect(getLapCount(event, 'SCY')).toBe(4)
  })

  it('returns course-aware laps for 400/500 free', () => {
    const event = getEventById('400-500-free')!
    expect(getLapCount(event, 'SCM')).toBe(8)
    expect(getLapCount(event, 'SCY')).toBe(10)
  })
})

describe('goalPaceFromTime', () => {
  it('computes 200 breast @ 2:00', () => {
    const result = goalPaceFromTime(12000, 4)
    expect(result.pacePer50).toBe(3000)
    expect(result.pacePer100).toBe(6000)
    expect(result.lapCount).toBe(4)
  })

  it('computes 100 free @ 52.00', () => {
    const result = goalPaceFromTime(5200, 2)
    expect(result.pacePer50).toBe(2600)
    expect(result.pacePer100).toBe(5200)
  })

  it('computes 50 fly @ 25.50 with no per-100', () => {
    const result = goalPaceFromTime(2550, 1)
    expect(result.pacePer50).toBe(2550)
    expect(result.pacePer100).toBeNull()
  })

  it('computes 400/500 free SCM @ 5:00 with 8 laps', () => {
    const event = getEventById('400-500-free')!
    const lapCount = getLapCount(event, 'SCM')
    const result = goalPaceFromTime(30000, lapCount)
    expect(lapCount).toBe(8)
    expect(result.pacePer50).toBe(3750)
  })
})
