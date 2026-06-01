import type { Course } from '../../convert'
import type { ParsePdfResult } from '../types'

export type MappedField =
  | 'name'
  | 'team'
  | 'age'
  | 'year'
  | 'lane'
  | 'time'
  | 'place'
  | 'ignore'

export type LineDelimiter = 'tab' | 'pipe' | 'multi-space'

export type LineKind = 'event' | 'data' | 'skip' | 'unknown'

export type EventLineRule = {
  kind: 'results-title' | 'hytek-event-number' | 'contains'
  pattern?: string
}

/** User override for a specific line index in the sample panel. */
export type LineKindOverride = {
  lineIndex: number
  kind: LineKind
}

export type ColumnMappingConfig = {
  delimiter: LineDelimiter
  columnFields: MappedField[]
  activeTimeColumnIndex: number
  skipPatterns: string[]
  eventLineRules?: EventLineRule[]
  /** Phase C: per-line overrides from sample panel */
  lineKindOverrides?: LineKindOverride[]
  meetDefaultCourse: Course | null
}

export type ColumnMappingResult = ParsePdfResult & {
  mappingConfig: ColumnMappingConfig
}
