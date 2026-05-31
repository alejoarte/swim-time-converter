import { describe, expect, it } from 'vitest'
import sampleText from './fixtures/hytek-es-sample.txt?raw'
import fullSample from './fixtures/hytek-es-full-sample.txt?raw'
import englishSample from './fixtures/hytek-sample.txt?raw'
import { parseHyTekSpanishText } from './hyTekSpanishParser'
import { parsePdfText } from './parsePdfText'

describe('parseHyTekSpanishText', () => {
  it('parses Evento 9 100 Free rows with team-first comma times', () => {
    const { rows } = parseHyTekSpanishText(sampleText)
    const luciana = rows.find((r) => r.swimmerName.includes('Luciana Gomez'))
    expect(luciana).toBeDefined()
    expect(luciana?.rawTime).toBe('1:06,03')
    expect(luciana?.timeCentiseconds).toBe(6603)
    expect(luciana?.eventId).toBe('100-free')
    expect(luciana?.team).toBe('Antioquia')
    expect(luciana?.lane).toBe(3)
  })

  it('detects LCM from CL Metro headers', () => {
    const { meetInfo, rows } = parseHyTekSpanishText(sampleText)
    expect(meetInfo.detectedCourse).toBe('LCM')
    expect(meetInfo.format).toBe('hytek-es')
    expect(rows.every((r) => r.sourceCourse === 'LCM')).toBe(true)
  })

  it('skips Serie and column header lines', () => {
    const { rows } = parseHyTekSpanishText(sampleText)
    expect(rows.some((r) => r.swimmerName.includes('Serie'))).toBe(false)
    expect(rows.some((r) => r.swimmerName.includes('Edad'))).toBe(false)
  })

  it('flags NT rows as errors and excludes them', () => {
    const { rows } = parseHyTekSpanishText(sampleText)
    const ntRow = rows.find((r) => r.swimmerName.includes('Alejandra Cristina'))
    expect(ntRow?.status).toBe('error')
    expect(ntRow?.issues).toContain('No time (NT)')
    expect(ntRow?.included).toBe(false)
  })

  it('handles X-prefixed exhibition times as warnings', () => {
    const { rows } = parseHyTekSpanishText(sampleText)
    const exRow = rows.find((r) => r.swimmerName.includes('Maria Gabriela Vega'))
    expect(exRow?.status).toBe('warning')
    expect(exRow?.issues).toContain('Exhibition swim')
    expect(exRow?.timeCentiseconds).toBe(6797)
  })

  it('maps Estilo de Pecho to 50-breast', () => {
    const { rows } = parseHyTekSpanishText(sampleText)
    const breast = rows.find((r) => r.swimmerName.includes('Sofia Pe'))
    expect(breast?.eventId).toBe('50-breast')
  })
})

describe('parsePdfText routing', () => {
  it('routes Spanish fixture to hytek-es', () => {
    const result = parsePdfText(sampleText)
    expect(result.meetInfo.format).toBe('hytek-es')
    expect(result.rows.length).toBeGreaterThan(0)
  })

  it('routes English fixture to hytek', () => {
    const result = parsePdfText(englishSample)
    expect(result.meetInfo.format).toBe('hytek')
  })
})

describe('parseHyTekSpanishText full meet sample', () => {
  it('parses the example Spanish meet with many swimmer rows', () => {
    const { rows, meetInfo } = parseHyTekSpanishText(fullSample)
    expect(meetInfo.detectedCourse).toBe('LCM')
    expect(meetInfo.title).toContain('CAMPEONATO NACIONAL')
    expect(rows.length).toBeGreaterThan(100)
    expect(rows.filter((r) => r.status === 'ok' || r.status === 'warning').length).toBeGreaterThan(
      100,
    )
  })
})
