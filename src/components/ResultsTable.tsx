import type { ConversionResult, Course } from '../lib/convert'
import { formatTime } from '../lib/timeParse'

type ResultsTableProps = {
  results: ConversionResult[]
  onEditTimes: () => void
  onExport: () => void
}

const COURSES: Course[] = ['SCY', 'SCM', 'LCM']

export function ResultsTable({ results, onEditTimes, onExport }: ResultsTableProps) {
  if (results.length === 0) return null

  return (
    <section className="results">
      <div className="section-header">
        <h2>Results</h2>
        <div className="button-group">
          <button type="button" className="secondary" onClick={onEditTimes}>
            Edit times
          </button>
          <button type="button" onClick={onExport}>
            Export to Excel
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <caption className="visually-hidden">
            Converted event times across SCY, SCM, and LCM.
          </caption>
          <thead>
            <tr>
              <th>Event</th>
              {COURSES.map((course) => (
                <th key={course}>{course}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.eventId}>
                <td>{row.eventLabel}</td>
                {COURSES.map((course) => (
                  <td
                    key={course}
                    className={course === row.sourceCourse ? 'source-cell' : undefined}
                  >
                    {formatTime(row[course])}
                    {course === row.sourceCourse && (
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
      <p className="hint">* = your entered time</p>
    </section>
  )
}
