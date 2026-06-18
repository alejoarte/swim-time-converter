/** Normalize locale-specific decimal separators (e.g. European comma). */
export function normalizeTimeString(input: string): string {
  return input.trim().replace(',', '.')
}

/** Parse swim time string to centiseconds (hundredths of a second). */
export function parseTime(input: string): number | null {
  const trimmed = normalizeTimeString(input)
  if (!trimmed) return null

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d{1,2}))?$/)
  if (colonMatch) {
    const minutes = Number(colonMatch[1])
    const seconds = Number(colonMatch[2])
    const hundredths = colonMatch[3] ? Number(colonMatch[3].padEnd(2, '0')) : 0
    if (seconds >= 60) return null
    return minutes * 6000 + seconds * 100 + hundredths
  }

  const plainMatch = trimmed.match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (plainMatch) {
    const seconds = Number(plainMatch[1])
    const hundredths = plainMatch[2] ? Number(plainMatch[2].padEnd(2, '0')) : 0
    return seconds * 100 + hundredths
  }

  return null
}

/** Format centiseconds as MM:SS.hh (or SS.hh if under one minute). */
/** Split centiseconds into manual entry fields (minutes may be empty for sub-minute times). */
export function centisecondsToTimeParts(centiseconds: number): TimeParts {
  const rounded = Math.round(centiseconds)
  const totalSeconds = Math.floor(rounded / 100)
  const hundredths = rounded % 100
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return {
      minutes: String(minutes),
      seconds: seconds.toString().padStart(2, '0'),
      hundredths: hundredths.toString().padStart(2, '0'),
    }
  }

  return {
    minutes: '',
    seconds: String(seconds),
    hundredths: hundredths.toString().padStart(2, '0'),
  }
}

export function rawTimeToTimeParts(raw: string): TimeParts | null {
  const cs = parseTime(raw)
  if (cs === null) return null
  return centisecondsToTimeParts(cs)
}

export function formatTime(centiseconds: number): string {
  const rounded = Math.round(centiseconds)
  const totalSeconds = Math.floor(rounded / 100)
  const hundredths = rounded % 100
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  const hh = hundredths.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')

  if (minutes > 0) {
    return `${minutes}:${ss}.${hh}`
  }
  return `${seconds}.${hh}`
}

export function isValidTimeInput(input: string): boolean {
  if (!input.trim()) return false
  return parseTime(input) !== null
}

export type TimePart = 'minutes' | 'seconds' | 'hundredths'

export type TimeParts = {
  minutes: string
  seconds: string
  hundredths: string
}

export const EMPTY_TIME_PARTS: TimeParts = {
  minutes: '',
  seconds: '',
  hundredths: '',
}

function parsePart(value: string, max: number): number | null {
  const trimmed = value.trim()
  if (!trimmed) return 0
  if (!/^\d+$/.test(trimmed)) return null
  const num = Number(trimmed)
  if (num < 0 || num > max) return null
  return num
}

export function isTimePartsEmpty(parts: TimeParts): boolean {
  return !parts.minutes.trim() && !parts.seconds.trim() && !parts.hundredths.trim()
}

export function partsToCentiseconds(parts: TimeParts): number | null {
  if (isTimePartsEmpty(parts)) return null

  const minutes = parsePart(parts.minutes, 999)
  const seconds = parsePart(parts.seconds, 59)
  const hundredths = parsePart(parts.hundredths, 99)

  if (minutes === null || seconds === null || hundredths === null) return null

  const secondsStr = parts.seconds.trim()
  if (secondsStr && Number(secondsStr) >= 60) return null

  return minutes * 6000 + seconds * 100 + hundredths
}

export function isValidTimeParts(parts: TimeParts): boolean {
  return partsToCentiseconds(parts) !== null
}

export function normalizeTimeParts(parts: TimeParts): TimeParts {
  if (isTimePartsEmpty(parts)) return parts

  const padTwo = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return '00'
    if (!/^\d+$/.test(trimmed)) return trimmed
    return trimmed.padStart(2, '0')
  }

  return {
    minutes: parts.minutes.trim() || '0',
    seconds: padTwo(parts.seconds),
    hundredths: padTwo(parts.hundredths),
  }
}

export type TimePartsError =
  | 'empty'
  | 'seconds_range'
  | 'hundredths_range'
  | 'minutes_invalid'

export function getTimePartsError(parts: TimeParts): TimePartsError | null {
  if (isTimePartsEmpty(parts)) return 'empty'
  if (isValidTimeParts(parts)) return null

  if (parts.seconds.trim()) {
    if (!/^\d+$/.test(parts.seconds.trim()) || Number(parts.seconds) >= 60) {
      return 'seconds_range'
    }
  }

  if (parts.hundredths.trim()) {
    if (!/^\d+$/.test(parts.hundredths.trim()) || Number(parts.hundredths) > 99) {
      return 'hundredths_range'
    }
  }

  if (parts.minutes.trim() && !/^\d+$/.test(parts.minutes.trim())) {
    return 'minutes_invalid'
  }

  return 'seconds_range'
}
