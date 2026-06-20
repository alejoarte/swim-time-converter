import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CourseSelector } from './components/CourseSelector'
import { EventPicker } from './components/EventPicker'
import { IconSwimmer } from './components/icons'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { ResultsTable } from './components/ResultsTable'
import { TimeEntryList } from './components/TimeEntryList'
import { compareEventIds, getEventById } from './data/events'
import { buildConversionResults, hasAnyTimeEntry } from './lib/conversionResults'
import { type Course } from './lib/convert'
import {
  buildManualShareUrl,
  hasManualShareQuery,
  hasPlanShareQuery,
  parseManualShareFromLocation,
  parsePlanShareFromLocation,
  type ManualShareState,
  type PlanShareState,
} from './lib/shareUrl'
import {
  centisecondsToTimeParts,
  EMPTY_TIME_PARTS,
  isTimePartsEmpty,
  isValidTimeParts,
  type TimePart,
  type TimeParts,
} from './lib/timeParse'

type AppMode = 'manual' | 'plan'

const MANUAL_STATE_STORAGE_KEY = 'swim-time-converter:manual-state:v1'

type SavedManualState = {
  sourceCourse: Course
  selectedIds: string[]
  times: Record<string, TimeParts>
}

function isCourse(value: unknown): value is Course {
  return value === 'SCY' || value === 'SCM' || value === 'LCM'
}

function isTimeParts(value: unknown): value is TimeParts {
  if (!value || typeof value !== 'object') return false
  const parts = value as Partial<TimeParts>
  return (
    typeof parts.minutes === 'string' &&
    typeof parts.seconds === 'string' &&
    typeof parts.hundredths === 'string'
  )
}

type InitialShareBootstrap = {
  mode: AppMode
  planShareInitial: PlanShareState | null
  manualShareInitial: ManualShareState | null
  shareParseFailed: boolean
}

function manualShareToSavedState(share: ManualShareState): SavedManualState {
  const times: Record<string, TimeParts> = {}
  for (const entry of share.entries) {
    times[entry.eventId] = centisecondsToTimeParts(entry.centiseconds)
  }

  return {
    sourceCourse: share.sourceCourse,
    selectedIds: share.entries.map((entry) => entry.eventId).sort(compareEventIds),
    times,
  }
}

function getInitialShareBootstrap(): InitialShareBootstrap {
  if (typeof window === 'undefined') {
    return {
      mode: 'manual',
      planShareInitial: null,
      manualShareInitial: null,
      shareParseFailed: false,
    }
  }

  const params = new URLSearchParams(window.location.search)
  const planShareInitial = parsePlanShareFromLocation()

  if (planShareInitial) {
    return {
      mode: 'plan',
      planShareInitial,
      manualShareInitial: null,
      shareParseFailed: false,
    }
  }

  if (hasPlanShareQuery(params)) {
    return {
      mode: 'plan',
      planShareInitial: null,
      manualShareInitial: null,
      shareParseFailed: true,
    }
  }

  const manualShareInitial = parseManualShareFromLocation()
  if (manualShareInitial) {
    return {
      mode: 'manual',
      planShareInitial: null,
      manualShareInitial,
      shareParseFailed: false,
    }
  }

  if (hasManualShareQuery(params)) {
    return {
      mode: 'manual',
      planShareInitial: null,
      manualShareInitial: null,
      shareParseFailed: true,
    }
  }

  return {
    mode: 'manual',
    planShareInitial: null,
    manualShareInitial: null,
    shareParseFailed: false,
  }
}

function loadSavedManualState(manualShare: ManualShareState | null): SavedManualState | null {
  if (manualShare) return manualShareToSavedState(manualShare)

  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(MANUAL_STATE_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const draft = parsed as Partial<SavedManualState>
    if (!isCourse(draft.sourceCourse)) return null
    if (!Array.isArray(draft.selectedIds)) return null
    if (!draft.times || typeof draft.times !== 'object') return null

    const validEventIds = new Set(
      draft.selectedIds.filter((id) => typeof id === 'string' && getEventById(id)),
    )

    const validTimesEntries = Object.entries(draft.times).filter(
      ([eventId, parts]) => validEventIds.has(eventId) && isTimeParts(parts),
    ) as [string, TimeParts][]

    return {
      sourceCourse: draft.sourceCourse,
      selectedIds: [...validEventIds].sort(compareEventIds),
      times: Object.fromEntries(validTimesEntries),
    }
  } catch {
    return null
  }
}

