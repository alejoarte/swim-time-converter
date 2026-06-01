import { describe, expect, it } from 'vitest'
import laneFirstSample from './fixtures/hytek-es-lane-first-sample.txt?raw'
import spanishSample from './fixtures/hytek-es-sample.txt?raw'
import { inferRowLayout } from './inferRowLayout'
import { normalizePdfText } from './normalizePdfText'
import { parseLaneFirstTimeLastLine } from './rowLayouts'
import type { EventRowContext } from './types'

const free200Ctx: EventRowContext = {
  eventLabel: '200 Free',
  eventId: '200-free',
  sourceCourse: 'LCM',
  isRelay: false,
}

describe('parseLaneFirstTimeLastLine', () => {
  it('parses pipe-table row with lane, name, age, team, and time', () => {
    const row = parseLaneFirstTimeLastLine(
      '| 4 Tiffany Murillo Jinete          |  17 Antioquia |     | 1:59.04 |     |     |',
      free200Ctx,
    )
    expect(row).toBeDefined()
    expect(row?.swimmerName).toBe('Tiffany Murillo Jinete')
    expect(row?.lane).toBe(4)
    expect(row?.age).toBe(17)
    expect(row?.team).toBe('Antioquia')
    expect(row?.rawTime).toBe('1:59.04')
    expect(row?.timeCentiseconds).toBe(11904)
  })

  it('parses plain space-separated row', () => {
    const row = parseLaneFirstTimeLastLine(
      '6 Fabiola Valentina Mach Gil  18 Norte de Santander 2:24.86',
      free200Ctx,
    )
    expect(row).toBeDefined()
    expect(row?.swimmerName).toBe('Fabiola Valentina Mach Gil')
    expect(row?.lane).toBe(6)
    expect(row?.age).toBe(18)
    expect(row?.team).toBe('Norte de Santander')
    expect(row?.rawTime).toBe('2:24.86')
  })

  it('returns null for pipe separator rows', () => {
    const row = parseLaneFirstTimeLastLine(
      '| ----------------------------------- | ---------------- | --- | ------- | --- | --- |',
      free200Ctx,
    )
    expect(row).toBeNull()
  })
})

describe('inferRowLayout', () => {
  it('infers lane-first-time-last for lane-first fixture', () => {
    const result = inferRowLayout(normalizePdfText(laneFirstSample))
    expect(result.layoutId).toBe('lane-first-time-last')
    expect(result.confidence).toBeGreaterThan(0.3)
    expect(result.scores['lane-first-time-last']).toBeGreaterThan(
      result.scores['team-time-first'],
    )
  })

  it('infers team-time-first for team-first fixture', () => {
    const result = inferRowLayout(normalizePdfText(spanishSample))
    expect(result.layoutId).toBe('team-time-first')
    expect(result.confidence).toBeGreaterThan(0.3)
  })

  it('returns low confidence for random text', () => {
    const result = inferRowLayout(['Hello world', 'No swim data here'])
    expect(result.confidence).toBeLessThan(0.3)
  })
})
