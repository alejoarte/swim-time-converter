import { useCallback, useReducer, useState } from 'react'
import { ColumnMapperStep, LAYOUT_CONFIDENCE_MAPPER_THRESHOLD } from './ColumnMapperStep'
import { PdfPreview } from './PdfPreview'
import { CourseSelector } from './CourseSelector'
import { BulkResultsTable } from './BulkResultsTable'
import { ImportPreviewTable } from './ImportPreviewTable'
import { EventFilterPanel } from './EventFilterPanel'
import { EventResultsSummary } from './EventResultsSummary'
import { SwimmerFilterPanel } from './SwimmerFilterPanel'
import { SwimmerResultsSummary } from './SwimmerResultsSummary'
import { convertBulkRows, type BulkConversionResult, type Course } from '../lib/convert'
import { exportMeetToExcel } from '../lib/exportExcel'
import type { ManualPrefill } from '../lib/manualPrefill'
import {
  applyColumnMapping,
  computeLayoutFingerprint,
  extractPdfTextWithPositions,
  findMatchingProfile,
  parsePdfText,
  saveMappingProfile,
  suggestMappingConfig,
} from '../lib/parsePdf'
import type { PdfTextLine } from '../lib/parsePdf/buildPdfLines'
import { isLikelyScannedPdf } from '../lib/parsePdf/columnMapping/isLikelyScannedPdf'
import type {
  ColumnMappingConfig,
  ColumnMappingResult,
} from '../lib/parsePdf/columnMapping/types'
import type { ColumnProfileResult } from '../lib/parsePdf/columnMapping/inferColumnProfile'
import type { ParsedRow, ParsePdfResult, RowLayoutId } from '../lib/parsePdf/types'

type ImportStep =
  | 'upload'
  | 'mapper'
  | 'chooseIntent'
  | 'pickSwimmers'
  | 'swimmerSummary'
  | 'pickEvents'
  | 'eventSummary'
  | 'preview'
  | 'results'
  | 'scanned'

type PdfImportProps = {
  onSendToManualConverter?: (prefill: ManualPrefill) => void
}

type ImportUiState = {
  step: ImportStep
  loading: boolean
  error: string | null
  fileName: string | null
  dragOver: boolean
  canManualMap: boolean
  exportError: string | null
}

type ImportUiAction =
  | { type: 'reset' }
  | { type: 'setStep'; step: ImportStep }
  | { type: 'setLoading'; loading: boolean }
  | { type: 'setError'; error: string | null }
  | { type: 'setFileName'; fileName: string | null }
  | { type: 'setDragOver'; dragOver: boolean }
  | { type: 'setCanManualMap'; canManualMap: boolean }
  | { type: 'setExportError'; exportError: string | null }

const INITIAL_IMPORT_UI_STATE: ImportUiState = {
  step: 'upload',
  loading: false,
  error: null,
  fileName: null,
  dragOver: false,
  canManualMap: false,
  exportError: null,
}

function importUiReducer(state: ImportUiState, action: ImportUiAction): ImportUiState {
  if (action.type === 'reset') return INITIAL_IMPORT_UI_STATE
  if (action.type === 'setStep') return { ...state, step: action.step }
  if (action.type === 'setLoading') return { ...state, loading: action.loading }
  if (action.type === 'setError') return { ...state, error: action.error }
  if (action.type === 'setFileName') return { ...state, fileName: action.fileName }
  if (action.type === 'setDragOver') return { ...state, dragOver: action.dragOver }
  if (action.type === 'setCanManualMap')
    return { ...state, canManualMap: action.canManualMap }
  if (action.type === 'setExportError')
    return { ...state, exportError: action.exportError }
  return state
}

function applyParsedMeet(
  parsed: ParsePdfResult,
  setters: {
    setRows: (rows: ParsedRow[]) => void
    setMeetTitle: (title: string | undefined) => void
    setParseWarnings: (warnings: string[]) => void
    setSourceCourse: (course: Course) => void
  },
) {
  setters.setRows(parsed.rows)
  setters.setMeetTitle(parsed.meetInfo.title)
  setters.setParseWarnings(parsed.warnings)
  if (parsed.meetInfo.detectedCourse) {
    setters.setSourceCourse(parsed.meetInfo.detectedCourse)
  }
}

