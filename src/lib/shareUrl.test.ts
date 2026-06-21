import { describe, expect, it } from 'vitest'
import {
  buildManualShareUrl,
  buildPlanShareUrl,
  hasPlanShareQuery,
  parseManualShareFromSearchParams,
  parsePlanShareFromSearchParams,
  SHARE_QUERY_VERSION,
} from './shareUrl'

const validState = {
  course: 'SCY' as const,
  eventId: '200-free',
  goalCentiseconds: 12834,
  zoneSystemId: 'a-system' as const,
  offsetModel: 'fixed' as const,
}

describe('hasPlanShareQuery', () => {
  it('detects plan query param', () => {
    expect(hasPlanShareQuery(new URLSearchParams('plan=1'))).toBe(true)
    expect(hasPlanShareQuery(new URLSearchParams('c=SCY'))).toBe(false)
  })
})

describe('parsePlanShareFromSearchParams', () => {
  it('parses a valid share link', () => {
    const params = new URLSearchParams(
      'plan=1&c=SCY&e=200-free&t=12834&z=a-system&o=fixed',
    )
    expect(parsePlanShareFromSearchParams(params)).toEqual(validState)
  })

  it('parses optional language', () => {
    const params = new URLSearchParams(
      'plan=1&c=SCY&e=200-free&t=12834&z=a-system&o=fixed&lng=es',
    )
    expect(parsePlanShareFromSearchParams(params)).toEqual({
      ...validState,
      language: 'es',
    })
  })

  it('returns null when plan version is wrong', () => {
    const params = new URLSearchParams('plan=2&c=SCY&e=200-free&t=12834')
    expect(parsePlanShareFromSearchParams(params)).toBeNull()
  })

  it('returns null for invalid goal time', () => {
    const params = new URLSearchParams('plan=1&c=SCY&e=200-free&t=abc')
    expect(parsePlanShareFromSearchParams(params)).toBeNull()
  })

  it('returns null for unknown event', () => {
    const params = new URLSearchParams('plan=1&c=SCY&e=999-free&t=12834')
    expect(parsePlanShareFromSearchParams(params)).toBeNull()
  })

  it('returns null for invalid zone system', () => {
    const params = new URLSearchParams('plan=1&c=SCY&e=200-free&t=12834&z=invalid')
    expect(parsePlanShareFromSearchParams(params)).toBeNull()
  })
})

describe('buildPlanShareUrl', () => {
  it('round-trips through parse', () => {
    const base = 'https://alejoarte.github.io/swim-time-converter/'
    const url = buildPlanShareUrl(validState, base)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('plan')).toBe(SHARE_QUERY_VERSION)
    expect(parsePlanShareFromSearchParams(parsed.searchParams)).toEqual(validState)
  })

  it('includes language when set', () => {
    const url = buildPlanShareUrl(
      { ...validState, language: 'en' },
      'https://example.com/swim-time-converter/',
    )
    expect(new URL(url).searchParams.get('lng')).toBe('en')
  })
})

const validManualState = {
  sourceCourse: 'SCY' as const,
  entries: [
    { eventId: '100-free', centiseconds: 6234 },
    { eventId: '200-free', centiseconds: 12834 },
  ],
}

describe('parseManualShareFromSearchParams', () => {
  it('parses a valid manual conversion share link', () => {
    const params = new URLSearchParams(
      'convert=1&c=SCY&ids=100-free,200-free&times=6234,12834',
    )
    expect(parseManualShareFromSearchParams(params)).toEqual(validManualState)
  })

  it('returns null for mismatched ids and times', () => {
    const params = new URLSearchParams('convert=1&c=SCY&ids=100-free&times=6234,12834')
    expect(parseManualShareFromSearchParams(params)).toBeNull()
  })

  it('returns null for invalid event id', () => {
    const params = new URLSearchParams('convert=1&c=SCY&ids=999-free&times=6234')
    expect(parseManualShareFromSearchParams(params)).toBeNull()
  })
})

describe('buildManualShareUrl', () => {
  it('round-trips through parse', () => {
    const base = 'https://alejoarte.github.io/swim-time-converter/'
    const url = buildManualShareUrl(validManualState, base)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('convert')).toBe('1')
    expect(parseManualShareFromSearchParams(parsed.searchParams)).toEqual(
      validManualState,
    )
  })
})
