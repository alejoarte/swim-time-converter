import { useEffect, useMemo, useState } from 'react'
import { EVENTS } from '../data/events'
import {
  countConvertibleRows,
  getRowsByOriginalStatus,
  mergeIssueReviewDraft,
} from '../lib/issuesReview'
import type { ParsedRow, ParseRowStatus } from '../lib/parsePdf/types'
import { revalidateParsedRow } from '../lib/revalidateParsedRow'

type IssueTab = 'errors' | 'warnings'

type IssuesReviewModalProps = {
  open: boolean
  onClose: () => void
  rows: ParsedRow[]
  onConfirm: (mergedRows: ParsedRow[]) => void
}

function statusLabel(status: ParseRowStatus): string {
  if (status === 'ok') return 'OK'
  if (status === 'warning') return 'Warning'
  return 'Error'
}

function formatIssueSummary(errorCount: number, warningCount: number): string {
  const parts: string[] = []
  if (errorCount > 0) {
    parts.push(`${errorCount} error${errorCount === 1 ? '' : 's'}`)
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} warning${warningCount === 1 ? '' : 's'}`)
  }
  return parts.join(', ')
}

function cloneRows(rows: ParsedRow[]): ParsedRow[] {
  return rows.map((row) => ({ ...row, issues: [...row.issues] }))
}

type IssueTableProps = {
  sectionRows: ParsedRow[]
  originalStatusById: Map<string, ParseRowStatus>
  onUpdateRow: (id: string, patch: Partial<ParsedRow>) => void
  onToggleIncluded: (id: string, included: boolean) => void
}

function IssueTable({
  sectionRows,
  originalStatusById,
  onUpdateRow,
  onToggleIncluded,
}: IssueTableProps) {
  if (sectionRows.length === 0) return null

  return (
    <div className="table-wrapper">
      <table className="import-table issues-review-table">
        <thead>
          <tr>
            <th>Include</th>
            <th>Status</th>
            <th>Event</th>
            <th>Name</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {sectionRows.map((row) => {
            const wasError = originalStatusById.get(row.id) === 'error'
            const isFixed = wasError && row.status !== 'error'

            return (
              <tr
                key={row.id}
                className={`import-row import-row--${row.status}${row.included ? '' : ' import-row--excluded'}${isFixed ? ' issues-review-row--fixed' : ''}`}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={row.included}
                    disabled={row.status === 'error'}
                    onChange={(e) => onToggleIncluded(row.id, e.target.checked)}
                    aria-label={`Include ${row.swimmerName}`}
                  />
                </td>
                <td>
                  <span className={`status-badge status-badge--${row.status}`}>
                    {statusLabel(row.status)}
                  </span>
                  {isFixed && <span className="issues-review-fixed-badge">Fixed</span>}
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
                      onUpdateRow(row.id, { eventId: e.target.value || null })
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
                <td>
                  <input
                    type="text"
                    className="import-time-input"
                    value={row.rawTime}
                    onChange={(e) => onUpdateRow(row.id, { rawTime: e.target.value })}
                    aria-label={`Time for ${row.swimmerName}`}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function IssuesReviewModal({ open, onClose, rows, onConfirm }: IssuesReviewModalProps) {
  const [draftRows, setDraftRows] = useState<ParsedRow[]>([])
  const [originalStatusById, setOriginalStatusById] = useState<Map<string, ParseRowStatus>>(
    new Map(),
  )
  const [activeTab, setActiveTab] = useState<IssueTab>('errors')

  useEffect(() => {
    if (!open) return

    const cloned = cloneRows(rows)
    const statusMap = new Map(rows.map((row) => [row.id, row.status]))
    const errorCount = getRowsByOriginalStatus(cloned, statusMap, 'error').length

    setDraftRows(cloned)
    setOriginalStatusById(statusMap)
    setActiveTab(errorCount > 0 ? 'errors' : 'warnings')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, rows, onClose])

  const errorRows = useMemo(
    () => getRowsByOriginalStatus(draftRows, originalStatusById, 'error'),
    [draftRows, originalStatusById],
  )
  const warningRows = useMemo(
    () => getRowsByOriginalStatus(draftRows, originalStatusById, 'warning'),
    [draftRows, originalStatusById],
  )
  const showTabs = errorRows.length > 0 && warningRows.length > 0
  const visibleRows = activeTab === 'errors' ? errorRows : warningRows
  const includedCount = countConvertibleRows(draftRows)

  if (!open) return null

  const updateDraftRow = (id: string, patch: Partial<ParsedRow>) => {
    setDraftRows((current) =>
      current.map((row) =>
        row.id === id
          ? revalidateParsedRow({ ...row, ...patch }, { autoIncludeOnFix: true })
          : row,
      ),
    )
  }

  const toggleDraftIncluded = (id: string, included: boolean) => {
    setDraftRows((current) =>
      current.map((row) =>
        row.id === id && row.status !== 'error' ? { ...row, included } : row,
      ),
    )
  }

  const includeAllWarnings = () => {
    setDraftRows((current) =>
      current.map((row) =>
        originalStatusById.get(row.id) === 'warning' ? { ...row, included: true } : row,
      ),
    )
  }

  const excludeAllErrors = () => {
    setDraftRows((current) =>
      current.map((row) =>
        originalStatusById.get(row.id) === 'error' ? { ...row, included: false } : row,
      ),
    )
  }

  const excludeAllWarnings = () => {
    setDraftRows((current) =>
      current.map((row) =>
        originalStatusById.get(row.id) === 'warning' ? { ...row, included: false } : row,
      ),
    )
  }

  const includeAllFixable = () => {
    setDraftRows((current) =>
      current.map((row) =>
        originalStatusById.get(row.id) === 'error' && row.status !== 'error'
          ? { ...row, included: true }
          : row,
      ),
    )
  }

  const handleConfirm = () => {
    onConfirm(mergeIssueReviewDraft(rows, draftRows))
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-dialog modal-dialog--issues-review"
        role="dialog"
        aria-modal="true"
        aria-labelledby="issues-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="issues-review-title">Review issues</h2>
          <button
            type="button"
            className="modal-close secondary"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          <p className="issues-review-summary">
            {formatIssueSummary(errorRows.length, warningRows.length)} found in this import.
          </p>

          {showTabs && (
            <div className="issues-review-tabs" role="tablist" aria-label="Issue type">
              <button
                type="button"
                role="tab"
                id="issues-tab-errors"
                aria-selected={activeTab === 'errors'}
                aria-controls="issues-tabpanel"
                className={`issues-review-tab secondary${activeTab === 'errors' ? ' issues-review-tab--active' : ''}`}
                onClick={() => setActiveTab('errors')}
              >
                Errors ({errorRows.length})
              </button>
              <button
                type="button"
                role="tab"
                id="issues-tab-warnings"
                aria-selected={activeTab === 'warnings'}
                aria-controls="issues-tabpanel"
                className={`issues-review-tab secondary${activeTab === 'warnings' ? ' issues-review-tab--active' : ''}`}
                onClick={() => setActiveTab('warnings')}
              >
                Warnings ({warningRows.length})
              </button>
            </div>
          )}

          <div className="issues-review-toolbar button-group">
            {activeTab === 'errors' ? (
              <>
                <button type="button" className="secondary" onClick={excludeAllErrors}>
                  Exclude all errors
                </button>
                <button type="button" className="secondary" onClick={includeAllFixable}>
                  Include all fixable
                </button>
              </>
            ) : (
              <>
                <button type="button" className="secondary" onClick={includeAllWarnings}>
                  Include all warnings
                </button>
                <button type="button" className="secondary" onClick={excludeAllWarnings}>
                  Exclude all warnings
                </button>
              </>
            )}
          </div>

          <section
            id="issues-tabpanel"
            role="tabpanel"
            aria-labelledby={activeTab === 'errors' ? 'issues-tab-errors' : 'issues-tab-warnings'}
            className="issues-review-section"
          >
            {!showTabs && (
              <h3 className="issues-review-section-title">
                {activeTab === 'errors'
                  ? `Errors (${errorRows.length})`
                  : `Warnings (${warningRows.length})`}
              </h3>
            )}
            {activeTab === 'errors' && (
              <p className="hint hint--warning">
                Fix event or time to resolve errors. Include is enabled once a row is
                fixable.
              </p>
            )}
            <IssueTable
              sectionRows={visibleRows}
              originalStatusById={originalStatusById}
              onUpdateRow={updateDraftRow}
              onToggleIncluded={toggleDraftIncluded}
            />
          </section>
        </div>

        <footer className="modal-footer">
          <span className="issues-review-footer-summary">
            {includedCount} row{includedCount === 1 ? '' : 's'} will be included
          </span>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm}>
            Confirm
          </button>
        </footer>
      </div>
    </div>
  )
}
