import * as pdfjs from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

/** Extract plain text from a PDF file (all pages, line-oriented). */
export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const pageTexts: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const items = content.items as Array<{ str: string; transform: number[] }>

    let lastY: number | null = null
    let line = ''

    for (const item of items) {
      const y = item.transform[5]
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        pageTexts.push(line.trim())
        line = item.str
      } else {
        line += (line && !line.endsWith(' ') ? ' ' : '') + item.str
      }
      lastY = y
    }

    if (line.trim()) {
      pageTexts.push(line.trim())
    }
  }

  return pageTexts.join('\n')
}
