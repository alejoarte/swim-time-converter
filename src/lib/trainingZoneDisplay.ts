import { type SwimEvent } from '../data/events'
import { getIntensitySpec, type IntensityLevel } from '../data/trainingZoneSystems'
import i18n from '../i18n'
import { convertCentiseconds, type Course } from './convert'
import { formatTime } from './timeParse'
import type { TrainingZonePlan, TrainingZoneRow } from './trainingZones'

export const MAX_HR = 190

export type SimplifiedZoneId = 'recovery' | 'aerobic' | 'threshold' | 'racePace'

export type SimplifiedZoneColor = 'blue' | 'green' | 'orange' | 'red'

export const SIMPLIFIED_ZONE_GROUPS: {
  id: SimplifiedZoneId
  levels: IntensityLevel[]
  color: SimplifiedZoneColor
}[] = [
  { id: 'recovery', levels: ['recovery'], color: 'blue' },
  { id: 'aerobic', levels: ['lowAerobic', 'moderateAerobic'], color: 'green' },
  { id: 'threshold', levels: ['threshold', 'vo2'], color: 'orange' },
  { id: 'racePace', levels: ['racePace', 'sprint'], color: 'red' },
]

export type SimplifiedZoneRow = {
  id: SimplifiedZoneId
  color: SimplifiedZoneColor
  title: string
  subtitle: string
  effortLabel: string
  hrLabel: string
  rpeLabel: string
  paceMinCs: number
  paceMaxCs: number
  metricPaceMinCs: number | null
  metricPaceMaxCs: number | null
}

export function pacePer100FromRow(row: TrainingZoneRow, repDistance: number): number {
  return Math.round(row.pacePerRepCs * (100 / repDistance))
}

export function formatHrLabel(hrMin: number, hrMax: number): string {
  const pctMin = Math.round((hrMin / MAX_HR) * 100)
  const pctMax = Math.round((hrMax / MAX_HR) * 100)
  return `${pctMin}–${pctMax}% / ${hrMin}–${hrMax} bpm`
}

export function formatPaceRange(minCs: number, maxCs: number): string {
  return `${formatTime(minCs)} – ${formatTime(maxCs)}`
}

function getMetricPace(cs: number, course: Course, event: SwimEvent): number | null {
  if (course !== 'SCY') return null
  return Math.round(convertCentiseconds(cs, 'SCY', 'SCM', event))
}

export function buildSimplifiedZoneRows(
  plan: TrainingZonePlan,
  course: Course,
  event: SwimEvent,
): SimplifiedZoneRow[] {
  const repDistance = plan.practiceRepDistance
  const rowsByLevel = new Map(plan.rows.map((row) => [row.level, row]))

  return SIMPLIFIED_ZONE_GROUPS.map((group) => {
    const groupRows = group.levels
      .map((level) => rowsByLevel.get(level))
      .filter((row): row is TrainingZoneRow => row !== undefined)

    const paces = groupRows.map((row) => pacePer100FromRow(row, repDistance))
    const paceMinCs = Math.min(...paces)
    const paceMaxCs = Math.max(...paces)

    const specs = group.levels.map((level) => getIntensitySpec(level))
    const hrMin = Math.min(...specs.map((spec) => spec.hrMin))
    const hrMax = Math.max(...specs.map((spec) => spec.hrMax))

    return {
      id: group.id,
      color: group.color,
      title: i18n.t(`simplified.${group.id}.title`, { ns: 'zones' }),
      subtitle: i18n.t(`simplified.${group.id}.subtitle`, { ns: 'zones' }),
      effortLabel: i18n.t(`simplified.${group.id}.effort`, { ns: 'zones' }),
      hrLabel: formatHrLabel(hrMin, hrMax),
      rpeLabel: i18n.t(`simplified.${group.id}.rpe`, { ns: 'zones' }),
      paceMinCs,
      paceMaxCs,
      metricPaceMinCs: getMetricPace(paceMinCs, course, event),
      metricPaceMaxCs: getMetricPace(paceMaxCs, course, event),
    }
  })
}
