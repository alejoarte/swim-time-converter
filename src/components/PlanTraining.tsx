import { useEffect, useMemo, useRef, useState } from 'react'
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
import { buildPlanShareUrl, type PlanShareState } from '../lib/shareUrl'
import {
  computeTrainingZoneRows,
  shouldShowRaceAverageReference,
} from '../lib/trainingZones'
import {
  centisecondsToTimeParts,
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

type PlanTrainingProps = {
  initialFromShare?: PlanShareState | null
  shareParseFailed?: boolean
}

function initialGoalTime(share: PlanShareState | null | undefined): TimeParts {
  if (!share) return EMPTY_TIME_PARTS
  return centisecondsToTimeParts(share.goalCentiseconds)
}

export function PlanTraining({
  initialFromShare = null,
  shareParseFailed = false,
}: PlanTrainingProps) {
  const { t, i18n } = useTranslation()
  const [course, setCourse] = useState<Course>(initialFromShare?.course ?? 'SCY')
  const [eventId, setEventId] = useState(initialFromShare?.eventId ?? '200-free')
  const [zoneSystemId, setZoneSystemId] = useState<ZoneSystemId>(
    initialFromShare?.zoneSystemId ?? 'a-system',
  )
  const [offsetModel, setOffsetModel] = useState<OffsetModel>(
    initialFromShare?.offsetModel ?? 'fixed',
  )
  const [goalTime, setGoalTime] = useState<TimeParts>(() =>
    initialGoalTime(initialFromShare),
  )
  const [goalShowErrors, setGoalShowErrors] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [copyFallbackUrl, setCopyFallbackUrl] = useState<string | null>(null)
  const copyStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shareLanguageAppliedRef = useRef(false)

  const showShareLoadedBanner = initialFromShare !== null
  const showShareInvalidBanner = shareParseFailed

  useEffect(() => {
    if (!initialFromShare?.language || shareLanguageAppliedRef.current) return
    shareLanguageAppliedRef.current = true
    void i18n.changeLanguage(initialFromShare.language)
  }, [initialFromShare?.language, i18n])

  useEffect(() => {
    return () => {
      if (copyStatusTimerRef.current) clearTimeout(copyStatusTimerRef.current)
    }
  }, [])

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

  const handleCopyLink = async () => {
    if (!validGoal || goalCs === null) return

    const url = buildPlanShareUrl({
      course,
      eventId,
      goalCentiseconds: goalCs,
      zoneSystemId,
      offsetModel,
      language: i18n.language === 'es' ? 'es' : 'en',
    })

    setCopyFallbackUrl(null)
    setCopyStatus('idle')

    try {
      await navigator.clipboard.writeText(url)
      setCopyStatus('copied')
      if (copyStatusTimerRef.current) clearTimeout(copyStatusTimerRef.current)
      copyStatusTimerRef.current = setTimeout(() => setCopyStatus('idle'), 3000)
    } catch {
      setCopyStatus('failed')
      setCopyFallbackUrl(url)
    }
  }

  const eventLabel = event ? getEventLabel(event.id) : ''
  const zoneSystemLabel = getZoneSystemLabel(zoneSystemId)

  return (
    <div className="plan-training">
      {showShareLoadedBanner && (
        <p className="share-banner share-banner--success" role="status">
          {t('share.loadedBanner')}
        </p>
      )}
      {showShareInvalidBanner && (
        <p className="share-banner share-banner--warning" role="status">
          {t('share.invalidBanner')}
        </p>
      )}

      <CourseSelector
        value={course}
        onChange={setCourse}
        heading={t('course.headingPlan')}
        name="plan-course"
        showSourceHint={false}
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

          <p className="hint share-hint no-print">{t('share.hint')}</p>

          {copyStatus === 'copied' && (
            <p className="share-copy-status" role="status" aria-live="polite">
              {t('share.copied')}
            </p>
          )}

          {copyStatus === 'failed' && copyFallbackUrl && (
            <div className="share-copy-fallback">
              <p className="field-error" role="status">
                {t('share.copyFailed')}
              </p>
              <input
                className="share-copy-fallback-input"
                type="text"
                readOnly
                value={copyFallbackUrl}
                aria-label={t('share.copyLinkAria')}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          )}

          <TrainingZonesTable
            plan={zonePlan}
            lengthUnit={lengthUnit}
            context={{
              eventLabel,
              course,
              zoneSystemLabel,
              goalCentiseconds: goalCs,
            }}
            onCopyLink={handleCopyLink}
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
