import { Trans, useTranslation } from 'react-i18next'
import { getOffsetModelLabel, getZoneGlossary } from '../data/trainingZoneSystems'
import { formatTime } from '../lib/timeParse'
import {
  formatReliabilityLabel,
  formatVsRaceOffset,
  type TrainingZonePlan,
} from '../lib/trainingZones'

export type TrainingZonesTableContext = {
  eventLabel: string
  course: string
  zoneSystemLabel: string
  goalCentiseconds: number
}

type TrainingZonesTableProps = {
  plan: TrainingZonePlan
  lengthUnit: 'yard' | 'meter'
  context: TrainingZonesTableContext
  onCopyLink: () => void
  onExport: () => void
  onPrint: () => void
}

export function TrainingZonesTable({
  plan,
  lengthUnit,
  context,
  onCopyLink,
  onExport,
  onPrint,
}: TrainingZonesTableProps) {
  const { t } = useTranslation('zones')
  const { t: tCommon } = useTranslation()
  const repLabel = plan.practiceRepDistance === 50 ? '50' : '100'
  const unitLabel = lengthUnit === 'yard' ? 'yd' : 'm'
  const offsetModelLabel = getOffsetModelLabel(plan.offsetModel)

  return (
    <section className="training-zones">
      <div className="section-header">
        <h2>{t('table.heading')}</h2>
        <div className="button-group">
          <button
            type="button"
            className="secondary"
            onClick={onCopyLink}
            aria-label={tCommon('share.copyLinkAria')}
          >
            {tCommon('share.copyLink')}
          </button>
          <button type="button" className="secondary" onClick={onPrint}>
            {t('table.print')}
          </button>
          <button type="button" onClick={onExport}>
            {t('table.exportExcel')}
          </button>
        </div>
      </div>

      <div className="training-zones-callout" role="note">
        <p>
          <Trans
            ns="zones"
            i18nKey="table.callout1"
            values={{
              repDistance: plan.practiceRepDistance,
              unit: unitLabel,
              anchor: plan.anchorLabel,
              paceModel: offsetModelLabel,
            }}
            components={{ strong: <strong /> }}
          />
        </p>
        <p>
          <Trans
            ns="zones"
            i18nKey="table.callout2"
            components={{ strong: <strong /> }}
          />
        </p>
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
        <table className="training-zones-table">
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
                <td className={row.isRacePace ? 'training-zones-pace--race' : undefined}>
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

      <p className="plan-results-meta plan-results-disclaimer">{getZoneGlossary()}</p>

      <p className="plan-results-meta plan-results-disclaimer">
        {t('table.disclaimer', {
          paceModel: offsetModelLabel.toLowerCase(),
        })}
      </p>
    </section>
  )
}
