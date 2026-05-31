import type { ParsedRow } from './parsePdf/types'

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
