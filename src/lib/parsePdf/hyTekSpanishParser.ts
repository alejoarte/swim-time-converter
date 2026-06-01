import { inferRowLayout } from './inferRowLayout'
import { normalizePdfText } from './normalizePdfText'
import { parseHyTekSpanishMeetLines } from './parseHyTekMeet'
import { getRowLayout, parseTeamTimeFirstLine } from './rowLayouts'
import { resetRowIds } from './rowBuilder'
import type { ParsePdfResult } from './types'

const LAYOUT_CONFIDENCE_THRESHOLD = 0.3

export function isHyTekSpanishFormat(text: string): boolean {
  return (
    /^Evento\s+\d+/m.test(text) ||
    (/Programa de Competencias/i.test(text) && /CL Metro/i.test(text))
  )
}

export function parseHyTekSpanishText(raw: string): ParsePdfResult {
  resetRowIds()
  const lines = normalizePdfText(raw)

  const teamFirstResult = parseHyTekSpanishMeetLines(lines, parseTeamTimeFirstLine)

  if (teamFirstResult.rows.length > 0) {
    return {
      rows: teamFirstResult.rows,
      meetInfo: teamFirstResult.meetInfo,
      warnings: teamFirstResult.warnings,
      detectedLayout: 'team-time-first',
      layoutConfidence: 1,
    }
  }

  if (teamFirstResult.state.eventCount === 0) {
    const warnings = [...teamFirstResult.warnings]
    warnings.push('No swimmer rows found. The PDF layout may not match Hy-Tek Meet Manager.')
    return {
      rows: [],
      meetInfo: teamFirstResult.meetInfo,
      warnings,
    }
  }

  const inference = inferRowLayout(lines)
  const bestLayout = getRowLayout(inference.layoutId)

  if (
    inference.layoutId !== 'team-time-first' &&
    inference.confidence >= LAYOUT_CONFIDENCE_THRESHOLD
  ) {
    resetRowIds()
    const inferredResult = parseHyTekSpanishMeetLines(lines, bestLayout.parseLine)
    const pct = Math.round(inference.confidence * 100)
    const warnings = [
      ...inferredResult.warnings,
      `Detected ${bestLayout.label} layout (${pct}% match).`,
    ]

    if (inferredResult.rows.length > 0) {
      return {
        rows: inferredResult.rows,
        meetInfo: inferredResult.meetInfo,
        warnings,
        detectedLayout: inference.layoutId,
        layoutConfidence: inference.confidence,
      }
    }
  }

  const warnings = [...teamFirstResult.warnings]
  warnings.push('No swimmer rows found. The PDF layout may not match Hy-Tek Meet Manager.')

  return {
    rows: [],
    meetInfo: teamFirstResult.meetInfo,
    warnings,
    detectedLayout: inference.confidence > 0 ? inference.layoutId : undefined,
    layoutConfidence: inference.confidence > 0 ? inference.confidence : undefined,
  }
}
