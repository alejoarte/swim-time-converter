import { isHyTekEnglishFormat, parseHyTekText } from './hyTekParser'
import { isHyTekSpanishFormat, parseHyTekSpanishText } from './hyTekSpanishParser'
import type { ParsePdfResult } from './types'

const HYTEK_HEADER = /HY-TEK'?s?\s+MEET MANAGER/i

export function parsePdfText(raw: string): ParsePdfResult {
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

  return {
    rows: [],
    meetInfo: { detectedCourse: null, format: 'unknown' },
    warnings: [
      'Unsupported PDF format. Currently only Hy-Tek Meet Manager text PDFs (English or Spanish) are supported.',
    ],
  }
}
