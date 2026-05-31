import { getEventById } from '../../data/events'
import type { Course } from '../convert'
import { parseTime } from '../timeParse'
import type { ParsedRow, ParseRowStatus } from './types'

let rowCounter = 0

export function resetRowIds(): void {
  rowCounter = 0
}

export function createRowId(): string {
  rowCounter += 1
  return `row-${rowCounter}`
}

export type BuildParsedRowInput = {
  swimmerName: string
  age?: number
  team?: string
  lane?: number
  rawTime: string
  timeCentiseconds?: number | null
  eventLabel: string
  eventId: string | null
  sourceCourse: Course | null
  extraIssues?: string[]
  forceStatus?: ParseRowStatus
  included?: boolean
}

export function buildParsedRow(input: BuildParsedRowInput): ParsedRow {
  const issues = [...(input.extraIssues ?? [])]
  let status: ParseRowStatus = 'ok'

  const timeCentiseconds =
    input.timeCentiseconds !== undefined
      ? input.timeCentiseconds
      : parseTime(input.rawTime)

  if (!input.eventId) {
    issues.push('Unmapped event')
    status = 'error'
  }
  if (!input.sourceCourse) {
    issues.push('Unknown course')
    status = 'error'
  }
  if (timeCentiseconds === null && !issues.some((i) => i.includes('No time'))) {
    issues.push('Invalid time format')
    status = 'error'
  }
  if (!input.swimmerName.trim()) {
    issues.push('Missing swimmer name')
    status = 'error'
  }

  if (status === 'ok' && input.eventId && !getEventById(input.eventId)) {
    issues.push('Event not in catalog')
    status = 'warning'
  }

  if (input.extraIssues?.some((i) => i.includes('Exhibition swim')) && status === 'ok') {
    status = 'warning'
  }

  if (input.forceStatus) {
    status = input.forceStatus
  }

  const included =
    input.included !== undefined ? input.included : status !== 'error'

  return {
    id: createRowId(),
    swimmerName: input.swimmerName.trim(),
    age: input.age,
    team: input.team,
    lane: input.lane,
    eventLabel: input.eventLabel,
    eventId: input.eventId,
    sourceCourse: input.sourceCourse,
    rawTime: input.rawTime,
    timeCentiseconds,
    status,
    issues,
    included,
  }
}
