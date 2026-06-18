import { type SwimEvent } from '../data/events'
import { type Course } from './convert'

export type GoalPaceResult = {
  pacePer50: number
  pacePer100: number | null
  lapCount: number
}

/** Race length in pool units (yards for SCY, meters for SCM/LCM). */
export function getRaceLength(event: SwimEvent, course: Course): number {
  if (event.id === '400-500-free') {
    return course === 'SCM' ? 400 : 500
  }
  if (event.id === '800-1000-free') {
    return course === 'SCM' ? 800 : 1000
  }
  if (event.id === '1500-1650-free') {
    return course === 'SCY' ? 1650 : 1500
  }
  return event.distance
}

/** Number of 50-length segments in the race. */
export function getLapCount(event: SwimEvent, course: Course): number {
  return getRaceLength(event, course) / 50
}

/** Even-split pace targets from a goal race time. */
export function goalPaceFromTime(
  goalCentiseconds: number,
  lapCount: number,
): GoalPaceResult {
  const pacePer50 = Math.round(goalCentiseconds / lapCount)
  const pacePer100 = lapCount >= 2 ? Math.round(goalCentiseconds / (lapCount / 2)) : null

  return { pacePer50, pacePer100, lapCount }
}

/** Label for pool length unit in pace copy. */
export function getLengthUnitLabel(course: Course): 'yard' | 'meter' {
  return course === 'SCY' ? 'yard' : 'meter'
}
