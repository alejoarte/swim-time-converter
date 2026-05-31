export type Stroke = 'fly' | 'back' | 'breast' | 'free' | 'im'

export type SwimEvent = {
  id: string
  label: string
  stroke: Stroke
  /** Nominal distance in meters (500y/1650y use meter equivalents for conversion lookup). */
  distance: number
  group: 'fly' | 'back' | 'breast' | 'free' | 'im'
  /** Optional sub-section label within a group (e.g. Distance Freestyle under Freestyle). */
  subgroup?: 'distance-free'
}

export const EVENTS: SwimEvent[] = [
  { id: '50-fly', label: '50 Fly', stroke: 'fly', distance: 50, group: 'fly' },
  { id: '100-fly', label: '100 Fly', stroke: 'fly', distance: 100, group: 'fly' },
  { id: '200-fly', label: '200 Fly', stroke: 'fly', distance: 200, group: 'fly' },
  { id: '50-back', label: '50 Back', stroke: 'back', distance: 50, group: 'back' },
  { id: '100-back', label: '100 Back', stroke: 'back', distance: 100, group: 'back' },
  { id: '200-back', label: '200 Back', stroke: 'back', distance: 200, group: 'back' },
  { id: '50-breast', label: '50 Breast', stroke: 'breast', distance: 50, group: 'breast' },
  { id: '100-breast', label: '100 Breast', stroke: 'breast', distance: 100, group: 'breast' },
  { id: '200-breast', label: '200 Breast', stroke: 'breast', distance: 200, group: 'breast' },
  { id: '50-free', label: '50 Free', stroke: 'free', distance: 50, group: 'free' },
  { id: '100-free', label: '100 Free', stroke: 'free', distance: 100, group: 'free' },
  { id: '200-free', label: '200 Free', stroke: 'free', distance: 200, group: 'free' },
  { id: '400-500-free', label: '400/500 Free', stroke: 'free', distance: 500, group: 'free', subgroup: 'distance-free' },
  { id: '800-1000-free', label: '800/1000 Free', stroke: 'free', distance: 1000, group: 'free', subgroup: 'distance-free' },
  { id: '1500-1650-free', label: '1500/1650 Free', stroke: 'free', distance: 1650, group: 'free', subgroup: 'distance-free' },
  { id: '100-im', label: '100 IM', stroke: 'im', distance: 100, group: 'im' },
  { id: '200-im', label: '200 IM', stroke: 'im', distance: 200, group: 'im' },
  { id: '400-im', label: '400 IM', stroke: 'im', distance: 400, group: 'im' },
]

export const EVENT_GROUPS: { key: SwimEvent['group']; label: string }[] = [
  { key: 'fly', label: 'Butterfly' },
  { key: 'back', label: 'Backstroke' },
  { key: 'breast', label: 'Breaststroke' },
  { key: 'free', label: 'Freestyle' },
  { key: 'im', label: 'Individual Medley' },
]

export const SUBGROUP_LABELS: Record<NonNullable<SwimEvent['subgroup']>, string> = {
  'distance-free': 'Distance Freestyle',
}

export function getEventById(id: string): SwimEvent | undefined {
  return EVENTS.find((e) => e.id === id)
}

/** Compare event ids by stroke order (fly → back → breast → free → im), then distance. */
export function compareEventIds(a: string, b: string): number {
  const indexA = EVENTS.findIndex((e) => e.id === a)
  const indexB = EVENTS.findIndex((e) => e.id === b)
  return indexA - indexB
}
