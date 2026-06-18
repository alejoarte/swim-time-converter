import { useMemo, useState } from 'react'
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
import { IconSearch } from './icons'

type EventPickerProps = {
  selectedIds: Set<string>
  onChange: (selectedIds: Set<string>) => void
  disabled?: boolean
}

function EventListRow({
  event,
  checked,
  onToggle,
  disabled,
}: {
  event: SwimEvent
  checked: boolean
  onToggle: (id: string) => void
  disabled?: boolean
}) {
  const id = `event-${event.id}`
  return (
    <label className="event-list-row" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="event-list-checkbox"
        checked={checked}
        onChange={() => onToggle(event.id)}
        disabled={disabled}
      />
      <span className="event-list-label">{getEventLabel(event.id)}</span>
    </label>
  )
}

function EventListRows({
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
    <>
      {events.map((event) => (
        <EventListRow
          key={event.id}
          event={event}
          checked={selectedIds.has(event.id)}
          onToggle={onToggle}
          disabled={disabled}
        />
      ))}
    </>
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
      <EventListRows
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
        <div key={section.label ?? 'main'} className="event-list-group">
          {section.label && (
            <p className="event-list-group-title">{section.label}</p>
          )}
          <EventListRows
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
  const [search, setSearch] = useState('')

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

  const query = search.trim().toLowerCase()
  const filteredEvents = useMemo(() => {
    if (!query) return null
    return EVENTS.filter((e) => getEventLabel(e.id).toLowerCase().includes(query))
  }, [query])

  return (
    <div className="event-picker">
      <div className="event-picker-top">
        <span className="field-label">{t('eventPicker.heading')}</span>
        <div
          className="event-picker-toolbar"
          role="group"
          aria-label={t('eventPicker.bulkActionsAria')}
        >
          <button
            type="button"
            className="event-picker-action-btn"
            onClick={selectAll}
            disabled={disabled}
          >
            {t('eventPicker.selectAll')}
          </button>
          <button
            type="button"
            className="event-picker-action-btn"
            onClick={clearAll}
            disabled={disabled}
          >
            {t('eventPicker.clearAll')}
          </button>
        </div>
      </div>

      <div className="event-list-panel">
        <div className="event-search-wrap">
          <IconSearch className="event-search-icon" size={16} />
          <input
            type="search"
            className="event-search-input"
            placeholder={t('eventPicker.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            aria-label={t('eventPicker.searchPlaceholder')}
          />
        </div>

        <div className="event-list-scroll">
          {filteredEvents ? (
            filteredEvents.length > 0 ? (
              <EventListRows
                events={filteredEvents}
                selectedIds={selectedIds}
                onToggle={toggleEvent}
                disabled={disabled}
              />
            ) : (
              <p className="event-list-empty hint">{t('eventPicker.noResults')}</p>
            )
          ) : (
            EVENT_GROUP_KEYS.map((groupKey) => {
              const groupEvents = EVENTS.filter((e) => e.group === groupKey)
              return (
                <div key={groupKey} className="event-list-group">
                  <p className="event-list-group-title">{getEventGroupLabel(groupKey)}</p>
                  {renderGroupEvents(groupEvents, selectedIds, toggleEvent, disabled)}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