export function PdfImport({ onSendToManualConverter }: PdfImportProps) {
  const [ui, dispatchUi] = useReducer(importUiReducer, INITIAL_IMPORT_UI_STATE)
  const { step, loading, error, fileName, dragOver, canManualMap, exportError } = ui
  const [meetTitle, setMeetTitle] = useState<string | undefined>()
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [sourceCourse, setSourceCourse] = useState<Course>('LCM')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [results, setResults] = useState<BulkConversionResult[] | null>(null)
  const [rawText, setRawText] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfLines, setPdfLines] = useState<PdfTextLine[]>([])
  const [mappingConfig, setMappingConfig] = useState<ColumnMappingConfig | null>(null)
  const [columnProfile, setColumnProfile] = useState<ColumnProfileResult | null>(null)
  const [autoParseResult, setAutoParseResult] = useState<ParsePdfResult | null>(null)
  const [inferredLayoutId, setInferredLayoutId] = useState<RowLayoutId | undefined>()
  const [inferredLayoutConfidence, setInferredLayoutConfidence] = useState<
    number | undefined
  >()
  const [selectedSwimmerKeys, setSelectedSwimmerKeys] = useState<Set<string>>(new Set())
  const [selectedEventKeys, setSelectedEventKeys] = useState<Set<string>>(new Set())
  const announcementByStep: Record<ImportStep, string> = {
    upload: 'Upload a PDF to start import.',
    mapper: 'Column mapper opened.',
    chooseIntent: 'Choose how to continue with imported rows.',
    pickSwimmers: 'Select swimmers from the imported rows.',
    swimmerSummary: 'Showing selected swimmer results.',
    pickEvents: 'Select events from the imported rows.',
    eventSummary: 'Showing selected event results.',
    preview: 'Showing full meet preview.',
    results: 'Showing converted meet results.',
    scanned: 'Scanned PDF warning shown.',
  }
  const announcement = announcementByStep[step]

  const reset = useCallback(() => {
    dispatchUi({ type: 'reset' })
    setMeetTitle(undefined)
    setParseWarnings([])
    setSourceCourse('LCM')
    setRows([])
    setResults(null)
    setRawText('')
    setPdfFile(null)
    setPdfLines([])
    setMappingConfig(null)
    setColumnProfile(null)
    setAutoParseResult(null)
    setInferredLayoutId(undefined)
    setInferredLayoutConfidence(undefined)
    setSelectedSwimmerKeys(new Set())
    setSelectedEventKeys(new Set())
  }, [])

  const goToChooseIntent = useCallback(() => {
    setSelectedSwimmerKeys(new Set())
    setSelectedEventKeys(new Set())
    dispatchUi({ type: 'setStep', step: 'chooseIntent' })
  }, [])

  const openMapper = useCallback((text: string, parsed: ParsePdfResult | null) => {
    const suggestion = suggestMappingConfig(text)
    setMappingConfig(suggestion.config)
    setColumnProfile(suggestion.columnProfile)
    setInferredLayoutId(suggestion.inferredLayoutId)
    setInferredLayoutConfidence(suggestion.inferredLayoutConfidence)
    setAutoParseResult(parsed)
    setParseWarnings(parsed?.warnings ?? [])
    dispatchUi({ type: 'setStep', step: 'mapper' })
    dispatchUi({ type: 'setError', error: null })
  }, [])

  const shouldUseMapper = (parsed: ParsePdfResult): boolean => {
    if (parsed.rows.length === 0) return true
    if (
      parsed.layoutConfidence !== undefined &&
      parsed.layoutConfidence < LAYOUT_CONFIDENCE_MAPPER_THRESHOLD
    ) {
      return true
    }
    return false
  }

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      dispatchUi({ type: 'setError', error: 'Please upload a PDF file.' })
      return
    }

    dispatchUi({ type: 'setLoading', loading: true })
    dispatchUi({ type: 'setError', error: null })
    dispatchUi({ type: 'setFileName', fileName: file.name })
    setPdfFile(file)
    setResults(null)
    dispatchUi({ type: 'setExportError', exportError: null })
    dispatchUi({ type: 'setCanManualMap', canManualMap: false })

    try {
      const extraction = await extractPdfTextWithPositions(file)
      const text = extraction.text
      setRawText(text)
      setPdfLines(extraction.lines)

      if (isLikelyScannedPdf(text)) {
        dispatchUi({
          type: 'setError',
          error:
            'This PDF appears to be scanned or image-only. Text extraction found little usable content. Try a text-based Hy-Tek export or use the CSV template for manual entry.',
        })
        dispatchUi({ type: 'setStep', step: 'scanned' })
        return
      }

      const fingerprint = computeLayoutFingerprint(text)
      const savedProfile = findMatchingProfile(fingerprint)
      if (savedProfile) {
        const profileResult = applyColumnMapping(text, savedProfile.config)
        if (profileResult.rows.length > 0) {
          setMappingConfig(profileResult.mappingConfig)
          applyParsedMeet(
            {
              rows: profileResult.rows,
              meetInfo: {
                ...profileResult.meetInfo,
                format: 'column-mapped',
              },
              warnings: [
                'Applied saved column mapping for this PDF layout.',
                ...profileResult.warnings.filter(
                  (w) => !w.startsWith('Mapped manually'),
                ),
              ],
            },
            { setRows, setMeetTitle, setParseWarnings, setSourceCourse },
          )
          goToChooseIntent()
          return
        }
      }

      const parsed = parsePdfText(text)
      setAutoParseResult(parsed)

      if (shouldUseMapper(parsed)) {
        dispatchUi({ type: 'setCanManualMap', canManualMap: true })
        dispatchUi({
          type: 'setError',
          error:
            parsed.warnings[0] ??
            'No swimmer rows found. Try mapping columns manually or use the CSV template.',
        })
        openMapper(text, parsed)
        return
      }

      applyParsedMeet(parsed, {
        setRows,
        setMeetTitle,
        setParseWarnings,
        setSourceCourse,
      })
      goToChooseIntent()
    } catch {
      dispatchUi({
        type: 'setError',
        error: 'Failed to read PDF. The file may be corrupted or password-protected.',
      })
      setPdfFile(null)
      setPdfLines([])
      dispatchUi({ type: 'setStep', step: 'upload' })
    } finally {
      dispatchUi({ type: 'setLoading', loading: false })
    }
  }

  const handleMapperApply = (result: ColumnMappingResult) => {
    setRows(result.rows)
    setMeetTitle(result.meetInfo.title)
    setParseWarnings(result.warnings)
    if (result.meetInfo.detectedCourse) {
      setSourceCourse(result.meetInfo.detectedCourse)
    } else if (result.mappingConfig.meetDefaultCourse) {
      setSourceCourse(result.mappingConfig.meetDefaultCourse)
    }
    setMappingConfig(result.mappingConfig)
    if (rawText) {
      saveMappingProfile(rawText, result.mappingConfig, fileName ?? undefined)
    }
    goToChooseIntent()
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dispatchUi({ type: 'setDragOver', dragOver: false })
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
    dispatchUi({ type: 'setExportError', exportError: null })
    dispatchUi({ type: 'setStep', step: 'results' })
    setTimeout(() => {
      document.getElementById('import-results')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleExport = () => {
    if (!results) return

    dispatchUi({ type: 'setExportError', exportError: null })
    try {
      exportMeetToExcel(results, sourceCourse, meetTitle)
    } catch (error) {
      dispatchUi({
        type: 'setExportError',
        exportError:
          error instanceof Error ? error.message : 'Failed to export meet results.',
      })
    }
  }

  const handleBackToPreview = () => {
    setResults(null)
    dispatchUi({ type: 'setExportError', exportError: null })
    dispatchUi({ type: 'setStep', step: 'preview' })
  }

  const handleManualMap = () => {
    if (rawText) {
      openMapper(rawText, autoParseResult)
    }
  }

  const handleSwimmerPickerConfirm = (keys: Set<string>) => {
    setSelectedSwimmerKeys(keys)
    dispatchUi({ type: 'setStep', step: 'swimmerSummary' })
  }

  const handleEventPickerConfirm = (keys: Set<string>) => {
    setSelectedEventKeys(keys)
    dispatchUi({ type: 'setStep', step: 'eventSummary' })
  }

  const renderMeetHeader = (title: string) => (
    <section className="import-summary">
      <div className="section-header">
        <h2>{fileName ?? title}</h2>
        <div className="section-header-actions">
          {rawText && step !== 'mapper' && (
            <button
              type="button"
              className="secondary"
              onClick={() => openMapper(rawText, autoParseResult)}
            >
              Remap columns
            </button>
          )}
          <button type="button" className="secondary" onClick={reset}>
            Choose another file
          </button>
        </div>
      </div>
      {meetTitle && <p className="meet-title">{meetTitle}</p>}
      {parseWarnings.map((warning) => (
        <p key={warning} className="hint hint--warning">
          {warning}
        </p>
      ))}
    </section>
  )

  return (
    <div className="pdf-import">
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      {step === 'upload' && (
        <section className="pdf-upload">
          <h2>Import meet PDF</h2>
          <p className="hint">
            Upload a text-based meet PDF (Hy-Tek Meet Manager, college results, or similar
            tabular layouts). If auto-parse fails, you can match columns using a preview of
            your document.
          </p>

          <div
            className={`drop-zone${dragOver ? ' drop-zone--active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              dispatchUi({ type: 'setDragOver', dragOver: true })
            }}
            onDragLeave={() => dispatchUi({ type: 'setDragOver', dragOver: false })}
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

          {error && (
            <div className="upload-error-block">
              <p className="field-error">{error}</p>
              {canManualMap && rawText && (
                <button type="button" className="primary" onClick={handleManualMap}>
                  Match columns
                </button>
              )}
              <p className="hint">
                Or enter times using the CSV template in the manual converter (spreadsheet
                export).
              </p>
            </div>
          )}
        </section>
      )}

      {step === 'scanned' && (
        <section className="pdf-scanned">
          <div className="section-header">
            <h2>{fileName ?? 'PDF preview'}</h2>
            <button type="button" className="secondary" onClick={reset}>
              Choose another file
            </button>
          </div>
          <p className="field-error">{error}</p>
          <p className="hint">
            This document is image-only — we cannot extract swimmer names or times from
            it. Export a text-based PDF from Hy-Tek, or use the CSV template.
          </p>
          <PdfPreview file={pdfFile} />
        </section>
      )}

      {step === 'mapper' && mappingConfig && (
        <ColumnMapperStep
          rawText={rawText}
          fileName={fileName}
          pdfFile={pdfFile}
          pdfLines={pdfLines}
          initialConfig={mappingConfig}
          initialColumnProfile={columnProfile}
          inferredLayoutId={inferredLayoutId}
          inferredLayoutConfidence={inferredLayoutConfidence}
          autoParseWarnings={autoParseResult?.warnings}
          onApply={handleMapperApply}
          onBack={() => dispatchUi({ type: 'setStep', step: 'upload' })}
        />
      )}

      {step === 'chooseIntent' && (
        <section className="pdf-choose-intent">
          {renderMeetHeader('Imported PDF')}
          <p className="hint">
            {rows.length} swimmer row{rows.length === 1 ? '' : 's'} parsed. What would you
            like to do?
          </p>
          <div className="intent-cards">
            <button
              type="button"
              className="intent-card"
              onClick={() => dispatchUi({ type: 'setStep', step: 'preview' })}
            >
              <span className="intent-card-title">Review whole meet</span>
              <span className="intent-card-desc">
                See every parsed row, fix issues, and convert the full meet to SCY, SCM,
                and LCM.
              </span>
            </button>
            <button
              type="button"
              className="intent-card"
              onClick={() => dispatchUi({ type: 'setStep', step: 'pickSwimmers' })}
            >
              <span className="intent-card-title">Find swimmers</span>
              <span className="intent-card-desc">
                Search and select swimmers by name, then view their events and times from
                this PDF.
              </span>
            </button>
            <button
              type="button"
              className="intent-card"
              onClick={() => dispatchUi({ type: 'setStep', step: 'pickEvents' })}
            >
              <span className="intent-card-title">Browse by event</span>
              <span className="intent-card-desc">
                Pick one or more events from this meet and see every swimmer and time in
                those races.
              </span>
            </button>
          </div>
        </section>
      )}

      {step === 'pickSwimmers' && (
        <section className="pdf-pick-swimmers">
          {renderMeetHeader('Find swimmers')}
          <SwimmerFilterPanel
            rows={rows}
            activeFilter={selectedSwimmerKeys.size > 0 ? selectedSwimmerKeys : null}
            onConfirm={handleSwimmerPickerConfirm}
            hintText="Search by name, check the swimmers you want, then confirm to see their results."
            className="swimmer-filter--standalone"
          />
          <button
            type="button"
            className="secondary pdf-pick-swimmers-back"
            onClick={() => dispatchUi({ type: 'setStep', step: 'chooseIntent' })}
          >
            Back
          </button>
        </section>
      )}

      {step === 'swimmerSummary' && (
        <>
          <CourseSelector
            value={sourceCourse}
            onChange={setSourceCourse}
            heading="Source course for times in this PDF"
          />
          <SwimmerResultsSummary
            rows={rows}
            selectedKeys={selectedSwimmerKeys}
            fileName={fileName}
            meetTitle={meetTitle}
            sourceCourse={sourceCourse}
            onChangeSelection={() =>
              dispatchUi({ type: 'setStep', step: 'pickSwimmers' })
            }
            onChooseAnotherFile={reset}
            onSendToManualConverter={onSendToManualConverter}
          />
        </>
      )}

      {step === 'pickEvents' && (
        <section className="pdf-pick-events">
          {renderMeetHeader('Browse by event')}
          <EventFilterPanel
            rows={rows}
            activeFilter={selectedEventKeys.size > 0 ? selectedEventKeys : null}
            onConfirm={handleEventPickerConfirm}
            hintText="Search by event name, check the events you want, then confirm to see results."
            className="swimmer-filter--standalone"
          />
          <button
            type="button"
            className="secondary pdf-pick-swimmers-back"
            onClick={() => dispatchUi({ type: 'setStep', step: 'chooseIntent' })}
          >
            Back
          </button>
        </section>
      )}

      {step === 'eventSummary' && (
        <>
          {renderMeetHeader('Event results')}
          <EventResultsSummary
            rows={rows}
            selectedKeys={selectedEventKeys}
            fileName={fileName}
            meetTitle={meetTitle}
            onChangeSelection={() => dispatchUi({ type: 'setStep', step: 'pickEvents' })}
            onChooseAnotherFile={reset}
          />
        </>
      )}

      {step === 'preview' && (
        <>
          {renderMeetHeader('Imported PDF')}
          <button
            type="button"
            className="secondary pdf-preview-back-intent"
            onClick={() => dispatchUi({ type: 'setStep', step: 'chooseIntent' })}
          >
            Back to options
          </button>

          <CourseSelector
            value={sourceCourse}
            onChange={setSourceCourse}
            heading="Source course for all times in this PDF"
          />

          <ImportPreviewTable rows={rows} onChange={setRows} onConvert={handleConvert} />
        </>
      )}

      <div id="import-results">
        {step === 'results' && results && (
          <BulkResultsTable
            results={results}
            sourceCourse={sourceCourse}
            onBack={handleBackToPreview}
            onExport={handleExport}
            onImportAnother={reset}
          />
        )}
        {exportError && (
          <p className="field-error" role="status" aria-live="polite">
            {exportError}
          </p>
        )}
      </div>
    </div>
  )
}
