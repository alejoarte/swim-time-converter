import type { ParsedRow } from './parsePdf/types'

function sortBySwimmerName(a: ParsedRow, b: ParsedRow): number {
  return a.swimmerName.localeCompare(b.swimmerName)
}

export function getIssueRows(rows: ParsedRow[]): ParsedRow[] {
  return rows.filter((row) => row.status === 'error' || row.status === 'warning')
}

export function getIssueRowsSorted(rows: ParsedRow[]): ParsedRow[] {
  const errors = rows.filter((row) => row.status === 'error').sort(sortBySwimmerName)
  const warnings = rows.filter((row) => row.status === 'warning').sort(sortBySwimmerName)
  return [...errors, ...warnings]
}

export function getErrorsSorted(rows: ParsedRow[]): ParsedRow[] {
  return rows.filter((row) => row.status === 'error').sort(sortBySwimmerName)
}

export function getWarningsSorted(rows: ParsedRow[]): ParsedRow[] {
  return rows.filter((row) => row.status === 'warning').sort(sortBySwimmerName)
}

export function getRowsByOriginalStatus(
  rows: ParsedRow[],
  originalStatusById: Map<string, ParsedRow['status']>,
  status: 'error' | 'warning',
): ParsedRow[] {
  return rows
    .filter((row) => originalStatusById.get(row.id) === status)
    .sort(sortBySwimmerName)
}

export function countConvertibleRows(rows: ParsedRow[]): number {
  return rows.filter((row) => row.included && row.status !== 'error').length
}

export function mergeIssueReviewDraft(
  allRows: ParsedRow[],
  draftRows: ParsedRow[],
): ParsedRow[] {
  const draftById = new Map(draftRows.map((row) => [row.id, row]))
  return allRows.map((row) => draftById.get(row.id) ?? row)
}
