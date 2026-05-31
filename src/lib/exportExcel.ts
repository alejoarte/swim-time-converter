import * as XLSX from 'xlsx'
import { compareEventIds } from '../data/events'
import { getOffsetModelLabel, ZONE_GLOSSARY } from '../data/trainingZoneSystems'
import type { BulkConversionResult, ConversionResult, Course } from './convert'
import { formatTime } from './timeParse'
import { formatReliabilityLabel, formatVsRaceOffset, type TrainingZonePlan } from './trainingZones'

const COURSES: Course[] = ['SCY', 'SCM', 'LCM']

export type TrainingZoneExportParams = {
  eventLabel: string
  course: Course
  zoneSystemLabel: string
  goalCentiseconds: number
  lengthUnit: 'yard' | 'meter'
  plan: TrainingZonePlan
  showRaceAverageReference: boolean
}

export function exportTrainingZonesToExcel(params: TrainingZoneExportParams): void {
  const {
    eventLabel,
    course,
    zoneSystemLabel,
    goalCentiseconds,
    lengthUnit,
    plan,
    showRaceAverageReference,
  } = params

  const generatedAt = new Date().toLocaleString()
  const repLabel = plan.practiceRepDistance === 50 ? '50' : '100'
  const unitLabel = lengthUnit === 'yard' ? 'yd' : 'm'

  const headerRows: (string | number)[][] = [
    ['Swim Time Converter — Training Zones'],
    ['Event', eventLabel],
    ['Course', course],
    ['Zone system', zoneSystemLabel],
    ['Goal time', formatTime(goalCentiseconds)],
    ...(showRaceAverageReference
      ? [
          ['Goal race average / 100', formatTime(plan.goalPacePer100Cs)],
          ['Goal race average / 50', formatTime(plan.goalPacePer50Cs)],
        ]
      : []),
    [`Practice repeats`, `${plan.practiceRepDistance}-${unitLabel}`],
    ['Pace model', getOffsetModelLabel(plan.offsetModel)],
    ['Anchor', plan.anchorLabel],
    ['Generated', generatedAt],
    [],
    [
      'Zone',
      'Name',
      'Purpose',
      'Effort',
      'HR (bpm)',
      'RPE',
      'Rest',
      `Pace / ${repLabel}`,
      'vs race',
      'Reliability',
      'Reliability note',
    ],
  ]

  const dataRows = plan.rows.map((row) => [
    row.code,
    row.name,
    row.purpose,
    row.effortLabel,
    row.hrLabel,
    row.rpeLabel,
    row.restGuidance,
    formatTime(row.pacePerRepCs),
    formatVsRaceOffset(row.vsRacePerRepCs),
    formatReliabilityLabel(row.reliability),
    row.reliabilityNote,
  ])

  const footerRows: (string | number)[][] = [
    [],
    ['Notes', ZONE_GLOSSARY],
    [
      'Disclaimer',
      `Zone paces are estimates from your goal time (${getOffsetModelLabel(plan.offsetModel).toLowerCase()} model). Treat each pace as roughly ±1–3 seconds per 100. Not a substitute for lactate testing, CSS benchmarks, or your coach's set design.`,
    ],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows, ...footerRows])
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 32 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 48 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Training Zones')

  const dateStamp = new Date().toISOString().slice(0, 10)
  const slug = eventLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  XLSX.writeFile(workbook, `swim-training-zones-${slug || 'plan'}-${dateStamp}.xlsx`)
}

export function exportToExcel(
  results: ConversionResult[],
  sourceCourse: Course,
): void {
  const generatedAt = new Date().toLocaleString()

  const headerRows: (string | number)[][] = [
    ['Swim Time Converter'],
    ['Source course', sourceCourse],
    ['Generated', generatedAt],
    ['Conversions use Classical (Colorado Timing) factors. Converted times are estimates and not official.'],
    [],
    ['Event', 'Source Course', 'Source Time', 'SCY', 'SCM', 'LCM'],
  ]

  const sortedResults = [...results].sort((a, b) => compareEventIds(a.eventId, b.eventId))

  const dataRows = sortedResults.map((row) => [
    row.eventLabel,
    row.sourceCourse,
    formatTime(row.sourceCentiseconds),
    formatTime(row.SCY),
    formatTime(row.SCM),
    formatTime(row.LCM),
  ])

  const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows])
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Conversions')

  const dateStamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `swim-conversions-${dateStamp}.xlsx`)
}

export function exportMeetToExcel(
  results: BulkConversionResult[],
  sourceCourse: Course,
  meetTitle?: string,
): void {
  const generatedAt = new Date().toLocaleString()

  const headerRows: (string | number)[][] = [
    ['Swim Time Converter — Meet Import'],
    ...(meetTitle ? [['Meet', meetTitle]] : []),
    ['Source course', sourceCourse],
    ['Generated', generatedAt],
    ['Conversions use Classical (Colorado Timing) factors. Converted times are estimates and not official.'],
    [],
    ['Name', 'Age', 'Team', 'Lane', 'Event', 'Source Course', 'Source Time', 'SCY', 'SCM', 'LCM'],
  ]

  const sortedResults = [...results].sort((a, b) => {
    const byEvent = compareEventIds(a.eventId, b.eventId)
    if (byEvent !== 0) return byEvent
    return a.swimmerName.localeCompare(b.swimmerName)
  })

  const dataRows = sortedResults.map((row) => [
    row.swimmerName,
    row.age ?? '',
    row.team ?? '',
    row.lane ?? '',
    row.eventLabel,
    row.sourceCourse,
    formatTime(row.sourceCentiseconds),
    formatTime(row.SCY),
    formatTime(row.SCM),
    formatTime(row.LCM),
  ])

  const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows])
  worksheet['!cols'] = [
    { wch: 28 },
    { wch: 6 },
    { wch: 16 },
    { wch: 6 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Meet Conversions')

  const dateStamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `swim-meet-conversions-${dateStamp}.xlsx`)
}

export { COURSES }
