import { useTranslation } from 'react-i18next'
import {
  EVENT_GROUP_KEYS,
  EVENTS,
  getEventGroupLabel,
  getEventLabel,
  getSubgroupLabel,
  type EventSubgroup,
  type SwimEvent,
} from '../data/events'

type EventPickerProps = {
  selectedIds: Set<string>
  onChange: (selectedIds: Set<string>) => void
  disabled?: boolean
}

function EventCheckboxes({
  events,
  selectedIds,
  onToggle,
  disabled,
}: {
  events: SwimEvent[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  disabled?: boolean
}) {
  return (
    <div className="event-checkboxes">
      {events.map((event) => (
        <label key={event.id} className="event-checkbox">
          <input
            type="checkbox"
            checked={selectedIds.has(event.id)}
            onChange={() => onToggle(event.id)}
            disabled={disabled}
          />
          {getEventLabel(event.id)}
        </label>
      ))}
    </div>
  )
}

function renderGroupEvents(
  groupEvents: SwimEvent[],
  selectedIds: Set<string>,
  toggleEvent: (id: string) => void,
  disabled?: boolean,
) {
  const subgroups = [...new Set(groupEvents.map((e) => e.subgroup))]

  if (subgroups.length <= 1 && !subgroups[0]) {
    return (
      <EventCheckboxes
        events={groupEvents}
        selectedIds={selectedIds}
        onToggle={toggleEvent}
        disabled={disabled}
      />
    )
  }

  const sections: { label: string | null; events: SwimEvent[] }[] = []
  const mainEvents = groupEvents.filter((e) => !e.subgroup)
  if (mainEvents.length > 0) {
    sections.push({ label: null, events: mainEvents })
  }

  for (const subgroup of subgroups) {
    if (!subgroup) continue
    sections.push({
      label: getSubgroupLabel(subgroup as EventSubgroup),
      events: groupEvents.filter((e) => e.subgroup === subgroup),
    })
  }

  return (
    <>
      {sections.map((section) => (
        <div key={section.label ?? 'main'} className="event-subgroup">
          {section.label && <p className="event-group-title event-subgroup-title">{section.label}</p>}
          <EventCheckboxes
            events={section.events}
            selectedIds={selectedIds}
            onToggle={toggleEvent}
            disabled={disabled}
          />
        </div>
      ))}
    </>
  )
}

export function EventPicker({ selectedIds, onChange, disabled }: EventPickerProps) {
  const { t } = useTranslation()

  const toggleEvent = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange(next)
  }

  const selectAll = () => {
    onChange(new Set(EVENTS.map((e) => e.id)))
  }

  const clearAll = () => {
    onChange(new Set())
  }

  return (
    <section className="event-picker">
      <div className="section-header">
        <h2>{t('eventPicker.heading')}</h2>
        <div className="button-group">
          <button type="button" onClick={selectAll} disabled={disabled}>
            {t('eventPicker.selectAll')}
          </button>
          <button type="button" onClick={clearAll} disabled={disabled}>
            {t('eventPicker.clearAll')}
          </button>
        </div>
      </div>

      {EVENT_GROUP_KEYS.map((groupKey) => {
        const groupEvents = EVENTS.filter((e) => e.group === groupKey)
        return (
          <div key={groupKey} className="event-group">
            <h3 className="event-group-title">{getEventGroupLabel(groupKey)}</h3>
            {renderGroupEvents(groupEvents, selectedIds, toggleEvent, disabled)}
          </div>
        )
      })}
    </section>
  )
}
