import { compareEventIds, getEventById } from '../data/events'
import { convertEntry, type ConversionResult, type Course } from './convert'
import { EMPTY_TIME_PARTS, isValidTimeParts, partsToCentiseconds, type TimeParts } from './timeParse'

export function buildConversionResults(
  selectedIds: string[],
  times: Record<string, TimeParts>,
  sourceCourse: Course,
): ConversionResult[] | null {
  if (selectedIds.length === 0) return null
  if (!selectedIds.every((id) => isValidTimeParts(times[id] ?? EMPTY_TIME_PARTS))) {
    return null
  }

  return selectedIds
    .map((id) => {
      const event = getEventById(id)
      const cs = partsToCentiseconds(times[id] ?? EMPTY_TIME_PARTS)
      if (!event || cs === null) return null
      return convertEntry(event, sourceCourse, cs)
    })
    .filter((r): r is ConversionResult => r !== null)
    .sort((a, b) => compareEventIds(a.eventId, b.eventId))
}

export function hasAnyTimeEntry(
  selectedIds: string[],
  times: Record<string, TimeParts>,
): boolean {
  return selectedIds.some((id) => {
    const parts = times[id] ?? EMPTY_TIME_PARTS
    return parts.minutes.trim() !== '' || parts.seconds.trim() !== '' || parts.hundredths.trim() !== ''
  })
}
