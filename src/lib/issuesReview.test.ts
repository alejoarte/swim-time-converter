import { describe, expect, it } from 'vitest'
import type { ParsedRow } from './parsePdf/types'
import {
  countConvertibleRows,
  getIssueRows,
  getIssueRowsSorted,
  mergeIssueReviewDraft,
} from './issuesReview'

function makeRow(overrides: Partial<ParsedRow> & Pick<ParsedRow, 'id' | 'status'>): ParsedRow {
  return {
    swimmerName: 'Test Swimmer',
    eventLabel: '100 Free',
    eventId: '100-free',
    sourceCourse: 'LCM',
    rawTime: '1:00.00',
    timeCentiseconds: 6000,
    issues: [],
    included: true,
    ...overrides,
  }
}

describe('issuesReview', () => {
  const rows = [
    makeRow({ id: 'ok', status: 'ok', swimmerName: 'Zara', included: true }),
    makeRow({
      id: 'warning-b',
      status: 'warning',
      swimmerName: 'Bob',
      included: false,
      issues: ['Exhibition swim'],
    }),
    makeRow({
      id: 'error-a',
      status: 'error',
      swimmerName: 'Alice',
      included: false,
      issues: ['No time (NT)'],
    }),
    makeRow({
      id: 'warning-a',
      status: 'warning',
      swimmerName: 'Anna',
      included: true,
      issues: ['Exhibition swim'],
    }),
  ]

  it('getIssueRows returns only error and warning rows', () => {
    expect(getIssueRows(rows).map((row) => row.id)).toEqual([
      'warning-b',
      'error-a',
      'warning-a',
    ])
  })

  it('getIssueRowsSorted returns errors before warnings, sorted by name', () => {
    expect(getIssueRowsSorted(rows).map((row) => row.id)).toEqual([
      'error-a',
      'warning-a',
      'warning-b',
    ])
  })

  it('mergeIssueReviewDraft applies draft edits and preserves untouched rows', () => {
    const draftRows = rows.map((row) =>
      row.id === 'warning-b' ? { ...row, included: true, rawTime: '1:02.00' } : row,
    )
    const merged = mergeIssueReviewDraft(rows, draftRows)
    expect(merged.find((row) => row.id === 'ok')).toEqual(rows[0])
    expect(merged.find((row) => row.id === 'warning-b')?.included).toBe(true)
    expect(merged.find((row) => row.id === 'warning-b')?.rawTime).toBe('1:02.00')
  })

  it('countConvertibleRows counts included non-error rows', () => {
    expect(countConvertibleRows(rows)).toBe(2)
  })
})
