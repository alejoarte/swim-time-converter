import { useCallback, useEffect, useRef, useState } from 'react'
import { loadPdfFromFile } from '../lib/parsePdf/pdfDocument'
import type { PdfBBox } from '../lib/parsePdf/buildPdfLines'

export type PdfHighlight = {
  pageIndex: number
  bbox: PdfBBox
}

type PdfPreviewProps = {
  file: File | null
  className?: string
  highlights?: PdfHighlight[]
  /** When set, navigate to this page (0-based). */
  focusPageIndex?: number
  /** Optional overlay rendered on top of the current page canvas. */
  overlay?: React.ReactNode
  /** Called when the active page render dimensions change. */
  onActivePageRender?: (render: PageRender | null) => void
}

type PageRender = {
  pageIndex: number
  width: number
  height: number
  scale: number
}

export type { PageRender }

export function PdfPreview({
  file,
  className,
  highlights = [],
  focusPageIndex,
  overlay,
  onActivePageRender,
}: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageRenders, setPageRenders] = useState<PageRender[]>([])

  const renderPdf = useCallback(async (pdfFile: File) => {
    setLoading(true)
    setError(null)
    canvasRefs.current.clear()

    try {
      const pdf = await loadPdfFromFile(pdfFile)
      setNumPages(pdf.numPages)

      const containerWidth = containerRef.current?.clientWidth ?? 480
      const maxWidth = Math.min(containerWidth, 560)
      const renders: PageRender[] = []

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum)
        const baseViewport = page.getViewport({ scale: 1 })
        const scale = maxWidth / baseViewport.width
        const viewport = page.getViewport({ scale })

        renders.push({
          pageIndex: pageNum - 1,
          width: viewport.width,
          height: viewport.height,
          scale,
        })
      }

      setPageRenders(renders)
      setCurrentPage(0)
    } catch {
      setError('Could not display PDF.')
      setNumPages(0)
      setPageRenders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!file) {
      setNumPages(0)
      setPageRenders([])
      setError(null)
      return
    }
    void renderPdf(file)
  }, [file, renderPdf])

  useEffect(() => {
    if (!file || pageRenders.length === 0) return

    let cancelled = false

    async function drawPages() {
      const pdf = await loadPdfFromFile(file!)
      for (const render of pageRenders) {
        if (cancelled) return
        const canvas = canvasRefs.current.get(render.pageIndex)
        if (!canvas) continue

        const page = await pdf.getPage(render.pageIndex + 1)
        const viewport = page.getViewport({ scale: render.scale })
        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({ canvasContext: ctx, viewport, canvas }).promise
      }
    }

    void drawPages()
    return () => {
      cancelled = true
    }
  }, [file, pageRenders])

  useEffect(() => {
    if (focusPageIndex !== undefined && focusPageIndex >= 0 && focusPageIndex < numPages) {
      setCurrentPage(focusPageIndex)
    }
  }, [focusPageIndex, numPages])

  useEffect(() => {
    onActivePageRender?.(pageRenders[currentPage] ?? null)
  }, [currentPage, pageRenders, onActivePageRender])

  const highlightsForPage = (pageIndex: number) =>
    highlights.filter((h) => h.pageIndex === pageIndex)

  if (!file) {
    return (
      <div className={`pdf-preview pdf-preview--empty${className ? ` ${className}` : ''}`}>
        <p className="hint">No PDF loaded</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`pdf-preview pdf-preview--loading${className ? ` ${className}` : ''}`}>
        <p className="hint">Loading PDF…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`pdf-preview pdf-preview--error${className ? ` ${className}` : ''}`}>
        <p className="field-error">{error}</p>
      </div>
    )
  }

  const activeRender = pageRenders[currentPage]

  return (
    <div
      ref={containerRef}
      className={`pdf-preview${className ? ` ${className}` : ''}`}
    >
      {numPages > 1 && (
        <div className="pdf-preview-nav">
          <button
            type="button"
            className="secondary"
            disabled={currentPage <= 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="pdf-preview-page-label">
            Page {currentPage + 1} of {numPages}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={currentPage >= numPages - 1}
            onClick={() => setCurrentPage((p) => Math.min(numPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      <div className="pdf-preview-canvas-wrap">
        {pageRenders.map((render) => (
          <div
            key={render.pageIndex}
            className="pdf-preview-page"
            style={{
              display: render.pageIndex === currentPage ? 'block' : 'none',
              width: render.width,
              height: render.height,
            }}
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(render.pageIndex, el)
                else canvasRefs.current.delete(render.pageIndex)
              }}
              className="pdf-preview-canvas"
            />
            {activeRender && render.pageIndex === currentPage && (
              <>
                <svg
                  className="pdf-preview-overlay"
                  width={render.width}
                  height={render.height}
                  viewBox={`0 0 ${render.width} ${render.height}`}
                >
                  {highlightsForPage(render.pageIndex).map((hl, i) => {
                    const top =
                      render.height - (hl.bbox.y + hl.bbox.height) * render.scale
                    return (
                      <rect
                        key={i}
                        x={hl.bbox.x * render.scale}
                        y={top}
                        width={hl.bbox.width * render.scale}
                        height={hl.bbox.height * render.scale}
                        className="pdf-preview-highlight"
                      />
                    )
                  })}
                </svg>
                {overlay}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
