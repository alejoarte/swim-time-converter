import { parseAnyEventTitle } from '../mapEvent'
import { TIME_TOKEN_PATTERN } from '../parseTimeToken'
import { splitLineToColumns } from './splitLineToColumns'
import type { ColumnMappingConfig, LineKind } from './types'

const timePattern = new RegExp(`^${TIME_TOKEN_PATTERN}$`, 'i')

function matchesSkipPattern(line: string, patterns: string[]): boolean {
  for (const source of patterns) {
    try {
      if (new RegExp(source, 'i').test(line)) return true
    } catch {
      // ignore invalid user regex
    }
  }
  return false
}

function isEventLine(line: string, config: ColumnMappingConfig): boolean {
  if (parseAnyEventTitle(line)) return true

  if (/^(Evento|Event)\s+\d+/i.test(line.trim())) {
    const fragment = line.replace(/^(Evento|Event)\s+\d+\s*/i, '')
    if (parseAnyEventTitle(fragment)) return true
  }

  for (const rule of config.eventLineRules ?? []) {
    if (rule.kind === 'contains' && rule.pattern && line.includes(rule.pattern)) {
      return true
    }
  }

  return false
}

function requiredColumnCount(config: ColumnMappingConfig): number {
  let max = 0
  config.columnFields.forEach((field, idx) => {
    if (field !== 'ignore') max = Math.max(max, idx + 1)
  })
  if (config.activeTimeColumnIndex >= 0) {
    max = Math.max(max, config.activeTimeColumnIndex + 1)
  }
  return max
}

function isDataRow(line: string, config: ColumnMappingConfig): boolean {
  if (config.columnFields.length === 0) return false

  const cells = splitLineToColumns(line, config.delimiter)
  if (cells.length === 0) return false

  const minCols = requiredColumnCount(config)
  if (cells.length < minCols) return false

  const nameIdx = config.columnFields.indexOf('name')
  if (nameIdx === -1) return false

  const name = cells[nameIdx]?.trim()
  if (!name) return false

  const timeIdx = config.activeTimeColumnIndex
  if (timeIdx < 0 || timeIdx >= cells.length) return false

  const timeCell = cells[timeIdx]?.trim()
  if (!timeCell) return false

  return timePattern.test(
    timeCell.replace(/\s+(FECN|JJNN)$/i, '').replace(/\s+q$/i, ''),
  )
}

export function classifyLine(
  line: string,
  config: ColumnMappingConfig,
  lineIndex?: number,
): LineKind {
  const override = config.lineKindOverrides?.find((o) => o.lineIndex === lineIndex)
  if (override) return override.kind

  const trimmed = line.trim()
  if (!trimmed) return 'skip'

  if (matchesSkipPattern(trimmed, config.skipPatterns)) return 'skip'

  if (isEventLine(trimmed, config)) return 'event'

  if (isDataRow(trimmed, config)) return 'data'

  return 'unknown'
}

export function classifyLines(
  lines: string[],
  config: ColumnMappingConfig,
): LineKind[] {
  return lines.map((line, i) => classifyLine(line, config, i))
}
