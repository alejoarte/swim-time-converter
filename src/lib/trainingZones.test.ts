import { describe, expect, it } from 'vitest'
import { getEventById } from '../data/events'
import {
  computeTrainingZoneRows,
  getDisplayPaceDistance,
  getGoalDisplayPaceCs,
  shouldShowRaceAverageReference,
} from './trainingZones'

const fiftyFree = getEventById('50-free')!
const hundredFree = getEventById('100-free')!
const twoHundredFree = getEventById('200-free')!

describe('getDisplayPaceDistance', () => {
  it('returns 50 for single-length 50 events', () => {
    expect(getDisplayPaceDistance(fiftyFree)).toBe(50)
  })

  it('returns 100 for distance events', () => {
    expect(getDisplayPaceDistance(hundredFree)).toBe(100)
    expect(getDisplayPaceDistance(twoHundredFree)).toBe(100)
  })
})

describe('shouldShowRaceAverageReference', () => {
  it('is false for 50 events and true otherwise', () => {
    expect(shouldShowRaceAverageReference(fiftyFree)).toBe(false)
    expect(shouldShowRaceAverageReference(hundredFree)).toBe(true)
  })
})

describe('getGoalDisplayPaceCs', () => {
  it('uses the actual goal time for 50 events instead of extrapolating per-100', () => {
    expect(getGoalDisplayPaceCs(2200, fiftyFree, 'SCY')).toBe(2200)
  })

  it('uses per-100 race average for longer events', () => {
    expect(getGoalDisplayPaceCs(4400, hundredFree, 'SCY')).toBe(4400)
  })
})

describe('computeTrainingZoneRows for 50-free', () => {
  const goalCs = 2200

  it('sets display fields for per-50 UI', () => {
    const plan = computeTrainingZoneRows(goalCs, fiftyFree, 'SCY', 'a-system', 'fixed')

    expect(plan.displayPaceDistance).toBe(50)
    expect(plan.goalDisplayPaceCs).toBe(2200)
    expect(plan.practiceRepDistance).toBe(50)
  })

  it('computes race-pace rep at the goal time', () => {
    const plan = computeTrainingZoneRows(goalCs, fiftyFree, 'SCY', 'a-system', 'fixed')
    const racePace = plan.rows.find((row) => row.level === 'racePace')

    expect(racePace?.pacePerRepCs).toBe(2200)
    expect(racePace?.vsRacePerRepCs).toBe(0)
  })

  it('applies halved fixed offsets to 50 rep paces', () => {
    const plan = computeTrainingZoneRows(goalCs, fiftyFree, 'SCY', 'a-system', 'fixed')
    const recovery = plan.rows.find((row) => row.level === 'recovery')

    expect(recovery?.pacePerRepCs).toBe(2900)
  })
})
