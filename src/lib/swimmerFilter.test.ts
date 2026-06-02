import { describe, expect, it } from 'vitest'
import type { ParsedRow } from './parsePdf/types'
import {
  getSwimmerSummaryStats,
  getUniqueSwimmers,
  nameMatches,
  swimmerKey,
} from './swimmerFilter'

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

describe('swimmerFilter', () => {
  it('builds stable keys from name, age, and team', () => {
    const row = makeRow({
      swimmerName: 'Andres Garcia',
      age: 14,
      team: 'Club A',
    })
    expect(swimmerKey(row)).toBe('Andres Garcia|14|Club A')
  })

  it('dedupes multiple event rows into one swimmer', () => {
    const rows = [
      makeRow({ id: 'row-1', swimmerName: 'Andres Garcia', age: 14, team: 'Club A' }),
      makeRow({ id: 'row-2', swimmerName: 'Andres Garcia', age: 14, team: 'Club A' }),
      makeRow({ id: 'row-3', swimmerName: 'Maria Lopez', age: 12 }),
    ]

    const swimmers = getUniqueSwimmers(rows)
    expect(swimmers).toHaveLength(2)
    expect(swimmers.find((s) => s.swimmerName === 'Andres Garcia')?.rowCount).toBe(2)
    expect(swimmers.find((s) => s.swimmerName === 'Maria Lopez')?.rowCount).toBe(1)
  })

  it('treats different ages or teams as separate swimmers', () => {
    const rows = [
      makeRow({ id: 'row-1', swimmerName: 'Andres Garcia', age: 14, team: 'Club A' }),
      makeRow({ id: 'row-2', swimmerName: 'Andres Garcia', age: 15, team: 'Club B' }),
    ]

    expect(getUniqueSwimmers(rows)).toHaveLength(2)
  })

  it('matches names case-insensitively with substring search', () => {
    expect(nameMatches('Andres Garcia', 'andres')).toBe(true)
    expect(nameMatches('Andres Garcia', 'GARCIA')).toBe(true)
    expect(nameMatches('Andres Garcia', 'lopez')).toBe(false)
  })

  it('matches all names when query is empty', () => {
    expect(nameMatches('Andres Garcia', '')).toBe(true)
    expect(nameMatches('Andres Garcia', '   ')).toBe(true)
  })

  it('computes distinct event count and appearances for selected swimmers', () => {
    const rows = [
      makeRow({
        id: 'row-1',
        swimmerName: 'Andres Garcia',
        age: 14,
        eventLabel: '100 Free',
        eventId: '100-free',
      }),
      makeRow({
        id: 'row-2',
        swimmerName: 'Andres Garcia',
        age: 14,
        eventLabel: '200 Free',
        eventId: '200-free',
      }),
      makeRow({
        id: 'row-3',
        swimmerName: 'Andres Garcia',
        age: 14,
        eventLabel: '100 Free',
        eventId: '100-free',
        rawTime: '59.50',
      }),
      makeRow({ id: 'row-4', swimmerName: 'Maria Lopez', age: 12 }),
    ]

    const andresKey = swimmerKey(rows[0])
    const stats = getSwimmerSummaryStats(rows, new Set([andresKey]))
    expect(stats).toHaveLength(1)
    expect(stats[0].distinctEventCount).toBe(2)
    expect(stats[0].rowCount).toBe(3)
  })
})
