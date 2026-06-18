import * as XLSX from 'xlsx'
import { compareEventIds } from '../data/events'
import { getOffsetModelLabel, getZoneGlossary } from '../data/trainingZoneSystems'
import i18n from '../i18n'
import type { ConversionResult, Course } from './convert'
import { formatTime } from './timeParse'
import {
  formatReliabilityLabel,
  formatVsRaceOffset,
  type TrainingZonePlan,
} from './trainingZones'

const COURSES: Course[] = ['SCY', 'SCM', 'LCM']

function writeWorkbookFile(workbook: XLSX.WorkBook, fileName: string): void {
  try {
    XLSX.writeFile(workbook, fileName)
  } catch {
    throw new Error(i18n.t('error', { ns: 'export' }))
  }
}

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

  const generatedAt = new Date().toLocaleString(i18n.language)
  const repLabel = plan.practiceRepDistance === 50 ? '50' : '100'
  const unitLabel = lengthUnit === 'yard' ? 'yd' : 'm'
  const headerRows: (string | number)[][] = [
    [i18n.t('trainingZones.title', { ns: 'export' })],
    [i18n.t('trainingZones.event', { ns: 'export' }), eventLabel],
    [i18n.t('trainingZones.course', { ns: 'export' }), course],
    [i18n.t('trainingZones.zoneSystem', { ns: 'export' }), zoneSystemLabel],
    [i18n.t('trainingZones.goalTime', { ns: 'export' }), formatTime(goalCentiseconds)],
    ...(showRaceAverageReference
      ? [
          [
            i18n.t('trainingZones.goalRaceAvg100', { ns: 'export' }),
            formatTime(plan.goalPacePer100Cs),
          ],
          [
            i18n.t('trainingZones.goalRaceAvg50', { ns: 'export' }),
            formatTime(plan.goalPacePer50Cs),
          ],
        ]
      : []),
    [
      i18n.t('trainingZones.practiceRepeats', { ns: 'export' }),
      `${plan.practiceRepDistance}-${unitLabel}`,
    ],
    [
      i18n.t('trainingZones.paceModel', { ns: 'export' }),
      getOffsetModelLabel(plan.offsetModel),
    ],
    [i18n.t('trainingZones.anchor', { ns: 'export' }), plan.anchorLabel],
    [i18n.t('trainingZones.generated', { ns: 'export' }), generatedAt],
    [],
    [
      i18n.t('trainingZones.columns.zone', { ns: 'export' }),
      i18n.t('trainingZones.columns.name', { ns: 'export' }),
      i18n.t('trainingZones.columns.purpose', { ns: 'export' }),
      i18n.t('trainingZones.columns.effort', { ns: 'export' }),
      i18n.t('trainingZones.columns.hr', { ns: 'export' }),
      i18n.t('trainingZones.columns.rpe', { ns: 'export' }),
      i18n.t('trainingZones.columns.rest', { ns: 'export' }),
      i18n.t('trainingZones.columns.pace', { ns: 'export', rep: repLabel }),
      i18n.t('trainingZones.columns.vsRace', { ns: 'export' }),
      i18n.t('trainingZones.columns.reliability', { ns: 'export' }),
      i18n.t('trainingZones.columns.reliabilityNote', { ns: 'export' }),
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
    [i18n.t('trainingZones.notes', { ns: 'export' }), getZoneGlossary()],
    [
      i18n.t('trainingZones.disclaimerLabel', { ns: 'export' }),
      i18n.t('trainingZones.disclaimer', {
        ns: 'export',
        paceModel: getOffsetModelLabel(plan.offsetModel).toLowerCase(),
      }),
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
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    i18n.t('trainingZones.sheetName', { ns: 'export' }),
  )

  const dateStamp = new Date().toISOString().slice(0, 10)
  const slug = eventLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  writeWorkbookFile(workbook, `swim-training-zones-${slug || 'plan'}-${dateStamp}.xlsx`)
}

export function exportToExcel(results: ConversionResult[], sourceCourse: Course): void {
  const generatedAt = new Date().toLocaleString(i18n.language)
  const headerRows: (string | number)[][] = [
    [i18n.t('conversions.title', { ns: 'export' })],
    [i18n.t('conversions.sourceCourse', { ns: 'export' }), sourceCourse],
    [i18n.t('conversions.generated', { ns: 'export' }), generatedAt],
    [i18n.t('conversions.disclaimer', { ns: 'export' })],
    [],
    [
      i18n.t('conversions.columns.event', { ns: 'export' }),
      i18n.t('conversions.columns.sourceCourse', { ns: 'export' }),
      i18n.t('conversions.columns.sourceTime', { ns: 'export' }),
      'SCY',
      'SCM',
      'LCM',
    ],
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
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    i18n.t('conversions.sheetName', { ns: 'export' }),
  )

  const dateStamp = new Date().toISOString().slice(0, 10)
  writeWorkbookFile(workbook, `swim-conversions-${dateStamp}.xlsx`)
}

export { COURSES }
