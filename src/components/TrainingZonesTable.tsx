import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { getOffsetModelLabel, getZoneGlossary } from '../data/trainingZoneSystems'
import { getEventById } from '../data/events'
import { type Course } from '../lib/convert'
import {
  buildSimplifiedZoneRows,
  formatPaceRange,
  type SimplifiedZoneId,
} from '../lib/trainingZoneDisplay'
import { formatTime } from '../lib/timeParse'
import {
  formatReliabilityLabel,
  formatVsRaceOffset,
  type TrainingZonePlan,
} from '../lib/trainingZones'
import {
  IconBarChart,
  IconDownload,
  IconFlag,
  IconGauge,
  IconHeart,
  IconInfo,
  IconLink,
  IconPrint,
  IconPulse,
} from './icons'

export type TrainingZonesTableContext = {
  eventId: string
  eventLabel: string
  course: string
  zoneSystemLabel: string
  goalCentiseconds: number
}

type TrainingZonesTableProps = {
  plan: TrainingZonePlan
  course: Course
  lengthUnit: 'yard' | 'meter'
  context: TrainingZonesTableContext
  onCopyLink: () => void
  onExport: () => void
  onPrint: () => void
}

function ZoneIcon({ id }: { id: SimplifiedZoneId }) {
  const className = `zone-icon zone-icon--${id}`
  switch (id) {
    case 'recovery':
      return (
        <span className={className}>
          <IconHeart size={18} />
        </span>
      )
    case 'aerobic':
      return (
        <span className={className}>
          <IconPulse size={18} />
        </span>
      )
    case 'threshold':
      return (
        <span className={className}>
          <IconGauge size={18} />
        </span>
      )
    case 'racePace':
      return (
        <span className={className}>
          <IconFlag size={18} />
        </span>
      )
  }
}

