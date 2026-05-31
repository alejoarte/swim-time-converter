import { useEffect, useMemo, useState } from 'react'
import type { ParsedRow } from '../lib/parsePdf/types'
import { getUniqueSwimmers, nameMatches } from '../lib/swimmerFilter'

type SwimmerFilterPanelProps = {
  rows: ParsedRow[]
  activeFilter: Set<string> | null
  onConfirm: (selectedKeys: Set<string>) => void
}

export function SwimmerFilterPanel({
  rows,
  activeFilter,
  onConfirm,
}: SwimmerFilterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [pickerSelection, setPickerSelection] = useState<Set<string>>(new Set())
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)

  useEffect(() => {
    if (activeFilter) {
      setPickerSelection(new Set(activeFilter))
    } else {
      setPickerSelection(new Set())
      setShowSelectedOnly(false)
    }
  }, [activeFilter])

  useEffect(() => {
    if (pickerSelection.size === 0) {
      setShowSelectedOnly(false)
    }
  }, [pickerSelection.size])

  const uniqueSwimmers = useMemo(() => getUniqueSwimmers(rows), [rows])

  const visibleSwimmers = useMemo(
    () => uniqueSwimmers.filter((swimmer) => nameMatches(swimmer.swimmerName, searchQuery)),
    [uniqueSwimmers, searchQuery],
  )

  const listSwimmers = useMemo(() => {
    if (!showSelectedOnly) return visibleSwimmers
    return visibleSwimmers.filter((swimmer) => pickerSelection.has(swimmer.key))
  }, [visibleSwimmers, showSelectedOnly, pickerSelection])

  const togglePicker = (key: string, checked: boolean) => {
    setPickerSelection((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })
  }

  const selectAllShown = () => {
    setPickerSelection(new Set(visibleSwimmers.map((swimmer) => swimmer.key)))
  }

  const clearPicker = () => {
    setPickerSelection(new Set())
  }

  const handleConfirm = () => {
    if (pickerSelection.size === 0) return
    onConfirm(new Set(pickerSelection))
  }

  return (
    <div className="swimmer-filter">
      <p className="hint">
        Search by name, check the swimmers you want, then confirm to filter the table below.
      </p>

      <input
        type="search"
        className="swimmer-filter-search"
        placeholder="Search by name (e.g. Andres)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Search swimmers by name"
      />

      <div className="swimmer-filter-actions">
        <div className="button-group">
          <button
            type="button"
            className="secondary"
            onClick={selectAllShown}
            disabled={visibleSwimmers.length === 0}
          >
            Select all shown
          </button>
          <button
            type="button"
            className="secondary"
            onClick={clearPicker}
            disabled={pickerSelection.size === 0}
          >
            Clear
          </button>
          <button
            type="button"
            className="swimmer-filter-confirm"
            onClick={handleConfirm}
            disabled={pickerSelection.size === 0}
          >
            Confirm selection{' '}
            <span className="swimmer-filter-count">({pickerSelection.size})</span>
          </button>
        </div>
      </div>

      <label className="swimmer-filter-show-selected">
        <input
          type="checkbox"
          checked={showSelectedOnly}
          disabled={pickerSelection.size === 0}
          onChange={(e) => setShowSelectedOnly(e.target.checked)}
        />
        Selected only
      </label>

      <ul className="swimmer-filter-list">
        {listSwimmers.length === 0 ? (
          <li className="swimmer-filter-empty">
            {showSelectedOnly
              ? 'No selected swimmers match your search.'
              : 'No swimmers match your search.'}
          </li>
        ) : (
          listSwimmers.map((swimmer) => (
            <li key={swimmer.key} className="swimmer-filter-item">
              <label className="swimmer-filter-label">
                <input
                  type="checkbox"
                  checked={pickerSelection.has(swimmer.key)}
                  onChange={(e) => togglePicker(swimmer.key, e.target.checked)}
                />
                <span className="swimmer-filter-name">{swimmer.swimmerName}</span>
                <span className="swimmer-filter-meta">
                  {swimmer.age != null && <span>Age {swimmer.age}</span>}
                  {swimmer.team && <span>{swimmer.team}</span>}
                  <span>
                    {swimmer.rowCount} event{swimmer.rowCount === 1 ? '' : 's'}
                  </span>
                </span>
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
