/** Underlying intensity level — shared pace math across all zone naming profiles. */
export type IntensityLevel =
  | 'recovery'
  | 'lowAerobic'
  | 'moderateAerobic'
  | 'threshold'
  | 'vo2'
  | 'racePace'
  | 'sprint'

export type ZoneReliability = 'high' | 'moderate' | 'low'

export type OffsetModel = 'fixed' | 'percent'

export type IntensityDefinition = {
  level: IntensityLevel
  /** Seconds added to goal race pace per 100 (negative = faster than race). */
  offsetPer100Cs: number
  /** Percent added to goal race pace per 100 (negative = faster than race). */
  offsetPer100Percent: number
  purpose: string
  effortMin: number
  effortMax: number
  hrMin: number
  hrMax: number
  rpeMin: number
  rpeMax: number
  restGuidance: string
  reliability: ZoneReliability
  reliabilityNote: string
}

export const OFFSET_MODELS: { id: OffsetModel; label: string; description: string }[] = [
  {
    id: 'fixed',
    label: 'Fixed seconds',
    description:
      'Same +/− seconds per 100 regardless of speed (simple cruise-style ladder).',
  },
  {
    id: 'percent',
    label: 'Percentage',
    description:
      'Scales with your pace (Hy-Tek-style); better for very fast or slow swimmers.',
  },
]

export const ANCHOR_LABEL = 'Goal race average (even split)'

export function getOffsetModelLabel(id: OffsetModel): string {
  return OFFSET_MODELS.find((m) => m.id === id)?.label ?? id
}

export type ZoneLabel = {
  level: IntensityLevel
  code: string
  name: string
}

export type ZoneSystemId = 'a-system' | 'us-system' | 'dual'

export type ZoneSystemProfile = {
  id: ZoneSystemId
  label: string
  description: string
  zones: ZoneLabel[]
}

/** Pace offsets and physiology metadata (US Swimming 1995, A-system clubs, cruise-time models). */
export const INTENSITY_DEFINITIONS: IntensityDefinition[] = [
  {
    level: 'recovery',
    offsetPer100Cs: 1400,
    offsetPer100Percent: 28,
    purpose: 'Warm-up, cool-down, active recovery',
    effortMin: 55,
    effortMax: 65,
    hrMin: 100,
    hrMax: 120,
    rpeMin: 2,
    rpeMax: 3,
    restGuidance: 'Choice / 15–30 s',
    reliability: 'low',
    reliabilityNote:
      'Coaches usually set recovery paces from feel or current threshold, not goal race time.',
  },
  {
    level: 'lowAerobic',
    offsetPer100Cs: 1000,
    offsetPer100Percent: 20,
    purpose: 'Basic endurance, aerobic base',
    effortMin: 65,
    effortMax: 75,
    hrMin: 120,
    hrMax: 140,
    rpeMin: 3,
    rpeMax: 4,
    restGuidance: '10–20 s',
    reliability: 'low',
    reliabilityNote:
      'Coaches usually set aerobic paces from current threshold/CSS, not goal race time.',
  },
  {
    level: 'moderateAerobic',
    offsetPer100Cs: 700,
    offsetPer100Percent: 14,
    purpose: 'Aerobic development, technique at tempo',
    effortMin: 75,
    effortMax: 82,
    hrMin: 140,
    hrMax: 155,
    rpeMin: 5,
    rpeMax: 6,
    restGuidance: '10–20 s',
    reliability: 'low',
    reliabilityNote:
      'Coaches usually set aerobic paces from current threshold/CSS, not goal race time.',
  },
  {
    level: 'threshold',
    offsetPer100Cs: 400,
    offsetPer100Percent: 8,
    purpose: 'Aerobic threshold, sustained quality',
    effortMin: 82,
    effortMax: 88,
    hrMin: 155,
    hrMax: 170,
    rpeMin: 7,
    rpeMax: 8,
    restGuidance: '10–30 s',
    reliability: 'moderate',
    reliabilityNote: 'Useful guide; confirm with test sets or your coach.',
  },
  {
    level: 'vo2',
    offsetPer100Cs: 100,
    offsetPer100Percent: 2,
    purpose: 'Aerobic power / VO2 max intervals',
    effortMin: 88,
    effortMax: 94,
    hrMin: 170,
    hrMax: 185,
    rpeMin: 8,
    rpeMax: 9,
    restGuidance: '20 s – 1:1',
    reliability: 'moderate',
    reliabilityNote: 'Useful guide; confirm with test sets or your coach.',
  },
  {
    level: 'racePace',
    offsetPer100Cs: 0,
    offsetPer100Percent: 0,
    purpose: 'Race-pace rehearsal, goal speed',
    effortMin: 95,
    effortMax: 100,
    hrMin: 175,
    hrMax: 190,
    rpeMin: 9,
    rpeMax: 10,
    restGuidance: '30 s – 1:2',
    reliability: 'high',
    reliabilityNote: 'Best fit for goal-race planning.',
  },
  {
    level: 'sprint',
    offsetPer100Cs: -300,
    offsetPer100Percent: -6,
    purpose: 'Power / speed, short maximal reps',
    effortMin: 100,
    effortMax: 100,
    hrMin: 190,
    hrMax: 200,
    rpeMin: 10,
    rpeMax: 10,
    restGuidance: '1:2 – full',
    reliability: 'high',
    reliabilityNote: 'Best fit for goal-race planning.',
  },
]