export function TrainingZonesTable({
  plan,
  course,
  lengthUnit,
  context,
  onCopyLink,
  onExport,
  onPrint,
}: TrainingZonesTableProps) {
  const { t } = useTranslation('zones')
  const { t: tCommon } = useTranslation()
  const [showDetails, setShowDetails] = useState(false)
  const repLabel = plan.practiceRepDistance === 50 ? '50' : '100'
  const unitLabel = lengthUnit === 'yard' ? 'y' : 'm'
  const unitShort = lengthUnit === 'yard' ? 'y' : 'm'
  const offsetModelLabel = getOffsetModelLabel(plan.offsetModel)
  const event = getEventById(context.eventId)
  const simplifiedRows =
    event !== undefined ? buildSimplifiedZoneRows(plan, course, event) : []

  return (
    <section className="plan-card training-zones">
      <div className="training-zones__top">
        <div className="plan-card__header">
          <div className="plan-card__icon" aria-hidden="true">
            <IconBarChart size={22} />
          </div>
          <div className="plan-card__heading">
            <h2>{t('table.heading')}</h2>
            <p>{t('table.subtitle', { unit: unitLabel })}</p>
          </div>
        </div>

        <div className="training-zones__meta">
          <span className="training-zones-badge">
            {t('table.goalBadge', {
              event: context.eventLabel,
              goal: formatTime(context.goalCentiseconds),
            })}
          </span>
          <div className="training-zones__actions no-print">
            <button
              type="button"
              className="icon-btn secondary"
              onClick={onCopyLink}
              aria-label={tCommon('share.copyLinkAria')}
              title={tCommon('share.copyLink')}
            >
              <IconLink size={16} />
              <span>{tCommon('share.copyLink')}</span>
            </button>
            <button
              type="button"
              className="icon-btn secondary"
              onClick={onPrint}
              title={t('table.print')}
            >
              <IconPrint size={16} />
              <span>{t('table.print')}</span>
            </button>
            <button type="button" className="icon-btn" onClick={onExport}>
              <IconDownload size={16} />
              <span>{t('table.exportExcel')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="plan-print-meta">
        <p>
          <Trans
            ns="zones"
            i18nKey="table.printMeta"
            values={{
              event: context.eventLabel,
              course: context.course,
              time: formatTime(context.goalCentiseconds),
            }}
            components={{ strong: <strong /> }}
          />
        </p>
        <p className="plan-print-meta-system">
          {t('table.printMetaSystem', { system: context.zoneSystemLabel })}
        </p>
      </div>

      <div className="table-wrapper">
        <table className="training-zones-table training-zones-table--coach">
          <caption className="visually-hidden">{t('table.caption')}</caption>
          <thead>
            <tr>
              <th>{t('table.coachColumns.zone')}</th>
              <th>{t('table.coachColumns.pace', { unit: unitShort })}</th>
              <th>{t('table.coachColumns.effort')}</th>
              <th>{t('table.coachColumns.hr')}</th>
              <th>{t('table.coachColumns.rpe')}</th>
            </tr>
          </thead>
          <tbody>
            {simplifiedRows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="training-zones-zone-cell">
                    <ZoneIcon id={row.id} />
                    <div>
                      <strong>{row.title}</strong>
                      <span className="training-zones-name">{row.subtitle}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="training-zones-pace-main">
                    {formatPaceRange(row.paceMinCs, row.paceMaxCs)}
                  </span>
                  {row.metricPaceMinCs !== null && row.metricPaceMaxCs !== null && (
                    <span className="training-zones-pace-metric">
                      {t('table.metricPace', {
                        range: formatPaceRange(row.metricPaceMinCs, row.metricPaceMaxCs),
                      })}
                    </span>
                  )}
                </td>
                <td>{row.effortLabel}</td>
                <td>{row.hrLabel}</td>
                <td>{row.rpeLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="training-zones-footer">
        <IconInfo size={16} />
        <span>{t('table.hrDisclaimer')}</span>
      </p>

      <div className="training-zones-details no-print">
        <button
          type="button"
          className="training-zones-details-toggle secondary"
          onClick={() => setShowDetails((open) => !open)}
          aria-expanded={showDetails}
        >
          {showDetails ? t('table.hideDetails') : t('table.showDetails')}
        </button>

        {showDetails && (
          <div className="training-zones-details-panel">
            <div className="table-wrapper">
              <table className="training-zones-table training-zones-table--full">
                <caption className="visually-hidden">{t('table.caption')}</caption>
                <thead>
                  <tr>
                    <th>{t('table.columns.zone')}</th>
                    <th>{t('table.columns.purpose')}</th>
                    <th>{t('table.columns.effort')}</th>
                    <th>{t('table.columns.hr')}</th>
                    <th>{t('table.columns.rpe')}</th>
                    <th>{t('table.columns.rest')}</th>
                    <th>{t('table.columns.pace', { rep: repLabel })}</th>
                    <th>{t('table.columns.vsRace')}</th>
                    <th>{t('table.columns.reliability')}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.map((row) => (
                    <tr
                      key={row.level}
                      className={row.isRacePace ? 'training-zones-row--race' : undefined}
                    >
                      <td>
                        <strong>{row.code}</strong>
                        <span className="training-zones-name">{row.name}</span>
                      </td>
                      <td>{row.purpose}</td>
                      <td>{row.effortLabel}</td>
                      <td>{row.hrLabel}</td>
                      <td>{row.rpeLabel}</td>
                      <td>{row.restGuidance}</td>
                      <td
                        className={
                          row.isRacePace ? 'training-zones-pace--race' : undefined
                        }
                      >
                        {formatTime(row.pacePerRepCs)}
                      </td>
                      <td>{formatVsRaceOffset(row.vsRacePerRepCs)}</td>
                      <td>
                        <span
                          className={`training-zones-reliability training-zones-reliability--${row.reliability}`}
                        >
                          {formatReliabilityLabel(row.reliability)}
                        </span>
                        <span className="training-zones-reliability-note">
                          {row.reliabilityNote}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="plan-results-meta plan-results-disclaimer">
              {getZoneGlossary()}
            </p>
            <p className="plan-results-meta plan-results-disclaimer">
              {t('table.disclaimer', {
                paceModel: offsetModelLabel.toLowerCase(),
              })}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
