import {
  collectSpanishCandidateLines,
  isSpanishSkipLine,
} from './parseHyTekMeet'
import { ROW_LAYOUTS, type RowLayoutParser } from './rowLayouts'
import type { EventRowContext, RowLayoutId } from './types'

const MAX_SAMPLE_LINES = 50

const HEADER_HINTS: { pattern: RegExp; layoutId: RowLayoutId; boost: number }[] = [
  { pattern: /Carril.*Nombre.*Tiempo/i, layoutId: 'lane-first-time-last', boost: 0.25 },
  { pattern: /Edad\s+Carril\s+Equipo/i, layoutId: 'team-time-first', boost: 0.25 },
  { pattern: /Age\s+Name\s+Team/i, layoutId: 'time-first', boost: 0.25 },
]

export type InferRowLayoutResult = {
  layoutId: RowLayoutId
  confidence: number
  scores: Record<RowLayoutId, number>
}

function scoreLayout(
  parseLine: RowLayoutParser,
  candidateLines: string[],
  ctx: EventRowContext,
): { matched: number; tried: number } {
  let matched = 0
  let tried = 0

  for (const line of candidateLines) {
    if (isSpanishSkipLine(line)) continue
    tried += 1
    const row = parseLine(line, ctx)
    if (row && row.status !== 'error') {
      matched += 1
    } else if (row && row.issues.some((i) => i.includes('No time'))) {
      matched += 1
    }
    if (tried >= MAX_SAMPLE_LINES) break
  }

  return { matched, tried }
}

export function inferRowLayout(lines: string[]): InferRowLayoutResult {
  const headerBoosts: Partial<Record<RowLayoutId, number>> = {}

  for (const line of lines) {
    for (const hint of HEADER_HINTS) {
      if (hint.pattern.test(line)) {
        headerBoosts[hint.layoutId] = (headerBoosts[hint.layoutId] ?? 0) + hint.boost
      }
    }
  }

  const candidateGroups = collectSpanishCandidateLines(lines)
  const scores: Record<RowLayoutId, number> = {
    'team-time-first': headerBoosts['team-time-first'] ?? 0,
    'lane-first-time-last': headerBoosts['lane-first-time-last'] ?? 0,
    'time-first': headerBoosts['time-first'] ?? 0,
  }

  let totalTried = 0

  for (const layout of ROW_LAYOUTS) {
    let matched = 0
    let tried = 0

    for (const group of candidateGroups) {
      const result = scoreLayout(layout.parseLine, group.lines, group.ctx)
      matched += result.matched
      tried += result.tried
      if (tried >= MAX_SAMPLE_LINES) break
    }

    totalTried += tried
    if (tried > 0) {
      scores[layout.id] += matched / tried
    }
  }

  const ranked = ROW_LAYOUTS.map((layout) => ({
    id: layout.id,
    score: scores[layout.id],
  })).sort((a, b) => b.score - a.score)

  const best = ranked[0]
  const confidence = totalTried > 0 ? Math.min(1, best.score) : 0

  return {
    layoutId: best.id,
    confidence,
    scores,
  }
}
