import { TIME_TOKEN_PATTERN } from './parseTimeToken'
import { normalizeTimeCell } from './columnMapping/normalizeTimeCell'
import { classifyLine } from './columnMapping/classifyLine'
import { DEFAULT_SKIP_PATTERNS } from './columnMapping/constants'
import { inferBestColumnProfile } from './columnMapping/inferColumnProfile'
import { normalizePdfText } from './normalizePdfText'
import type { PdfTextLine } from './buildPdfLines'
import type { ColumnMappingConfig, LineDelimiter, MappedField } from './columnMapping/types'

const TIME_RE = new RegExp(`^${TIME_TOKEN_PATTERN}$`, 'i')
const YEAR_CLASS = /^(FR|SO|JR|SR)$/i
const X_GAP_THRESHOLD = 8

export type ColumnCluster = {
  index: number
  xMin: number
  xMax: number
  sampleValues: string[]
  inferredField: MappedField
  confidence: number
  assignedField: MappedField
}

function clusterLineItems(line: PdfTextLine): { xMin: number; xMax: number; text: string }[] {
  if (line.items.length === 0) {
    return line.text.split(/\s{2,}|\t/).map((part, i) => ({
      xMin: i * 50,
      xMax: (i + 1) * 50,
      text: part.trim(),
    })).filter((c) => c.text)
  }

  const sorted = [...line.items].sort((a, b) => a.x - b.x)
  const clusters: { xMin: number; xMax: number; text: string }[] = []
  let current: { xMin: number; xMax: number; parts: string[] } | null = null

  for (const item of sorted) {
    const itemEnd = item.x + item.width
    if (
      current &&
      item.x - (current.xMax) <= X_GAP_THRESHOLD
    ) {
      current.parts.push(item.str)
      current.xMax = Math.max(current.xMax, itemEnd)
    } else {
      if (current) {
        clusters.push({
          xMin: current.xMin,
          xMax: current.xMax,
          text: current.parts.join(' ').trim(),
        })
      }
      current = { xMin: item.x, xMax: itemEnd, parts: [item.str] }
    }
  }

  if (current) {
    clusters.push({
      xMin: current.xMin,
      xMax: current.xMax,
      text: current.parts.join(' ').trim(),
    })
  }

  return clusters.filter((c) => c.text)
}

function scoreCellForField(cell: string): { field: MappedField; confidence: number } {
  const trimmed = cell.trim()
  if (!trimmed) return { field: 'ignore', confidence: 0 }

  const normalized = normalizeTimeCell(trimmed)
  if (TIME_RE.test(normalized)) return { field: 'time', confidence: 0.95 }
  if (YEAR_CLASS.test(trimmed)) return { field: 'year', confidence: 0.9 }
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed)
    if (n >= 1 && n <= 10) return { field: 'lane', confidence: 0.7 }
    if (n >= 5 && n <= 24) return { field: 'age', confidence: 0.6 }
    if (n >= 1 && n <= 99) return { field: 'place', confidence: 0.5 }
  }
  if (trimmed.includes(',') || (trimmed.split(/\s+/).length >= 2 && /^[A-Za-z]/.test(trimmed))) {
    return { field: 'name', confidence: 0.75 }
  }
  if (/^[A-Z]{2,6}$/.test(trimmed)) return { field: 'team', confidence: 0.55 }
  return { field: 'ignore', confidence: 0.2 }
}

function mergeClustersAcrossRows(
  rowClusters: { xMin: number; xMax: number; text: string }[][],
): ColumnCluster[] {
  if (rowClusters.length === 0) return []

  const maxCols = Math.max(...rowClusters.map((r) => r.length))
  const result: ColumnCluster[] = []

  for (let col = 0; col < maxCols; col += 1) {
    const samples: string[] = []
    let xMin = Infinity
    let xMax = -Infinity
    const fieldScores = new Map<MappedField, number>()

    for (const row of rowClusters) {
      const cell = row[col]
      if (!cell) continue
      samples.push(cell.text)
      xMin = Math.min(xMin, cell.xMin)
      xMax = Math.max(xMax, cell.xMax)
      const { field, confidence } = scoreCellForField(cell.text)
      fieldScores.set(field, (fieldScores.get(field) ?? 0) + confidence)
    }

    let bestField: MappedField = 'ignore'
    let bestScore = 0
    for (const [field, score] of fieldScores) {
      if (score > bestScore) {
        bestScore = score
        bestField = field
      }
    }

    const confidence = samples.length > 0 ? bestScore / samples.length : 0

    result.push({
      index: col,
      xMin: xMin === Infinity ? col * 60 : xMin,
      xMax: xMax === -Infinity ? (col + 1) * 60 : xMax,
      sampleValues: samples.slice(0, 5),
      inferredField: bestField,
      confidence,
      assignedField: bestField,
    })
  }

  return result
}

