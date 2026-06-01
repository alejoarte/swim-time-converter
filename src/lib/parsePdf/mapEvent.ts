import type { Course } from '../convert'

const STROKE_ALIASES: Record<string, string> = {
  freestyle: 'free',
  free: 'free',
  backstroke: 'back',
  back: 'back',
  breaststroke: 'breast',
  breast: 'breast',
  fly: 'fly',
  butterfly: 'fly',
  im: 'im',
  'individual medley': 'im',
  'estilo libre': 'free',
  'estilo de pecho': 'breast',
  'estilo de espalda': 'back',
  'estilo de mariposa': 'fly',
  mariposa: 'fly',
  combinado: 'im',
  'combinado individual': 'im',
  'combinado relevo': 'im',
  ci: 'im',
}

const STROKE_KEYS_BY_LENGTH = Object.keys(STROKE_ALIASES).sort(
  (a, b) => b.length - a.length,
)

export function mapCourseFromHyTek(scPrefix: string, unit: string): Course | null {
  const prefix = scPrefix.toUpperCase()
  const u = unit.toLowerCase()

  const isYards = u === 'yard' || u === 'yards' || u === 'yardas'
  const isMeters = u === 'meter' || u === 'meters' || u === 'metro'

  if (prefix === 'SC' && isYards) return 'SCY'
  if (prefix === 'SC' && isMeters) return 'SCM'
  if ((prefix === 'LC' || prefix === 'CL') && isMeters) return 'LCM'

  return null
}

function resolveStroke(strokeLabel: string): string | undefined {
  const lower = strokeLabel.trim().toLowerCase()
  for (const key of STROKE_KEYS_BY_LENGTH) {
    if (lower === key || lower.startsWith(`${key} `) || lower.endsWith(` ${key}`)) {
      return STROKE_ALIASES[key]
    }
  }
  return STROKE_ALIASES[lower]
}

export function isRelayEventText(text: string): boolean {
  return /\d+x\d+/i.test(text) || /relevo/i.test(text)
}

export type ParsedEventTitle = {
  distance: number
  course: Course | null
  eventId: string | null
  strokeLabel: string
  isRelay: boolean
}

const EVENT_TITLE_FRAGMENT =
  /(\d{2,4})\s+(SC|LC|CL)\s+(Metro|Meter|Meters|Yard|Yards|Yarda?s?)\s+(.+)$/i

export function parseHyTekEventTitle(text: string): ParsedEventTitle | null {
  if (isRelayEventText(text)) {
    return {
      distance: 0,
      course: null,
      eventId: null,
      strokeLabel: '',
      isRelay: true,
    }
  }

  const match = text.match(EVENT_TITLE_FRAGMENT)
  if (!match) return null

  const [, distanceStr, scPrefix, unit, strokeLabel] = match
  const distance = Number(distanceStr)
  const course = mapCourseFromHyTek(scPrefix, unit)
  const eventId = mapHyTekEventToId(distance, strokeLabel)

  return {
    distance,
    course,
    eventId,
    strokeLabel: strokeLabel.trim(),
    isRelay: false,
  }
}

export function mapHyTekEventToId(
  distance: number,
  strokeLabel: string,
): string | null {
  const stroke = resolveStroke(strokeLabel)
  if (!stroke) return null

  if (stroke === 'free') {
    if (distance === 50) return '50-free'
    if (distance === 100) return '100-free'
    if (distance === 200) return '200-free'
    if (distance === 400 || distance === 500) return '400-500-free'
    if (distance === 800 || distance === 1000) return '800-1000-free'
    if (distance === 1500 || distance === 1650) return '1500-1650-free'
    return null
  }

  if (distance === 50 && stroke === 'fly') return '50-fly'
  if (distance === 100 && stroke === 'fly') return '100-fly'
  if (distance === 200 && stroke === 'fly') return '200-fly'
  if (distance === 50 && stroke === 'back') return '50-back'
  if (distance === 100 && stroke === 'back') return '100-back'
  if (distance === 200 && stroke === 'back') return '200-back'
  if (distance === 50 && stroke === 'breast') return '50-breast'
  if (distance === 100 && stroke === 'breast') return '100-breast'
  if (distance === 200 && stroke === 'breast') return '200-breast'
  if (distance === 100 && stroke === 'im') return '100-im'
  if (distance === 200 && stroke === 'im') return '200-im'
  if (distance === 400 && stroke === 'im') return '400-im'

  return null
}

export function formatEventLabel(eventId: string): string {
  const parts = eventId.split('-')
  if (parts.length < 2) return eventId

  const strokeMap: Record<string, string> = {
    fly: 'Fly',
    back: 'Back',
    breast: 'Breast',
    free: 'Free',
    im: 'IM',
  }

  if (eventId === '400-500-free') return '400/500 Free'
  if (eventId === '800-1000-free') return '800/1000 Free'
  if (eventId === '1500-1650-free') return '1500/1650 Free'

  const stroke = strokeMap[parts[parts.length - 1]] ?? parts[parts.length - 1]
  const distance = parts.slice(0, -1).join('-')
  return `${distance} ${stroke}`
}

const RESULTS_EVENT_TITLE =
  /^(?:Women|Men|W|M|Hombres|Mujeres)\s+(\d{2,4})\s+(Yard|Yards|Meter|Meters)\s+(.+)$/i

export function parseResultsEventTitle(text: string): ParsedEventTitle | null {
  const trimmed = text.trim()
  if (isRelayEventText(trimmed)) {
    return {
      distance: 0,
      course: null,
      eventId: null,
      strokeLabel: '',
      isRelay: true,
    }
  }

  const match = trimmed.match(RESULTS_EVENT_TITLE)
  if (!match) return null

  const [, distanceStr, unit, strokeLabel] = match
  const distance = Number(distanceStr)
  const u = unit.toLowerCase()
  const course: Course | null =
    u === 'yard' || u === 'yards' ? 'SCY' : u === 'meter' || u === 'meters' ? 'SCM' : null
  const eventId = mapHyTekEventToId(distance, strokeLabel)

  return {
    distance,
    course,
    eventId,
    strokeLabel: strokeLabel.trim(),
    isRelay: false,
  }
}

/** Parse course from meet venue line, e.g. "- 25Y" → SCY, "- 50M" → SCM. */
export function parseMeetCourseFromHeader(line: string): Course | null {
  const match = line.match(/-\s*(\d+)\s*([YM])\b/i)
  if (!match) return null

  const [, lengthStr, unit] = match
  const length = Number(lengthStr)
  const u = unit.toUpperCase()

  if (u === 'Y') return 'SCY'
  if (u === 'M' && length <= 25) return 'SCM'
  if (u === 'M') return 'LCM'

  return null
}

/** Try Hy-Tek meet program or results-style event title parsing. */
export function parseAnyEventTitle(text: string): ParsedEventTitle | null {
  const direct = parseHyTekEventTitle(text) ?? parseResultsEventTitle(text)
  if (direct) return direct

  const stripped = text.replace(/^(Evento|Event)\s+\d+\s*/i, '')
  if (stripped !== text) {
    return parseHyTekEventTitle(stripped) ?? parseResultsEventTitle(stripped)
  }

  return null
}
