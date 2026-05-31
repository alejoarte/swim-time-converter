import { describe, expect, it } from 'vitest'

import { getEventById } from '../data/events'

import { ANCHOR_LABEL, getZoneSystem } from '../data/trainingZoneSystems'

import {

  computeTrainingZoneRows,

  formatReliabilityLabel,

  formatVsRaceOffset,

  getPracticeRepDistance,

  goalPacePer100,

  shouldShowRaceAverageReference,

} from './trainingZones'



describe('getPracticeRepDistance', () => {

  it('uses 50 for 100 and 200 events', () => {

    expect(getPracticeRepDistance(getEventById('100-free')!)).toBe(50)

    expect(getPracticeRepDistance(getEventById('200-breast')!)).toBe(50)

  })



  it('uses 100 for 400+ events', () => {

    expect(getPracticeRepDistance(getEventById('400-im')!)).toBe(100)

    expect(getPracticeRepDistance(getEventById('400-500-free')!)).toBe(100)

  })

})



describe('shouldShowRaceAverageReference', () => {

  it('hides reference for 50 events', () => {

    expect(shouldShowRaceAverageReference(getEventById('50-free')!)).toBe(false)

  })



  it('shows reference for 100+ events', () => {

    expect(shouldShowRaceAverageReference(getEventById('100-free')!)).toBe(true)

    expect(shouldShowRaceAverageReference(getEventById('200-breast')!)).toBe(true)

  })

})



describe('goalPacePer100', () => {

  it('computes 200 breast @ 2:00', () => {

    const event = getEventById('200-breast')!

    expect(goalPacePer100(12000, event, 'SCY')).toBe(6000)

  })

})



