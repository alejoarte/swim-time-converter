import { parseTime } from '../timeParse'

export type TimeTokenResult = {
  rawTime: string
  timeCentiseconds: number | null
  extraIssues: string[]
  forceStatus?: 'error' | 'warning'
  included?: boolean
}

export function parseTimeToken(timeToken: string): TimeTokenResult {
  const upper = timeToken.toUpperCase()

  if (upper === 'NT' || upper === 'XNT') {
    return {
      rawTime: timeToken,
      timeCentiseconds: null,
      extraIssues: ['No time (NT)'],
      forceStatus: 'error',
      included: false,
    }
  }

  const isExhibition = /^X/i.test(timeToken)
  const normalized = isExhibition ? timeToken.replace(/^X/i, '') : timeToken
  const timeCentiseconds = parseTime(normalized)

  if (isExhibition) {
    return {
      rawTime: timeToken,
      timeCentiseconds,
      extraIssues: ['Exhibition swim'],
      forceStatus: timeCentiseconds !== null ? 'warning' : 'error',
      included: timeCentiseconds !== null,
    }
  }

  return {
    rawTime: timeToken,
    timeCentiseconds,
    extraIssues: [],
  }
}

export const TIME_TOKEN_PATTERN = 'X?(?:NT|\\d{1,2}(?::\\d{2})?[,.]\\d{2})'
