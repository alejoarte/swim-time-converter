import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyColumnMapping,
  countMappedRows,
  previewMappedRows,
} from '../lib/parsePdf/columnMapping/applyColumnMapping'
import { classifyLine } from '../lib/parsePdf/columnMapping/classifyLine'
import {
  DEFAULT_SKIP_PATTERNS,
  LAYOUT_CONFIDENCE_MAPPER_THRESHOLD,
  MAPPED_FIELD_LABELS,
} from '../lib/parsePdf/columnMapping/constants'
import { layoutToColumnMapping, profileForDelimiter } from '../lib/parsePdf/columnMapping/suggestMappingConfig'
import { splitLineToColumns } from '../lib/parsePdf/columnMapping/splitLineToColumns'
import type { ColumnProfileResult } from '../lib/parsePdf/columnMapping/inferColumnProfile'
import type {
  ColumnMappingConfig,
  ColumnMappingResult,
  LineDelimiter,
  LineKind,
  LineKindOverride,
  MappedField,
} from '../lib/parsePdf/columnMapping/types'
import type { PdfTextLine } from '../lib/parsePdf/buildPdfLines'
import {
  clustersFromColumnFields,
  clustersToColumnMappingConfig,
  inferPdfColumnLayout,
  validateColumnAssignments,
  type ColumnCluster,
} from '../lib/parsePdf/inferPdfColumnLayout'
import { normalizePdfText } from '../lib/parsePdf/normalizePdfText'
import type { RowLayoutId } from '../lib/parsePdf/types'
import { PdfColumnOverlay } from './PdfColumnOverlay'
import { MapperRowPicker } from './MapperRowPicker'
import { PdfPreview, type PageRender, type PdfHighlight } from './PdfPreview'

const ALL_FIELDS: MappedField[] = [
  'name',
  'team',
  'age',
  'year',
  'lane',
  'time',
  'place',
  'ignore',
]

const DELIMITERS: { id: LineDelimiter; label: string }[] = [
  { id: 'tab', label: 'Tab' },
  { id: 'pipe', label: 'Pipe |' },
  { id: 'multi-space', label: 'Multi-space' },
]

const LINE_KIND_CYCLE: LineKind[] = ['unknown', 'event', 'data', 'skip']

type MapperMode = 'overlay' | 'list'

type ColumnMapperStepProps = {
  rawText: string
  fileName: string | null
  pdfFile: File | null
  pdfLines?: PdfTextLine[]
  initialConfig: ColumnMappingConfig
  initialColumnProfile?: ColumnProfileResult | null
  inferredLayoutId?: RowLayoutId
  inferredLayoutConfidence?: number
  autoParseWarnings?: string[]
  onApply: (result: ColumnMappingResult) => void
  onBack: () => void
}

