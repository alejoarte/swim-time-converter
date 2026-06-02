import type { ParsedRow } from './parsePdf/types'

export function eventIdentity(row: ParsedRow): string {
  return row.eventId ?? row.eventLabel
}

export type EventIdentity = {
  key: string
  eventLabel: string
  eventId: string | null
  rowCount: number
}

export function getUniqueEvents(rows: ParsedRow[]): EventIdentity[] {
  const byKey = new Map<string, EventIdentity>()

  for (const row of rows) {
    const key = eventIdentity(row)
    const existing = byKey.get(key)
    if (existing) {
      existing.rowCount += 1
    } else {
      byKey.set(key, {
        key,
        eventLabel: row.eventLabel,
        eventId: row.eventId,
        rowCount: 1,
      })
    }
  }

  return [...byKey.values()].sort((a, b) => a.eventLabel.localeCompare(b.eventLabel))
}

export function filterRowsByEventKeys(
  rows: ParsedRow[],
  keys: Set<string>,
): ParsedRow[] {
  return rows.filter((row) => keys.has(eventIdentity(row)))
}

export function groupRowsByEventKey(
  rows: ParsedRow[],
  selectedKeys: Set<string>,
): Map<string, ParsedRow[]> {
  const groups = new Map<string, ParsedRow[]>()
  for (const row of filterRowsByEventKeys(rows, selectedKeys)) {
    const key = eventIdentity(row)
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  return groups
}
