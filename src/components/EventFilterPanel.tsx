import { useEffect, useMemo, useState } from 'react'
import { getUniqueEvents, type EventIdentity } from '../lib/eventFilter'
import type { ParsedRow } from '../lib/parsePdf/types'

type EventFilterPanelProps = {
  rows: ParsedRow[]
  activeFilter: Set<string> | null
  onConfirm: (selectedKeys: Set<string>) => void
  hintText?: string
  className?: string
}

function eventMatches(event: EventIdentity, query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true
  return event.eventLabel.toLowerCase().includes(trimmed.toLowerCase())
}

export function EventFilterPanel({
  rows,
  activeFilter,
  onConfirm,
  hintText = 'Search by event name, check the events you want, then confirm to view those results.',
  className,
}: EventFilterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [pickerSelection, setPickerSelection] = useState<Set<string>>(new Set())
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)

  useEffect(() => {
    if (activeFilter) {
      setPickerSelection(new Set(activeFilter))
    } else {
      setPickerSelection(new Set())
      setShowSelectedOnly(false)
    }
  }, [activeFilter])

  useEffect(() => {
    if (pickerSelection.size === 0) {
      setShowSelectedOnly(false)
    }
  }, [pickerSelection.size])

  const uniqueEvents = useMemo(() => getUniqueEvents(rows), [rows])

  const visibleEvents = useMemo(
    () => uniqueEvents.filter((event) => eventMatches(event, searchQuery)),
    [uniqueEvents, searchQuery],
  )

  const listEvents = useMemo(() => {
    if (!showSelectedOnly) return visibleEvents
    return visibleEvents.filter((event) => pickerSelection.has(event.key))
  }, [visibleEvents, showSelectedOnly, pickerSelection])

  const togglePicker = (key: string, checked: boolean) => {
    setPickerSelection((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })
  }

  const selectAllShown = () => {
    setPickerSelection(new Set(visibleEvents.map((event) => event.key)))
  }

  const clearPicker = () => {
    setPickerSelection(new Set())
  }

  const handleConfirm = () => {
    if (pickerSelection.size === 0) return
    onConfirm(new Set(pickerSelection))
  }

  return (
    <div className={className ? `event-filter ${className}` : 'event-filter'}>
      <p className="hint">{hintText}</p>

      <input
        type="search"
        className="swimmer-filter-search"
        placeholder="Search by event (e.g. 100 Free)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Search events by name"
      />

      <div className="swimmer-filter-actions">
        <div className="button-group">
          <button
            type="button"
            className="secondary"
            onClick={selectAllShown}
            disabled={visibleEvents.length === 0}
          >
            Select all shown
          </button>
          <button
            type="button"
            className="secondary"
            onClick={clearPicker}
            disabled={pickerSelection.size === 0}
          >
            Clear
          </button>
          <button
            type="button"
            className="swimmer-filter-confirm"
            onClick={handleConfirm}
            disabled={pickerSelection.size === 0}
          >
            Confirm selection{' '}
            <span className="swimmer-filter-count">({pickerSelection.size})</span>
          </button>
        </div>
      </div>

      <label className="swimmer-filter-show-selected">
        <input
          type="checkbox"
          checked={showSelectedOnly}
          disabled={pickerSelection.size === 0}
          onChange={(e) => setShowSelectedOnly(e.target.checked)}
        />
        Selected only
      </label>

      <ul className="swimmer-filter-list">
        {listEvents.length === 0 ? (
          <li className="swimmer-filter-empty">
            {showSelectedOnly
              ? 'No selected events match your search.'
              : 'No events match your search.'}
          </li>
        ) : (
          listEvents.map((event) => (
            <li key={event.key} className="swimmer-filter-item">
              <label className="swimmer-filter-label">
                <input
                  type="checkbox"
                  checked={pickerSelection.has(event.key)}
                  onChange={(e) => togglePicker(event.key, e.target.checked)}
                />
                <span className="swimmer-filter-name">{event.eventLabel}</span>
                <span className="swimmer-filter-meta">
                  <span>
                    {event.rowCount} result{event.rowCount === 1 ? '' : 's'}
                  </span>
                </span>
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
