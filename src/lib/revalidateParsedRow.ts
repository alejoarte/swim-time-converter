import { getEventById } from '../data/events'
import type { ParsedRow, ParseRowStatus } from './parsePdf/types'
import { parseTime } from './timeParse'

export type RevalidateParsedRowOptions = {
  autoIncludeOnFix?: boolean
}

export function revalidateParsedRow(
  row: ParsedRow,
  options?: RevalidateParsedRowOptions,
): ParsedRow {
  const previousStatus = row.status
  const issues: string[] = []
  let status: ParseRowStatus = 'ok'

  const timeCentiseconds = parseTime(row.rawTime)
  if (timeCentiseconds === null) {
    issues.push('Invalid time format')
    status = 'error'
  }

  if (!row.eventId) {
    issues.push('Unmapped event')
    status = 'error'
  } else if (!getEventById(row.eventId)) {
    issues.push('Event not in catalog')
    status = 'warning'
  }

  if (!row.swimmerName.trim()) {
    issues.push('Missing swimmer name')
    status = 'error'
  }

  const event = row.eventId ? getEventById(row.eventId) : undefined

  let included = status !== 'error' ? row.included : false

  if (
    options?.autoIncludeOnFix &&
    previousStatus === 'error' &&
    status !== 'error'
  ) {
    included = true
  }

  return {
    ...row,
    eventLabel: event?.label ?? row.eventLabel,
    timeCentiseconds,
    status,
    issues,
    included,
  }
}
