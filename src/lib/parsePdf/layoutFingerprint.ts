import { parseAnyEventTitle } from './mapEvent'
import { normalizePdfText } from './normalizePdfText'
import { suggestMappingConfig } from './columnMapping/suggestMappingConfig'
import type { ColumnMappingConfig } from './columnMapping/types'

function hashString(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return `fp_${Math.abs(hash).toString(36)}`
}

export function computeLayoutFingerprint(
  rawText: string,
  config?: ColumnMappingConfig,
): string {
  const lines = normalizePdfText(rawText)
  const cfg = config ?? suggestMappingConfig(rawText).config
  const firstEventLine =
    lines.find((line) => parseAnyEventTitle(line) || /^(Evento|Event)\s+\d+/i.test(line)) ??
    ''

  const payload = [
    cfg.delimiter,
    cfg.columnFields.join(','),
    String(cfg.activeTimeColumnIndex),
    firstEventLine.slice(0, 120),
  ].join('|')

  return hashString(payload)
}
