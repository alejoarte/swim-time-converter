import type { Course } from '../convert'

export type ParseRowStatus = 'ok' | 'warning' | 'error'

export type ParsedRow = {
  id: string
  swimmerName: string
  age?: number
  team?: string
  lane?: number
  eventLabel: string
  eventId: string | null
  sourceCourse: Course | null
  rawTime: string
  timeCentiseconds: number | null
  status: ParseRowStatus
  issues: string[]
  included: boolean
  /** Source line index in normalized PDF text (for highlight sync). */
  sourceLineIndex?: number
}

export type RowLayoutId = 'team-time-first' | 'lane-first-time-last' | 'time-first'

export type DetectedMeetInfo = {
  title?: string
  detectedCourse: Course | null
  format: 'hytek' | 'hytek-es' | 'unknown'
}

export type ParsePdfResult = {
  rows: ParsedRow[]
  meetInfo: DetectedMeetInfo
  warnings: string[]
  detectedLayout?: RowLayoutId
  layoutConfidence?: number
}

export type EventRowContext = {
  eventLabel: string
  eventId: string | null
  sourceCourse: Course | null
  isRelay: boolean
}
