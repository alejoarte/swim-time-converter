/** Strip meet-program / results suffixes before time parsing. */
export function normalizeTimeCell(raw: string): string {
  return raw
    .trim()
    .replace(/\s+(FECN|JJNN)$/i, '')
    .replace(/\s+q$/i, '')
    .replace(/\*+$/, '')
    .trim()
}
