import { eventIdentity } from './eventFilter'
import type { ParsedRow } from './parsePdf/types'

export { eventIdentity }

export type SwimmerIdentity = {
  key: string
  swimmerName: string
  age?: number
  team?: string
  rowCount: number
}

export function swimmerKey(row: ParsedRow): string {
  return `${row.swimmerName}|${row.age ?? ''}|${row.team ?? ''}`
}

export function nameMatches(swimmerName: string, query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true
  return swimmerName.toLowerCase().includes(trimmed.toLowerCase())
}

export function filterRowsBySwimmerKeys(
  rows: ParsedRow[],
  keys: Set<string>,
): ParsedRow[] {
  return rows.filter((row) => keys.has(swimmerKey(row)))
}

export type SwimmerSummaryStats = SwimmerIdentity & {
  distinctEventCount: number
}

export function getSwimmerSummaryStats(
  rows: ParsedRow[],
  selectedKeys: Set<string>,
): SwimmerSummaryStats[] {
  const filtered = filterRowsBySwimmerKeys(rows, selectedKeys)
  const byKey = new Map<string, { identity: SwimmerIdentity; eventIds: Set<string> }>()

  for (const row of filtered) {
    const key = swimmerKey(row)
    const existing = byKey.get(key)
    if (existing) {
      existing.identity.rowCount += 1
      existing.eventIds.add(eventIdentity(row))
    } else {
      byKey.set(key, {
        identity: {
          key,
          swimmerName: row.swimmerName,
          age: row.age,
          team: row.team,
          rowCount: 1,
        },
        eventIds: new Set([eventIdentity(row)]),
      })
    }
  }

  return [...byKey.values()]
    .map(({ identity, eventIds }) => ({
      ...identity,
      distinctEventCount: eventIds.size,
    }))
    .sort((a, b) => a.swimmerName.localeCompare(b.swimmerName))
}

export function groupRowsBySwimmerKey(
  rows: ParsedRow[],
  selectedKeys: Set<string>,
): Map<string, ParsedRow[]> {
  const groups = new Map<string, ParsedRow[]>()
  for (const row of filterRowsBySwimmerKeys(rows, selectedKeys)) {
    const key = swimmerKey(row)
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  return groups
}

export function getUniqueSwimmers(rows: ParsedRow[]): SwimmerIdentity[] {
  const byKey = new Map<string, SwimmerIdentity>()

  for (const row of rows) {
    const key = swimmerKey(row)
    const existing = byKey.get(key)
    if (existing) {
      existing.rowCount += 1
    } else {
      byKey.set(key, {
        key,
        swimmerName: row.swimmerName,
        age: row.age,
        team: row.team,
        rowCount: 1,
      })
    }
  }

  return [...byKey.values()].sort((a, b) =>
    a.swimmerName.localeCompare(b.swimmerName),
  )
}
