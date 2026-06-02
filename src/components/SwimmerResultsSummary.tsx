import { useMemo } from 'react'
import { getEventById } from '../data/events'
import { buildManualPrefill } from '../lib/manualPrefill'
import type { ManualPrefill } from '../lib/manualPrefill'
import type { Course } from '../lib/convert'
import type { ParsedRow } from '../lib/parsePdf/types'
import { getSwimmerSummaryStats, groupRowsBySwimmerKey } from '../lib/swimmerFilter'

type SwimmerResultsSummaryProps = {
  rows: ParsedRow[]
  selectedKeys: Set<string>
  fileName: string | null
  meetTitle?: string
  sourceCourse: Course
  onChangeSelection: () => void
  onChooseAnotherFile: () => void
  onSendToManualConverter?: (prefill: ManualPrefill) => void
}

export function SwimmerResultsSummary({
  rows,
  selectedKeys,
  fileName,
  meetTitle,
  sourceCourse,
  onChangeSelection,
  onChooseAnotherFile,
  onSendToManualConverter,
}: SwimmerResultsSummaryProps) {
  const stats = useMemo(
    () => getSwimmerSummaryStats(rows, selectedKeys),
    [rows, selectedKeys],
  )

  const groupedRows = useMemo(
    () => groupRowsBySwimmerKey(rows, selectedKeys),
    [rows, selectedKeys],
  )

  const manualPrefill = useMemo(
    () => buildManualPrefill(rows, selectedKeys, sourceCourse),
    [rows, selectedKeys, sourceCourse],
  )

  const singleSwimmerSelected = selectedKeys.size === 1

  const handleSendToManual = () => {
    if (!manualPrefill || !onSendToManualConverter) return
    onSendToManualConverter(manualPrefill)
  }

  return (
    <section className="swimmer-results-summary">
      <div className="section-header">
        <h2>Swimmer results</h2>
        <div className="section-header-actions">
          <button type="button" className="secondary" onClick={onChangeSelection}>
            Change selection
          </button>
          <button type="button" className="secondary" onClick={onChooseAnotherFile}>
            Choose another file
          </button>
        </div>
      </div>

      {fileName && <p className="hint">{fileName}</p>}
      {meetTitle && <p className="meet-title">{meetTitle}</p>}
      <p className="hint">
        {stats.length} swimmer{stats.length === 1 ? '' : 's'} selected
      </p>

      {stats.map((swimmer) => {
        const swimmerRows = groupedRows.get(swimmer.key) ?? []
        return (
          <article key={swimmer.key} className="swimmer-results-card">
            <header className="swimmer-results-card-header">
              <h3>{swimmer.swimmerName}</h3>
              <div className="swimmer-results-card-meta">
                {swimmer.age != null && <span>Age {swimmer.age}</span>}
                {swimmer.team && <span>{swimmer.team}</span>}
                <span>
                  {swimmer.distinctEventCount} event
                  {swimmer.distinctEventCount === 1 ? '' : 's'}
                </span>
                <span>
                  {swimmer.rowCount} result line{swimmer.rowCount === 1 ? '' : 's'}
                </span>
              </div>
            </header>

            <div className="table-wrapper">
              <table className="import-table swimmer-results-table">
                <caption className="visually-hidden">
                  Parsed event rows for {swimmer.swimmerName}.
                </caption>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Age</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {swimmerRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.eventId
                          ? (getEventById(row.eventId)?.label ?? row.eventLabel)
                          : row.eventLabel}
                      </td>
                      <td>{row.age ?? '—'}</td>
                      <td>{row.rawTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )
      })}

      <div className="swimmer-results-actions">
        {onSendToManualConverter && (
          <div className="swimmer-results-manual-bridge">
            <button
              type="button"
              className="primary"
              onClick={handleSendToManual}
              disabled={!singleSwimmerSelected || manualPrefill === null}
            >
              Send to Manual converter
            </button>
            {!singleSwimmerSelected ? (
              <p className="hint">
                Import to time converter works for one swimmer at a time. Select a single
                swimmer to enable this.
              </p>
            ) : manualPrefill === null ? (
              <p className="hint">
                This swimmer has no rows with a recognized event and valid time for
                import.
              </p>
            ) : (
              <p className="hint">
                Opens Manual entry with {manualPrefill.entries.length} event
                {manualPrefill.entries.length === 1 ? '' : 's'} prefilled from this PDF.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
