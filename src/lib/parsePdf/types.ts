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
}

export type DetectedMeetInfo = {
  title?: string
  detectedCourse: Course | null
  format: 'hytek' | 'hytek-es' | 'unknown'
}

export type ParsePdfResult = {
  rows: ParsedRow[]
  meetInfo: DetectedMeetInfo
  warnings: string[]
}
