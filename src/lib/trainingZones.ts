import {
  getAnchorLabel,
  getIntensityPurpose,
  getIntensityReliabilityNote,
  getIntensityRestGuidance,
  getIntensitySpec,
  getLocalizedZoneName,
  getZoneSystem,
  type IntensityLevel,
  type OffsetModel,
  type ZoneReliability,
  type ZoneSystemId,
} from '../data/trainingZoneSystems'
import { type SwimEvent } from '../data/events'
import i18n from '../i18n'
import { type Course } from './convert'
import { getRaceLength } from './pacing'

export type TrainingZoneRow = {
  level: IntensityLevel
  code: string
  name: string
  purpose: string
  effortLabel: string
  hrLabel: string
  rpeLabel: string
  restGuidance: string
  pacePerRepCs: number
  vsRacePerRepCs: number
  isRacePace: boolean
  reliability: ZoneReliability
  reliabilityNote: string
}

export type TrainingZonePlan = {
  goalPacePer100Cs: number
  goalPacePer50Cs: number
  goalDisplayPaceCs: number
  displayPaceDistance: 50 | 100
  practiceRepDistance: number
  offsetModel: OffsetModel
  anchorLabel: string
  rows: TrainingZoneRow[]
}

/** Practice repeat distance: 50s for sprints through 200, 100s for 400+. */
export function getPracticeRepDistance(event: SwimEvent): number {
  if (event.distance <= 200) return 50
  return 100
}

/** Per-100/50 race average reference is misleading for single-length 50 events. */
export function shouldShowRaceAverageReference(event: SwimEvent): boolean {
  return event.distance > 50
}

/** Pace distance used in coach table and goal-pace card labels. */
export function getDisplayPaceDistance(event: SwimEvent): 50 | 100 {
  return shouldShowRaceAverageReference(event) ? 100 : 50
}

/** Goal pace shown in the UI (actual 50 time for 50 events, per-100 average otherwise). */
export function getGoalDisplayPaceCs(
  goalCentiseconds: number,
  event: SwimEvent,
  course: Course,
): number {
  return getDisplayPaceDistance(event) === 50
    ? goalCentiseconds
    : goalPacePer100(goalCentiseconds, event, course)
}

/** Goal race average pace per 100 in centiseconds. */
export function goalPacePer100(
  goalCentiseconds: number,
  event: SwimEvent,
  course: Course,
): number {
  const raceLength = getRaceLength(event, course)
  return Math.round(goalCentiseconds / (raceLength / 100))
}

function pacePer100ForZone(
  pace100: number,
  offsetModel: OffsetModel,
  offsetPer100Cs: number,
  offsetPer100Percent: number,
): number {
  if (offsetModel === 'percent') {
    return Math.round(pace100 * (1 + offsetPer100Percent / 100))
  }
  return pace100 + offsetPer100Cs
}

export function computeTrainingZoneRows(
  goalCentiseconds: number,
  event: SwimEvent,
  course: Course,
  systemId: ZoneSystemId,
  offsetModel: OffsetModel = 'fixed',
): TrainingZonePlan {
  const profile = getZoneSystem(systemId)
  const repDistance = getPracticeRepDistance(event)
  const displayPaceDistance = getDisplayPaceDistance(event)
  const pace100 = goalPacePer100(goalCentiseconds, event, course)
  const pace50 = Math.round(pace100 / 2)
  const goalDisplayPaceCs = getGoalDisplayPaceCs(goalCentiseconds, event, course)

  const rows: TrainingZoneRow[] = profile.zones.map((zone) => {
    const spec = getIntensitySpec(zone.level)
    const pacePer100Cs = pacePer100ForZone(
      pace100,
      offsetModel,
      spec.offsetPer100Cs,
      spec.offsetPer100Percent,
    )
    const vsRacePer100Cs = pacePer100Cs - pace100
    const pacePerRepCs = Math.round(pacePer100Cs * (repDistance / 100))
    const vsRacePerRepCs = Math.round(vsRacePer100Cs * (repDistance / 100))

    const effortLabel =
      spec.effortMin === spec.effortMax
        ? `${spec.effortMin}%+`
        : `${spec.effortMin}–${spec.effortMax}%`

    const rpeLabel =
      spec.rpeMin === spec.rpeMax ? `${spec.rpeMin}` : `${spec.rpeMin}–${spec.rpeMax}`

    return {
      level: zone.level,
      code: zone.code,
      name: getLocalizedZoneName(systemId, zone.level),
      purpose: getIntensityPurpose(zone.level),
      effortLabel,
      hrLabel: `${spec.hrMin}–${spec.hrMax}`,
      rpeLabel,
      restGuidance: getIntensityRestGuidance(zone.level),
      pacePerRepCs,
      vsRacePerRepCs,
      isRacePace: zone.level === 'racePace',
      reliability: spec.reliability,
      reliabilityNote: getIntensityReliabilityNote(zone.level),
    }
  })

  return {
    goalPacePer100Cs: pace100,
    goalPacePer50Cs: pace50,
    goalDisplayPaceCs,
    displayPaceDistance,
    practiceRepDistance: repDistance,
    offsetModel,
    anchorLabel: getAnchorLabel(),
    rows,
  }
}

/** Format centisecond offset for vs-race column (+ slower, − faster). */
export function formatVsRaceOffset(centiseconds: number): string {
  if (centiseconds === 0) return '0'
  const sign = centiseconds > 0 ? '+' : '−'
  const abs = Math.abs(centiseconds)
  const seconds = Math.floor(abs / 100)
  const hundredths = abs % 100
  if (seconds === 0) {
    return `${sign}0.${hundredths.toString().padStart(2, '0')}`
  }
  const ss = (seconds % 60).toString()
  const mm = Math.floor(seconds / 60)
  const hh = hundredths.toString().padStart(2, '0')
  if (mm > 0) {
    return `${sign}${mm}:${ss.padStart(2, '0')}.${hh}`
  }
  return `${sign}${ss}.${hh}`
}

export function formatReliabilityLabel(reliability: ZoneReliability): string {
  return i18n.t(`reliability.${reliability}`, { ns: 'zones' })
}
