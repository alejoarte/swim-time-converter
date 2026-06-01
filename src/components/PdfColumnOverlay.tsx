import { useMemo, useState } from 'react'
import { MAPPED_FIELD_LABELS } from '../lib/parsePdf/columnMapping/constants'
import type { ColumnCluster } from '../lib/parsePdf/inferPdfColumnLayout'
import type { MappedField } from '../lib/parsePdf/columnMapping/types'
import { ColumnFieldPicker } from './ColumnFieldPicker'

type PdfColumnOverlayProps = {
  clusters: ColumnCluster[]
  pageWidth: number
  pageHeight: number
  scale: number
  onAssignField: (index: number, field: MappedField) => void
}

export function PdfColumnOverlay({
  clusters,
  pageWidth,
  pageHeight,
  scale,
  onAssignField,
}: PdfColumnOverlayProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const pickerPosition = useMemo(() => {
    if (activeIndex === null) return null
    const cluster = clusters[activeIndex]
    if (!cluster) return null
    const left = cluster.xMin * scale
    const top = pageHeight - cluster.xMax * 0 - (clusters[0]?.xMax ?? 0)
    return { left: Math.min(left, pageWidth - 180), top: Math.max(8, top) }
  }, [activeIndex, clusters, pageWidth, pageHeight, scale])

  return (
    <div className="pdf-column-overlay" style={{ width: pageWidth, height: pageHeight }}>
      {clusters.map((cluster) => {
        const left = cluster.xMin * scale
        const width = (cluster.xMax - cluster.xMin) * scale
        const field = cluster.assignedField
        const label =
          field === 'ignore'
            ? '?'
            : MAPPED_FIELD_LABELS[field] ?? field

        return (
          <button
            key={cluster.index}
            type="button"
            className={`pdf-column-band pdf-column-band--${field}${activeIndex === cluster.index ? ' pdf-column-band--active' : ''}`}
            style={{
              left,
              width: Math.max(width, 24),
              top: 0,
              height: pageHeight,
            }}
            onClick={() => setActiveIndex(cluster.index)}
            title={`Column ${cluster.index + 1}: ${label}. Click to change.`}
          >
            <span className="pdf-column-band-label">{label}</span>
          </button>
        )
      })}

      {activeIndex !== null && pickerPosition && (
        <ColumnFieldPicker
          field={clusters[activeIndex]?.assignedField ?? 'ignore'}
          onSelect={(field) => onAssignField(activeIndex, field)}
          onClose={() => setActiveIndex(null)}
          style={{
            position: 'absolute',
            left: pickerPosition.left,
            top: pickerPosition.top,
            zIndex: 10,
          }}
        />
      )}
    </div>
  )
}
