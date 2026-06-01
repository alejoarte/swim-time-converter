import type { ParsedRow } from '../lib/parsePdf/types'

type MapperRowPickerProps = {
  rows: ParsedRow[]
  selectedLineIndex: number | null
  onSelect: (lineIndex: number | null) => void
}

export function MapperRowPicker({ rows, selectedLineIndex, onSelect }: MapperRowPickerProps) {
  const rowsWithSource = rows.filter((r) => r.sourceLineIndex !== undefined)

  if (rowsWithSource.length === 0) return null

  return (
    <div className="mapper-row-picker">
      <h4>Find a row on the PDF</h4>
      <p className="hint mapper-hint-inline">
        Click a swimmer below to highlight their row in the document.
      </p>
      <div className="mapper-row-picker-cards">
        {rowsWithSource.map((row) => {
          const lineIndex = row.sourceLineIndex!
          const isSelected = selectedLineIndex === lineIndex
          const hasLocation = lineIndex >= 0

          return (
            <button
              key={row.id}
              type="button"
              className={`mapper-row-card${isSelected ? ' mapper-row-card--selected' : ''}`}
              onClick={() => onSelect(isSelected ? null : lineIndex)}
              disabled={!hasLocation}
              title={
                hasLocation
                  ? 'Show this row on the PDF'
                  : 'Could not locate this row on the page'
              }
            >
              <span className="mapper-row-card-name">{row.swimmerName}</span>
              <span className="mapper-row-card-time">{row.rawTime}</span>
              {row.team && <span className="mapper-row-card-team">{row.team}</span>}
              {!hasLocation && (
                <span className="mapper-row-card-hint">Could not locate on page</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
