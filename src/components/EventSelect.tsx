import { useTranslation } from 'react-i18next'
import {
  EVENT_GROUP_KEYS,
  EVENTS,
  getEventGroupLabel,
  getEventLabel,
  getSubgroupLabel,
  type EventSubgroup,
} from '../data/events'

type EventSelectProps = {
  value: string
  onChange: (eventId: string) => void
  disabled?: boolean
}

export function EventSelect({ value, onChange, disabled }: EventSelectProps) {
  const { t } = useTranslation()

  return (
    <section className="event-select-section">
      <h2>{t('eventSelect.heading')}</h2>
      <select
        className="event-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={t('eventSelect.ariaLabel')}
      >
        {EVENT_GROUP_KEYS.map((groupKey) => {
          const groupEvents = EVENTS.filter((e) => e.group === groupKey)
          const subgroups = [...new Set(groupEvents.map((e) => e.subgroup))]
          const groupLabel = getEventGroupLabel(groupKey)

          if (subgroups.length <= 1 && !subgroups[0]) {
            return (
              <optgroup key={groupKey} label={groupLabel}>
                {groupEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {getEventLabel(event.id)}
                  </option>
                ))}
              </optgroup>
            )
          }

          const sections: { label: string; events: typeof groupEvents }[] = []
          const mainEvents = groupEvents.filter((e) => !e.subgroup)
          if (mainEvents.length > 0) {
            sections.push({ label: groupLabel, events: mainEvents })
          }

          for (const subgroup of subgroups) {
            if (!subgroup) continue
            sections.push({
              label: `${groupLabel} — ${getSubgroupLabel(subgroup as EventSubgroup)}`,
              events: groupEvents.filter((e) => e.subgroup === subgroup),
            })
          }

          return sections.map((section) => (
            <optgroup key={section.label} label={section.label}>
              {section.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {getEventLabel(event.id)}
                </option>
              ))}
            </optgroup>
          ))
        })}
      </select>
    </section>
  )
}
