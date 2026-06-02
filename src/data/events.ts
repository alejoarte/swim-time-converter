import i18n from '../i18n'

export type Stroke = 'fly' | 'back' | 'breast' | 'free' | 'im'

export type SwimEvent = {
  id: string
  stroke: Stroke
  /** Nominal distance in meters (500y/1650y use meter equivalents for conversion lookup). */
  distance: number
  group: 'fly' | 'back' | 'breast' | 'free' | 'im'
  /** Optional sub-section label within a group (e.g. Distance Freestyle under Freestyle). */
  subgroup?: 'distance-free'
}

export const EVENTS: SwimEvent[] = [
  { id: '50-fly', stroke: 'fly', distance: 50, group: 'fly' },
  { id: '100-fly', stroke: 'fly', distance: 100, group: 'fly' },
  { id: '200-fly', stroke: 'fly', distance: 200, group: 'fly' },
  { id: '50-back', stroke: 'back', distance: 50, group: 'back' },
  { id: '100-back', stroke: 'back', distance: 100, group: 'back' },
  { id: '200-back', stroke: 'back', distance: 200, group: 'back' },
  { id: '50-breast', stroke: 'breast', distance: 50, group: 'breast' },
  { id: '100-breast', stroke: 'breast', distance: 100, group: 'breast' },
  { id: '200-breast', stroke: 'breast', distance: 200, group: 'breast' },
  { id: '50-free', stroke: 'free', distance: 50, group: 'free' },
  { id: '100-free', stroke: 'free', distance: 100, group: 'free' },
  { id: '200-free', stroke: 'free', distance: 200, group: 'free' },
  {
    id: '400-500-free',
    stroke: 'free',
    distance: 500,
    group: 'free',
    subgroup: 'distance-free',
  },
  {
    id: '800-1000-free',
    stroke: 'free',
    distance: 1000,
    group: 'free',
    subgroup: 'distance-free',
  },
  {
    id: '1500-1650-free',
    stroke: 'free',
    distance: 1650,
    group: 'free',
    subgroup: 'distance-free',
  },
  { id: '100-im', stroke: 'im', distance: 100, group: 'im' },
  { id: '200-im', stroke: 'im', distance: 200, group: 'im' },
  { id: '400-im', stroke: 'im', distance: 400, group: 'im' },
]

export const EVENT_GROUP_KEYS: SwimEvent['group'][] = [
  'fly',
  'back',
  'breast',
  'free',
  'im',
]

export const SUBGROUP_KEYS = ['distance-free'] as const

export type EventSubgroup = (typeof SUBGROUP_KEYS)[number]

export function getEventLabel(id: string): string {
  return i18n.t(`items.${id}`, { ns: 'events', defaultValue: id })
}

export function getEventGroupLabel(group: SwimEvent['group']): string {
  return i18n.t(`groups.${group}`, { ns: 'events' })
}

export function getSubgroupLabel(subgroup: EventSubgroup): string {
  return i18n.t(`subgroups.${subgroup}`, { ns: 'events' })
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