const PlanTraining = lazy(() =>
  import('./components/PlanTraining').then((m) => ({ default: m.PlanTraining })),
)

function App() {
  const { t, i18n } = useTranslation()
  const [shareBootstrap] = useState(getInitialShareBootstrap)
  const [savedManualState] = useState<SavedManualState | null>(() =>
    loadSavedManualState(shareBootstrap.manualShareInitial),
  )
  const entryRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<AppMode>(shareBootstrap.mode)
  const [sourceCourse, setSourceCourse] = useState<Course>(
    savedManualState?.sourceCourse ?? 'SCY',
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(savedManualState?.selectedIds ?? []),
  )
  const [times, setTimes] = useState<Record<string, TimeParts>>(
    savedManualState?.times ?? {},
  )
  const [exportError, setExportError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [copyFallbackUrl, setCopyFallbackUrl] = useState<string | null>(null)
  const copyStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shareLanguageAppliedRef = useRef(false)

  useEffect(() => {
    const language =
      shareBootstrap.manualShareInitial?.language ?? shareBootstrap.planShareInitial?.language
    if (!language || shareLanguageAppliedRef.current) return
    shareLanguageAppliedRef.current = true
    void i18n.changeLanguage(language)
  }, [shareBootstrap.manualShareInitial?.language, shareBootstrap.planShareInitial?.language, i18n])

  useEffect(() => {
    return () => {
      if (copyStatusTimerRef.current) clearTimeout(copyStatusTimerRef.current)
    }
  }, [])

  useEffect(() => {
    try {
      const payload: SavedManualState = {
        sourceCourse,
        selectedIds: [...selectedIds],
        times,
      }
      window.localStorage.setItem(MANUAL_STATE_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore local storage write errors (private mode/quota).
    }
  }, [sourceCourse, selectedIds, times])

  const selectedList = useMemo(() => [...selectedIds], [selectedIds])
  const results = useMemo(
    () => buildConversionResults(selectedList, times, sourceCourse),
    [selectedList, times, sourceCourse],
  )

  const showTimeErrors =
    selectedList.length > 0 &&
    selectedList.some((id) => {
      const parts = times[id] ?? EMPTY_TIME_PARTS
      return !isTimePartsEmpty(parts) && !isValidTimeParts(parts)
    })

  const hasEnteredTimes = hasAnyTimeEntry(selectedList, times)

  const announcement = results
    ? t('announcements.results', { count: results.length })
    : mode === 'plan'
      ? t('announcements.planMode')
      : t('announcements.manualMode')

  const handleTimeChange = (eventId: string, part: TimePart, value: string) => {
    setTimes((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] ?? EMPTY_TIME_PARTS),
        [part]: value,
      },
    }))
    setExportError(null)
    setCopyStatus('idle')
  }

  const handleTimePaste = (eventId: string, parts: TimeParts) => {
    setTimes((prev) => ({ ...prev, [eventId]: parts }))
    setExportError(null)
    setCopyStatus('idle')
  }

  const handleTimeNormalize = (eventId: string, parts: TimeParts) => {
    setTimes((prev) => ({ ...prev, [eventId]: parts }))
  }

  const handleSelectedChange = (next: Set<string>) => {
    const removedWithTimes = selectedList.some((id) => {
      if (next.has(id)) return false
      const parts = times[id] ?? EMPTY_TIME_PARTS
      return !isTimePartsEmpty(parts)
    })

    if (removedWithTimes && !window.confirm(t('confirm.selectionChange'))) {
      return
    }

    setSelectedIds(next)
    setExportError(null)
    setCopyStatus('idle')
  }

  const handleCourseChange = (course: Course) => {
    if (course === sourceCourse) return

    if (hasEnteredTimes && !window.confirm(t('confirm.courseChange'))) {
      return
    }

    setSourceCourse(course)
    setExportError(null)
    setCopyStatus('idle')
  }

  const handleExport = async () => {
    if (!results) return

    setExportError(null)
    try {
      const { exportToExcel } = await import('./lib/exportExcel')
      await exportToExcel(results, sourceCourse)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t('exportError'))
    }
  }

  const handleCopyLink = async () => {
    if (!results) return

    const url = buildManualShareUrl({
      sourceCourse,
      entries: results.map((row) => ({
        eventId: row.eventId,
        centiseconds: row.sourceCentiseconds,
      })),
      language: i18n.language === 'es' ? 'es' : 'en',
    })

    setCopyFallbackUrl(null)
    setCopyStatus('idle')

    try {
      await navigator.clipboard.writeText(url)
      setCopyStatus('copied')
      if (copyStatusTimerRef.current) clearTimeout(copyStatusTimerRef.current)
      copyStatusTimerRef.current = setTimeout(() => setCopyStatus('idle'), 2500)
    } catch {
      setCopyStatus('failed')
      setCopyFallbackUrl(url)
    }
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('skipToMain')}
      </a>
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <header className="app-nav">
        <div className="app-nav__inner">
          <div className="app-nav__brand">
            <IconSwimmer className="app-nav__logo" size={28} />
            <span className="app-nav__title">{t('app.title')}</span>
          </div>

          <nav className="app-nav__links" aria-label={t('mode.label')}>
            <button
              type="button"
              className={
                mode === 'manual'
                  ? 'app-nav__link app-nav__link--active'
                  : 'app-nav__link'
              }
              onClick={() => setMode('manual')}
              aria-current={mode === 'manual' ? 'page' : undefined}
            >
              {t('mode.convertTimes')}
            </button>
            <button
              type="button"
              className={
                mode === 'plan' ? 'app-nav__link app-nav__link--active' : 'app-nav__link'
              }
              onClick={() => setMode('plan')}
              aria-current={mode === 'plan' ? 'page' : undefined}
            >
              {t('mode.plan')}
            </button>
          </nav>

          <LanguageSwitcher />
        </div>
      </header>

      <div className={`app${mode === 'plan' ? ' app--plan' : ''}`}>
      <main id="main-content" ref={entryRef} className="app-main">
        {mode === 'plan' ? (
          <Suspense
            fallback={
              <p className="hint" role="status">
                {t('loadingPlan')}
              </p>
            }
          >
            <PlanTraining
              initialFromShare={shareBootstrap.planShareInitial}
              shareParseFailed={shareBootstrap.shareParseFailed}
            />
          </Suspense>
        ) : (
          <>
            {shareBootstrap.manualShareInitial && (
              <p className="share-banner share-banner--success" role="status">
                {t('share.conversionLoadedBanner')}
              </p>
            )}
            {shareBootstrap.shareParseFailed && mode === 'manual' && (
              <p className="share-banner share-banner--warning" role="status">
                {t('share.conversionInvalidBanner')}
              </p>
            )}

            <div className="card card-grid-2 manual-input-card">
              <CourseSelector value={sourceCourse} onChange={handleCourseChange} />

              <EventPicker selectedIds={selectedIds} onChange={handleSelectedChange} />
            </div>

            <TimeEntryList
              sourceCourse={sourceCourse}
              selectedIds={selectedList}
              times={times}
              onTimeChange={handleTimeChange}
              onTimePaste={handleTimePaste}
              onTimeNormalize={handleTimeNormalize}
              showErrors={showTimeErrors}
            />

            {selectedList.length > 0 && !results && (
              <p className="hint generate-section">{t('generate.hint')}</p>
            )}

            <div id="results">
              {results && (
                <>
                  <p className="live-preview-banner" role="status">
                    {t('results.livePreview')}
                  </p>
                  <ResultsTable
                    results={results}
                    onExport={handleExport}
                    onCopyLink={handleCopyLink}
                    copyStatus={copyStatus}
                  />
                </>
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
                    aria-label={t('share.copyConversionLinkAria')}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>
              )}
              {exportError && (
                <p className="field-error" role="status" aria-live="polite">
                  {exportError}
                </p>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="app-disclaimer">
        <p>{t('disclaimer')}</p>
      </footer>
      </div>
    </>
  )
}

export default App
