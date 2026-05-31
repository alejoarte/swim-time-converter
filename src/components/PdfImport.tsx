import { useCallback, useState } from 'react'
import { CourseSelector } from './CourseSelector'
import { BulkResultsTable } from './BulkResultsTable'
import { ImportPreviewTable } from './ImportPreviewTable'
import { convertBulkRows, type BulkConversionResult, type Course } from '../lib/convert'
import { exportMeetToExcel } from '../lib/exportExcel'
import { extractPdfText, parsePdfText } from '../lib/parsePdf'
import type { ParsedRow } from '../lib/parsePdf/types'

type ImportStep = 'upload' | 'preview' | 'results'

export function PdfImport() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [meetTitle, setMeetTitle] = useState<string | undefined>()
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [sourceCourse, setSourceCourse] = useState<Course>('LCM')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [results, setResults] = useState<BulkConversionResult[] | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const reset = useCallback(() => {
    setStep('upload')
    setLoading(false)
    setError(null)
    setFileName(null)
    setMeetTitle(undefined)
    setParseWarnings([])
    setSourceCourse('LCM')
    setRows([])
    setResults(null)
  }, [])

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }

    setLoading(true)
    setError(null)
    setFileName(file.name)
    setResults(null)

    try {
      const text = await extractPdfText(file)
      const parsed = parsePdfText(text)

      if (parsed.rows.length === 0) {
        setError(parsed.warnings[0] ?? 'No swimmer rows found in this PDF.')
        setStep('upload')
        return
      }

      setRows(parsed.rows)
      setMeetTitle(parsed.meetInfo.title)
      setParseWarnings(parsed.warnings)
      if (parsed.meetInfo.detectedCourse) {
        setSourceCourse(parsed.meetInfo.detectedCourse)
      }
      setStep('preview')
    } catch {
      setError('Failed to read PDF. The file may be corrupted or password-protected.')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void processFile(file)
  }

  const handleConvert = () => {
    const toConvert = rows.filter(
      (row) =>
        row.included &&
        row.status !== 'error' &&
        row.eventId &&
        row.timeCentiseconds !== null,
    )

    if (toConvert.length === 0) return

    const converted = convertBulkRows(
      toConvert.map((row) => ({
        eventId: row.eventId!,
        sourceCourse,
        sourceCentiseconds: row.timeCentiseconds!,
        swimmerName: row.swimmerName,
        age: row.age,
        team: row.team,
        lane: row.lane,
        rawTime: row.rawTime,
      })),
    )

    setResults(converted)
    setStep('results')
    setTimeout(() => {
      document.getElementById('import-results')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleExport = () => {
    if (results) {
      exportMeetToExcel(results, sourceCourse, meetTitle)
    }
  }

  return (
    <div className="pdf-import">
      {step === 'upload' && (
        <section className="pdf-upload">
          <h2>Import meet PDF</h2>
          <p className="hint">
            Upload a Hy-Tek Meet Manager text PDF (English or Spanish layout). Scanned PDFs
            and other formats are not supported yet.
          </p>

          <div
            className={`drop-zone${dragOver ? ' drop-zone--active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <p>{loading ? 'Reading PDF…' : 'Drop a PDF here or choose a file'}</p>
            <label className="file-picker">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInput}
                disabled={loading}
              />
              Choose PDF
            </label>
          </div>

          {error && <p className="field-error">{error}</p>}
        </section>
      )}

      {step === 'preview' && (
        <>
          <section className="import-summary">
            <div className="section-header">
              <h2>{fileName ?? 'Imported PDF'}</h2>
              <button type="button" className="secondary" onClick={reset}>
                Choose another file
              </button>
            </div>
            {meetTitle && <p className="meet-title">{meetTitle}</p>}
            {parseWarnings.map((warning) => (
              <p key={warning} className="hint hint--warning">
                {warning}
              </p>
            ))}
          </section>

          <CourseSelector
            value={sourceCourse}
            onChange={setSourceCourse}
            heading="Source course for all times in this PDF"
          />

          <ImportPreviewTable
            rows={rows}
            onChange={setRows}
            onConvert={handleConvert}
          />
        </>
      )}

      <div id="import-results">
        {step === 'results' && results && (
          <BulkResultsTable
            results={results}
            sourceCourse={sourceCourse}
            onExport={handleExport}
            onImportAnother={reset}
          />
        )}
      </div>
    </div>
  )
}
