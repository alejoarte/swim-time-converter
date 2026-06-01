import type { Course } from '../../convert'
import { inferRowLayout } from '../inferRowLayout'
import { parseMeetCourseFromHeader } from '../mapEvent'
import { normalizePdfText } from '../normalizePdfText'
import { DEFAULT_SKIP_PATTERNS } from './constants'
import {
  inferBestColumnProfile,
  inferColumnProfile,
  pickActiveTimeColumnFromHeader,
  type ColumnProfileResult,
} from './inferColumnProfile'
import { splitLineToColumns } from './splitLineToColumns'
import type { RowLayoutId } from '../types'
import type { ColumnMappingConfig, LineDelimiter, MappedField } from './types'

const HEADER_FIELD_MAP: Record<string, MappedField> = {
  name: 'name',
  nombre: 'name',
  school: 'team',
  team: 'team',
  equipo: 'team',
  age: 'age',
  edad: 'age',
  yr: 'year',
  year: 'year',
  lane: 'lane',
  carril: 'lane',
  place: 'place',
  rank: 'place',
  finals: 'time',
  prelim: 'time',
  seed: 'time',
  time: 'time',
  tiempo: 'time',
}

function mapHeaderCell(cell: string): MappedField {
  const normalized = cell.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  for (const [key, field] of Object.entries(HEADER_FIELD_MAP)) {
    if (normalized.includes(key)) return field
  }
  return 'ignore'
}

function findHeaderRow(
  lines: string[],
  delimiter: LineDelimiter,
): { columnFields: MappedField[]; headerIndex: number; headerCells: string[] } | null {
  for (let i = 0; i < Math.min(lines.length, 50); i += 1) {
    const line = lines[i]
    if (
      !/name|nombre|school|team|equipo|time|tiempo|finals|prelim|seed|yr/i.test(
        line,
      )
    ) {
      continue
    }

    const cells = splitLineToColumns(line, delimiter)
    if (cells.length < 3) continue

    const fields = cells.map(mapHeaderCell)
    if (fields.includes('name') && fields.some((f) => f === 'time' || f === 'team')) {
      return { columnFields: fields, headerIndex: i, headerCells: cells }
    }
  }
  return null
}

function detectMeetCourse(lines: string[]): Course | null {
  for (const line of lines.slice(0, 15)) {
    const course = parseMeetCourseFromHeader(line)
    if (course) return course
  }
  return null
}

export type SuggestMappingResult = {
  config: ColumnMappingConfig
  columnProfile: ColumnProfileResult | null
  inferredLayoutId?: RowLayoutId
  inferredLayoutConfidence?: number
}

export function suggestMappingConfig(rawText: string): SuggestMappingResult {
  const lines = normalizePdfText(rawText)

  const tabHeader = findHeaderRow(lines, 'tab')
  const pipeHeader = findHeaderRow(lines, 'pipe')
  const headerCells = tabHeader?.headerCells ?? pipeHeader?.headerCells

  const columnProfile = inferBestColumnProfile(lines, headerCells)

  let delimiter: LineDelimiter = columnProfile?.delimiter ?? 'tab'
  let columnFields: MappedField[] = columnProfile?.columnFields ?? [
    'team',
    'year',
    'name',
    'time',
    'time',
    'place',
  ]
  let activeTimeColumnIndex = columnProfile?.activeTimeColumnIndex ?? 3

  if (columnProfile) {
    delimiter = columnProfile.delimiter
    columnFields = [...columnProfile.columnFields]
    activeTimeColumnIndex = columnProfile.activeTimeColumnIndex
  } else {
    const header = findHeaderRow(lines, delimiter)
    if (header) {
      columnFields = header.columnFields
      activeTimeColumnIndex = pickActiveTimeColumnFromHeader(
        columnFields,
        header.headerCells,
      )
    }
  }

  const layoutInference = inferRowLayout(lines)

  return {
    config: {
      delimiter,
      columnFields,
      activeTimeColumnIndex,
      skipPatterns: [...DEFAULT_SKIP_PATTERNS],
      meetDefaultCourse: detectMeetCourse(lines),
    },
    columnProfile,
    inferredLayoutId: layoutInference.layoutId,
    inferredLayoutConfidence: layoutInference.confidence,
  }
}

/** Apply inferred meet-program layout as column mapping preset (stepping stone). */
export function layoutToColumnMapping(
  layoutId: 'team-time-first' | 'lane-first-time-last' | 'time-first',
  delimiter: LineDelimiter = 'tab',
): ColumnMappingConfig {
  const presets: Record<string, MappedField[]> = {
    'team-time-first': ['team', 'time', 'age', 'name', 'lane'],
    'lane-first-time-last': ['lane', 'name', 'age', 'team', 'time'],
    'time-first': ['time', 'name', 'age', 'lane', 'team'],
  }

  const columnFields = presets[layoutId] ?? presets['time-first']
  const activeTimeColumnIndex = columnFields.indexOf('time')

  return {
    delimiter,
    columnFields,
    activeTimeColumnIndex,
    skipPatterns: [...DEFAULT_SKIP_PATTERNS],
    meetDefaultCourse: null,
  }
}

/** Re-run column profiling for a specific delimiter (mapper UI). */
export function profileForDelimiter(
  rawText: string,
  delimiter: LineDelimiter,
): ColumnProfileResult | null {
  const lines = normalizePdfText(rawText)
  const header = findHeaderRow(lines, delimiter)
  return inferColumnProfile(lines, delimiter, header?.headerCells)
}
