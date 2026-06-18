import { getEventById } from '../data/events'
import {
  OFFSET_MODEL_IDS,
  ZONE_SYSTEMS,
  type OffsetModel,
  type ZoneSystemId,
} from '../data/trainingZoneSystems'
import { type Course } from './convert'

export type PlanShareLanguage = 'en' | 'es'

export type PlanShareState = {
  course: Course
  eventId: string
  goalCentiseconds: number
  zoneSystemId: ZoneSystemId
  offsetModel: OffsetModel
  language?: PlanShareLanguage
}

export const SHARE_QUERY_VERSION = '1'

const MAX_GOAL_CENTISECONDS = 360_000

const ZONE_SYSTEM_IDS = new Set(ZONE_SYSTEMS.map((s) => s.id))
const OFFSET_MODEL_SET = new Set(OFFSET_MODEL_IDS)

function isCourse(value: string): value is Course {
  return value === 'SCY' || value === 'SCM' || value === 'LCM'
}

function isZoneSystemId(value: string): value is ZoneSystemId {
  return ZONE_SYSTEM_IDS.has(value as ZoneSystemId)
}

function isOffsetModel(value: string): value is OffsetModel {
  return OFFSET_MODEL_SET.has(value as OffsetModel)
}

function isPlanShareLanguage(value: string): value is PlanShareLanguage {
  return value === 'en' || value === 'es'
}

function parsePositiveCentiseconds(raw: string | null): number | null {
  if (raw === null || raw === '') return null
  if (!/^\d+$/.test(raw)) return null
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_GOAL_CENTISECONDS) {
    return null
  }
  return value
}

export function hasPlanShareQuery(params: URLSearchParams): boolean {
  return params.get('plan') !== null
}

export function parsePlanShareFromSearchParams(
  params: URLSearchParams,
): PlanShareState | null {
  if (params.get('plan') !== SHARE_QUERY_VERSION) return null

  const courseRaw = params.get('c')
  if (!courseRaw || !isCourse(courseRaw)) return null

  const eventId = params.get('e')
  if (!eventId || !getEventById(eventId)) return null

  const goalCentiseconds = parsePositiveCentiseconds(params.get('t'))
  if (goalCentiseconds === null) return null

  const zoneRaw = params.get('z')
  let zoneSystemId: ZoneSystemId = 'a-system'
  if (zoneRaw !== null && zoneRaw !== '') {
    if (!isZoneSystemId(zoneRaw)) return null
    zoneSystemId = zoneRaw
  }

  const offsetRaw = params.get('o')
  let offsetModel: OffsetModel = 'fixed'
  if (offsetRaw !== null && offsetRaw !== '') {
    if (!isOffsetModel(offsetRaw)) return null
    offsetModel = offsetRaw
  }

  const lngRaw = params.get('lng')
  let language: PlanShareLanguage | undefined
  if (lngRaw !== null && lngRaw !== '') {
    if (!isPlanShareLanguage(lngRaw)) return null
    language = lngRaw
  }

  return {
    course: courseRaw,
    eventId,
    goalCentiseconds,
    zoneSystemId,
    offsetModel,
    language,
  }
}

export function parsePlanShareFromLocation(loc?: Location): PlanShareState | null {
  if (typeof window === 'undefined' && loc === undefined) return null
  const location = loc ?? window.location
  return parsePlanShareFromSearchParams(new URLSearchParams(location.search))
}

export function buildPlanShareUrl(state: PlanShareState, baseHref?: string): string {
  const href =
    baseHref ??
    (typeof window !== 'undefined'
      ? window.location.href
      : 'http://localhost/swim-time-converter/')
  const url = new URL(href)

  url.searchParams.set('plan', SHARE_QUERY_VERSION)
  url.searchParams.set('c', state.course)
  url.searchParams.set('e', state.eventId)
  url.searchParams.set('t', String(state.goalCentiseconds))
  url.searchParams.set('z', state.zoneSystemId)
  url.searchParams.set('o', state.offsetModel)

  if (state.language) {
    url.searchParams.set('lng', state.language)
  } else {
    url.searchParams.delete('lng')
  }

  return url.toString()
}
