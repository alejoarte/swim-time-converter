import { parseTime } from '../timeParse'
import {
  formatEventLabel,
  isRelayEventText,
  parseHyTekEventTitle,
} from './mapEvent'
import { normalizePdfText } from './normalizePdfText'
import { buildParsedRow, resetRowIds } from './rowBuilder'
import type { DetectedMeetInfo, ParsedRow, ParsePdfResult } from './types'

const SERIE_LINE = /^Serie\s+\d+/i
const COLUMN_HEADER = /^Edad\s+Carril\s+Equipo/i
const RELAY_HEADER = /^Relevo\s+Equipo/i
const NO_ENTRIES = /^No entries for event/i
const MEET_TITLE = /^\d{4}\s+.+\d{1,2}\/\d{1,2}\/\d{4}/

const TEAM_TIME =
  /^(.+)\s+(X?(?:NT|\d{1,2}(?::\d{2})?[,.]\d{2}))$/i

const CONTINUATION_EVENT = /\((?:#\d+\s+)?(.+)\)$/

function applyEventContext(
  line: string,
  detectedCourse: import('../convert').Course | null,
  warnings: string[],
): {
  eventLabel: string
  eventId: string | null
  course: import('../convert').Course | null
  isRelay: boolean
} | null {
  if (isRelayEventText(line)) {
    return {
      eventLabel: 'Relay',
      eventId: null,
      course: detectedCourse,
      isRelay: true,
    }
  }

  const parsed = parseHyTekEventTitle(line)
  if (!parsed) return null

  if (parsed.isRelay) {
    return {
      eventLabel: 'Relay',
      eventId: null,
      course: parsed.course ?? detectedCourse,
      isRelay: true,
    }
  }

  const eventLabel =
    parsed.eventId != null
      ? formatEventLabel(parsed.eventId)
      : `${parsed.distance} ${parsed.strokeLabel}`

  if (parsed.course && detectedCourse && parsed.course !== detectedCourse) {
    warnings.push('Multiple courses detected in PDF; using first detected course as default.')
  }

  return {
    eventLabel,
    eventId: parsed.eventId,
    course: parsed.course,
    isRelay: false,
  }
}

function parseTimeToken(timeToken: string): {
  rawTime: string
  timeCentiseconds: number | null
  extraIssues: string[]
  forceStatus?: 'error' | 'warning'
  included?: boolean
} {
  const upper = timeToken.toUpperCase()

  if (upper === 'NT' || upper === 'XNT') {
    return {
      rawTime: timeToken,
      timeCentiseconds: null,
      extraIssues: ['No time (NT)'],
      forceStatus: 'error',
      included: false,
    }
  }

  const isExhibition = /^X/i.test(timeToken)
  const normalized = isExhibition ? timeToken.replace(/^X/i, '') : timeToken
  const timeCentiseconds = parseTime(normalized)

  if (isExhibition) {
    return {
      rawTime: timeToken,
      timeCentiseconds,
      extraIssues: ['Exhibition swim'],
      forceStatus: timeCentiseconds !== null ? 'warning' : 'error',
      included: timeCentiseconds !== null,
    }
  }

  return {
    rawTime: timeToken,
    timeCentiseconds,
    extraIssues: [],
  }
}

function parseSpanishSwimmerLine(
  line: string,
  eventLabel: string,
  eventId: string | null,
  sourceCourse: import('../convert').Course | null,
  isRelay: boolean,
): ParsedRow | null {
  if (isRelay) {
    return buildParsedRow({
      swimmerName: line,
      rawTime: '',
      timeCentiseconds: null,
      eventLabel,
      eventId,
      sourceCourse,
      extraIssues: ['Relay event not supported'],
      forceStatus: 'error',
      included: false,
    })
  }

  const tabParts = line.split('\t').map((p) => p.trim()).filter(Boolean)

  let teamTimePart: string
  let age: number | undefined
  let swimmerName: string
  let lane: number | undefined

  if (tabParts.length >= 4) {
    teamTimePart = tabParts[0]
    age = Number(tabParts[1])
    swimmerName = tabParts[2]
    lane = Number(tabParts[3])
  } else if (tabParts.length === 3) {
    teamTimePart = tabParts[0]
    age = Number(tabParts[1])
    swimmerName = tabParts[2]
  } else {
    const spaceMatch = line.match(
      /^(.+?\s+X?(?:NT|\d{1,2}(?::\d{2})?[,.]\d{2}))\s+(\d{1,2})\s+(.+?)\s+(\d{1,2})$/,
    )
    if (!spaceMatch) return null
    teamTimePart = spaceMatch[1]
    age = Number(spaceMatch[2])
    swimmerName = spaceMatch[3].trim()
    lane = Number(spaceMatch[4])
  }

  if (!teamTimePart || !swimmerName) return null

  const teamTimeMatch = teamTimePart.match(TEAM_TIME)
  if (!teamTimeMatch) return null

  const team = teamTimeMatch[1].trim()
  const timeToken = teamTimeMatch[2]
  const timeResult = parseTimeToken(timeToken)

  return buildParsedRow({
    swimmerName,
    age: age !== undefined && !Number.isNaN(age) ? age : undefined,
    team,
    lane: lane !== undefined && !Number.isNaN(lane) ? lane : undefined,
    rawTime: timeResult.rawTime,
    timeCentiseconds: timeResult.timeCentiseconds,
    eventLabel,
    eventId,
    sourceCourse,
    extraIssues: timeResult.extraIssues,
    forceStatus: timeResult.forceStatus,
    included: timeResult.included,
  })
}

export function isHyTekSpanishFormat(text: string): boolean {
  return (
    /^Evento\s+\d+/m.test(text) ||
    (/Programa de Competencias/i.test(text) && /CL Metro/i.test(text))
  )
}

export function parseHyTekSpanishText(raw: string): ParsePdfResult {
  resetRowIds()
  const lines = normalizePdfText(raw)
  const rows: ParsedRow[] = []
  const warnings: string[] = []

  let meetTitle: string | undefined
  let detectedCourse: import('../convert').Course | null = null
  let currentEventLabel = ''
  let currentEventId: string | null = null
  let currentCourse: import('../convert').Course | null = null
  let currentIsRelay = false

  for (const line of lines) {
    if (MEET_TITLE.test(line)) {
      meetTitle = line
      continue
    }

    if (line.startsWith('Evento ')) {
      const ctx = applyEventContext(line, detectedCourse, warnings)
      if (ctx) {
        currentEventLabel = ctx.eventLabel
        currentEventId = ctx.eventId
        currentCourse = ctx.course
        currentIsRelay = ctx.isRelay
        if (detectedCourse === null && currentCourse) {
          detectedCourse = currentCourse
        }
      }
      continue
    }

    const continuation = line.match(CONTINUATION_EVENT)
    if (continuation && SERIE_LINE.test(line)) {
      const ctx = applyEventContext(continuation[1], detectedCourse, warnings)
      if (ctx) {
        currentEventLabel = ctx.eventLabel
        currentEventId = ctx.eventId
        currentCourse = ctx.course ?? currentCourse
        currentIsRelay = ctx.isRelay
        if (detectedCourse === null && currentCourse) {
          detectedCourse = currentCourse
        }
      }
      continue
    }

    if (
      SERIE_LINE.test(line) ||
      COLUMN_HEADER.test(line) ||
      RELAY_HEADER.test(line) ||
      NO_ENTRIES.test(line)
    ) {
      continue
    }

    if (!currentEventLabel || currentIsRelay) continue

    const row = parseSpanishSwimmerLine(
      line,
      currentEventLabel,
      currentEventId,
      currentCourse,
      currentIsRelay,
    )
    if (row) rows.push(row)
  }

  const meetInfo: DetectedMeetInfo = {
    title: meetTitle,
    detectedCourse,
    format: 'hytek-es',
  }

  if (rows.length === 0) {
    warnings.push('No swimmer rows found. The PDF layout may not match Hy-Tek Meet Manager.')
  }

  return { rows, meetInfo, warnings }
}
