/** Convert "Last, First" to "First Last"; pass through if no comma. */
export function formatDisplayName(raw: string): string {
  const trimmed = raw.trim()
  const commaIdx = trimmed.indexOf(',')
  if (commaIdx === -1) return trimmed

  const last = trimmed.slice(0, commaIdx).trim()
  const first = trimmed.slice(commaIdx + 1).trim()
  if (!first) return last
  if (!last) return first
  return `${first} ${last}`
}
