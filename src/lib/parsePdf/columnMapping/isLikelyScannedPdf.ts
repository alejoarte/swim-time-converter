/** Heuristic: extracted text too short or lacks time-like tokens → likely scanned PDF. */
export function isLikelyScannedPdf(rawText: string): boolean {
  const trimmed = rawText.trim()
  if (trimmed.length < 200) return true
  return !/\d{1,2}[.:,\d]{2,}/.test(trimmed)
}
