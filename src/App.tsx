import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CourseSelector } from './components/CourseSelector'
import { EventPicker } from './components/EventPicker'
import { IconSwimmer } from './components/icons'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { ResultsTable } from './components/ResultsTable'
import { canGenerate, TimeEntryList } from './components/TimeEntryList'
import { compareEventIds, getEventById } from './data/events'
import { convertEntry, type ConversionResult, type Course } from './lib/convert'
import { exportToExcel } from './lib/exportExcel'
import {
  hasPlanShareQuery,
  parsePlanShareFromLocation,
  type PlanShareState,
} from './lib/shareUrl'
import {
  EMPTY_TIME_PARTS,
  partsToCentiseconds,
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
  shareParseFailed: boolean
}

function getInitialShareBootstrap(): InitialShareBootstrap {
  if (typeof window === 'undefined') {
    return { mode: 'manual', planShareInitial: null, shareParseFailed: false }
  }

  const params = new URLSearchParams(window.location.search)
  const planShareInitial = parsePlanShareFromLocation()

  if (planShareInitial) {
    return { mode: 'plan', planShareInitial, shareParseFailed: false }
  }

  if (hasPlanShareQuery(params)) {
    return { mode: 'plan', planShareInitial: null, shareParseFailed: true }
  }

  return { mode: 'manual', planShareInitial: null, shareParseFailed: false }
}

function loadSavedManualState(): SavedManualState | null {
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

    const validTimesEntries = Object.entries(draft.times).filter(
      ([eventId, parts]) => typeof eventId === 'string' && isTimeParts(parts),
    ) as [string, TimeParts][]

    return {
      sourceCourse: draft.sourceCourse,
      selectedIds: draft.selectedIds.filter((id): id is string => typeof id === 'string'),
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
  const { t } = useTranslation()
  const [shareBootstrap] = useState(getInitialShareBootstrap)
  const [savedManualState] = useState<SavedManualState | null>(() =>
    loadSavedManualState(),
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
  const [showErrors, setShowErrors] = useState(false)
  const [results, setResults] = useState<ConversionResult[] | null>(null)
  const [locked, setLocked] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

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

  const selectedList = [...selectedIds]
  const ready = canGenerate(selectedList, times)
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
    if (results) {
      setResults(null)
      setLocked(false)
    }
    setExportError(null)
  }

  const handleTimeNormalize = (eventId: string, parts: TimeParts) => {
    setTimes((prev) => ({ ...prev, [eventId]: parts }))
  }

  const handleSelectedChange = (next: Set<string>) => {
    setSelectedIds(next)
    if (results) {
      setResults(null)
      setLocked(false)
    }
    setExportError(null)
  }

  const handleCourseChange = (course: Course) => {
    setSourceCourse(course)
    if (results) {
      setResults(null)
      setLocked(false)
    }
    setExportError(null)
  }

  const handleGenerate = () => {
    setShowErrors(true)
    if (!ready) return

    const converted: ConversionResult[] = selectedList
      .map((id) => {
        const event = getEventById(id)
        const cs = partsToCentiseconds(times[id] ?? EMPTY_TIME_PARTS)
        if (!event || cs === null) return null
        return convertEntry(event, sourceCourse, cs)
      })
      .filter((r): r is ConversionResult => r !== null)
      .sort((a, b) => compareEventIds(a.eventId, b.eventId))

    setResults(converted)
    setLocked(true)
    setExportError(null)
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleEditTimes = () => {
    setResults(null)
    setLocked(false)
    setShowErrors(false)
    setExportError(null)
    entryRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleExport = () => {
    if (!results) return

    setExportError(null)
    try {
      exportToExcel(results, sourceCourse)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t('exportError'))
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
            <div className="card card-grid-2 manual-input-card">
              <CourseSelector
                value={sourceCourse}
                onChange={handleCourseChange}
                disabled={locked}
              />

              <EventPicker
                selectedIds={selectedIds}
                onChange={handleSelectedChange}
                disabled={locked}
              />
            </div>

            <TimeEntryList
              sourceCourse={sourceCourse}
              selectedIds={selectedList}
              times={times}
              onTimeChange={handleTimeChange}
              onTimeNormalize={handleTimeNormalize}
              showErrors={showErrors}
              disabled={locked}
            />

            <div className="generate-section">
              <button
                type="button"
                className="generate-btn"
                onClick={handleGenerate}
                disabled={locked || !ready}
              >
                {t('generate.button')}
              </button>
              {!ready && selectedList.length > 0 && !locked && (
                <p className="hint">{t('generate.hint')}</p>
              )}
            </div>

            <div id="results">
              {results && (
                <ResultsTable
                  results={results}
                  onEditTimes={handleEditTimes}
                  onExport={handleExport}
                />
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