const A_SYSTEM_LABELS: ZoneLabel[] = [
  { level: 'recovery', code: 'REC', name: 'Recovery' },
  { level: 'lowAerobic', code: 'A1', name: 'Basic endurance' },
  { level: 'moderateAerobic', code: 'A2', name: 'Aerobic tempo' },
  { level: 'threshold', code: 'A3', name: 'Threshold' },
  { level: 'vo2', code: 'VO2', name: 'Aerobic power' },
  { level: 'racePace', code: 'RP', name: 'Race pace' },
  { level: 'sprint', code: 'SP', name: 'Sprint' },
]

const US_SYSTEM_LABELS: ZoneLabel[] = [
  { level: 'recovery', code: 'REC', name: 'Warm-up / Recovery' },
  { level: 'lowAerobic', code: 'EN1', name: 'Aerobic base' },
  { level: 'moderateAerobic', code: 'EN2', name: 'Aerobic development' },
  { level: 'threshold', code: 'EN3', name: 'Threshold / VO2' },
  { level: 'vo2', code: 'SP1', name: 'Best average' },
  { level: 'racePace', code: 'SP2', name: 'Race pace' },
  { level: 'sprint', code: 'SP3', name: 'Maximum speed' },
]

function dualLabels(): ZoneLabel[] {
  return A_SYSTEM_LABELS.map((a, i) => {
    const us = US_SYSTEM_LABELS[i]
    return {
      level: a.level,
      code: `${a.code} / ${us.code}`,
      name: `${a.name} · ${us.name}`,
    }
  })
}

export const ZONE_SYSTEMS: ZoneSystemProfile[] = [
  {
    id: 'a-system',
    label: 'A-system (REC, A1, A2, A3, VO2, RP, SP)',
    description: 'UK / European club tradition',
    zones: A_SYSTEM_LABELS,
  },
  {
    id: 'us-system',
    label: 'US Swimming (REC, EN1–EN3, SP1–SP3)',
    description: 'USA Swimming / Hy-Tek energy levels',
    zones: US_SYSTEM_LABELS,
  },
  {
    id: 'dual',
    label: 'Dual labels (A + US codes)',
    description: 'Both naming systems side by side',
    zones: dualLabels(),
  },
]

export function getZoneSystem(id: ZoneSystemId): ZoneSystemProfile {
  const profile = ZONE_SYSTEMS.find((s) => s.id === id)
  if (!profile) return ZONE_SYSTEMS[0]
  return profile
}

export function getIntensityDefinition(level: IntensityLevel): IntensityDefinition {
  const def = INTENSITY_DEFINITIONS.find((d) => d.level === level)
  if (!def) throw new Error(`Unknown intensity level: ${level}`)
  return def
}

export const ZONE_GLOSSARY =
  'A1 ≈ EN1 (aerobic base) · A2 ≈ EN2 · A3 / VO2 ≈ EN3 / SP1 · RP ≈ SP2 (race pace) · SP ≈ SP3. ' +
  'Older cruise-time and R/V zone names vary by coach — use the system your team uses. ' +
  'Fixed and percentage offset models both anchor to goal race average; treat paces as ±1–3 s per 100. ' +
  'HR ranges are general estimates; confirm targets with your coach.'
