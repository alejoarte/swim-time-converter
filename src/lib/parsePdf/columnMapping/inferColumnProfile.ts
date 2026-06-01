import { TIME_TOKEN_PATTERN } from '../parseTimeToken'
import { DEFAULT_SKIP_PATTERNS } from './constants'
import { normalizeTimeCell } from './normalizeTimeCell'
import { splitLineToColumns } from './splitLineToColumns'
import type { LineDelimiter, MappedField } from './types'

const TIME_RE = new RegExp(`^${TIME_TOKEN_PATTERN}$`, 'i')
const YEAR_CLASS = /^(FR|SO|JR|SR)$/i
const MAX_SAMPLE_ROWS = 120

const FIELD_KEYS: MappedField[] = [
  'name',
  'team',
  'age',
  'year',
  'lane',
  'time',
  'place',
  'ignore',
]

export type ColumnTypeScores = Partial<Record<MappedField, number>>

export type ColumnProfileEntry = {
  index: number
  inferredField: MappedField
  confidence: number
  scores: ColumnTypeScores
  sampleValue: string
}

export type ColumnProfileResult = {
  delimiter: LineDelimiter
  columnCount: number
  columns: ColumnProfileEntry[]
  columnFields: MappedField[]
  activeTimeColumnIndex: number
  timeColumnIndices: number[]
  profileConfidence: number
  rowsSampled: number
}

function matchesSkipLine(line: string): boolean {
  for (const source of DEFAULT_SKIP_PATTERNS) {
    try {
      if (new RegExp(source, 'i').test(line)) return true
    } catch {
      // ignore invalid pattern
    }
  }
  return false
}

function looksLikeNameCell(cell: string): boolean {
  const trimmed = cell.trim()
  if (trimmed.includes(',')) return true
  if (/^\d+\s+[A-Za-z]/.test(trimmed) && trimmed.split(/\s+/).length >= 2) return true
  if (/^[A-Za-z]/.test(trimmed) && trimmed.split(/\s+/).length >= 2) return true
  return false
}

function scoreCell(
  cell: string,
  colIndex: number,
  totalCols: number,
): ColumnTypeScores {
  const trimmed = cell.trim()
  if (!trimmed) return {}

  const scores: ColumnTypeScores = {}
  const normalized = normalizeTimeCell(trimmed)

  if (TIME_RE.test(normalized)) {
    scores.time = 1
  }

  if (YEAR_CLASS.test(trimmed)) {
    scores.year = 1
  }

  if (/^\d{1,2}$/.test(trimmed)) {
    const n = Number(trimmed)
    if (n >= 1 && n <= 99) scores.age = 0.5
    if (n >= 0 && n <= 10) scores.lane = 0.65
  }

  if (colIndex === totalCols - 1 && (/^\*?\d+$|^---$/.test(trimmed) || trimmed === '---')) {
    scores.place = 1
  }

  if (trimmed.includes(',')) {
    scores.name = 1
  } else if (/^\d+\s+[A-Za-z]/.test(trimmed)) {
    scores.lane = 0.55
    scores.name = 0.85
  } else if (/^[A-Za-z]/.test(trimmed) && /\s/.test(trimmed) && !scores.time) {
    scores.name = 0.55
  }

  if (
    trimmed.length >= 8 &&
    !scores.time &&
    !scores.year &&
    /^[A-Za-z]/.test(trimmed) &&
    !/^\d/.test(trimmed)
  ) {
    scores.team = 0.75
  }

  if (/^[A-Za-z]{2,5}$/.test(trimmed) && !scores.time && !scores.year) {
    scores.team = Math.max(scores.team ?? 0, 0.45)
  }

  return scores
}

function isCandidateDataRow(cells: string[]): boolean {
  if (cells.length < 3) return false

  const hasTime = cells.some((c) => TIME_RE.test(normalizeTimeCell(c.trim())))
  const hasName = cells.some((c) => looksLikeNameCell(c))

  return hasTime && hasName
}

function modalColumnCount(lines: string[], delimiter: LineDelimiter): number {
  const counts = new Map<number, number>()

  for (const line of lines) {
    if (matchesSkipLine(line)) continue
    const cells = splitLineToColumns(line, delimiter)
    if (cells.length >= 3 && isCandidateDataRow(cells)) {
      counts.set(cells.length, (counts.get(cells.length) ?? 0) + 1)
    }
  }

  let bestCount = 0
  let bestLen = 0
  for (const [len, n] of counts) {
    if (n > bestCount) {
      bestCount = n
      bestLen = len
    }
  }
  return bestLen
}

function pickFieldFromVotes(votes: ColumnTypeScores, total: number): MappedField {
  let bestField: MappedField = 'ignore'
  let bestScore = 0

  for (const field of FIELD_KEYS) {
    if (field === 'ignore') continue
    const score = (votes[field] ?? 0) / Math.max(total, 1)
    if (score > bestScore) {
      bestScore = score
      bestField = field
    }
  }

  if (bestScore < 0.35) return 'ignore'
  return bestField
}

