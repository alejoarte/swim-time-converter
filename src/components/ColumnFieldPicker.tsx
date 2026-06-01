import { MAPPED_FIELD_LABELS } from '../lib/parsePdf/columnMapping/constants'
import type { MappedField } from '../lib/parsePdf/columnMapping/types'

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

type ColumnFieldPickerProps = {
  field: MappedField
  onSelect: (field: MappedField) => void
  onClose: () => void
  style?: React.CSSProperties
}

export function ColumnFieldPicker({
  field,
  onSelect,
  onClose,
  style,
}: ColumnFieldPickerProps) {
  return (
    <div className="column-field-picker" style={style} role="dialog" aria-label="Choose column type">
      <p className="column-field-picker-title">What is this column?</p>
      <div className="column-field-picker-options">
        {ALL_FIELDS.map((f) => (
          <button
            key={f}
            type="button"
            className={`column-field-picker-btn${f === field ? ' column-field-picker-btn--active' : ''}`}
            onClick={() => {
              onSelect(f)
              onClose()
            }}
          >
            {MAPPED_FIELD_LABELS[f]}
          </button>
        ))}
      </div>
      <button type="button" className="secondary column-field-picker-close" onClick={onClose}>
        Cancel
      </button>
    </div>
  )
}
