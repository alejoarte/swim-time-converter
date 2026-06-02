import { applyColumnMapping } from './columnMapping/applyColumnMapping'
import { LAYOUT_CONFIDENCE_MAPPER_THRESHOLD } from './columnMapping/constants'
import { suggestMappingConfig } from './columnMapping/suggestMappingConfig'
import { isHyTekEnglishFormat, parseHyTekText } from './hyTekParser'
import { isHyTekSpanishFormat, parseHyTekSpanishText } from './hyTekSpanishParser'
import type { ParsePdfResult } from './types'

const HYTEK_HEADER = /HY-TEK'?s?\s+MEET MANAGER/i

function parseHyTekFamilies(raw: string): ParsePdfResult | null {
  if (isHyTekSpanishFormat(raw)) {
    const result = parseHyTekSpanishText(raw)
    if (result.rows.length > 0) return result

    if (isHyTekEnglishFormat(raw)) {
      const english = parseHyTekText(raw)
      if (english.rows.length > 0) return english
    }

    return result
  }

  if (isHyTekEnglishFormat(raw) || HYTEK_HEADER.test(raw)) {
    const result = parseHyTekText(raw)
    if (result.rows.length > 0) return result

    if (isHyTekSpanishFormat(raw)) {
      const spanish = parseHyTekSpanishText(raw)
      if (spanish.rows.length > 0) return spanish
    }

    return result
  }

  return null
}

function needsColumnMappingFallback(result: ParsePdfResult): boolean {
  if (result.rows.length === 0) return true
  if (
    result.layoutConfidence !== undefined &&
    result.layoutConfidence < LAYOUT_CONFIDENCE_MAPPER_THRESHOLD
  ) {
    return true
  }
  return false
}

function parseWithColumnMapping(raw: string): ParsePdfResult {
  const suggestion = suggestMappingConfig(raw)
  const mapped = applyColumnMapping(raw, suggestion.config)

  const warnings =
    mapped.rows.length > 0
      ? mapped.warnings.map((w) =>
          w.startsWith('Mapped manually') ? 'Auto-mapped columns from PDF layout.' : w,
        )
      : mapped.warnings

  return {
    rows: mapped.rows,
    meetInfo: {
      ...mapped.meetInfo,
      format: 'column-mapped',
    },
    warnings,
    detectedLayout: suggestion.inferredLayoutId,
    layoutConfidence: suggestion.inferredLayoutConfidence,
  }
}

export function parsePdfText(raw: string): ParsePdfResult {
  const hytekResult = parseHyTekFamilies(raw)

  if (hytekResult && !needsColumnMappingFallback(hytekResult)) {
    return hytekResult
  }

  const columnResult = parseWithColumnMapping(raw)
  if (columnResult.rows.length > 0) {
    return columnResult
  }

  if (hytekResult && hytekResult.rows.length > 0) {
    return hytekResult
  }

  if (hytekResult) {
    return hytekResult
  }

  return {
    rows: [],
    meetInfo: { detectedCourse: null, format: 'unknown' },
    warnings: [
      ...(columnResult.warnings.length > 0
        ? columnResult.warnings
        : ['No swimmer rows found. Try matching columns manually or use the CSV template.']),
    ],
    detectedLayout: columnResult.detectedLayout,
    layoutConfidence: columnResult.layoutConfidence,
  }
}
