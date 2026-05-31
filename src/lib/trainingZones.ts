import {

  ANCHOR_LABEL,

  getIntensityDefinition,

  getZoneSystem,

  type IntensityLevel,

  type OffsetModel,

  type ZoneReliability,

  type ZoneSystemId,

} from '../data/trainingZoneSystems'

import { type SwimEvent } from '../data/events'

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

  const pace100 = goalPacePer100(goalCentiseconds, event, course)

  const pace50 = Math.round(pace100 / 2)



  const rows: TrainingZoneRow[] = profile.zones.map((zone) => {

    const def = getIntensityDefinition(zone.level)

    const pacePer100Cs = pacePer100ForZone(

      pace100,

      offsetModel,

      def.offsetPer100Cs,

      def.offsetPer100Percent,

    )

    const vsRacePer100Cs = pacePer100Cs - pace100

    const pacePerRepCs = Math.round(pacePer100Cs * (repDistance / 100))

    const vsRacePerRepCs = Math.round(vsRacePer100Cs * (repDistance / 100))



    const effortLabel =

      def.effortMin === def.effortMax

        ? `${def.effortMin}%+`

        : `${def.effortMin}–${def.effortMax}%`



    const rpeLabel =

      def.rpeMin === def.rpeMax

        ? `${def.rpeMin}`

        : `${def.rpeMin}–${def.rpeMax}`



    return {

      level: zone.level,

      code: zone.code,

      name: zone.name,

      purpose: def.purpose,

      effortLabel,

      hrLabel: `${def.hrMin}–${def.hrMax}`,

      rpeLabel,

      restGuidance: def.restGuidance,

      pacePerRepCs,

      vsRacePerRepCs,

      isRacePace: zone.level === 'racePace',

      reliability: def.reliability,

      reliabilityNote: def.reliabilityNote,

    }

  })



  return {

    goalPacePer100Cs: pace100,

    goalPacePer50Cs: pace50,

    practiceRepDistance: repDistance,

    offsetModel,

    anchorLabel: ANCHOR_LABEL,

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



const RELIABILITY_LABELS: Record<ZoneReliability, string> = {

  high: 'High',

  moderate: 'Moderate',

  low: 'Low',

}



export function formatReliabilityLabel(reliability: ZoneReliability): string {

  return RELIABILITY_LABELS[reliability]

}


