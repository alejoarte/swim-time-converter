import { useMemo } from 'react'
import { filterRowsByEventKeys, getUniqueEvents, groupRowsByEventKey } from '../lib/eventFilter'
import type { ParsedRow } from '../lib/parsePdf/types'

type EventResultsSummaryProps = {
  rows: ParsedRow[]
  selectedKeys: Set<string>
  fileName: string | null
  meetTitle?: string
  onChangeSelection: () => void
  onChooseAnotherFile: () => void
}

export function EventResultsSummary({
  rows,
  selectedKeys,
  fileName,
  meetTitle,
  onChangeSelection,
  onChooseAnotherFile,
}: EventResultsSummaryProps) {
  const filteredRows = useMemo(
    () => filterRowsByEventKeys(rows, selectedKeys),
    [rows, selectedKeys],
  )

  const eventStats = useMemo(
    () => getUniqueEvents(filteredRows).filter((e) => selectedKeys.has(e.key)),
    [filteredRows, selectedKeys],
  )

  const groupedRows = useMemo(
    () => groupRowsByEventKey(rows, selectedKeys),
    [rows, selectedKeys],
  )

  return (
    <section className="swimmer-results-summary event-results-summary">
      <div className="section-header">
        <h2>Event results</h2>
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
        {eventStats.length} event{eventStats.length === 1 ? '' : 's'} selected ·{' '}
        {filteredRows.length} result{filteredRows.length === 1 ? '' : 's'}
      </p>

      {eventStats.map((event) => {
        const eventRows = groupedRows.get(event.key) ?? []
        return (
          <article key={event.key} className="swimmer-results-card">
            <header className="swimmer-results-card-header">
              <h3>{event.eventLabel}</h3>
              <span className="swimmer-results-card-meta">
                {event.rowCount} result{event.rowCount === 1 ? '' : 's'}
              </span>
            </header>
            <table className="swimmer-results-table">
              <thead>
                <tr>
                  <th scope="col">Swimmer</th>
                  <th scope="col">Time</th>
                  <th scope="col">Team</th>
                  <th scope="col">Heat</th>
                </tr>
              </thead>
              <tbody>
                {eventRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.swimmerName}</td>
                    <td>{row.rawTime}</td>
                    <td>{row.team ?? '—'}</td>
                    <td>{row.heatLabel ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        )
      })}
    </section>
  )
}
