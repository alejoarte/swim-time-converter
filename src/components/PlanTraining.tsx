import { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { getEventById, getEventLabel } from '../data/events'
import {
  getOffsetModelDescription,
  getOffsetModelLabel,
  getZoneSystemLabel,
  OFFSET_MODEL_IDS,
  ZONE_SYSTEMS,
  type OffsetModel,
  type ZoneSystemId,
} from '../data/trainingZoneSystems'
import { type Course } from '../lib/convert'
import { exportTrainingZonesToExcel } from '../lib/exportExcel'
import { getLengthUnitLabel } from '../lib/pacing'
import {
  computeTrainingZoneRows,
  shouldShowRaceAverageReference,
} from '../lib/trainingZones'
import {
  EMPTY_TIME_PARTS,
  formatTime,
  isTimePartsEmpty,
  isValidTimeParts,
  partsToCentiseconds,
  type TimeParts,
} from '../lib/timeParse'
import { CourseSelector } from './CourseSelector'
import { EventSelect } from './EventSelect'
import { TimeFields } from './TimeFields'
import { TrainingZonesTable } from './TrainingZonesTable'

export function PlanTraining() {
  const { t, i18n } = useTranslation()
  const [course, setCourse] = useState<Course>('SCY')
  const [eventId, setEventId] = useState('200-free')
  const [zoneSystemId, setZoneSystemId] = useState<ZoneSystemId>('a-system')
  const [offsetModel, setOffsetModel] = useState<OffsetModel>('fixed')
  const [goalTime, setGoalTime] = useState<TimeParts>(EMPTY_TIME_PARTS)
  const [goalShowErrors, setGoalShowErrors] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const event = getEventById(eventId)
  const goalCs = partsToCentiseconds(goalTime)
  const validGoal = goalCs !== null && isValidTimeParts(goalTime)
  const lengthUnit = getLengthUnitLabel(course)

  const zonePlan = useMemo(() => {
    if (!event || !validGoal || goalCs === null) return null
    return computeTrainingZoneRows(goalCs, event, course, zoneSystemId, offsetModel)
  }, [event, validGoal, goalCs, course, zoneSystemId, offsetModel, i18n.language])

  const handleGoalBlur = () => {
    if (!isValidTimeParts(goalTime) && !isTimePartsEmpty(goalTime)) {
      setGoalShowErrors(true)
    }
  }

  const eventLabel = event ? getEventLabel(event.id) : ''
  const zoneSystemLabel = getZoneSystemLabel(zoneSystemId)

  return (
    <div className="plan-training">
      <CourseSelector
        value={course}
        onChange={setCourse}
        heading={t('course.headingPlan')}
        name="plan-course"
      />

      <EventSelect value={eventId} onChange={setEventId} />

      <section className="goal-time-section">
        <h2>{t('plan.goalTime')}</h2>
        <div onBlur={handleGoalBlur}>
          <TimeFields
            idPrefix="goal"
            value={goalTime}
            onChange={(part, value) => {
              setGoalTime((prev) => ({ ...prev, [part]: value }))
              setGoalShowErrors(false)
            }}
            onNormalize={setGoalTime}
            showErrors={goalShowErrors}
          />
        </div>
      </section>

      {validGoal && (
        <section className="zone-system-section">
          <h2>{t('plan.zoneNaming')}</h2>
          <p className="hint plan-time-hint plan-time-hint--above">
            {t('plan.zoneNamingHint')}
          </p>
          <select
            className="zone-system-select"
            value={zoneSystemId}
            onChange={(e) => setZoneSystemId(e.target.value as ZoneSystemId)}
            aria-label={t('plan.zoneSystemAria')}
          >
            {ZONE_SYSTEMS.map((system) => (
              <option key={system.id} value={system.id}>
                {getZoneSystemLabel(system.id)}
              </option>
            ))}
          </select>
        </section>
      )}

      {validGoal && (
        <section className="pace-model-section">
          <h2>{t('plan.paceModel')}</h2>
          <fieldset className="pace-model-fieldset">
            <legend className="visually-hidden">{t('plan.paceModelLegend')}</legend>
            {OFFSET_MODEL_IDS.map((modelId) => (
              <label key={modelId} className="pace-model-option">
                <input
                  type="radio"
                  name="pace-model"
                  value={modelId}
                  checked={offsetModel === modelId}
                  onChange={() => setOffsetModel(modelId)}
                />
                <span className="pace-model-option-label">
                  <strong>{getOffsetModelLabel(modelId)}</strong>
                  <span className="pace-model-option-desc">
                    {getOffsetModelDescription(modelId)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </section>
      )}

      {zonePlan && event && goalCs !== null && (
        <div className="plan-results plan-print-area" aria-live="polite">
          <section className="plan-summary no-print-duplicate">
            <p>
              <Trans
                i18nKey="plan.summaryGoal"
                values={{
                  event: eventLabel,
                  course,
                  time: formatTime(goalCs),
                }}
                components={{ strong: <strong /> }}
              />
            </p>
            {shouldShowRaceAverageReference(event) && (
              <p className="plan-summary-reference">
                <Trans
                  i18nKey="plan.summaryReference"
                  values={{
                    pace100: formatTime(zonePlan.goalPacePer100Cs),
                    pace50: formatTime(zonePlan.goalPacePer50Cs),
                    unit: lengthUnit,
                  }}
                  components={{ strong: <strong /> }}
                />
              </p>
            )}
          </section>

          <TrainingZonesTable
            plan={zonePlan}
            lengthUnit={lengthUnit}
            context={{
              eventLabel,
              course,
              zoneSystemLabel,
              goalCentiseconds: goalCs,
            }}
            onExport={() =>
              (() => {
                setExportError(null)
                try {
                  exportTrainingZonesToExcel({
                    eventLabel,
                    course,
                    zoneSystemLabel,
                    goalCentiseconds: goalCs,
                    lengthUnit,
                    plan: zonePlan,
                    showRaceAverageReference: shouldShowRaceAverageReference(event),
                  })
                } catch (error) {
                  setExportError(
                    error instanceof Error ? error.message : t('plan.exportError'),
                  )
                }
              })()
            }
            onPrint={() => window.print()}
          />
          {exportError && (
            <p className="field-error" role="status" aria-live="polite">
              {exportError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
