import { eventIdentity } from '../eventFilter'
import type { ParsedMeet, ParsedMeetEvent, ParsedRow, RowRound } from './types'

function heatGroupKey(heatLabel?: string, round?: RowRound): string {
  return `${heatLabel ?? ''}|${round ?? ''}`
}

export function buildParsedMeet(rows: ParsedRow[]): ParsedMeet {
  const eventOrder: string[] = []
  const eventMap = new Map<string, ParsedMeetEvent>()

  for (const row of rows) {
    const key = eventIdentity(row)
    let event = eventMap.get(key)

    if (!event) {
      event = {
        eventKey: key,
        eventLabel: row.eventLabel,
        eventId: row.eventId,
        heats: [],
      }
      eventMap.set(key, event)
      eventOrder.push(key)
    }

    const rowHeatKey = heatGroupKey(row.heatLabel, row.round)
    let heat = event.heats.find(
      (h) => heatGroupKey(h.heatLabel, h.round) === rowHeatKey,
    )

    if (!heat) {
      heat = {
        heatLabel: row.heatLabel,
        round: row.round,
        rows: [],
      }
      event.heats.push(heat)
    }

    heat.rows.push(row)
  }

  return {
    events: eventOrder.map((k) => eventMap.get(k)!),
  }
}

/** Flatten grouped meet back to rows (preserves order). */
export function flattenParsedMeet(meet: ParsedMeet): ParsedRow[] {
  return meet.events.flatMap((event) => event.heats.flatMap((heat) => heat.rows))
}
