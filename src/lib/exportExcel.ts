import type { WorkBook, WorkSheet } from 'xlsx'
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

type XlsxModule = typeof import('xlsx')

async function loadXlsx(): Promise<XlsxModule> {
  return import('xlsx')
}

function uniqueExportStamp(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '')
  return `${date}-${time}`
}

function writeWorkbookFile(XLSX: XlsxModule, workbook: WorkBook, fileName: string): void {
  try {
    XLSX.writeFile(workbook, fileName)
  } catch {
    throw new Error(i18n.t('error', { ns: 'export' }))
  }
}

function courseHeaderLabel(course: Course, sourceCourse: Course): string {
  return course === sourceCourse ? `${course} *` : course
}

function applyConversionSheetLayout(
  worksheet: WorkSheet,
  sourceCourse: Course,
  headerRowIndex: number,
): void {
  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ]
  worksheet['!freeze'] = {
    xSplit: 0,
    ySplit: headerRowIndex + 1,
    topLeftCell: `A${headerRowIndex + 2}`,
    activePane: 'bottomLeft',
    state: 'frozen',
  }

  const sourceColIndex = COURSES.indexOf(sourceCourse)
  if (sourceColIndex >= 0) {
    const colLetter = String.fromCharCode('A'.charCodeAt(0) + 2 + sourceColIndex)
    const headerCell = worksheet[`${colLetter}${headerRowIndex + 1}`]
    if (headerCell) {
      headerCell.s = {
        fill: { patternType: 'solid', fgColor: { rgb: 'FFF3CD' } },
        font: { bold: true },
      }
    }
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

export async function exportTrainingZonesToExcel(
  params: TrainingZoneExportParams,
): Promise<void> {
  const XLSX = await loadXlsx()
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

  const slug = eventLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  writeWorkbookFile(
    XLSX,
    workbook,
    `swim-training-zones-${slug || 'plan'}-${uniqueExportStamp()}.xlsx`,
  )
}

export async function exportToExcel(
  results: ConversionResult[],
  sourceCourse: Course,
): Promise<void> {
  const XLSX = await loadXlsx()
  const generatedAt = new Date().toLocaleString(i18n.language)
  const headerRows: (string | number)[][] = [
    [i18n.t('conversions.title', { ns: 'export' })],
    [i18n.t('conversions.sourceCourse', { ns: 'export' }), sourceCourse],
    [i18n.t('conversions.generated', { ns: 'export' }), generatedAt],
    [i18n.t('conversions.disclaimer', { ns: 'export' })],
    [],
    [
      i18n.t('conversions.columns.event', { ns: 'export' }),
      i18n.t('conversions.columns.sourceTime', { ns: 'export' }),
      ...COURSES.map((course) => courseHeaderLabel(course, sourceCourse)),
    ],
  ]

  const headerRowIndex = headerRows.length - 1
  const sortedResults = [...results].sort((a, b) => compareEventIds(a.eventId, b.eventId))

  const dataRows = sortedResults.map((row) => [
    row.eventLabel,
    formatTime(row.sourceCentiseconds),
    ...COURSES.map((course) => formatTime(row[course])),
  ])

  const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows])
  applyConversionSheetLayout(worksheet, sourceCourse, headerRowIndex)

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    i18n.t('conversions.sheetName', { ns: 'export' }),
  )

  writeWorkbookFile(XLSX, workbook, `swim-conversions-${uniqueExportStamp()}.xlsx`)
}

export { COURSES }
