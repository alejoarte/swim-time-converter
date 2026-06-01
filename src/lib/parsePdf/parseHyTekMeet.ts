import {
  formatEventLabel,
  isRelayEventText,
  parseHyTekEventTitle,
} from './mapEvent'
import { isPipeSeparatorLine } from './preprocessRowLine'
import type { RowLayoutParser } from './rowLayouts'
import type { Course } from '../convert'
import type { DetectedMeetInfo, EventRowContext, ParsedRow, ParsePdfResult } from './types'

const SERIE_LINE = /^Serie\s+\d+/i
const SPANISH_COLUMN_HEADER =
  /^(\|?\s*)?(Edad\s+Carril\s+Equipo|Carril\s+Nombre)/i
const RELAY_HEADER = /^(\|?\s*)?(Relevo\s+Equipo|Carril\s+Equipo.*Relevo)/i
const NO_ENTRIES = /^No entries for event/i
const MEET_TITLE = /^\d{4}\s+.+\d{1,2}\/\d{1,2}\/\d{4}/
const CONTINUATION_EVENT = /\((?:#\d+\s+)?(.+)\)$/

export type SpanishMeetParseState = {
  eventCount: number
  detectedCourse: Course | null
}

function applyEventContext(
  line: string,
  detectedCourse: Course | null,
  warnings: string[],
): EventRowContext | null {
  if (isRelayEventText(line)) {
    return {
      eventLabel: 'Relay',
      eventId: null,
      sourceCourse: detectedCourse,
      isRelay: true,
    }
  }

  const parsed = parseHyTekEventTitle(line)
  if (!parsed) return null

  if (parsed.isRelay) {
    return {
      eventLabel: 'Relay',
      eventId: null,
      sourceCourse: parsed.course ?? detectedCourse,
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
    sourceCourse: parsed.course,
    isRelay: false,
  }
}

export function isSpanishSkipLine(line: string): boolean {
  return (
    SERIE_LINE.test(line) ||
    SPANISH_COLUMN_HEADER.test(line) ||
    RELAY_HEADER.test(line) ||
    NO_ENTRIES.test(line) ||
    isPipeSeparatorLine(line)
  )
}

export function parseHyTekSpanishMeetLines(
  lines: string[],
  rowParser: RowLayoutParser,
): ParsePdfResult & { state: SpanishMeetParseState } {
  const rows: ParsedRow[] = []
  const warnings: string[] = []

  let meetTitle: string | undefined
  let detectedCourse: Course | null = null
  let currentCtx: EventRowContext | null = null
  let eventCount = 0

  for (const line of lines) {
    if (MEET_TITLE.test(line)) {
      meetTitle = line
      continue
    }

    if (line.startsWith('Evento ')) {
      const ctx = applyEventContext(line, detectedCourse, warnings)
      if (ctx) {
        currentCtx = ctx
        eventCount += 1
        if (detectedCourse === null && ctx.sourceCourse) {
          detectedCourse = ctx.sourceCourse
        }
      }
      continue
    }

    const continuation = line.match(CONTINUATION_EVENT)
    if (continuation && SERIE_LINE.test(line)) {
      const ctx = applyEventContext(continuation[1], detectedCourse, warnings)
      if (ctx) {
        currentCtx = {
          ...ctx,
          sourceCourse: ctx.sourceCourse ?? currentCtx?.sourceCourse ?? null,
        }
        if (detectedCourse === null && ctx.sourceCourse) {
          detectedCourse = ctx.sourceCourse
        }
      }
      continue
    }

    if (isSpanishSkipLine(line)) continue
    if (!currentCtx || currentCtx.isRelay) continue

    const row = rowParser(line, currentCtx)
    if (row) rows.push(row)
  }

  const meetInfo: DetectedMeetInfo = {
    title: meetTitle,
    detectedCourse,
    format: 'hytek-es',
  }

  return {
    rows,
    meetInfo,
    warnings,
    state: { eventCount, detectedCourse },
  }
}

/** Collect candidate swimmer lines for layout scoring. */
export function collectSpanishCandidateLines(lines: string[]): {
  lines: string[]
  ctx: EventRowContext
}[] {
  const candidates: { lines: string[]; ctx: EventRowContext }[] = []
  let detectedCourse: Course | null = null
  let currentCtx: EventRowContext | null = null
  let currentLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('Evento ')) {
      if (currentCtx && currentLines.length > 0) {
        candidates.push({ lines: currentLines, ctx: currentCtx })
      }
      currentLines = []
      const ctx = applyEventContext(line, detectedCourse, [])
      if (ctx && !ctx.isRelay) {
        currentCtx = ctx
        if (detectedCourse === null && ctx.sourceCourse) {
          detectedCourse = ctx.sourceCourse
        }
      } else {
        currentCtx = null
      }
      continue
    }

    const continuation = line.match(CONTINUATION_EVENT)
    if (continuation && SERIE_LINE.test(line)) {
      const ctx = applyEventContext(continuation[1], detectedCourse, [])
      if (ctx && !ctx.isRelay) {
        currentCtx = {
          ...ctx,
          sourceCourse: ctx.sourceCourse ?? currentCtx?.sourceCourse ?? null,
        }
      }
      continue
    }

    if (isSpanishSkipLine(line) || !currentCtx || currentCtx.isRelay) continue
    currentLines.push(line)
  }

  if (currentCtx && currentLines.length > 0) {
    candidates.push({ lines: currentLines, ctx: currentCtx })
  }

  return candidates
}