export function pickActiveTimeColumnFromHeader(
  columnFields: MappedField[],
  headerCells?: string[],
): number {
  const timeIndices = columnFields
    .map((f, i) => (f === 'time' ? i : -1))
    .filter((i) => i >= 0)

  if (timeIndices.length === 0) return -1
  if (timeIndices.length === 1) return timeIndices[0]

  if (headerCells) {
    for (const idx of timeIndices) {
      const h = headerCells[idx]?.toLowerCase() ?? ''
      if (h.includes('final') || h.includes('seed') || h.includes('tiempo')) {
        return idx
      }
    }
    for (const idx of timeIndices) {
      const h = headerCells[idx]?.toLowerCase() ?? ''
      if (h.includes('prelim')) {
        return idx
      }
    }
  }

  return timeIndices[0]
}

export function inferColumnProfile(
  lines: string[],
  delimiter: LineDelimiter,
  headerCells?: string[],
): ColumnProfileResult | null {
  const targetCols = modalColumnCount(lines, delimiter)
  if (targetCols < 3) return null

  const columnVotes: ColumnTypeScores[] = Array.from({ length: targetCols }, () => ({}))
  const sampleValues: string[] = Array.from({ length: targetCols }, () => '')
  let rowsSampled = 0

  for (const line of lines) {
    if (matchesSkipLine(line)) continue

    const cells = splitLineToColumns(line, delimiter)
    if (cells.length !== targetCols || !isCandidateDataRow(cells)) continue

    rowsSampled += 1
    cells.forEach((cell, colIndex) => {
      const cellScores = scoreCell(cell, colIndex, targetCols)
      for (const [field, value] of Object.entries(cellScores) as [MappedField, number][]) {
        columnVotes[colIndex][field] = (columnVotes[colIndex][field] ?? 0) + value
      }
      if (!sampleValues[colIndex] && cell.trim()) {
        sampleValues[colIndex] = cell.trim()
      }
    })

    if (rowsSampled >= MAX_SAMPLE_ROWS) break
  }

  if (rowsSampled < 2) return null

  const columns: ColumnProfileEntry[] = columnVotes.map((votes, index) => {
    const inferredField = pickFieldFromVotes(votes, rowsSampled)
    const confidence = (votes[inferredField] ?? 0) / rowsSampled
    return {
      index,
      inferredField,
      confidence,
      scores: { ...votes },
      sampleValue: sampleValues[index] ?? '',
    }
  })

  const columnFields = columns.map((c) => c.inferredField)

  const timeColumnIndices = columns
    .filter((c) => {
      const timeRate = (c.scores.time ?? 0) / rowsSampled
      return timeRate >= 0.5 || c.inferredField === 'time'
    })
    .map((c) => c.index)

  for (const idx of timeColumnIndices) {
    if (columnFields[idx] !== 'time') columnFields[idx] = 'time'
  }

  const hasName = columnFields.includes('name')
  const hasTime = columnFields.includes('time')
  if (!hasName || !hasTime) return null

  const activeTimeColumnIndex = pickActiveTimeColumnFromHeader(columnFields, headerCells)

  const keyFields = columns.filter((c) => c.inferredField !== 'ignore')
  const profileConfidence =
    keyFields.length > 0
      ? keyFields.reduce((sum, c) => sum + c.confidence, 0) / keyFields.length
      : 0

  return {
    delimiter,
    columnCount: targetCols,
    columns,
    columnFields,
    activeTimeColumnIndex,
    timeColumnIndices:
      timeColumnIndices.length > 0
        ? timeColumnIndices
        : [activeTimeColumnIndex].filter((i) => i >= 0),
    profileConfidence,
    rowsSampled,
  }
}

export function inferBestColumnProfile(
  lines: string[],
  headerCells?: string[],
): ColumnProfileResult | null {
  const delimiters: LineDelimiter[] = ['tab', 'pipe', 'multi-space']
  let best: ColumnProfileResult | null = null

  for (const delimiter of delimiters) {
    const profile = inferColumnProfile(lines, delimiter, headerCells)
    if (!profile) continue

    const score = profile.profileConfidence * profile.rowsSampled
    const bestScore = best ? best.profileConfidence * best.rowsSampled : 0

    if (!best || score > bestScore) {
      best = profile
    }
  }

  return best
}

/** Split a line and annotate each cell with inferred field from profile. */
export function splitLineWithProfile(
  line: string,
  profile: ColumnProfileResult,
): { cell: string; field: MappedField }[] {
  const cells = splitLineToColumns(line, profile.delimiter)
  return cells.map((cell, i) => ({
    cell,
    field: profile.columnFields[i] ?? 'ignore',
  }))
}
