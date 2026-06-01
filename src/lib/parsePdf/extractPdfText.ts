import { buildPdfLinesFromItems, parseTextContentItems } from './buildPdfLines'
import { loadPdfFromFile } from './pdfDocument'

/** Extract plain text from a PDF file (all pages, line-oriented). */
export async function extractPdfText(file: File): Promise<string> {
  const pdf = await loadPdfFromFile(file)
  const pageTexts: string[] = []
  let lineIndex = 0

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const items = parseTextContentItems(
      content.items as Array<{ str: string; transform: number[]; width?: number; height?: number }>,
    )
    const { lines, nextLineIndex } = buildPdfLinesFromItems(items, pageNum - 1, lineIndex)
    for (const line of lines) {
      pageTexts.push(line.text)
    }
    lineIndex = nextLineIndex
  }

  return pageTexts.join('\n')
}
