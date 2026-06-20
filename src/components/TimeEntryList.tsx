import { useTranslation } from 'react-i18next'
import { compareEventIds, getEventById, getEventLabel } from '../data/events'
import type { Course } from '../lib/convert'
import {
  EMPTY_TIME_PARTS,
  type TimePart,
  type TimeParts,
} from '../lib/timeParse'
import { TimeFields } from './TimeFields'

type TimeEntryListProps = {
  sourceCourse: Course
  selectedIds: string[]
  times: Record<string, TimeParts>
  onTimeChange: (eventId: string, part: TimePart, value: string) => void
  onTimePaste: (eventId: string, parts: TimeParts) => void
  onTimeNormalize: (eventId: string, parts: TimeParts) => void
  showErrors: boolean
  disabled?: boolean
}

export function TimeEntryList({
  sourceCourse,
  selectedIds,
  times,
  onTimeChange,
  onTimePaste,
  onTimeNormalize,
  showErrors,
  disabled,
}: TimeEntryListProps) {
  const { t } = useTranslation()

  if (selectedIds.length === 0) {
    return (
      <section className="card time-entry">
        <h2 className="card-title">{t('timeEntry.heading', { course: sourceCourse })}</h2>
        <p className="hint">{t('timeEntry.emptyHint')}</p>
      </section>
    )
  }

  const sortedIds = [...selectedIds].sort(compareEventIds)

  return (
    <section className="card time-entry">
      <h2 className="card-title">{t('timeEntry.heading', { course: sourceCourse })}</h2>
      <p className="hint time-entry-paste-hint">{t('timeEntry.pasteHint')}</p>
      <ul className="time-entry-list">
        {sortedIds.map((id) => {
          const event = getEventById(id)
          if (!event) return null
          const value = times[id] ?? EMPTY_TIME_PARTS

          return (
            <li key={id} className="time-entry-row">
              <span className="time-entry-event-label">{getEventLabel(id)}</span>
              <TimeFields
                idPrefix={`time-${id}`}
                value={value}
                onChange={(part, v) => onTimeChange(id, part, v)}
                onPaste={(parts) => onTimePaste(id, parts)}
                onNormalize={(parts) => onTimeNormalize(id, parts)}
                disabled={disabled}
                showErrors={showErrors}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
