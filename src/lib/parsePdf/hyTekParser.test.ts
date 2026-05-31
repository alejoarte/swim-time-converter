import { describe, expect, it } from 'vitest'
import fullSample from './fixtures/hytek-full-sample.txt?raw'
import sampleText from './fixtures/hytek-sample.txt?raw'
import { parseHyTekText } from './hyTekParser'
import { parsePdfText } from './parsePdfText'

describe('parseHyTekText', () => {
  it('parses Event 1 IM rows with correct names and times', () => {
    const { rows } = parseHyTekText(sampleText)
    const gissell = rows.find((r) => r.swimmerName.includes('Gissell'))
    expect(gissell).toBeDefined()
    expect(gissell?.rawTime).toBe('5:33,02')
    expect(gissell?.timeCentiseconds).toBe(33302)
    expect(gissell?.eventId).toBe('400-im')
    expect(gissell?.team).toBe('Antioquia')
    expect(gissell?.lane).toBe(0)
    expect(gissell?.age).toBe(14)
  })

  it('detects LCM from event headers', () => {
    const { meetInfo, rows } = parseHyTekText(sampleText)
    expect(meetInfo.detectedCourse).toBe('LCM')
    expect(rows.every((r) => r.sourceCourse === 'LCM')).toBe(true)
  })

  it('skips heat and column header lines', () => {
    const { rows } = parseHyTekText(sampleText)
    expect(rows.some((r) => r.swimmerName.includes('Heat'))).toBe(false)
    expect(rows.some((r) => r.swimmerName.includes('Age'))).toBe(false)
  })

  it('handles comma decimals', () => {
    const { rows } = parseHyTekText(sampleText)
    const row = rows.find((r) => r.rawTime === '59,24')
    expect(row?.timeCentiseconds).toBe(5924)
  })

  it('maps 100 LC Meter Freestyle to 100-free', () => {
    const { rows } = parseHyTekText(sampleText)
    const row = rows.find((r) => r.swimmerName.includes('Maria Gabriela'))
    expect(row?.eventId).toBe('100-free')
  })

  it('handles glued age on name', () => {
    const { rows } = parseHyTekText(sampleText)
    const row = rows.find((r) => r.swimmerName.includes('Trespalacios'))
    expect(row?.age).toBe(17)
    expect(row?.swimmerName).toBe('Omar Enrique Mao Crueche Trespalacios')
  })

  it('parses age from space-separated pdf.js layout', () => {
    const text = [
      'Event 1 Women 14 & Over 400 LC Meter IM',
      '5:33,02 Gissell Sofia Rincon Flores  14 0  Antioquia',
      '53,25 Omar Enrique Mao Crueche Trespalacios  17 4  Atlantico',
    ].join('\n')
    const { rows } = parseHyTekText(text)
    expect(rows[0]?.age).toBe(14)
    expect(rows[0]?.swimmerName).toBe('Gissell Sofia Rincon Flores')
    expect(rows[0]?.lane).toBe(0)
    expect(rows[0]?.team).toBe('Antioquia')
    expect(rows[1]?.age).toBe(17)
    expect(rows[1]?.swimmerName).toBe('Omar Enrique Mao Crueche Trespalacios')
  })

  it('returns empty result for unknown format via parsePdfText', () => {
    const result = parsePdfText('Some random document text')
    expect(result.rows).toHaveLength(0)
    expect(result.meetInfo.format).toBe('unknown')
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

describe('parseHyTekText full meet sample', () => {
  it('parses the example meet PDF text with many swimmer rows', () => {
    const { rows, meetInfo } = parseHyTekText(fullSample)

    expect(meetInfo.detectedCourse).toBe('LCM')
    expect(meetInfo.title).toContain('CAMPEONATO INTERLIGAS')
    expect(rows.length).toBeGreaterThan(100)
    expect(rows.filter((r) => r.status === 'ok').length).toBeGreaterThan(100)
  })
})
