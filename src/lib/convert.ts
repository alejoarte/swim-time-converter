import { getEventLabel, type Stroke, type SwimEvent } from '../data/events'

export type Course = 'SCY' | 'SCM' | 'LCM'

export const CLASSICAL_FACTOR_STANDARD = 1.11
export const CLASSICAL_FACTOR_DISTANCE_FREE = 0.8925
export const CLASSICAL_FACTOR_SCY_TO_LCM_1650_FREE = 1.02

export const DISTANCE_INCRE_500_OR_400 = 640
export const DISTANCE_INCRE_1000_OR_800 = 1280
export const DISTANCE_INCRE_1650_OR_1500 = 2400

const STROKE_INCRE: Record<Stroke, number> = {
  fly: 70,
  back: 60,
  breast: 100,
  free: 80,
  im: 80,
}

function isDistanceFreeEvent(event: SwimEvent): boolean {
  return event.distance === 500 || event.distance === 1000 || event.distance === 1650
}

function usesDistanceFreeFactor(event: SwimEvent): boolean {
  return isDistanceFreeEvent(event)
}

/** fFactor for Classical (Colorado Timing) conversion. */
export function getFFactor(from: Course, to: Course, event: SwimEvent): number {
  if (from === 'SCM' && to === 'LCM') return 1.0
  if (from === 'LCM' && to === 'SCM') return 1.0

  if (usesDistanceFreeFactor(event)) {
    if (event.distance === 500 || event.distance === 1000) {
      return CLASSICAL_FACTOR_DISTANCE_FREE
    }
    if (event.distance === 1650) {
      return CLASSICAL_FACTOR_SCY_TO_LCM_1650_FREE
    }
  }

  return CLASSICAL_FACTOR_STANDARD
}

function strokeDistanceIncre(event: SwimEvent): number {
  const incre = STROKE_INCRE[event.stroke]
  if (event.distance === 50) return incre
  if (event.distance === 100) return 2 * incre
  if (event.distance === 200) return 4 * incre
  if (event.distance === 400) return 8 * incre
  return 0
}

function lcmScmDistanceIncre(event: SwimEvent): number | null {
  if (event.distance === 500 || event.distance === 400) return DISTANCE_INCRE_500_OR_400
  if (event.distance === 1000 || event.distance === 800) return DISTANCE_INCRE_1000_OR_800
  if (event.distance === 1650 || event.distance === 1500)
    return DISTANCE_INCRE_1650_OR_1500
  return null
}

/** fIncre in centiseconds for Classical (Colorado Timing) conversion. */
export function getFIncre(from: Course, to: Course, event: SwimEvent): number {
  const involvesScy = from === 'SCY' || to === 'SCY'
  const involvesScm = from === 'SCM' || to === 'SCM'
  const involvesLcm = from === 'LCM' || to === 'LCM'

  if (involvesScy && involvesScm && !involvesLcm) {
    return 0
  }

  if (involvesLcm && involvesScm && !involvesScy) {
    const distanceIncre = lcmScmDistanceIncre(event)
    if (distanceIncre !== null) return distanceIncre
    return strokeDistanceIncre(event)
  }

  if (involvesScy && involvesLcm) {
    if (event.stroke === 'im' && event.distance === 400) return DISTANCE_INCRE_500_OR_400
    if (isDistanceFreeEvent(event)) {
      if (event.distance === 500) return DISTANCE_INCRE_500_OR_400
      if (event.distance === 1000) return DISTANCE_INCRE_1000_OR_800
      if (event.distance === 1650) return DISTANCE_INCRE_1650_OR_1500
    }
    if (event.distance <= 200) return strokeDistanceIncre(event)
    return 0
  }

  return 0
}

function convertDirect(
  hsecs: number,
  from: Course,
  to: Course,
  event: SwimEvent,
): number {
  const fFactor = getFFactor(from, to, event)
  const fIncre = getFIncre(from, to, event)

  let converted: number

  if (from === 'SCY' && (to === 'LCM' || to === 'SCM')) {
    converted = hsecs * fFactor + fIncre
  } else if (from === 'LCM' && (to === 'SCY' || to === 'SCM')) {
    converted = (hsecs - fIncre) / fFactor
  } else if (from === 'SCM' && to === 'SCY') {
    converted = hsecs / fFactor
  } else if (from === 'SCM' && to === 'LCM') {
    converted = hsecs + fIncre
  } else if (from === 'LCM' && to === 'SCM') {
    converted = (hsecs - fIncre) / fFactor
  } else {
    throw new Error(`Unsupported direct conversion: ${from} → ${to}`)
  }

  return Math.max(0, converted)
}

/** Convert time in centiseconds between courses using Classical (Colorado Timing) factors. */
export function convertCentiseconds(
  hsecs: number,
  from: Course,
  to: Course,
  event: SwimEvent,
): number {
  if (from === to) return hsecs

  const directPairs: [Course, Course][] = [
    ['SCY', 'LCM'],
    ['SCY', 'SCM'],
    ['LCM', 'SCY'],
    ['LCM', 'SCM'],
    ['SCM', 'SCY'],
    ['SCM', 'LCM'],
  ]

  for (const [f, t] of directPairs) {
    if (from === f && to === t) {
      return convertDirect(hsecs, from, to, event)
    }
  }

  throw new Error(`Unsupported conversion: ${from} → ${to}`)
}

export type ConversionResult = {
  eventId: string
  eventLabel: string
  sourceCourse: Course
  sourceCentiseconds: number
  SCY: number
  SCM: number
  LCM: number
}

export function convertEntry(
  event: SwimEvent,
  sourceCourse: Course,
  sourceCentiseconds: number,
): ConversionResult {
  const courses: Course[] = ['SCY', 'SCM', 'LCM']
  const converted: Record<Course, number> = {
    SCY: 0,
    SCM: 0,
    LCM: 0,
  }

  for (const course of courses) {
    converted[course] = convertCentiseconds(
      sourceCentiseconds,
      sourceCourse,
      course,
      event,
    )
  }

  return {
    eventId: event.id,
    eventLabel: getEventLabel(event.id),
    sourceCourse,
    sourceCentiseconds,
    SCY: converted.SCY,
    SCM: converted.SCM,
    LCM: converted.LCM,
  }
}
