import { describe, expect, it } from 'vitest'
import { buildPdfLinesFromItems, type PdfTextItem } from './buildPdfLines'
import {
  clustersToColumnMappingConfig,
  inferPdfColumnLayout,
} from './inferPdfColumnLayout'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('buildPdfLinesFromItems', () => {
  it('groups items on the same Y into one line', () => {
    const items: PdfTextItem[] = [
      { str: 'Smith,', x: 10, y: 100, width: 30, height: 10 },
      { str: 'Jane', x: 45, y: 100, width: 25, height: 10 },
      { str: '1:02.45', x: 200, y: 100, width: 40, height: 10 },
    ]
    const { lines } = buildPdfLinesFromItems(items, 0, 0)
    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('Smith, Jane 1:02.45')
    expect(lines[0].items).toHaveLength(3)
  })

  it('starts a new line when Y differs beyond threshold', () => {
    const items: PdfTextItem[] = [
      { str: 'Line one', x: 10, y: 100, width: 50, height: 10 },
      { str: 'Line two', x: 10, y: 80, width: 50, height: 10 },
    ]
    const { lines } = buildPdfLinesFromItems(items, 0, 0)
    expect(lines).toHaveLength(2)
    expect(lines[0].text).toBe('Line one')
    expect(lines[1].text).toBe('Line two')
  })
})

describe('inferPdfColumnLayout', () => {
  it('infers columns from fixture text via profile fallback', () => {
    const fixturePath = join(__dirname, 'fixtures', 'cciw-results-sample.txt')
    const rawText = readFileSync(fixturePath, 'utf-8')
    const clusters = inferPdfColumnLayout([], rawText)
    expect(clusters.length).toBeGreaterThanOrEqual(2)
    expect(clusters.some((c) => c.inferredField === 'time')).toBe(true)
  })

  it('builds column mapping config from clusters', () => {
    const config = clustersToColumnMappingConfig([
      {
        index: 0,
        xMin: 0,
        xMax: 80,
        sampleValues: ['Smith, Jane'],
        inferredField: 'name',
        confidence: 0.9,
        assignedField: 'name',
      },
      {
        index: 1,
        xMin: 100,
        xMax: 160,
        sampleValues: ['1:02.45'],
        inferredField: 'time',
        confidence: 0.95,
        assignedField: 'time',
      },
    ])
    expect(config.columnFields).toEqual(['name', 'time'])
    expect(config.activeTimeColumnIndex).toBe(1)
  })
})
