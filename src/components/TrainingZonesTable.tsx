import { getOffsetModelLabel, ZONE_GLOSSARY } from '../data/trainingZoneSystems'

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

  onExport: () => void

  onPrint: () => void
}

export function TrainingZonesTable({
  plan,

  lengthUnit,

  context,

  onExport,

  onPrint,
}: TrainingZonesTableProps) {
  const repLabel = plan.practiceRepDistance === 50 ? '50' : '100'

  const unitLabel = lengthUnit === 'yard' ? 'yd' : 'm'

  const offsetModelLabel = getOffsetModelLabel(plan.offsetModel)

  return (
    <section className="training-zones">
      <div className="section-header">
        <h2>Training zones</h2>

        <div className="button-group">
          <button type="button" className="secondary" onClick={onPrint}>
            Print
          </button>

          <button type="button" onClick={onExport}>
            Export to Excel
          </button>
        </div>
      </div>

      <div className="training-zones-callout" role="note">
        <p>
          Practice paces for{' '}
          <strong>
            {plan.practiceRepDistance}-{unitLabel}
          </strong>{' '}
          repeats, anchored to your <strong>{plan.anchorLabel.toLowerCase()}</strong>.
          Pace model: <strong>{offsetModelLabel}</strong>.
        </p>

        <p>
          If your goal time is aspirational, <strong>race pace (RP/SP2)</strong> and{' '}
          <strong>sprint (SP/SP3)</strong> are the most reliable targets. Aerobic zones
          (REC, A1/EN1, A2/EN2) are usually set from current threshold or CSS — confirm
          with your coach if unsure.
        </p>
      </div>

      <div className="plan-print-meta">
        <p>
          <strong>{context.eventLabel}</strong> ({context.course}) · Goal{' '}
          <strong>{formatTime(context.goalCentiseconds)}</strong>
        </p>

        <p className="plan-print-meta-system">Zone system: {context.zoneSystemLabel}</p>
      </div>

      <div className="table-wrapper">
        <table className="training-zones-table">
          <caption className="visually-hidden">
            Training zone pace targets, effort guidance, and reliability labels.
          </caption>

          <thead>
            <tr>
              <th>Zone</th>

              <th>Purpose</th>

              <th>Effort</th>

              <th>HR</th>

              <th>RPE</th>

              <th>Rest</th>

              <th>Pace / {repLabel}</th>

              <th>vs race</th>

              <th>Reliability</th>
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

      <p className="plan-results-meta plan-results-disclaimer">{ZONE_GLOSSARY}</p>

      <p className="plan-results-meta plan-results-disclaimer">
        Zone paces are estimates from your goal time ({offsetModelLabel.toLowerCase()}{' '}
        model). Treat each pace as roughly ±1–3 seconds per 100. They are not a substitute
        for lactate testing, CSS benchmarks, or your coach&apos;s set design. HR varies by
        age, fitness, and stroke.
      </p>
    </section>
  )
}
