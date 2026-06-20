import { useTranslation } from 'react-i18next'
import { getEventLabel } from '../data/events'
import type { ConversionResult, Course } from '../lib/convert'
import { formatTime } from '../lib/timeParse'
import { IconInfo, IconLink } from './icons'

type ResultsTableProps = {
  results: ConversionResult[]
  onExport: () => void
  onCopyLink: () => void
  copyStatus: 'idle' | 'copied' | 'failed'
}

const COURSES: Course[] = ['SCY', 'SCM', 'LCM']

export function ResultsTable({
  results,
  onExport,
  onCopyLink,
  copyStatus,
}: ResultsTableProps) {
  const { t } = useTranslation()

  if (results.length === 0) return null

  const sourceCourse = results[0]?.sourceCourse

  return (
    <section className="card results">
      <div className="section-header">
        <h2 className="card-title">{t('results.heading')}</h2>
        <div className="button-group">
          <button
            type="button"
            className="secondary icon-btn"
            onClick={onCopyLink}
            aria-label={t('share.copyConversionLinkAria')}
          >
            <IconLink size={16} />
            <span>
              {copyStatus === 'copied' ? t('share.copied') : t('share.copyConversionLink')}
            </span>
          </button>
          <button type="button" onClick={onExport}>
            {t('results.exportExcel')}
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="results-table">
          <caption className="visually-hidden">{t('results.caption')}</caption>
          <thead>
            <tr>
              <th>{t('results.eventColumn')}</th>
              {COURSES.map((course) => (
                <th
                  key={course}
                  className={course === sourceCourse ? 'source-col-header' : undefined}
                >
                  {course}
                  {course === sourceCourse && (
                    <span
                      className="source-marker"
                      title={t('results.sourceMarkerTitle')}
                    >
                      *
                    </span>
                  )}
                </th>
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
                    className={
                      course === row.sourceCourse
                        ? 'source-cell source-cell--value'
                        : undefined
                    }
                  >
                    {formatTime(row[course])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint-inline hint-inline--below">
        <IconInfo size={14} />
        <span>{t('results.sourceHint')}</span>
      </p>
    </section>
  )
}
