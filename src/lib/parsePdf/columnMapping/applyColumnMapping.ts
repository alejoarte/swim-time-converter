import type { Course } from '../../convert'
import {
  formatEventLabel,
  isRelayEventText,
  parseAnyEventTitle,
  parseMeetCourseFromHeader,
} from '../mapEvent'
import { normalizePdfText } from '../normalizePdfText'
import { parseTimeToken } from '../parseTimeToken'
import { parseHeatContextLine } from '../parseHeatContext'
import { buildParsedRow, resetRowIds } from '../rowBuilder'
import type { DetectedMeetInfo, EventRowContext, ParsedRow } from '../types'
import { classifyLine } from './classifyLine'
import { formatDisplayName } from './formatDisplayName'
import { normalizeTimeCell } from './normalizeTimeCell'
import { splitLineToColumns } from './splitLineToColumns'
import type { ColumnMappingConfig, ColumnMappingResult, MappedField } from './types'

const EMPTY_CTX: EventRowContext = {
  eventLabel: '',
  eventId: null,
  sourceCourse: null,
  isRelay: false,
}

function resolveEventContext(
  line: string,
  meetDefaultCourse: Course | null,
): EventRowContext | null {
  let parsed = parseAnyEventTitle(line)

  if (!parsed && /^(Evento|Event)\s+\d+/i.test(line.trim())) {
    const fragment = line.replace(/^(Evento|Event)\s+\d+\s*/i, '')
    parsed = parseAnyEventTitle(fragment)
  }

  if (!parsed) return null

  if (parsed.isRelay) {
    return {
      eventLabel: line.trim(),
      eventId: null,
      sourceCourse: parsed.course ?? meetDefaultCourse,
      isRelay: true,
    }
  }

  const course = parsed.course ?? meetDefaultCourse
  const eventLabel = parsed.eventId
    ? formatEventLabel(parsed.eventId)
    : line.trim()

  return {
    eventLabel,
    eventId: parsed.eventId,
    sourceCourse: course,
    isRelay: false,
  }
}

function detectMeetInfo(lines: string[], config: ColumnMappingConfig): DetectedMeetInfo {
  let title: string | undefined
  let detectedCourse = config.meetDefaultCourse

  for (const line of lines.slice(0, 20)) {
    if (!detectedCourse) {
      detectedCourse = parseMeetCourseFromHeader(line)
    }
    if (
      !title &&
      line.length > 10 &&
      !/HY-TEK|MEET MANAGER|Results|Programa|Page \d/i.test(line) &&
      !parseAnyEventTitle(line)
    ) {
      title = line.trim()
    }
  }

  return {
    title,
    detectedCourse,
    format: 'column-mapped',
  }
}

function getCellValue(cells: string[], index: number): string | undefined {
  if (index < 0 || index >= cells.length) return undefined
  const val = cells[index]?.trim()
  return val || undefined
}

function parseMappedRow(
  cells: string[],
  config: ColumnMappingConfig,
  ctx: EventRowContext,
  sourceLineIndex?: number,
): ParsedRow | null {
  if (ctx.isRelay || isRelayEventText(ctx.eventLabel)) return null

  let swimmerName = ''
  let team: string | undefined
  let age: number | undefined
  let lane: number | undefined
  let rawTime = ''

  config.columnFields.forEach((field: MappedField, idx) => {
    const val = getCellValue(cells, idx)
    if (!val) return

    switch (field) {
      case 'name':
        swimmerName = formatDisplayName(val)
        break
      case 'team':
        team = val
        break
      case 'age': {
        const n = Number(val)
        if (!Number.isNaN(n) && n > 0 && n < 100) age = n
        break
      }
      case 'lane': {
        const n = Number(val)
        if (!Number.isNaN(n)) lane = n
        break
      }
      case 'time':
        if (idx === config.activeTimeColumnIndex) {
          rawTime = normalizeTimeCell(val)
        }
        break
      default:
        break
    }
  })

  if (!swimmerName || !rawTime) return null

  const timeResult = parseTimeToken(rawTime)

  return buildParsedRow({
    swimmerName,
    age,
    team,
    lane,
    rawTime: timeResult.rawTime,
    timeCentiseconds: timeResult.timeCentiseconds,
    eventLabel: ctx.eventLabel,
    eventId: ctx.eventId,
    sourceCourse: ctx.sourceCourse,
    extraIssues: timeResult.extraIssues,
    forceStatus: timeResult.forceStatus,
    included: timeResult.included,
    sourceLineIndex,
    heatLabel: ctx.heatLabel,
    round: ctx.round,
  })
}

export function applyColumnMapping(
  rawText: string,
  config: ColumnMappingConfig,
): ColumnMappingResult {
  resetRowIds()

  const lines = normalizePdfText(rawText)
  const meetInfo = detectMeetInfo(lines, config)
  const effectiveConfig: ColumnMappingConfig = {
    ...config,
    meetDefaultCourse: config.meetDefaultCourse ?? meetInfo.detectedCourse,
  }

  const rows: ParsedRow[] = []
  let ctx = { ...EMPTY_CTX }
  const warnings: string[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const heatCtx = parseHeatContextLine(line)
    if (heatCtx) {
      ctx = { ...ctx, heatLabel: heatCtx.heatLabel, round: heatCtx.round }
      continue
    }

    const kind = classifyLine(line, effectiveConfig, i)

    if (kind === 'event') {
      const nextCtx = resolveEventContext(line, effectiveConfig.meetDefaultCourse)
      if (nextCtx) ctx = { ...nextCtx }
      continue
    }

    if (kind !== 'data') continue

    const cells = splitLineToColumns(line, effectiveConfig.delimiter)
    const row = parseMappedRow(cells, effectiveConfig, ctx, i)
    if (row) rows.push(row)
  }

  if (rows.length === 0) {
    warnings.push('No swimmer rows matched the column mapping.')
  } else {
    warnings.push(
      `Mapped manually (${effectiveConfig.delimiter}, ${effectiveConfig.columnFields.length} columns, ${rows.length} rows).`,
    )
  }

  return {
    rows,
    meetInfo,
    warnings,
    mappingConfig: effectiveConfig,
  }
}

/** Preview count without full row build — for live UI updates. */
export function countMappedRows(rawText: string, config: ColumnMappingConfig): number {
  const lines = normalizePdfText(rawText)
  let ctx = { ...EMPTY_CTX }
  let count = 0

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const kind = classifyLine(line, config, i)

    if (kind === 'event') {
      const nextCtx = resolveEventContext(line, config.meetDefaultCourse)
      if (nextCtx) ctx = nextCtx
      continue
    }

    if (kind !== 'data' || ctx.isRelay) continue

    const cells = splitLineToColumns(line, config.delimiter)
    const nameIdx = config.columnFields.indexOf('name')
    const timeIdx = config.activeTimeColumnIndex
    const name = nameIdx >= 0 ? getCellValue(cells, nameIdx) : undefined
    const time = timeIdx >= 0 ? getCellValue(cells, timeIdx) : undefined

    if (name && time && ctx.eventId) count += 1
  }

  return count
}

/** Return preview rows (max limit) for mapper UI mini-table. */
export function previewMappedRows(
  rawText: string,
  config: ColumnMappingConfig,
  limit = 5,
): ParsedRow[] {
  resetRowIds()
  const result = applyColumnMapping(rawText, config)
  resetRowIds()
  return result.rows.slice(0, limit)
}
