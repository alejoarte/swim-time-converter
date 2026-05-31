import { useEffect } from 'react'
import type { ParsedRow } from '../lib/parsePdf/types'
import { SwimmerFilterPanel } from './SwimmerFilterPanel'

type SwimmerFilterModalProps = {
  open: boolean
  onClose: () => void
  rows: ParsedRow[]
  activeFilter: Set<string> | null
  onConfirm: (selectedKeys: Set<string>) => void
}

export function SwimmerFilterModal({
  open,
  onClose,
  rows,
  activeFilter,
  onConfirm,
}: SwimmerFilterModalProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-dialog modal-dialog--swimmer-filter"
        role="dialog"
        aria-modal="true"
        aria-labelledby="swimmer-filter-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="swimmer-filter-title">Find swimmers</h2>
          <button
            type="button"
            className="modal-close secondary"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          <SwimmerFilterPanel
            rows={rows}
            activeFilter={activeFilter}
            onConfirm={onConfirm}
          />
        </div>

        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
