import { describe, expect, it } from 'vitest'
import englishSample from '../fixtures/hytek-sample.txt?raw'
import spanishSample from '../fixtures/hytek-es-sample.txt?raw'
import cciwSample from '../fixtures/cciw-results-sample.txt?raw'
import fecnSample from '../fixtures/hytek-en-lane-first-fecn-sample.txt?raw'
import {
  parseMeetCourseFromHeader,
  parseAnyEventTitle,
  parseResultsEventTitle,
} from '../mapEvent'
import { parsePdfText } from '../parsePdfText'
import { normalizePdfText } from '../normalizePdfText'
import { applyColumnMapping } from './applyColumnMapping'
import { classifyLine } from './classifyLine'
import { formatDisplayName } from './formatDisplayName'
import { inferBestColumnProfile, inferColumnProfile } from './inferColumnProfile'
import { normalizeTimeCell } from './normalizeTimeCell'
import { splitLineToColumns } from './splitLineToColumns'
import { suggestMappingConfig } from './suggestMappingConfig'
import type { ColumnMappingConfig } from './types'

describe('splitLineToColumns', () => {
  it('splits tab-delimited CCIW rows', () => {
    const cells = splitLineToColumns(
      'Augustana College\tJR\tMihm, Kendle \t24.16\t24.42\t1',
      'tab',
    )
    expect(cells.length).toBe(6)
    expect(cells[2]).toContain('Mihm')
  })

  it('splits pipe-delimited rows', () => {
    const cells = splitLineToColumns(
      '| 3 Alexa Faith Acosta Acosta |  17 BOG | 28.09 FECN |',
      'pipe',
    )
    expect(cells.length).toBeGreaterThanOrEqual(3)
    expect(cells.some((c) => c.includes('Acosta'))).toBe(true)
  })

  it('splits multi-space rows', () => {
    const cells = splitLineToColumns(
      '6 Fabiola Valentina Mach Gil  18 Norte de Santander 2:24.86',
      'multi-space',
    )
    expect(cells.length).toBeGreaterThanOrEqual(2)
  })
})

describe('parseResultsEventTitle', () => {
  it('maps Women 50 Yard Freestyle to 50-free SCY', () => {
    const parsed = parseResultsEventTitle('Women 50 Yard Freestyle')
    expect(parsed?.eventId).toBe('50-free')
    expect(parsed?.course).toBe('SCY')
  })
})

describe('parseMeetCourseFromHeader', () => {
  it('detects SCY from 25Y venue line', () => {
    expect(
      parseMeetCourseFromHeader('RecPlex Aquatic Cntr, Pleasant Prairie, WI - 25Y'),
    ).toBe('SCY')
  })
})

describe('formatDisplayName', () => {
  it('converts Last, First to First Last', () => {
    expect(formatDisplayName('Mihm, Kendle')).toBe('Kendle Mihm')
  })
})

describe('normalizeTimeCell', () => {
  it('strips qualifier and suffix tokens', () => {
    expect(normalizeTimeCell('24.42 q')).toBe('24.42')
    expect(normalizeTimeCell('28.09 FECN')).toBe('28.09')
    expect(normalizeTimeCell('X26.78 JJNN')).toBe('X26.78')
  })
})

describe('classifyLine', () => {
  const cciwConfig = suggestMappingConfig(cciwSample).config

  it('skips record and section header lines', () => {
    expect(classifyLine('CCIW Meet: 22.66 M 2/14/2013', cciwConfig)).toBe('skip')
    expect(classifyLine('A - Final', cciwConfig)).toBe('skip')
    expect(classifyLine('Q25\t23.40', cciwConfig)).toBe('skip')
  })

  it('detects event title lines', () => {
    expect(classifyLine('Women 50 Yard Freestyle', cciwConfig)).toBe('event')
  })

  it('detects data rows', () => {
    expect(
      classifyLine(
        'Augustana College\tJR\tMihm, Kendle \t24.16\t24.42\t1',
        cciwConfig,
      ),
    ).toBe('data')
  })
})

describe('inferColumnProfile on CCIW sample', () => {
  it('detects 6 tab columns with team, name, two time cols, place', () => {
    const lines = normalizePdfText(cciwSample)
    const profile = inferBestColumnProfile(lines)
    expect(profile).not.toBeNull()
    expect(profile?.delimiter).toBe('tab')
    expect(profile?.columnCount).toBe(6)
    expect(profile?.columnFields).toContain('name')
    expect(profile?.columnFields).toContain('team')
    expect(profile?.columnFields.filter((f) => f === 'time').length).toBeGreaterThanOrEqual(2)
    expect(profile?.columnFields).toContain('place')
    expect(profile?.rowsSampled).toBeGreaterThanOrEqual(10)
  })

  it('prefers Finals time column over Prelim when header present', () => {
    const lines = normalizePdfText(cciwSample)
    const profile = inferColumnProfile(lines, 'tab')
    expect(profile?.activeTimeColumnIndex).toBe(3)
  })
})

describe('suggestMappingConfig with column profile', () => {
  it('returns columnProfile for CCIW text', () => {
    const { config, columnProfile } = suggestMappingConfig(cciwSample)
    expect(columnProfile).not.toBeNull()
    expect(config.columnFields).toEqual(columnProfile?.columnFields)
    expect(config.delimiter).toBe('tab')
  })
})

