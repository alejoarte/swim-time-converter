import { EVENT_GROUPS, EVENTS, SUBGROUP_LABELS } from '../data/events'

type EventSelectProps = {
  value: string
  onChange: (eventId: string) => void
  disabled?: boolean
}

export function EventSelect({ value, onChange, disabled }: EventSelectProps) {
  return (
    <section className="event-select-section">
      <h2>Select event</h2>
      <select
        className="event-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Select event"
      >
        {EVENT_GROUPS.map((group) => {
          const groupEvents = EVENTS.filter((e) => e.group === group.key)
          const subgroups = [...new Set(groupEvents.map((e) => e.subgroup))]

          if (subgroups.length <= 1 && !subgroups[0]) {
            return (
              <optgroup key={group.key} label={group.label}>
                {groupEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.label}
                  </option>
                ))}
              </optgroup>
            )
          }

          const sections: { label: string; events: typeof groupEvents }[] = []
          const mainEvents = groupEvents.filter((e) => !e.subgroup)
          if (mainEvents.length > 0) {
            sections.push({ label: group.label, events: mainEvents })
          }

          for (const subgroup of subgroups) {
            if (!subgroup) continue
            sections.push({
              label: `${group.label} — ${SUBGROUP_LABELS[subgroup]}`,
              events: groupEvents.filter((e) => e.subgroup === subgroup),
            })
          }

          return sections.map((section) => (
            <optgroup key={section.label} label={section.label}>
              {section.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.label}
                </option>
              ))}
            </optgroup>
          ))
        })}
      </select>
    </section>
  )
}
