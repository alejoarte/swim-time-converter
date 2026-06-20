import { describe, expect, it } from 'vitest'
import { getEventById } from '../data/events'
import {
  buildSimplifiedZoneRows,
  formatHrLabel,
  formatPaceRange,
  pacePer100FromRow,
} from './trainingZoneDisplay'
import { computeTrainingZoneRows } from './trainingZones'

const twoHundredFree = getEventById('200-free')!

describe('formatHrLabel', () => {
  it('formats percent and bpm from max HR of 190', () => {
    expect(formatHrLabel(95, 114)).toBe('50–60% / 95–114 bpm')
  })
})

describe('formatPaceRange', () => {
  it('formats a pace range with en-dash separator', () => {
    expect(formatPaceRange(6417, 8334)).toBe('1:04.17 – 1:23.34')
  })
})

describe('pacePer100FromRow', () => {
  it('normalizes per-50 rep paces to per-100', () => {
    expect(
      pacePer100FromRow(
        {
          level: 'racePace',
          code: 'RP',
          name: 'Race pace',
          purpose: '',
          effortLabel: '',
          hrLabel: '',
          rpeLabel: '',
          restGuidance: '',
          pacePerRepCs: 3209,
          vsRacePerRepCs: 0,
          isRacePace: true,
          reliability: 'high',
          reliabilityNote: '',
        },
        50,
      ),
    ).toBe(6418)
  })
})

describe('buildSimplifiedZoneRows', () => {
  it('returns four grouped rows for a 200-free SCY goal', () => {
    const goalCs = 12834
    const plan = computeTrainingZoneRows(
      goalCs,
      twoHundredFree,
      'SCY',
      'a-system',
      'fixed',
    )
    const rows = buildSimplifiedZoneRows(plan, 'SCY', twoHundredFree)

    expect(rows).toHaveLength(4)
    expect(rows.map((row) => row.id)).toEqual([
      'recovery',
      'aerobic',
      'threshold',
      'racePace',
    ])
    expect(rows[3].paceMinCs).toBeLessThanOrEqual(rows[3].paceMaxCs)
    expect(rows[3].metricPaceMinCs).not.toBeNull()
    expect(rows[3].metricPaceMaxCs).not.toBeNull()
  })

  it('omits metric sub-line when course is not SCY', () => {
    const goalCs = 12834
    const plan = computeTrainingZoneRows(
      goalCs,
      twoHundredFree,
      'SCM',
      'a-system',
      'fixed',
    )
    const rows = buildSimplifiedZoneRows(plan, 'SCM', twoHundredFree)

    expect(rows[0].metricPaceMinCs).toBeNull()
    expect(rows[0].metricPaceMaxCs).toBeNull()
  })

  it('uses the selected event for SCY metric pace conversion', () => {
    const goalCs = 15000
    const twoHundredBreast = getEventById('200-breast')!
    const hundredFree = getEventById('100-free')!
    const breastPlan = computeTrainingZoneRows(
      goalCs,
      twoHundredBreast,
      'SCY',
      'a-system',
      'fixed',
    )
    const freePlan = computeTrainingZoneRows(goalCs, hundredFree, 'SCY', 'a-system', 'fixed')
    const breastRows = buildSimplifiedZoneRows(breastPlan, 'SCY', twoHundredBreast)
    const freeRows = buildSimplifiedZoneRows(freePlan, 'SCY', hundredFree)

    expect(breastRows[3].metricPaceMinCs).not.toBe(freeRows[3].metricPaceMinCs)
  })
})
