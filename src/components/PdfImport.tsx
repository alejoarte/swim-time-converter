import { useCallback, useState } from 'react'
import { ColumnMapperStep, LAYOUT_CONFIDENCE_MAPPER_THRESHOLD } from './ColumnMapperStep'
import { PdfPreview } from './PdfPreview'
import { CourseSelector } from './CourseSelector'
import { BulkResultsTable } from './BulkResultsTable'
import { ImportPreviewTable } from './ImportPreviewTable'
import { convertBulkRows, type BulkConversionResult, type Course } from '../lib/convert'
import { exportMeetToExcel } from '../lib/exportExcel'
import {
  extractPdfTextWithPositions,
  parsePdfText,
  suggestMappingConfig,
} from '../lib/parsePdf'
import type { PdfTextLine } from '../lib/parsePdf/buildPdfLines'
import { isLikelyScannedPdf } from '../lib/parsePdf/columnMapping/isLikelyScannedPdf'
import type { ColumnMappingConfig, ColumnMappingResult } from '../lib/parsePdf/columnMapping/types'
import type { ColumnProfileResult } from '../lib/parsePdf/columnMapping/inferColumnProfile'
import type { ParsedRow, ParsePdfResult, RowLayoutId } from '../lib/parsePdf/types'

type ImportStep = 'upload' | 'mapper' | 'preview' | 'results' | 'scanned'

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
  const [rawText, setRawText] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfLines, setPdfLines] = useState<PdfTextLine[]>([])
  const [mappingConfig, setMappingConfig] = useState<ColumnMappingConfig | null>(null)
  const [columnProfile, setColumnProfile] = useState<ColumnProfileResult | null>(null)
  const [autoParseResult, setAutoParseResult] = useState<ParsePdfResult | null>(null)
  const [inferredLayoutId, setInferredLayoutId] = useState<RowLayoutId | undefined>()
  const [inferredLayoutConfidence, setInferredLayoutConfidence] = useState<number | undefined>()
  const [canManualMap, setCanManualMap] = useState(false)

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
    setRawText('')
    setPdfFile(null)
    setPdfLines([])
    setMappingConfig(null)
    setColumnProfile(null)
    setAutoParseResult(null)
    setInferredLayoutId(undefined)
    setInferredLayoutConfidence(undefined)
    setCanManualMap(false)
  }, [])

  const openMapper = useCallback(
    (text: string, parsed: ParsePdfResult | null) => {
      const suggestion = suggestMappingConfig(text)
      setMappingConfig(suggestion.config)
      setColumnProfile(suggestion.columnProfile)
      setInferredLayoutId(suggestion.inferredLayoutId)
      setInferredLayoutConfidence(suggestion.inferredLayoutConfidence)
      setAutoParseResult(parsed)
      setParseWarnings(parsed?.warnings ?? [])
      setStep('mapper')
      setError(null)
    },
    [],
  )

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
      setError('Please upload a PDF file.')
      return
    }

    setLoading(true)
    setError(null)
    setFileName(file.name)
    setPdfFile(file)
    setResults(null)
    setCanManualMap(false)

    try {
      const extraction = await extractPdfTextWithPositions(file)
      const text = extraction.text
      setRawText(text)
      setPdfLines(extraction.lines)

      if (isLikelyScannedPdf(text)) {
        setError(
          'This PDF appears to be scanned or image-only. Text extraction found little usable content. Try a text-based Hy-Tek export or use the CSV template for manual entry.',
        )
        setStep('scanned')
        return
      }

      const parsed = parsePdfText(text)
      setAutoParseResult(parsed)

      if (shouldUseMapper(parsed)) {
        setCanManualMap(true)
        setError(
          parsed.warnings[0] ??
            'No swimmer rows found. Try mapping columns manually or use the CSV template.',
        )
        openMapper(text, parsed)
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
      setPdfFile(null)
      setPdfLines([])
      setStep('upload')
    } finally {
      setLoading(false)
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
    setStep('preview')
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

  const handleBackToPreview = () => {
    setResults(null)
    setStep('preview')
  }

  const handleManualMap = () => {
    if (rawText) {
      openMapper(rawText, autoParseResult)
    }
  }

  return (
    <div className="pdf-import">
      {step === 'upload' && (
        <section className="pdf-upload">
          <h2>Import meet PDF</h2>
          <p className="hint">
            Upload a Hy-Tek Meet Manager text PDF (meet program or results). If auto-parse
            fails, you can match columns using a preview of your document.
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
            This document is image-only — we cannot extract swimmer names or times from it.
            Export a text-based PDF from Hy-Tek, or use the CSV template.
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
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'preview' && (
        <>
          <section className="import-summary">
            <div className="section-header">
              <h2>{fileName ?? 'Imported PDF'}</h2>
              <div className="section-header-actions">
                {rawText && (
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
            onBack={handleBackToPreview}
            onExport={handleExport}
            onImportAnother={reset}
          />
        )}
      </div>
    </div>
  )
}