describe('computeTrainingZoneRows', () => {

  it('computes 200 breast goal 2:00 with A-system race and A1 paces (fixed)', () => {

    const event = getEventById('200-breast')!

    const plan = computeTrainingZoneRows(12000, event, 'SCY', 'a-system', 'fixed')



    expect(plan.offsetModel).toBe('fixed')

    expect(plan.anchorLabel).toBe(ANCHOR_LABEL)

    expect(plan.practiceRepDistance).toBe(50)

    expect(plan.goalPacePer50Cs).toBe(3000)



    const race = plan.rows.find((r) => r.isRacePace)!

    expect(race.pacePerRepCs).toBe(3000)

    expect(race.vsRacePerRepCs).toBe(0)

    expect(race.reliability).toBe('high')



    const a1 = plan.rows.find((r) => r.code === 'A1')!

    expect(a1.pacePerRepCs).toBe(3500)

    expect(a1.vsRacePerRepCs).toBe(500)

    expect(a1.reliability).toBe('low')

  })



  it('computes 100 free goal 52.0 with 50 rep distance (fixed)', () => {

    const event = getEventById('100-free')!

    const plan = computeTrainingZoneRows(5200, event, 'SCY', 'a-system', 'fixed')



    expect(plan.practiceRepDistance).toBe(50)

    const race = plan.rows.find((r) => r.isRacePace)!

    expect(race.pacePerRepCs).toBe(2600)

  })



  it('computes 100 free goal 52.0 in percent mode', () => {

    const event = getEventById('100-free')!

    const plan = computeTrainingZoneRows(5200, event, 'SCY', 'a-system', 'percent')



    expect(plan.offsetModel).toBe('percent')



    const race = plan.rows.find((r) => r.isRacePace)!

    expect(race.pacePerRepCs).toBe(2600)

    expect(race.vsRacePerRepCs).toBe(0)



    const sprint = plan.rows.find((r) => r.level === 'sprint')!

    expect(sprint.pacePerRepCs).toBeLessThan(race.pacePerRepCs)



    const rec = plan.rows.find((r) => r.level === 'recovery')!

    const a1 = plan.rows.find((r) => r.code === 'A1')!

    expect(rec.pacePerRepCs).toBeGreaterThan(a1.pacePerRepCs)

  })



  it('derives vs race from computed pace in percent mode', () => {

    const event = getEventById('100-free')!

    const plan = computeTrainingZoneRows(5200, event, 'SCY', 'a-system', 'percent')



    const sprint = plan.rows.find((r) => r.level === 'sprint')!

    // 52.0 * 0.94 = 48.88 per 100 → −3.12 per 100 → −1.56 per 50

    expect(sprint.vsRacePerRepCs).toBe(-156)

    expect(sprint.vsRacePerRepCs).not.toBe(-150)

  })



  it('percent mode spreads aerobic offsets wider than fixed at slower paces', () => {

    const event = getEventById('100-free')!



    const fastFixed = computeTrainingZoneRows(5000, event, 'SCY', 'a-system', 'fixed')

    const slowFixed = computeTrainingZoneRows(9000, event, 'SCY', 'a-system', 'fixed')

    const fastPercent = computeTrainingZoneRows(5000, event, 'SCY', 'a-system', 'percent')

    const slowPercent = computeTrainingZoneRows(9000, event, 'SCY', 'a-system', 'percent')



    const fixedSlowDelta =

      slowFixed.rows.find((r) => r.code === 'A1')!.vsRacePerRepCs -

      fastFixed.rows.find((r) => r.code === 'A1')!.vsRacePerRepCs

    const percentSlowDelta =

      slowPercent.rows.find((r) => r.code === 'A1')!.vsRacePerRepCs -

      fastPercent.rows.find((r) => r.code === 'A1')!.vsRacePerRepCs



    expect(fixedSlowDelta).toBe(0)

    expect(percentSlowDelta).toBeGreaterThan(0)

  })



  it('computes 400 IM with 100 rep distance', () => {

    const event = getEventById('400-im')!

    const plan = computeTrainingZoneRows(30000, event, 'LCM', 'a-system', 'fixed')



    expect(plan.practiceRepDistance).toBe(100)

    const race = plan.rows.find((r) => r.isRacePace)!

    expect(race.pacePerRepCs).toBe(7500)

  })



  it('sprint zone is faster than race pace', () => {

    const event = getEventById('200-free')!

    const plan = computeTrainingZoneRows(12000, event, 'SCY', 'a-system', 'fixed')

    const race = plan.rows.find((r) => r.isRacePace)!

    const sprint = plan.rows.find((r) => r.level === 'sprint')!

    expect(sprint.pacePerRepCs).toBeLessThan(race.pacePerRepCs)

  })



  it('changes labels per zone system but keeps paces', () => {

    const event = getEventById('200-free')!

    const aPlan = computeTrainingZoneRows(12000, event, 'SCY', 'a-system', 'fixed')

    const usPlan = computeTrainingZoneRows(12000, event, 'SCY', 'us-system', 'fixed')



    expect(aPlan.rows.find((r) => r.isRacePace)!.code).toBe('RP')

    expect(usPlan.rows.find((r) => r.isRacePace)!.code).toBe('SP2')

    expect(aPlan.rows.find((r) => r.isRacePace)!.pacePerRepCs).toBe(

      usPlan.rows.find((r) => r.isRacePace)!.pacePerRepCs,

    )

  })



  it('dual system shows combined codes', () => {

    const event = getEventById('200-free')!

    const plan = computeTrainingZoneRows(12000, event, 'SCY', 'dual', 'fixed')

    expect(plan.rows[1].code).toBe('A1 / EN1')

  })

})



describe('getZoneSystem', () => {

  it('returns all three profiles', () => {

    expect(getZoneSystem('a-system').zones).toHaveLength(7)

    expect(getZoneSystem('us-system').zones).toHaveLength(7)

    expect(getZoneSystem('dual').zones).toHaveLength(7)

  })

})



describe('formatVsRaceOffset', () => {

  it('formats positive and negative offsets', () => {

    expect(formatVsRaceOffset(500)).toBe('+5.00')

    expect(formatVsRaceOffset(-150)).toBe('−1.50')

    expect(formatVsRaceOffset(0)).toBe('0')

  })

})



describe('formatReliabilityLabel', () => {

  it('maps reliability levels to labels', () => {

    expect(formatReliabilityLabel('high')).toBe('High')

    expect(formatReliabilityLabel('moderate')).toBe('Moderate')

    expect(formatReliabilityLabel('low')).toBe('Low')

  })

})


