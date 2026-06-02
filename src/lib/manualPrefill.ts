import type { Course } from './convert'
import type { ParsedRow } from './parsePdf/types'
import { parseTime } from './timeParse'
import { swimmerKey } from './swimmerFilter'

export type ManualPrefillEntry = {
  eventId: string
  rawTime: string
}

export type ManualPrefill = {
  sourceCourse: Course
  entries: ManualPrefillEntry[]
}

export function buildManualPrefill(
  rows: ParsedRow[],
  selectedKeys: Set<string>,
  sourceCourse: Course,
): ManualPrefill | null {
  if (selectedKeys.size !== 1) return null

  const swimmerRows = rows.filter((row) => selectedKeys.has(swimmerKey(row)))
  const entries: ManualPrefillEntry[] = []
  const seenEventIds = new Set<string>()

  for (const row of swimmerRows) {
    if (!row.eventId || parseTime(row.rawTime) === null) continue
    if (seenEventIds.has(row.eventId)) continue
    seenEventIds.add(row.eventId)
    entries.push({ eventId: row.eventId, rawTime: row.rawTime })
  }

  if (entries.length === 0) return null

  return { sourceCourse, entries }
}
