import { isPipeSeparatorLine, splitPipeCells } from '../preprocessRowLine'
import type { LineDelimiter } from './types'

export function splitLineToColumns(line: string, delimiter: LineDelimiter): string[] {
  switch (delimiter) {
    case 'tab':
      return line.split('\t').map((cell) => cell.trim())
    case 'pipe': {
      if (isPipeSeparatorLine(line)) return []
      const cells = splitPipeCells(line)
      if (cells) return cells
      return line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell, i, arr) => i > 0 || cell !== '' || arr.length > 1)
    }
    case 'multi-space':
      return line.trim().split(/\s{2,}/).map((cell) => cell.trim())
    default:
      return [line.trim()]
  }
}
