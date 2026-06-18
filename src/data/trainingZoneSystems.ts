import i18n from '../i18n'

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

export type IntensitySpec = {
  level: IntensityLevel
  /** Seconds added to goal race pace per 100 (negative = faster than race). */
  offsetPer100Cs: number
  /** Percent added to goal race pace per 100 (negative = faster than race). */
  offsetPer100Percent: number
  effortMin: number
  effortMax: number
  hrMin: number
  hrMax: number
  rpeMin: number
  rpeMax: number
  reliability: ZoneReliability
}

export const OFFSET_MODEL_IDS: OffsetModel[] = ['fixed', 'percent']

export function getOffsetModelLabel(id: OffsetModel): string {
  return i18n.t(`offsetModels.${id}.label`, { ns: 'zones' })
}

export function getOffsetModelDescription(id: OffsetModel): string {
  return i18n.t(`offsetModels.${id}.description`, { ns: 'zones' })
}

export function getAnchorLabel(): string {
  return i18n.t('anchor', { ns: 'zones' })
}

export function getZoneGlossary(): string {
  return i18n.t('glossary', { ns: 'zones' })
}

export type ZoneLabel = {
  level: IntensityLevel
  code: string
}

export type ZoneSystemId = 'a-system' | 'us-system' | 'dual'

export type ZoneSystemProfile = {
  id: ZoneSystemId
  zones: ZoneLabel[]
}

/** Pace offsets and physiology metadata (US Swimming 1995, A-system clubs, cruise-time models). */
export const INTENSITY_SPECS: IntensitySpec[] = [
  {
    level: 'recovery',
    offsetPer100Cs: 1400,
    offsetPer100Percent: 28,
    effortMin: 55,
    effortMax: 65,
    hrMin: 100,
    hrMax: 120,
    rpeMin: 2,
    rpeMax: 3,
    reliability: 'low',
  },
  {
    level: 'lowAerobic',
    offsetPer100Cs: 1000,
    offsetPer100Percent: 20,
    effortMin: 65,
    effortMax: 75,
    hrMin: 120,
    hrMax: 140,
    rpeMin: 3,
    rpeMax: 4,
    reliability: 'low',
  },
  {
    level: 'moderateAerobic',
    offsetPer100Cs: 700,
    offsetPer100Percent: 14,
    effortMin: 75,
    effortMax: 82,
    hrMin: 140,
    hrMax: 155,
    rpeMin: 5,
    rpeMax: 6,
    reliability: 'low',
  },
  {
    level: 'threshold',
    offsetPer100Cs: 400,
    offsetPer100Percent: 8,
    effortMin: 82,
    effortMax: 88,
    hrMin: 155,
    hrMax: 170,
    rpeMin: 7,
    rpeMax: 8,
    reliability: 'moderate',
  },
  {
    level: 'vo2',
    offsetPer100Cs: 100,
    offsetPer100Percent: 2,
    effortMin: 88,
    effortMax: 94,
    hrMin: 170,
    hrMax: 185,
    rpeMin: 8,
    rpeMax: 9,
    reliability: 'moderate',
  },
  {
    level: 'racePace',
    offsetPer100Cs: 0,
    offsetPer100Percent: 0,
    effortMin: 95,
    effortMax: 100,
    hrMin: 175,
    hrMax: 190,
    rpeMin: 9,
    rpeMax: 10,
    reliability: 'high',
  },
  {
    level: 'sprint',
    offsetPer100Cs: -300,
    offsetPer100Percent: -6,
    effortMin: 100,
    effortMax: 100,
    hrMin: 190,
    hrMax: 200,
    rpeMin: 10,
    rpeMax: 10,
    reliability: 'high',
  },
]

const A_SYSTEM_CODES: ZoneLabel[] = [
  { level: 'recovery', code: 'REC' },
  { level: 'lowAerobic', code: 'A1' },
  { level: 'moderateAerobic', code: 'A2' },
  { level: 'threshold', code: 'A3' },
  { level: 'vo2', code: 'VO2' },
  { level: 'racePace', code: 'RP' },
  { level: 'sprint', code: 'SP' },
]

const US_SYSTEM_CODES: ZoneLabel[] = [
  { level: 'recovery', code: 'REC' },
  { level: 'lowAerobic', code: 'EN1' },
  { level: 'moderateAerobic', code: 'EN2' },
  { level: 'threshold', code: 'EN3' },
  { level: 'vo2', code: 'SP1' },
  { level: 'racePace', code: 'SP2' },
  { level: 'sprint', code: 'SP3' },
]

type ZoneNameProfile = 'aSystem' | 'usSystem'

function getZoneName(profile: ZoneNameProfile, level: IntensityLevel): string {
  return i18n.t(`zoneNames.${profile}.${level}`, { ns: 'zones' })
}

export function getLocalizedZoneName(
  systemId: ZoneSystemId,
  level: IntensityLevel,
): string {
  if (systemId === 'a-system') return getZoneName('aSystem', level)
  if (systemId === 'us-system') return getZoneName('usSystem', level)
  return `${getZoneName('aSystem', level)} · ${getZoneName('usSystem', level)}`
}

export function getLocalizedZoneCode(
  systemId: ZoneSystemId,
  level: IntensityLevel,
): string {
  const a = A_SYSTEM_CODES.find((z) => z.level === level)!
  const us = US_SYSTEM_CODES.find((z) => z.level === level)!
  if (systemId === 'a-system') return a.code
  if (systemId === 'us-system') return us.code
  return `${a.code} / ${us.code}`
}

function dualZones(): ZoneLabel[] {
  return A_SYSTEM_CODES.map((a) => {
    const us = US_SYSTEM_CODES.find((z) => z.level === a.level)!
    return {
      level: a.level,
      code: `${a.code} / ${us.code}`,
    }
  })
}

export const ZONE_SYSTEMS: ZoneSystemProfile[] = [
  { id: 'a-system', zones: A_SYSTEM_CODES },
  { id: 'us-system', zones: US_SYSTEM_CODES },
  { id: 'dual', zones: dualZones() },
]

export function getZoneSystemLabel(id: ZoneSystemId): string {
  return i18n.t(`systems.${id}.label`, { ns: 'zones' })
}

export function getZoneSystemDescription(id: ZoneSystemId): string {
  return i18n.t(`systems.${id}.description`, { ns: 'zones' })
}

export function getZoneSystem(id: ZoneSystemId): ZoneSystemProfile {
  const profile = ZONE_SYSTEMS.find((s) => s.id === id)
  if (!profile) return ZONE_SYSTEMS[0]
  return profile
}

export function getIntensitySpec(level: IntensityLevel): IntensitySpec {
  const spec = INTENSITY_SPECS.find((d) => d.level === level)
  if (!spec) throw new Error(`Unknown intensity level: ${level}`)
  return spec
}

export function getIntensityPurpose(level: IntensityLevel): string {
  return i18n.t(`intensity.${level}.purpose`, { ns: 'zones' })
}

export function getIntensityRestGuidance(level: IntensityLevel): string {
  return i18n.t(`intensity.${level}.restGuidance`, { ns: 'zones' })
}

export function getIntensityReliabilityNote(level: IntensityLevel): string {
  return i18n.t(`intensity.${level}.reliabilityNote`, { ns: 'zones' })
}