function findDataLineClusters(
  pdfLines: PdfTextLine[],
  rawText: string,
  config: Pick<ColumnMappingConfig, 'delimiter' | 'skipPatterns' | 'lineKindOverrides'>,
): { xMin: number; xMax: number; text: string }[][] {
  const normalizedLines = normalizePdfText(rawText)
  const lineTextToPdfLine = new Map<string, PdfTextLine>()
  for (const pl of pdfLines) {
    lineTextToPdfLine.set(pl.text.trim(), pl)
  }

  const rowClusters: { xMin: number; xMax: number; text: string }[][] = []

  for (let i = 0; i < normalizedLines.length; i += 1) {
    const line = normalizedLines[i]
    const kind = classifyLine(line, config as ColumnMappingConfig, i)
    if (kind !== 'data') continue

    const pdfLine = lineTextToPdfLine.get(line.trim())
    if (pdfLine && pdfLine.items.length > 0) {
      const clusters = clusterLineItems(pdfLine)
      if (clusters.length >= 2) {
        rowClusters.push(clusters)
      }
    }

    if (rowClusters.length >= 25) break
  }

  return rowClusters
}

export function inferPdfColumnLayout(
  pdfLines: PdfTextLine[],
  rawText: string,
  config?: Partial<ColumnMappingConfig>,
): ColumnCluster[] {
  const baseConfig: ColumnMappingConfig = {
    delimiter: config?.delimiter ?? 'multi-space',
    columnFields: config?.columnFields ?? [],
    activeTimeColumnIndex: config?.activeTimeColumnIndex ?? 0,
    skipPatterns: config?.skipPatterns ?? DEFAULT_SKIP_PATTERNS,
    lineKindOverrides: config?.lineKindOverrides ?? [],
    meetDefaultCourse: config?.meetDefaultCourse ?? null,
  }

  const rowClusters = findDataLineClusters(pdfLines, rawText, baseConfig)

  if (rowClusters.length > 0) {
    const merged = mergeClustersAcrossRows(rowClusters)
    if (merged.length >= 2) {
      const profile = inferBestColumnProfile(normalizePdfText(rawText))
      if (profile && profile.columnFields.length === merged.length) {
        return merged.map((cluster, i) => ({
          ...cluster,
          inferredField: profile.columnFields[i] ?? cluster.inferredField,
          assignedField: profile.columnFields[i] ?? cluster.inferredField,
          confidence: Math.max(cluster.confidence, profile.columns[i]?.confidence ?? 0),
        }))
      }
      return merged
    }
  }

  const profile = inferBestColumnProfile(normalizePdfText(rawText))
  if (!profile) return []

  return profile.columns.map((col, i) => ({
    index: i,
    xMin: i * 80,
    xMax: (i + 1) * 80 - 4,
    sampleValues: [col.sampleValue],
    inferredField: col.inferredField,
    confidence: col.confidence,
    assignedField: col.inferredField,
  }))
}

export function clustersToColumnMappingConfig(
  clusters: ColumnCluster[],
  delimiter: LineDelimiter = 'multi-space',
  meetDefaultCourse: ColumnMappingConfig['meetDefaultCourse'] = null,
): ColumnMappingConfig {
  const columnFields = clusters.map((c) => c.assignedField)
  const timeIndices = columnFields
    .map((f, i) => (f === 'time' ? i : -1))
    .filter((i) => i >= 0)

  return {
    delimiter,
    columnFields,
    activeTimeColumnIndex: timeIndices[0] ?? 0,
    skipPatterns: [...DEFAULT_SKIP_PATTERNS],
    meetDefaultCourse,
  }
}

export function validateColumnAssignments(clusters: ColumnCluster[]): string[] {
  const warnings: string[] = []
  const hasName = clusters.some((c) => c.assignedField === 'name')
  const hasTime = clusters.some((c) => c.assignedField === 'time')

  if (!hasName) warnings.push('Select a column for swimmer name.')
  if (!hasTime) warnings.push('Select a column for time.')

  for (const cluster of clusters) {
    if (cluster.assignedField !== 'time') continue
    const invalid = cluster.sampleValues.filter((v) => {
      const n = normalizeTimeCell(v.trim())
      return n && !TIME_RE.test(n)
    })
    if (invalid.length >= 2) {
      warnings.push(
        `Column ${cluster.index + 1} is marked as Time but some values don't look like times.`,
      )
    }
  }

  return warnings
}

export function clustersFromColumnFields(
  clusters: ColumnCluster[],
  columnFields: MappedField[],
): ColumnCluster[] {
  return clusters.map((cluster, i) => ({
    ...cluster,
    assignedField: columnFields[i] ?? cluster.assignedField,
  }))
}
