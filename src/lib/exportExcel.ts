import * as XLSX from 'xlsx'
import { compareEventIds } from '../data/events'
import type { BulkConversionResult, ConversionResult, Course } from './convert'
import { formatTime } from './timeParse'

const COURSES: Course[] = ['SCY', 'SCM', 'LCM']

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
