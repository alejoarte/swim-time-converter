import {
  formatEventLabel,
  mapCourseFromHyTek,
  mapHyTekEventToId,
  parseHyTekEventTitle,
} from './mapEvent'
import { normalizePdfText } from './normalizePdfText'
import { parseHeatContextLine } from './parseHeatContext'
import { buildParsedRow, resetRowIds } from './rowBuilder'
import type { DetectedMeetInfo, ParsedRow, ParsePdfResult } from './types'

const EVENT_LINE =
  /^Event\s+\d+\s+.+\s+(\d{2,4})\s+(SC|LC)\s+(Yard|Meter)\s+(Freestyle|Backstroke|Breaststroke|Fly|Butterfly|IM)\s*$/i

const COLUMN_HEADER = /^Age\s+Name\s+Team/i
const MEET_TITLE = /^\d{4}\s+.+\d{1,2}\/\d{1,2}\/\d{4}/

const TIME_PREFIX = /^(\d{1,2}(?::\d{2})?[,.]\d{2})\s+/

function extractNameAndAge(text: string): { name: string; age?: number } {
  const trimmed = text.trim()
  const spacedAge = trimmed.match(/^(.+?)\s+(\d{1,2})$/)
  if (spacedAge) {
    return { name: spacedAge[1].trim(), age: Number(spacedAge[2]) }
  }

  if (!/\s\d{1,2}$/.test(trimmed)) {
    const gluedAge = trimmed.match(/^(.+)(\d{2})$/)
    if (gluedAge && gluedAge[1].length >= 3) {
      return { name: gluedAge[1].trim(), age: Number(gluedAge[2]) }
    }
  }

  return { name: trimmed }
}

function parseSwimmerLine(
  line: string,
  eventLabel: string,
  eventId: string | null,
  sourceCourse: import('../convert').Course | null,
  heatLabel?: string,
  round?: import('./types').RowRound,
): ParsedRow | null {
  const timeMatch = line.match(TIME_PREFIX)
  if (!timeMatch) return null

  const rawTime = timeMatch[1]
  const remainder = line.slice(timeMatch[0].length)
  const tabParts = remainder.split('\t').map((p) => p.trim()).filter(Boolean)

  let namePart: string
  let lane: number | undefined
  let team: string | undefined
  let explicitAge: number | undefined

  if (tabParts.length >= 4 && /^\d{1,2}$/.test(tabParts[1])) {
    namePart = tabParts[0]
    explicitAge = Number(tabParts[1])
    lane = Number(tabParts[2])
    team = tabParts[3]
  } else if (tabParts.length >= 2) {
    namePart = tabParts[0]
    const laneTeamPart = tabParts.slice(1).join(' ')
    const laneTeamMatch = laneTeamPart.match(/^(\d{1,2})\s+(.+)$/)
    if (laneTeamMatch) {
      lane = Number(laneTeamMatch[1])
      team = laneTeamMatch[2].trim()
    } else if (/^\d{1,2}$/.test(laneTeamPart)) {
      lane = Number(laneTeamPart)
    } else {
      team = laneTeamPart
    }
  } else {
    const spaceMatch = remainder
      .trim()
      .match(/^(.+?)\s+(\d{1,2})\s+(\d{1,2})\s+(.+)$/)
    if (!spaceMatch) return null
    namePart = spaceMatch[1].trim()
    explicitAge = Number(spaceMatch[2])
    lane = Number(spaceMatch[3])
    team = spaceMatch[4].trim()
  }

  const { name, age: embeddedAge } = extractNameAndAge(namePart)
  const age = explicitAge ?? embeddedAge

  return buildParsedRow({
    swimmerName: name,
    age,
    team,
    lane,
    rawTime,
    eventLabel,
    eventId,
    sourceCourse,
    heatLabel,
    round,
  })
}

export function isHyTekEnglishFormat(text: string): boolean {
  return /^Event\s+\d+/m.test(text)
}

export function parseHyTekText(raw: string): ParsePdfResult {
  resetRowIds()
  const lines = normalizePdfText(raw)
  const rows: ParsedRow[] = []
  const warnings: string[] = []

  let meetTitle: string | undefined
  let detectedCourse: import('../convert').Course | null = null
  let currentEventLabel = ''
  let currentEventId: string | null = null
  let currentCourse: import('../convert').Course | null = null
  let currentHeatLabel: string | undefined
  let currentRound: import('./types').RowRound | undefined

  for (const line of lines) {
    if (MEET_TITLE.test(line)) {
      meetTitle = line
      continue
    }

    const eventMatch = line.match(EVENT_LINE)
    if (eventMatch) {
      const [, distanceStr, scPrefix, unit, strokeLabel] = eventMatch
      const distance = Number(distanceStr)
      currentCourse = mapCourseFromHyTek(scPrefix, unit)
      currentEventId = mapHyTekEventToId(distance, strokeLabel)
      currentEventLabel =
        currentEventId != null
          ? formatEventLabel(currentEventId)
          : `${distance} ${strokeLabel}`

      if (detectedCourse === null && currentCourse) {
        detectedCourse = currentCourse
      }
      if (currentCourse && detectedCourse && currentCourse !== detectedCourse) {
        warnings.push('Multiple courses detected in PDF; using first detected course as default.')
      }
      currentHeatLabel = undefined
      currentRound = undefined
      continue
    }

    const continuation = line.match(/\((?:#\d+\s+)?(.+)\)$/)
    if (continuation && !currentEventLabel) {
      const parsed = parseHyTekEventTitle(continuation[1])
      if (parsed && !parsed.isRelay) {
        currentCourse = parsed.course
        currentEventId = parsed.eventId
        currentEventLabel =
          parsed.eventId != null
            ? formatEventLabel(parsed.eventId)
            : `${parsed.distance} ${parsed.strokeLabel}`
        if (detectedCourse === null && currentCourse) {
          detectedCourse = currentCourse
        }
      }
      continue
    }

    const heatCtx = parseHeatContextLine(line)
    if (heatCtx) {
      currentHeatLabel = heatCtx.heatLabel
      currentRound = heatCtx.round
      continue
    }

    if (COLUMN_HEADER.test(line)) continue

    if (!currentEventLabel) continue

    const row = parseSwimmerLine(
      line,
      currentEventLabel,
      currentEventId,
      currentCourse,
      currentHeatLabel,
      currentRound,
    )
    if (row) rows.push(row)
  }

  const meetInfo: DetectedMeetInfo = {
    title: meetTitle,
    detectedCourse,
    format: 'hytek',
  }

  if (rows.length === 0) {
    warnings.push('No swimmer rows found. The PDF layout may not match Hy-Tek Meet Manager.')
  }

  return { rows, meetInfo, warnings }
}
