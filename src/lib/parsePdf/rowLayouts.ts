import { buildParsedRow } from './rowBuilder'
import { parseTimeToken, TIME_TOKEN_PATTERN } from './parseTimeToken'
import { isPipeSeparatorLine, splitPipeCells } from './preprocessRowLine'
import type { EventRowContext, ParsedRow, RowLayoutId } from './types'

const TEAM_TIME = new RegExp(`^(.+)\\s+(${TIME_TOKEN_PATTERN})$`, 'i')

export type RowLayoutParser = (
  line: string,
  ctx: EventRowContext,
) => ParsedRow | null

export type RowLayout = {
  id: RowLayoutId
  label: string
  parseLine: RowLayoutParser
}

function buildRelayRow(line: string, ctx: EventRowContext): ParsedRow {
  return buildParsedRow({
    swimmerName: line,
    rawTime: '',
    timeCentiseconds: null,
    eventLabel: ctx.eventLabel,
    eventId: ctx.eventId,
    sourceCourse: ctx.sourceCourse,
    extraIssues: ['Relay event not supported'],
    forceStatus: 'error',
    included: false,
  })
}

function buildSwimmerRow(fields: {
  swimmerName: string
  age?: number
  team?: string
  lane?: number
  timeToken: string
  ctx: EventRowContext
}): ParsedRow | null {
  const { swimmerName, age, team, lane, timeToken, ctx } = fields
  if (!swimmerName.trim()) return null

  const timeResult = parseTimeToken(timeToken)

  return buildParsedRow({
    swimmerName: swimmerName.trim(),
    age: age !== undefined && !Number.isNaN(age) ? age : undefined,
    team: team?.trim(),
    lane: lane !== undefined && !Number.isNaN(lane) ? lane : undefined,
    rawTime: timeResult.rawTime,
    timeCentiseconds: timeResult.timeCentiseconds,
    eventLabel: ctx.eventLabel,
    eventId: ctx.eventId,
    sourceCourse: ctx.sourceCourse,
    extraIssues: timeResult.extraIssues,
    forceStatus: timeResult.forceStatus,
    included: timeResult.included,
  })
}

function parseAgeTeam(text: string): { age?: number; team?: string } | null {
  const match = text.trim().match(/^(\d{1,2})\s+(.+)$/)
  if (!match) return null
  return { age: Number(match[1]), team: match[2].trim() }
}

function findTimeToken(cells: string[]): string | null {
  for (let i = cells.length - 1; i >= 0; i -= 1) {
    const cell = cells[i].trim()
    if (!cell) continue
    if (new RegExp(`^${TIME_TOKEN_PATTERN}$`, 'i').test(cell)) {
      return cell
    }
  }
  return null
}

export function parseTeamTimeFirstLine(
  line: string,
  ctx: EventRowContext,
): ParsedRow | null {
  if (ctx.isRelay) return buildRelayRow(line, ctx)
  if (isPipeSeparatorLine(line)) return null

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
      new RegExp(
        `^(.+?\\s+${TIME_TOKEN_PATTERN})\\s+(\\d{1,2})\\s+(.+?)\\s+(\\d{1,2})$`,
        'i',
      ),
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

  return buildSwimmerRow({
    swimmerName,
    age,
    team: teamTimeMatch[1].trim(),
    lane,
    timeToken: teamTimeMatch[2],
    ctx,
  })
}

function parseLaneFirstPipeLine(
  line: string,
  ctx: EventRowContext,
): ParsedRow | null {
  const cells = splitPipeCells(line)
  if (!cells || cells.length < 2) return null

  const laneNameCell = cells[0]
  const ageTeamCell = cells[1]
  if (!laneNameCell || !ageTeamCell) return null

  const laneNameMatch = laneNameCell.match(/^(\d{1,2})\s+(.+)$/)
  if (!laneNameMatch) return null

  const ageTeam = parseAgeTeam(ageTeamCell)
  if (!ageTeam) return null

  const timeToken = findTimeToken(cells.slice(2))
  if (!timeToken) return null

  return buildSwimmerRow({
    lane: Number(laneNameMatch[1]),
    swimmerName: laneNameMatch[2].trim(),
    age: ageTeam.age,
    team: ageTeam.team,
    timeToken,
    ctx,
  })
}

function parseLaneFirstPlainLine(
  line: string,
  ctx: EventRowContext,
): ParsedRow | null {
  const match = line.match(
    new RegExp(
      `^(\\d{1,2})\\s+(.+?)\\s+(\\d{1,2})\\s+(.+?)\\s+(${TIME_TOKEN_PATTERN})$`,
      'i',
    ),
  )
  if (!match) return null

  return buildSwimmerRow({
    lane: Number(match[1]),
    swimmerName: match[2].trim(),
    age: Number(match[3]),
    team: match[4].trim(),
    timeToken: match[5],
    ctx,
  })
}

export function parseLaneFirstTimeLastLine(
  line: string,
  ctx: EventRowContext,
): ParsedRow | null {
  if (ctx.isRelay) return buildRelayRow(line, ctx)
  if (isPipeSeparatorLine(line)) return null

  const trimmed = line.trim()
  if (trimmed.startsWith('|')) {
    return parseLaneFirstPipeLine(line, ctx)
  }

  return parseLaneFirstPlainLine(line, ctx)
}

const TIME_PREFIX = new RegExp(`^(${TIME_TOKEN_PATTERN})\\s+`, 'i')

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

export function parseTimeFirstLine(
  line: string,
  ctx: EventRowContext,
): ParsedRow | null {
  if (ctx.isRelay) return null

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
    eventLabel: ctx.eventLabel,
    eventId: ctx.eventId,
    sourceCourse: ctx.sourceCourse,
  })
}

export const ROW_LAYOUTS: RowLayout[] = [
  {
    id: 'team-time-first',
    label: 'Team+Time → Age → Name → Lane',
    parseLine: parseTeamTimeFirstLine,
  },
  {
    id: 'lane-first-time-last',
    label: 'Lane → Name → Age+Team → Time',
    parseLine: parseLaneFirstTimeLastLine,
  },
  {
    id: 'time-first',
    label: 'Time → Name → Age → Lane → Team',
    parseLine: parseTimeFirstLine,
  },
]

export function getRowLayout(id: RowLayoutId): RowLayout {
  const layout = ROW_LAYOUTS.find((l) => l.id === id)
  if (!layout) throw new Error(`Unknown row layout: ${id}`)
  return layout
}
