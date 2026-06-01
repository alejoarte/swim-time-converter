export type PdfTextItem = {
  str: string
  x: number
  y: number
  width: number
  height: number
}

export type PdfBBox = {
  x: number
  y: number
  width: number
  height: number
}

export type PdfTextLine = {
  text: string
  pageIndex: number
  bbox: PdfBBox
  /** Global line index across all pages (0-based). */
  lineIndex: number
  items: PdfTextItem[]
}

const Y_THRESHOLD = 2

function itemFromTransform(
  str: string,
  transform: number[],
  width?: number,
  height?: number,
): PdfTextItem {
  const x = transform[4]
  const y = transform[5]
  const scaleX = Math.abs(transform[0])
  const scaleY = Math.abs(transform[3])
  const w = width ?? str.length * scaleX * 0.5
  const h = height ?? scaleY
  return { str, x, y, width: w, height: h }
}

function mergeBbox(a: PdfBBox, b: PdfBBox): PdfBBox {
  const xMin = Math.min(a.x, b.x)
  const yMin = Math.min(a.y, b.y)
  const xMax = Math.max(a.x + a.width, b.x + b.width)
  const yMax = Math.max(a.y + a.height, b.y + b.height)
  return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin }
}

type LineBuilder = {
  text: string
  bbox: PdfBBox | null
  lastY: number | null
  items: PdfTextItem[]
}

function flushLine(
  builder: LineBuilder,
  pageIndex: number,
  globalLineIndex: number,
  lines: PdfTextLine[],
): number {
  const trimmed = builder.text.trim()
  if (trimmed && builder.bbox) {
    lines.push({
      text: trimmed,
      pageIndex,
      bbox: builder.bbox,
      lineIndex: globalLineIndex,
      items: [...builder.items],
    })
    return globalLineIndex + 1
  }
  return globalLineIndex
}

/** Group positioned text items into lines with bounding boxes. */
export function buildPdfLinesFromItems(
  items: PdfTextItem[],
  pageIndex: number,
  startLineIndex: number,
): { lines: PdfTextLine[]; nextLineIndex: number } {
  const lines: PdfTextLine[] = []
  let globalLineIndex = startLineIndex

  const builder: LineBuilder = { text: '', bbox: null, lastY: null, items: [] }

  for (const item of items) {
    const itemBox: PdfBBox = {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    }

    if (builder.lastY !== null && Math.abs(item.y - builder.lastY) > Y_THRESHOLD) {
      globalLineIndex = flushLine(builder, pageIndex, globalLineIndex, lines)
      builder.text = item.str
      builder.bbox = itemBox
      builder.items = [item]
    } else {
      builder.text += (builder.text && !builder.text.endsWith(' ') ? ' ' : '') + item.str
      builder.bbox = builder.bbox ? mergeBbox(builder.bbox, itemBox) : itemBox
      builder.items.push(item)
    }
    builder.lastY = item.y
  }

  globalLineIndex = flushLine(builder, pageIndex, globalLineIndex, lines)

  return { lines, nextLineIndex: globalLineIndex }
}

/** Parse pdf.js text content items into positioned PdfTextItem array. */
export function parseTextContentItems(
  items: Array<{ str: string; transform: number[]; width?: number; height?: number }>,
): PdfTextItem[] {
  return items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => itemFromTransform(item.str, item.transform, item.width, item.height))
}
