import { useState } from 'react'
import { EVENTS } from '../data/events'
import type { ParsedRow, ParseRowStatus } from '../lib/parsePdf/types'
import { swimmerKey } from '../lib/swimmerFilter'
import { revalidateParsedRow } from '../lib/revalidateParsedRow'
import { IssuesReviewModal } from './IssuesReviewModal'
import { SwimmerFilterModal } from './SwimmerFilterModal'

type ImportPreviewTableProps = {
  rows: ParsedRow[]
  onChange: (rows: ParsedRow[]) => void
  onConvert: () => void
  converting?: boolean
}

function statusLabel(status: ParseRowStatus): string {
  if (status === 'ok') return 'OK'
  if (status === 'warning') return 'Warning'
  return 'Error'
}

export function ImportPreviewTable({
  rows,
  onChange,
  onConvert,
  converting,
}: ImportPreviewTableProps) {
  const [activeSwimmerFilter, setActiveSwimmerFilter] = useState<Set<string> | null>(null)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [issuesModalOpen, setIssuesModalOpen] = useState(false)

  const includedCount = rows.filter((r) => r.included && r.status !== 'error').length
  const errorCount = rows.filter((r) => r.status === 'error').length
  const warningCount = rows.filter((r) => r.status === 'warning').length
  const issueCount = errorCount + warningCount

  const displayRows = activeSwimmerFilter
    ? rows.filter((row) => activeSwimmerFilter.has(swimmerKey(row)))
    : rows

  const handleConfirmSwimmers = (selectedKeys: Set<string>) => {
    setActiveSwimmerFilter(selectedKeys)
    onChange(
      rows.map((row) => ({
        ...row,
        included:
          selectedKeys.has(swimmerKey(row)) && row.status !== 'error' ? true : false,
      })),
    )
  }

  const handleClearSwimmerFilter = () => {
    setActiveSwimmerFilter(null)
    onChange(
      rows.map((row) => ({
        ...row,
        included: row.status !== 'error' ? true : false,
      })),
    )
  }

  const updateRow = (id: string, patch: Partial<ParsedRow>) => {
    onChange(
      rows.map((row) => (row.id === id ? revalidateParsedRow({ ...row, ...patch }) : row)),
    )
  }

  const toggleIncluded = (id: string, included: boolean) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, included } : row)))
  }

  const handleConfirmIssuesReview = (mergedRows: ParsedRow[]) => {
    onChange(mergedRows)
  }

  return (
    <section className="import-preview">
      <IssuesReviewModal
        open={issuesModalOpen}
        onClose={() => setIssuesModalOpen(false)}
        rows={rows}
        onConfirm={handleConfirmIssuesReview}
      />

      <SwimmerFilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        rows={rows}
        activeFilter={activeSwimmerFilter}
        onConfirm={handleConfirmSwimmers}
      />

      <div className="section-header">
        <h2>
          Review parsed rows
          {activeSwimmerFilter
            ? ` (${displayRows.length} of ${rows.length})`
            : ` (${rows.length})`}
        </h2>
        <div className="button-group">
          <button type="button" className="secondary" onClick={() => setFilterModalOpen(true)}>
            Find swimmers
            {activeSwimmerFilter && (
              <span className="filter-badge"> ({activeSwimmerFilter.size})</span>
            )}
          </button>
          {activeSwimmerFilter && (
            <button type="button" className="secondary" onClick={handleClearSwimmerFilter}>
              Show all swimmers
            </button>
          )}
          {issueCount > 0 && (
            <button type="button" className="secondary" onClick={() => setIssuesModalOpen(true)}>
              Review issues ({issueCount})
            </button>
          )}
          <button
            type="button"
            onClick={onConvert}
            disabled={converting || includedCount === 0}
          >
            Convert {includedCount} rows
          </button>
        </div>
      </div>

      <p className="hint">
        Review and fix errors or warnings before converting. Uncheck individual rows you
        want to skip.
      </p>

      <div className="table-wrapper table-wrapper--wide">
        <table className="import-table">
          <thead>
            <tr>
              <th>Include</th>
              <th>Status</th>
              <th>Event</th>
              <th>Name</th>
              <th>Age</th>
              <th>Team</th>
              <th>Lane</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr
                key={row.id}
                className={`import-row import-row--${row.status}${row.included ? '' : ' import-row--excluded'}`}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={row.included}
                    disabled={row.status === 'error'}
                    onChange={(e) => toggleIncluded(row.id, e.target.checked)}
                    aria-label={`Include ${row.swimmerName}`}
                  />
                </td>
                <td>
                  <span className={`status-badge status-badge--${row.status}`}>
                    {statusLabel(row.status)}
                  </span>
                  {row.issues.length > 0 && (
                    <span className="status-detail" title={row.issues.join(', ')}>
                      {row.issues[0]}
                    </span>
                  )}
                </td>
                <td>
                  <select
                    value={row.eventId ?? ''}
                    onChange={(e) =>
                      updateRow(row.id, { eventId: e.target.value || null })
                    }
                  >
                    <option value="">— Select —</option>
                    {EVENTS.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{row.swimmerName}</td>
                <td>{row.age ?? '—'}</td>
                <td>{row.team ?? '—'}</td>
                <td>{row.lane ?? '—'}</td>
                <td>
                  <input
                    type="text"
                    className="import-time-input"
                    value={row.rawTime}
                    onChange={(e) => updateRow(row.id, { rawTime: e.target.value })}
                    aria-label={`Time for ${row.swimmerName}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