describe('applyColumnMapping on CCIW sample', () => {
  it('produces reviewable rows with correct event and course', () => {
    const { config } = suggestMappingConfig(cciwSample)
    const result = applyColumnMapping(cciwSample, config)

    expect(result.rows.length).toBeGreaterThanOrEqual(16)
    expect(result.meetInfo.detectedCourse).toBe('SCY')

    const mihm = result.rows.find((r) => r.swimmerName.includes('Kendle Mihm'))
    expect(mihm).toBeDefined()
    expect(mihm?.eventId).toBe('50-free')
    expect(mihm?.sourceCourse).toBe('SCY')
    expect(mihm?.rawTime).toBe('24.16')
    expect(mihm?.team).toBe('Augustana College')
  })
})

describe('parseAnyEventTitle for meet program lines', () => {
  it('parses Event N prefix lines', () => {
    const line = 'Event  49   Women 14 Year Olds 50 LC Meter Freestyle'
    expect(parseAnyEventTitle(line)?.eventId).toBe('50-free')
    expect(parseAnyEventTitle(line)?.course).toBe('LCM')
  })
})

describe('applyColumnMapping on document2 fixture', () => {
  it('parses pipe row with FECN suffix from fixture', () => {
    const config: ColumnMappingConfig = {
      delimiter: 'pipe',
      columnFields: ['ignore', 'ignore', 'ignore', 'name', 'team', 'time'],
      activeTimeColumnIndex: 5,
      skipPatterns: [
        'CCIW Meet:|CCIW Open:|NACIONAL INTERLIGAS',
        '^\\w+\\t\\d+\\.\\d{2}$',
        '^[A-Z]\\s*-\\s*Final$',
        '^Preliminaries$',
        '^Results$',
        '^(Yr|Lane|Age)\\s+(Name|Nombre)',
        'HY-TEK\'?s MEET MANAGER',
        '^-- \\d+ of \\d+ --$',
        '^\\d+\\.\\d{2}\\s+\\d{1,2}(-\\d{1,2})?\\s+(FECN|JJNN)',
        '^Heat\\s+\\d',
        '^Serie\\s+\\d',
      ],
      meetDefaultCourse: 'LCM',
    }

    const result = applyColumnMapping(fecnSample, config)
    const alexa = result.rows.find((r) => r.swimmerName.includes('Acosta'))
    expect(alexa).toBeDefined()
    expect(alexa?.rawTime).toBe('28.09')
    expect(alexa?.eventId).toBe('50-free')
  })

  it('profiles pipe delimiter for fixture text', () => {
    const lines = normalizePdfText(fecnSample)
    const profile = inferColumnProfile(lines, 'pipe')
    expect(profile).not.toBeNull()
    expect(profile?.delimiter).toBe('pipe')
    expect(profile?.columnFields).toContain('time')
  })
})

describe('applyColumnMapping on document2 pipe rows', () => {
  it('parses FECN suffix times from pipe layout', () => {
    const config: ColumnMappingConfig = {
      delimiter: 'pipe',
      columnFields: ['name', 'team', 'time'],
      activeTimeColumnIndex: 2,
      skipPatterns: [
        'CCIW Meet:|CCIW Open:|NACIONAL INTERLIGAS',
        '^\\w+\\t\\d+\\.\\d{2}$',
        '^[A-Z]\\s*-\\s*Final$',
        '^Preliminaries$',
        '^Results$',
        '^(Yr|Lane|Age)\\s+(Name|Nombre)',
        'HY-TEK\'?s MEET MANAGER',
        '^-- \\d+ of \\d+ --$',
        '^\\d+\\.\\d{2}\\s+\\d{1,2}(-\\d{1,2})?\\s+(FECN|JJNN)',
        '^Heat\\s+\\d',
        '^Serie\\s+\\d',
      ],
      meetDefaultCourse: 'LCM',
    }

    const line = '| 3 Alexa Faith Acosta Acosta |  17 BOG | 28.09 FECN |'
    const miniText = [
      'Event  49   Women 14 Year Olds 50 LC Meter Freestyle',
      line,
    ].join('\n')

    const result = applyColumnMapping(miniText, config)
    const alexa = result.rows.find((r) => r.swimmerName.includes('Acosta'))
    expect(alexa).toBeDefined()
    expect(alexa?.rawTime).toBe('28.09')
    expect(alexa?.eventId).toBe('50-free')
  })
})

describe('regression: auto-parse still works for known meet programs', () => {
  it('parses English meet program fixture', () => {
    const { rows } = parsePdfText(englishSample)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('parses Spanish meet program fixture', () => {
    const { rows } = parsePdfText(spanishSample)
    expect(rows.length).toBeGreaterThan(0)
  })
})

describe('document2 excerpt delimiter detection', () => {
  it('profiles pipe layout from fecn fixture', () => {
    const lines = normalizePdfText(fecnSample)
    const profile = inferBestColumnProfile(lines)
    expect(profile).not.toBeNull()
    expect(['pipe', 'multi-space']).toContain(profile?.delimiter)
  })
})
