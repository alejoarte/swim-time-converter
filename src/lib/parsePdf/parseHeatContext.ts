import type { RowRound } from './types'

export type HeatContext = {
  heatLabel: string
  round: RowRound
}

function inferRoundFromLabel(label: string): RowRound {
  const lower = label.toLowerCase()
  if (/\bprelim/i.test(lower)) return 'prelim'
  if (/\bfinal/i.test(lower) || /\s-\s*final/i.test(lower)) return 'final'
  if (/\bseed/i.test(lower)) return 'seed'
  return 'unknown'
}

/** Detect heat / round header lines shared by Hy-Tek and column-mapped parsers. */
export function parseHeatContextLine(line: string): HeatContext | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  if (/^Heat\s+\d+/i.test(trimmed)) {
    return { heatLabel: trimmed, round: inferRoundFromLabel(trimmed) }
  }

  if (/^Serie\s+\d+/i.test(trimmed)) {
    return { heatLabel: trimmed, round: inferRoundFromLabel(trimmed) }
  }

  if (/^[A-Z]\s*-\s*Final$/i.test(trimmed)) {
    return { heatLabel: trimmed, round: 'final' }
  }

  if (/^Preliminaries$/i.test(trimmed)) {
    return { heatLabel: trimmed, round: 'prelim' }
  }

  if (/^Finales\s+Inicia/i.test(trimmed)) {
    return { heatLabel: trimmed, round: 'final' }
  }

  return null
}
