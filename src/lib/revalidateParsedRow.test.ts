import { describe, expect, it } from 'vitest'
import type { ParsedRow } from './parsePdf/types'
import { revalidateParsedRow } from './revalidateParsedRow'

function makeRow(overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    id: 'row-1',
    swimmerName: 'Test Swimmer',
    eventLabel: '100 Free',
    eventId: '100-free',
    sourceCourse: 'LCM',
    rawTime: '1:00.00',
    timeCentiseconds: 6000,
    status: 'ok',
    issues: [],
    included: false,
    ...overrides,
  }
}

describe('revalidateParsedRow', () => {
  it('flags invalid time as error and clears included', () => {
    const result = revalidateParsedRow(
      makeRow({ rawTime: 'NT', status: 'warning', included: true }),
    )
    expect(result.status).toBe('error')
    expect(result.included).toBe(false)
    expect(result.issues).toContain('Invalid time format')
  })

  it('preserves included when row stays non-error without autoIncludeOnFix', () => {
    const result = revalidateParsedRow(
      makeRow({ status: 'warning', included: false, issues: ['Exhibition swim'] }),
    )
    expect(result.status).toBe('ok')
    expect(result.included).toBe(false)
  })

  it('auto-checks included when error becomes ok with autoIncludeOnFix', () => {
    const result = revalidateParsedRow(
      makeRow({
        status: 'error',
        rawTime: '1:05.00',
        timeCentiseconds: null,
        included: false,
        issues: ['Invalid time format'],
      }),
      { autoIncludeOnFix: true },
    )
    expect(result.status).toBe('ok')
    expect(result.included).toBe(true)
  })

  it('auto-checks included when error becomes warning with autoIncludeOnFix', () => {
    const result = revalidateParsedRow(
      makeRow({
        status: 'error',
        eventId: 'unknown-event',
        included: false,
        issues: ['Unmapped event'],
      }),
      { autoIncludeOnFix: true },
    )
    expect(result.status).toBe('warning')
    expect(result.included).toBe(true)
  })
})
