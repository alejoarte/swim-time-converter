import { buildPdfLinesFromItems, parseTextContentItems, type PdfTextLine } from './buildPdfLines'
import { loadPdfFromFile } from './pdfDocument'

export type { PdfTextLine, PdfBBox } from './buildPdfLines'

export type PdfTextExtraction = {
  text: string
  lines: PdfTextLine[]
}

/** Extract text plus per-line page positions for PDF highlight sync. */
export async function extractPdfTextWithPositions(file: File): Promise<PdfTextExtraction> {
  const pdf = await loadPdfFromFile(file)
  const allLines: PdfTextLine[] = []
  let lineIndex = 0

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const items = parseTextContentItems(
      content.items as Array<{ str: string; transform: number[]; width?: number; height?: number }>,
    )
    const { lines, nextLineIndex } = buildPdfLinesFromItems(items, pageNum - 1, lineIndex)
    allLines.push(...lines)
    lineIndex = nextLineIndex
  }

  return {
    text: allLines.map((l) => l.text).join('\n'),
    lines: allLines,
  }
}
