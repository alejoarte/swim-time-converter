const PAGE_FOOTER = /^--\s*\d+\s+of\s+\d+\s*--$/i
const PAGE_HEADER =
  /^(Federacion|HY-TEK'?s?\s+MEET MANAGER|Meet Program|Programa de Competencias)/i

export function normalizePdfText(raw: string): string[] {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[^\S\t]+/g, ' ').trim())
    .filter((line) => {
      if (!line) return false
      if (PAGE_FOOTER.test(line)) return false
      if (
        PAGE_HEADER.test(line) &&
        !line.startsWith('Event ') &&
        !line.startsWith('Evento ')
      ) {
        return false
      }
      return true
    })
}
