import type { BulkConversionResult, Course } from '../lib/convert'
import { formatTime } from '../lib/timeParse'

type BulkResultsTableProps = {
  results: BulkConversionResult[]
  sourceCourse: Course
  onBack: () => void
  onExport: () => void
  onImportAnother: () => void
}

const COURSES: Course[] = ['SCY', 'SCM', 'LCM']

export function BulkResultsTable({
  results,
  sourceCourse,
  onBack,
  onExport,
  onImportAnother,
}: BulkResultsTableProps) {
  if (results.length === 0) return null

  return (
    <section className="results results--bulk">
      <div className="section-header">
        <h2>Meet conversions ({results.length} rows)</h2>
        <div className="button-group">
          <button type="button" className="secondary" onClick={onBack}>
            Back to review
          </button>
          <button type="button" className="secondary" onClick={onImportAnother}>
            Import another PDF
          </button>
          <button type="button" onClick={onExport}>
            Export to Excel
          </button>
        </div>
      </div>

      <div className="table-wrapper table-wrapper--wide">
        <table>
          <caption className="visually-hidden">
            Converted meet rows by swimmer and event across SCY, SCM, and LCM.
          </caption>
          <thead>
            <tr>
              <th>Name</th>
              <th>Event</th>
              <th>Team</th>
              {COURSES.map((course) => (
                <th key={course}>{course}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, index) => (
              <tr key={`${row.eventId}-${row.swimmerName}-${index}`}>
                <td>{row.swimmerName}</td>
                <td>{row.eventLabel}</td>
                <td>{row.team ?? '—'}</td>
                {COURSES.map((course) => (
                  <td
                    key={course}
                    className={course === sourceCourse ? 'source-cell' : undefined}
                  >
                    {formatTime(row[course])}
                    {course === sourceCourse && (
                      <span className="source-marker" title="Source time">
                        *
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">* = source time from PDF ({sourceCourse})</p>
    </section>
  )
}
