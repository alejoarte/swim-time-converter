import { describe, expect, it } from 'vitest'
import cciwSample from './fixtures/cciw-results-sample.txt?raw'
import englishSample from './fixtures/hytek-sample.txt?raw'
import spanishSample from './fixtures/hytek-es-sample.txt?raw'
import { parsePdfText } from './parsePdfText'

describe('parsePdfText unified router', () => {
  it('parses Hy-Tek English program via family parser', () => {
    const result = parsePdfText(englishSample)
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.meetInfo.format).toBe('hytek')
    expect(result.rows.some((r) => r.swimmerName.includes('Gissell'))).toBe(true)
  })

  it('parses Hy-Tek Spanish program via family parser', () => {
    const result = parsePdfText(spanishSample)
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.meetInfo.format).toBe('hytek-es')
  })

  it('parses CCIW results via column mapping fallback', () => {
    const result = parsePdfText(cciwSample)
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.meetInfo.format).toBe('column-mapped')
    expect(result.rows.some((r) => r.swimmerName.includes('Mihm'))).toBe(true)
    expect(result.rows.some((r) => r.eventId === '50-free')).toBe(true)
  })

  it('returns unknown format for unstructured text', () => {
    const result = parsePdfText('Some random document text without tables')
    expect(result.rows).toHaveLength(0)
    expect(result.meetInfo.format).toBe('unknown')
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
