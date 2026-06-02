import { useTranslation } from 'react-i18next'
import { getEventLabel } from '../data/events'
import type { ConversionResult, Course } from '../lib/convert'
import { formatTime } from '../lib/timeParse'

type ResultsTableProps = {
  results: ConversionResult[]
  onEditTimes: () => void
  onExport: () => void
}

const COURSES: Course[] = ['SCY', 'SCM', 'LCM']

export function ResultsTable({ results, onEditTimes, onExport }: ResultsTableProps) {
  const { t } = useTranslation()

  if (results.length === 0) return null

  return (
    <section className="results">
      <div className="section-header">
        <h2>{t('results.heading')}</h2>
        <div className="button-group">
          <button type="button" className="secondary" onClick={onEditTimes}>
            {t('results.editTimes')}
          </button>
          <button type="button" onClick={onExport}>
            {t('results.exportExcel')}
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <caption className="visually-hidden">{t('results.caption')}</caption>
          <thead>
            <tr>
              <th>{t('results.eventColumn')}</th>
              {COURSES.map((course) => (
                <th key={course}>{course}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.eventId}>
                <td>{getEventLabel(row.eventId)}</td>
                {COURSES.map((course) => (
                  <td
                    key={course}
                    className={course === row.sourceCourse ? 'source-cell' : undefined}
                  >
                    {formatTime(row[course])}
                    {course === row.sourceCourse && (
                      <span className="source-marker" title={t('results.sourceMarkerTitle')}>
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
      <p className="hint">{t('results.sourceHint')}</p>
    </section>
  )
}
