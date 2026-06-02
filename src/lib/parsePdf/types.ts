import type { Course } from '../convert'

export type ParseRowStatus = 'ok' | 'warning' | 'error'

export type RowRound = 'prelim' | 'final' | 'seed' | 'unknown'

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
  heatLabel?: string
  round?: RowRound
}

export type RowLayoutId = 'team-time-first' | 'lane-first-time-last' | 'time-first'

export type MeetFormat = 'hytek' | 'hytek-es' | 'column-mapped' | 'unknown'

export type DetectedMeetInfo = {
  title?: string
  detectedCourse: Course | null
  format: MeetFormat
}

export type ParsedMeetHeat = {
  heatLabel?: string
  round?: RowRound
  rows: ParsedRow[]
}

export type ParsedMeetEvent = {
  eventKey: string
  eventLabel: string
  eventId: string | null
  heats: ParsedMeetHeat[]
}

export type ParsedMeet = {
  events: ParsedMeetEvent[]
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
  heatLabel?: string
  round?: RowRound
}
