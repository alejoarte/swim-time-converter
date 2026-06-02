import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { CourseSelector } from './components/CourseSelector'
import { EventPicker } from './components/EventPicker'
import { ResultsTable } from './components/ResultsTable'
import { canGenerate, TimeEntryList } from './components/TimeEntryList'
import { compareEventIds, getEventById } from './data/events'
import { convertEntry, type ConversionResult, type Course } from './lib/convert'
import { exportToExcel } from './lib/exportExcel'
import type { ManualPrefill } from './lib/manualPrefill'
import {
  EMPTY_TIME_PARTS,
  partsToCentiseconds,
  rawTimeToTimeParts,
  type TimePart,
  type TimeParts,
} from './lib/timeParse'

type AppMode = 'manual' | 'import' | 'plan'

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

const PdfImport = lazy(() =>
  import('./components/PdfImport').then((m) => ({ default: m.PdfImport })),
)

const PlanTraining = lazy(() =>
  import('./components/PlanTraining').then((m) => ({ default: m.PlanTraining })),
)

function App() {
  const [savedManualState] = useState<SavedManualState | null>(() =>
    loadSavedManualState(),
  )
  const entryRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<AppMode>('manual')
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
  const [pendingManualPrefill, setPendingManualPrefill] = useState<ManualPrefill | null>(
    null,
  )

  useEffect(() => {
    if (!pendingManualPrefill || mode !== 'manual') return

    const { sourceCourse: course, entries } = pendingManualPrefill
    const nextTimes: Record<string, TimeParts> = {}
    const nextIds = new Set<string>()

    for (const entry of entries) {
      const parts = rawTimeToTimeParts(entry.rawTime)
      if (!parts) continue
      nextIds.add(entry.eventId)
      nextTimes[entry.eventId] = parts
    }

    setSourceCourse(course)
    setSelectedIds(nextIds)
    setTimes(nextTimes)
    setResults(null)
    setLocked(false)
    setShowErrors(false)
    setExportError(null)
    setPendingManualPrefill(null)

    setTimeout(() => {
      entryRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [pendingManualPrefill, mode])

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

  const handleSendToManualConverter = (prefill: ManualPrefill) => {
    setPendingManualPrefill(prefill)
    setMode('manual')
  }

  const selectedList = [...selectedIds]
  const ready = canGenerate(selectedList, times)
  const announcement = results
    ? `Generated ${results.length} conversion result rows.`
    : mode === 'import'
      ? 'Import PDF mode.'
      : mode === 'plan'
        ? 'Plan training mode.'
        : 'Manual entry mode.'

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
      setExportError(error instanceof Error ? error.message : 'Failed to export results.')
    }
  }

  return (
    <div className={`app${mode === 'import' ? ' app--wide' : ''}`}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <header className="app-chrome">
        <div className="app-branding">
          <h1>Swim Time Converter</h1>
          <p className="app-tagline">
            Convert times between SCY, SCM, and LCM, import meet results from PDF, and
            plan training zones.
          </p>
        </div>

        <nav className="mode-switch" aria-label="Entry mode">
          <button
            type="button"
            className={
              mode === 'manual'
                ? 'mode-switch-btn mode-switch-btn--active'
                : 'mode-switch-btn'
            }
            onClick={() => setMode('manual')}
            aria-current={mode === 'manual' ? 'page' : undefined}
          >
            Manual entry
          </button>
          <button
            type="button"
            className={
              mode === 'import'
                ? 'mode-switch-btn mode-switch-btn--active'
                : 'mode-switch-btn'
            }
            onClick={() => setMode('import')}
            aria-current={mode === 'import' ? 'page' : undefined}
          >
            Import PDF
          </button>
          <button
            type="button"
            className={
              mode === 'plan'
                ? 'mode-switch-btn mode-switch-btn--active'
                : 'mode-switch-btn'
            }
            onClick={() => setMode('plan')}
            aria-current={mode === 'plan' ? 'page' : undefined}
          >
            Plan training
          </button>
        </nav>
      </header>

      <main id="main-content" ref={entryRef} className="app-main">
        {mode === 'import' ? (
          <Suspense
            fallback={
              <p className="hint" role="status">
                Loading PDF import…
              </p>
            }
          >
            <PdfImport onSendToManualConverter={handleSendToManualConverter} />
          </Suspense>
        ) : mode === 'plan' ? (
          <Suspense
            fallback={
              <p className="hint" role="status">
                Loading plan training…
              </p>
            }
          >
            <PlanTraining />
          </Suspense>
        ) : (
          <>
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
                Generate conversions
              </button>
              {!ready && selectedList.length > 0 && !locked && (
                <p className="hint">Enter a valid time for each selected event.</p>
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
        <p>
          Converted times use Classical (Colorado Timing) factors. Imported meet data and
          training zone paces are parsed or estimated from your inputs. Nothing here is
          official or a substitute for your coach&apos;s guidance.
        </p>
      </footer>
    </div>
  )
}

export default App
