/** True for markdown-style pipe separator rows. */
export function isPipeSeparatorLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.includes('|')) return false
  return /^\|[\s\-|]+\|$/.test(trimmed) || /^[\|\s\-]+$/.test(trimmed)
}

/** Strip pipe table framing and split into trimmed cells. */
export function splitPipeCells(line: string): string[] | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return null

  return trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}