export function ColumnMapperStep({
  rawText,
  fileName,
  pdfFile,
  pdfLines = [],
  initialConfig,
  initialColumnProfile = null,
  inferredLayoutId,
  inferredLayoutConfidence,
  autoParseWarnings = [],
  onApply,
  onBack,
}: ColumnMapperStepProps) {
  const [config, setConfig] = useState<ColumnMappingConfig>(initialConfig)
  const [lineKindOverrides, setLineKindOverrides] = useState<LineKindOverride[]>(
    initialConfig.lineKindOverrides ?? [],
  )
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null)
  const [mapperMode, setMapperMode] = useState<MapperMode>(
    pdfLines.length > 0 && pdfFile ? 'overlay' : 'list',
  )
  const [clusters, setClusters] = useState<ColumnCluster[]>([])
  const [activePageRender, setActivePageRender] = useState<PageRender | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const columnProfile = useMemo(
    () => profileForDelimiter(rawText, config.delimiter) ?? initialColumnProfile,
    [rawText, config.delimiter, initialColumnProfile],
  )

  const effectiveConfig = useMemo(
    () => ({ ...config, lineKindOverrides }),
    [config, lineKindOverrides],
  )

  useEffect(() => {
    if (pdfLines.length === 0) return
    const inferred = inferPdfColumnLayout(pdfLines, rawText, effectiveConfig)
    if (inferred.length >= 2) {
      setClusters(inferred)
      if (mapperMode === 'overlay') {
        const fromClusters = clustersToColumnMappingConfig(
          inferred,
          config.delimiter,
          config.meetDefaultCourse,
        )
        setConfig((prev) => ({
          ...prev,
          columnFields: fromClusters.columnFields,
          activeTimeColumnIndex: fromClusters.activeTimeColumnIndex,
        }))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- init clusters once when pdfLines arrive
  }, [pdfLines.length, rawText])

  const sampleLines = useMemo(() => normalizePdfText(rawText).slice(0, 50), [rawText])

  const lineKinds = useMemo(
    () => sampleLines.map((line, i) => classifyLine(line, effectiveConfig, i)),
    [sampleLines, effectiveConfig],
  )

  const sampleRowCells = useMemo(() => {
    if (columnProfile?.columns.length) {
      return columnProfile.columns.map((c) => c.sampleValue)
    }
    for (const line of sampleLines) {
      const cells = splitLineToColumns(line, config.delimiter)
      if (cells.length >= 3 && cells.some((c) => /\d/.test(c))) return cells
    }
    return splitLineToColumns(sampleLines[0] ?? '', config.delimiter)
  }, [sampleLines, config.delimiter, columnProfile])

  const selectedLineSplit = useMemo(() => {
    if (selectedLineIndex === null) return null
    const line = sampleLines[selectedLineIndex]
    if (!line) return null
    const cells = splitLineToColumns(line, config.delimiter)
    return cells.map((cell, i) => ({
      cell,
      field: config.columnFields[i] ?? 'ignore',
    }))
  }, [selectedLineIndex, sampleLines, config.delimiter, config.columnFields])

  const columnCount = Math.max(config.columnFields.length, sampleRowCells.length, 1)

  const timeColumnIndices = config.columnFields
    .map((f, i) => (f === 'time' ? i : -1))
    .filter((i) => i >= 0)

  const previewCount = useMemo(
    () => countMappedRows(rawText, effectiveConfig),
    [rawText, effectiveConfig],
  )

  const previewRows = useMemo(
    () => previewMappedRows(rawText, effectiveConfig, 5),
    [rawText, effectiveConfig],
  )

  const clusterWarnings = useMemo(
    () => (mapperMode === 'overlay' ? validateColumnAssignments(clusters) : []),
    [mapperMode, clusters],
  )

  const lineIndexToPdfLine = useMemo(() => {
    const map = new Map<number, PdfTextLine>()
    const normalized = normalizePdfText(rawText)
    for (const pl of pdfLines) {
      const idx = normalized.findIndex((l) => l.trim() === pl.text.trim())
      if (idx >= 0) map.set(idx, pl)
    }
    return map
  }, [pdfLines, rawText])

  const highlights: PdfHighlight[] = useMemo(() => {
    if (selectedLineIndex === null) return []
    const pdfLine = lineIndexToPdfLine.get(selectedLineIndex)
    if (!pdfLine) return []
    return [{ pageIndex: pdfLine.pageIndex, bbox: pdfLine.bbox }]
  }, [selectedLineIndex, lineIndexToPdfLine])

  const focusPageIndex =
    selectedLineIndex !== null
      ? lineIndexToPdfLine.get(selectedLineIndex)?.pageIndex
      : undefined

  const columnsSetCount = clusters.filter((c) => c.assignedField !== 'ignore').length

  const updateConfig = useCallback((patch: Partial<ColumnMappingConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }, [])

  const setColumnField = (index: number, field: MappedField) => {
    const next = [...config.columnFields]
    while (next.length <= index) next.push('ignore')
    next[index] = field

    let activeTimeColumnIndex = config.activeTimeColumnIndex
    if (field === 'time' && !timeColumnIndices.includes(index)) {
      activeTimeColumnIndex = index
    } else if (
      field !== 'time' &&
      activeTimeColumnIndex === index &&
      next.filter((f) => f === 'time').length > 0
    ) {
      activeTimeColumnIndex = next.findIndex((f) => f === 'time')
    }

    updateConfig({ columnFields: next, activeTimeColumnIndex })
    setClusters((prev) => clustersFromColumnFields(prev, next))
  }

  const assignClusterField = (index: number, field: MappedField) => {
    const nextClusters = clusters.map((c) =>
      c.index === index ? { ...c, assignedField: field } : c,
    )
    setClusters(nextClusters)
    const fromClusters = clustersToColumnMappingConfig(
      nextClusters,
      config.delimiter,
      config.meetDefaultCourse,
    )
    updateConfig({
      columnFields: fromClusters.columnFields,
      activeTimeColumnIndex: fromClusters.activeTimeColumnIndex,
    })
  }

  const toggleSkipPattern = (pattern: string, enabled: boolean) => {
    const current = new Set(config.skipPatterns)
    if (enabled) current.add(pattern)
    else current.delete(pattern)
    updateConfig({ skipPatterns: [...current] })
  }

  const cycleLineKind = (lineIndex: number) => {
    const current =
      lineKindOverrides.find((o) => o.lineIndex === lineIndex)?.kind ??
      lineKinds[lineIndex] ??
      'unknown'
    const nextIdx = (LINE_KIND_CYCLE.indexOf(current) + 1) % LINE_KIND_CYCLE.length
    const nextKind = LINE_KIND_CYCLE[nextIdx]

    setLineKindOverrides((prev) => {
      const filtered = prev.filter((o) => o.lineIndex !== lineIndex)
      if (nextKind === 'unknown') return filtered
      return [...filtered, { lineIndex, kind: nextKind }]
    })
  }

  const applyDetectedProfile = () => {
    if (!columnProfile) return
    updateConfig({
      delimiter: columnProfile.delimiter,
      columnFields: [...columnProfile.columnFields],
      activeTimeColumnIndex: columnProfile.activeTimeColumnIndex,
    })
    setClusters((prev) =>
      clustersFromColumnFields(prev, columnProfile.columnFields),
    )
  }

  const applyDetectedLayout = () => {
    if (!inferredLayoutId) return
    const preset = layoutToColumnMapping(inferredLayoutId, config.delimiter)
    setConfig((prev) => ({
      ...preset,
      meetDefaultCourse: prev.meetDefaultCourse,
      skipPatterns: prev.skipPatterns,
      lineKindOverrides,
    }))
    setClusters((prev) => clustersFromColumnFields(prev, preset.columnFields))
  }

  const handleApply = () => {
    const result = applyColumnMapping(rawText, effectiveConfig)
    onApply(result)
  }

  const showLayoutShortcut =
    inferredLayoutId &&
    inferredLayoutConfidence !== undefined &&
    inferredLayoutConfidence >= 0.3

  const hasRequiredFields =
    config.columnFields.includes('name') && config.columnFields.includes('time')

  const overlayEl =
    mapperMode === 'overlay' &&
    activePageRender &&
    clusters.length > 0 ? (
      <PdfColumnOverlay
        clusters={clusters}
        pageWidth={activePageRender.width}
        pageHeight={activePageRender.height}
        scale={activePageRender.scale}
        onAssignField={assignClusterField}
      />
    ) : null

  return (
    <section className="column-mapper">
      <div className="section-header">
        <h2>Match columns — {fileName ?? 'PDF'}</h2>
        <button type="button" className="secondary" onClick={onBack}>
          Back to upload
        </button>
      </div>

      <p className="hint">
        We couldn&apos;t read this PDF automatically. Look at your document and tell us
        what each column contains.
      </p>

      {autoParseWarnings.map((warning) => (
        <p key={warning} className="hint hint--warning">
          {warning}
        </p>
      ))}

      {clusterWarnings.map((warning) => (
        <p key={warning} className="hint hint--warning">
          {warning}
        </p>
      ))}

      <div className="mapper-split-view">
        <div className="mapper-split-view-pdf">
          <h3 className="mapper-step-title">Your PDF</h3>
          <PdfPreview
            file={pdfFile}
            highlights={highlights}
            focusPageIndex={focusPageIndex}
            overlay={overlayEl}
            onActivePageRender={setActivePageRender}
          />
          {mapperMode === 'overlay' && pdfLines.length > 0 && (
            <p className="hint mapper-hint-inline">
              Click a colored column on the PDF to label it.
            </p>
          )}
        </div>

        <div className="mapper-split-view-panel">
          <div className="mapper-mode-toggle">
            {pdfLines.length > 0 && pdfFile && (
              <>
                <button
                  type="button"
                  className={mapperMode === 'overlay' ? 'primary' : 'secondary'}
                  onClick={() => setMapperMode('overlay')}
                >
                  Click columns on PDF
                </button>
                <button
                  type="button"
                  className={mapperMode === 'list' ? 'primary' : 'secondary'}
                  onClick={() => setMapperMode('list')}
                >
                  Use column list
                </button>
              </>
            )}
          </div>

          {mapperMode === 'overlay' && clusters.length > 0 && (
            <div className="mapper-panel mapper-panel--compact">
              <h3 className="mapper-step-title">Column progress</h3>
              <p className="hint">
                <strong>{columnsSetCount}</strong> of <strong>{clusters.length}</strong>{' '}
                columns labeled
                {hasRequiredFields ? '' : ' — name and time are required'}
              </p>
              {columnProfile && columnProfile.profileConfidence >= 0.4 && (
                <button type="button" className="secondary" onClick={applyDetectedProfile}>
                  Reset to detected columns
                </button>
              )}
            </div>
          )}

          {mapperMode === 'list' && (
            <>
              <div className="mapper-panel mapper-panel--compact">
                <h3 className="mapper-step-title">Match each column</h3>
                <p className="hint mapper-hint-inline">
                  Compare with your PDF on the left. Each row is one column in the document.
                </p>
                {columnProfile && (
                  <button type="button" className="secondary" onClick={applyDetectedProfile}>
                    Use detected columns
                  </button>
                )}
                <div className="mapper-columns mapper-columns--simple">
                  {Array.from({ length: columnCount }, (_, i) => (
                    <div key={i} className="mapper-column-row">
                      <code className="mapper-col-sample">{sampleRowCells[i] ?? '—'}</code>
                      <select
                        value={config.columnFields[i] ?? 'ignore'}
                        onChange={(e) => setColumnField(i, e.target.value as MappedField)}
                        aria-label={`Column ${i + 1}`}
                      >
                        {ALL_FIELDS.map((field) => (
                          <option key={field} value={field}>
                            {MAPPED_FIELD_LABELS[field]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {timeColumnIndices.length > 1 && (
                <div className="mapper-panel mapper-panel--compact">
                  <h3 className="mapper-step-title">Which time column?</h3>
                  <div className="mapper-delimiter-options">
                    {timeColumnIndices.map((idx) => (
                      <label key={idx} className="mapper-radio">
                        <input
                          type="radio"
                          name="timeColumn"
                          checked={config.activeTimeColumnIndex === idx}
                          onChange={() => updateConfig({ activeTimeColumnIndex: idx })}
                        />
                        {sampleRowCells[idx] ?? `Column ${idx + 1}`}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mapper-panel mapper-panel--compact">
            <h3 className="mapper-step-title">Preview swimmers</h3>
            <p className="hint">
              <strong>{previewCount}</strong> swimmer{previewCount === 1 ? '' : 's'} found
            </p>

            <MapperRowPicker
              rows={previewRows}
              selectedLineIndex={selectedLineIndex}
              onSelect={setSelectedLineIndex}
            />

            {previewRows.length > 0 && (
              <table className="mapper-preview-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Team</th>
                    <th>Time</th>
                    <th>Event</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.sourceLineIndex !== undefined &&
                        selectedLineIndex === row.sourceLineIndex
                          ? 'mapper-preview-row--selected'
                          : undefined
                      }
                      onClick={() =>
                        row.sourceLineIndex !== undefined &&
                        setSelectedLineIndex(
                          selectedLineIndex === row.sourceLineIndex
                            ? null
                            : row.sourceLineIndex!,
                        )
                      }
                      style={{ cursor: row.sourceLineIndex !== undefined ? 'pointer' : undefined }}
                    >
                      <td>{row.swimmerName}</td>
                      <td>{row.team ?? '—'}</td>
                      <td>{row.rawTime}</td>
                      <td>{row.eventLabel || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mapper-actions">
            <button type="button" className="secondary" onClick={onBack}>
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              onClick={handleApply}
              disabled={previewCount === 0 || !hasRequiredFields}
            >
              Continue with {previewCount} swimmer{previewCount === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>

      <details
        className="mapper-advanced"
        open={showAdvanced}
        onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
      >
        <summary>Adjust settings</summary>

        {showLayoutShortcut && (
          <div className="mapper-shortcut">
            <p className="hint">
              Detected layout: <strong>{inferredLayoutId}</strong> (
              {Math.round((inferredLayoutConfidence ?? 0) * 100)}% match)
            </p>
            <button type="button" className="secondary" onClick={applyDetectedLayout}>
              Use detected layout
            </button>
          </div>
        )}

        {columnProfile && (
          <div className="mapper-panel">
            <h3>Detected column profile</h3>
            <table className="mapper-profile-table">
              <thead>
                <tr>
                  <th>Col</th>
                  <th>Sample</th>
                  <th>Detected</th>
                  <th>Match</th>
                </tr>
              </thead>
              <tbody>
                {columnProfile.columns.map((col) => (
                  <tr
                    key={col.index}
                    className={
                      config.columnFields[col.index] === col.inferredField
                        ? 'mapper-profile-row--match'
                        : 'mapper-profile-row--mismatch'
                    }
                  >
                    <td>{col.index + 1}</td>
                    <td>
                      <code>{col.sampleValue || '—'}</code>
                    </td>
                    <td>{MAPPED_FIELD_LABELS[col.inferredField]}</td>
                    <td>{Math.round(col.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mapper-panel">
          <h3>Sample lines</h3>
          <p className="hint mapper-hint-inline">
            Click a line to preview split. Shift+click to mark as event / data / skip.
          </p>
          <div className="mapper-sample-lines">
            {sampleLines.map((line, i) => (
              <button
                key={`${i}-${line.slice(0, 24)}`}
                type="button"
                className={`mapper-sample-line mapper-sample-line--${lineKinds[i]}${selectedLineIndex === i ? ' mapper-sample-line--selected' : ''}`}
                onClick={(e) => {
                  if (e.shiftKey) {
                    cycleLineKind(i)
                  } else {
                    setSelectedLineIndex(selectedLineIndex === i ? null : i)
                  }
                }}
                title="Click to preview split; Shift+click to cycle event / data / skip"
              >
                <span className="mapper-line-num">{i + 1}</span>
                <span className="mapper-line-kind">{lineKinds[i]}</span>
                <code>{line.length > 120 ? `${line.slice(0, 120)}…` : line}</code>
              </button>
            ))}
          </div>
          {selectedLineSplit && selectedLineSplit.length > 0 && (
            <div className="mapper-line-split-preview">
              <h4>Line split preview</h4>
              <div className="mapper-split-cells">
                {selectedLineSplit.map((part, i) => (
                  <div
                    key={i}
                    className={`mapper-split-cell mapper-split-cell--${part.field}`}
                  >
                    <span className="mapper-split-field">{MAPPED_FIELD_LABELS[part.field]}</span>
                    <code>{part.cell || '—'}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mapper-panel">
          <h3>Delimiter</h3>
          <div className="mapper-delimiter-options">
            {DELIMITERS.map(({ id, label }) => (
              <label key={id} className="mapper-radio">
                <input
                  type="radio"
                  name="delimiter"
                  checked={config.delimiter === id}
                  onChange={() => updateConfig({ delimiter: id })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="mapper-panel">
          <h3>Skip patterns</h3>
          <div className="mapper-skip-patterns">
            {DEFAULT_SKIP_PATTERNS.map((pattern) => (
              <label key={pattern} className="mapper-checkbox">
                <input
                  type="checkbox"
                  checked={config.skipPatterns.includes(pattern)}
                  onChange={(e) => toggleSkipPattern(pattern, e.target.checked)}
                />
                <code>{pattern}</code>
              </label>
            ))}
          </div>
        </div>
      </details>
    </section>
  )
}

export { LAYOUT_CONFIDENCE_MAPPER_THRESHOLD }
