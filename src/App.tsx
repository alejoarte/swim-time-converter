import { Suspense, lazy, useRef, useState } from 'react'
import { CourseSelector } from './components/CourseSelector'
import { EventPicker } from './components/EventPicker'
import { ResultsTable } from './components/ResultsTable'
import { canGenerate, TimeEntryList } from './components/TimeEntryList'
import { compareEventIds, getEventById } from './data/events'
import { convertEntry, type ConversionResult, type Course } from './lib/convert'
import { exportToExcel } from './lib/exportExcel'
import {
  EMPTY_TIME_PARTS,
  partsToCentiseconds,
  type TimePart,
  type TimeParts,
} from './lib/timeParse'

type AppMode = 'manual' | 'import'

const PdfImport = lazy(() =>
  import('./components/PdfImport').then((m) => ({ default: m.PdfImport })),
)

function App() {
  const entryRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<AppMode>('manual')
  const [sourceCourse, setSourceCourse] = useState<Course>('SCY')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [times, setTimes] = useState<Record<string, TimeParts>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [results, setResults] = useState<ConversionResult[] | null>(null)
  const [locked, setLocked] = useState(false)

  const selectedList = [...selectedIds]
  const ready = canGenerate(selectedList, times)

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
  }

  const handleCourseChange = (course: Course) => {
    setSourceCourse(course)
    if (results) {
      setResults(null)
      setLocked(false)
    }
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
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleEditTimes = () => {
    setResults(null)
    setLocked(false)
    setShowErrors(false)
    entryRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleExport = () => {
    if (results) {
      exportToExcel(results, sourceCourse)
    }
  }

  return (
    <div className={`app${mode === 'import' ? ' app--wide' : ''}`}>
      <header className="app-header">
        <h1>Swim Time Converter</h1>
        <p className="subtitle">
          Convert times between SCY, SCM, and LCM using Classical (Colorado Timing) factors.
        </p>
      </header>

      <nav className="mode-switch" aria-label="Entry mode">
        <button
          type="button"
          className={mode === 'manual' ? 'mode-switch-btn mode-switch-btn--active' : 'mode-switch-btn'}
          onClick={() => setMode('manual')}
        >
          Manual entry
        </button>
        <button
          type="button"
          className={mode === 'import' ? 'mode-switch-btn mode-switch-btn--active' : 'mode-switch-btn'}
          onClick={() => setMode('import')}
        >
          Import PDF
        </button>
      </nav>

      {mode === 'import' ? (
        <div className="app-main">
          <Suspense fallback={<p className="hint">Loading PDF import…</p>}>
            <PdfImport />
          </Suspense>
        </div>
      ) : (
      <div ref={entryRef} className="app-main">
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
        </div>
      </div>
      )}

      <footer className="app-footer">
        <p>
          Conversions use Classical (Colorado Timing) factors. Converted times are
          estimates and not official.
        </p>
      </footer>
    </div>
  )
}

export default App
