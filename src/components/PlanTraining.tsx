import { useState } from 'react'
import { getEventById } from '../data/events'
import {
  getZoneSystem,
  OFFSET_MODELS,
  type OffsetModel,
  type ZoneSystemId,
  ZONE_SYSTEMS,
} from '../data/trainingZoneSystems'
import { type Course } from '../lib/convert'
import { exportTrainingZonesToExcel } from '../lib/exportExcel'
import { getLengthUnitLabel } from '../lib/pacing'
import { computeTrainingZoneRows, shouldShowRaceAverageReference } from '../lib/trainingZones'
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
  const [course, setCourse] = useState<Course>('SCY')
  const [eventId, setEventId] = useState('200-free')
  const [zoneSystemId, setZoneSystemId] = useState<ZoneSystemId>('a-system')
  const [offsetModel, setOffsetModel] = useState<OffsetModel>('fixed')
  const [goalTime, setGoalTime] = useState<TimeParts>(EMPTY_TIME_PARTS)
  const [goalShowErrors, setGoalShowErrors] = useState(false)

  const event = getEventById(eventId)
  const goalCs = partsToCentiseconds(goalTime)
  const validGoal = goalCs !== null && isValidTimeParts(goalTime)
  const lengthUnit = getLengthUnitLabel(course)

  const zonePlan =
    event && validGoal && goalCs !== null
      ? computeTrainingZoneRows(goalCs, event, course, zoneSystemId, offsetModel)
      : null

  const handleGoalBlur = () => {
    if (!isValidTimeParts(goalTime) && !isTimePartsEmpty(goalTime)) {
      setGoalShowErrors(true)
    }
  }

  return (
    <div className="plan-training">
      <CourseSelector
        value={course}
        onChange={setCourse}
        heading="Pool course"
        name="plan-course"
      />

      <EventSelect value={eventId} onChange={setEventId} />

      <section className="goal-time-section">
        <h2>Goal time</h2>
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
          <h2>Zone naming</h2>
          <p className="hint plan-time-hint plan-time-hint--above">
            Match the system your coach or club uses.
          </p>
          <select
            className="zone-system-select"
            value={zoneSystemId}
            onChange={(e) => setZoneSystemId(e.target.value as ZoneSystemId)}
            aria-label="Training zone naming system"
          >
            {ZONE_SYSTEMS.map((system) => (
              <option key={system.id} value={system.id}>
                {system.label}
              </option>
            ))}
          </select>
        </section>
      )}

      {validGoal && (
        <section className="pace-model-section">
          <h2>Pace model</h2>
          <fieldset className="pace-model-fieldset">
            <legend className="visually-hidden">Pace offset model</legend>
            {OFFSET_MODELS.map((model) => (
              <label key={model.id} className="pace-model-option">
                <input
                  type="radio"
                  name="pace-model"
                  value={model.id}
                  checked={offsetModel === model.id}
                  onChange={() => setOffsetModel(model.id)}
                />
                <span className="pace-model-option-label">
                  <strong>{model.label}</strong>
                  <span className="pace-model-option-desc">{model.description}</span>
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
              <strong>{event.label}</strong> ({course}) · Goal{' '}
              <strong>{formatTime(goalCs)}</strong>
            </p>
            {shouldShowRaceAverageReference(event) && (
              <p className="plan-summary-reference">
                Goal race average (reference):{' '}
                <strong>{formatTime(zonePlan.goalPacePer100Cs)}</strong> / 100 ·{' '}
                <strong>{formatTime(zonePlan.goalPacePer50Cs)}</strong> / 50 ({lengthUnit}s)
              </p>
            )}
          </section>

          <TrainingZonesTable
            plan={zonePlan}
            lengthUnit={lengthUnit}
            context={{
              eventLabel: event.label,
              course,
              zoneSystemLabel: getZoneSystem(zoneSystemId).label,
              goalCentiseconds: goalCs,
            }}
            onExport={() =>
              exportTrainingZonesToExcel({
                eventLabel: event.label,
                course,
                zoneSystemLabel: getZoneSystem(zoneSystemId).label,
                goalCentiseconds: goalCs,
                lengthUnit,
                plan: zonePlan,
                showRaceAverageReference: shouldShowRaceAverageReference(event),
              })
            }
            onPrint={() => window.print()}
          />
        </div>
      )}
    </div>
  )
}
