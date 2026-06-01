export const LAYOUT_CONFIDENCE_MAPPER_THRESHOLD = 0.5

export const DEFAULT_SKIP_PATTERNS: string[] = [
  'CCIW Meet:|CCIW Open:|NACIONAL INTERLIGAS',
  '^\\w+\\t\\d+\\.\\d{2}$',
  '^[A-Z]\\s*-\\s*Final$',
  '^Preliminaries$',
  '^Results$',
  '^(Yr|Lane|Age)\\s+(Name|Nombre)',
  'HY-TEK\'?s MEET MANAGER',
  '^-- \\d+ of \\d+ --$',
  '^\\d+\\.\\d{2}\\s+\\d{1,2}(-\\d{1,2})?\\s+(FECN|JJNN)',
  '^Heat\\s+\\d',
  '^Serie\\s+\\d',
  '^Meet Program|^Programa de Competencias',
]

export const MAPPED_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  team: 'Team / School',
  age: 'Age',
  year: 'Year (class)',
  lane: 'Lane',
  time: 'Time',
  place: 'Place',
  ignore: 'Ignore',
}
