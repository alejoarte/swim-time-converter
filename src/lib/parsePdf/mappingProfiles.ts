import type { ColumnMappingConfig } from './columnMapping/types'
import { computeLayoutFingerprint } from './layoutFingerprint'

const STORAGE_KEY = 'swim-import-profiles:v1'

export type SavedMappingProfile = {
  fingerprint: string
  config: ColumnMappingConfig
  savedAt: string
  label?: string
}

type ProfileStore = Record<string, SavedMappingProfile>

function readStore(): ProfileStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ProfileStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: ProfileStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function findMatchingProfile(
  fingerprint: string,
): SavedMappingProfile | null {
  const store = readStore()
  return store[fingerprint] ?? null
}

export function saveMappingProfile(
  rawText: string,
  config: ColumnMappingConfig,
  label?: string,
): SavedMappingProfile {
  const fingerprint = computeLayoutFingerprint(rawText, config)
  const entry: SavedMappingProfile = {
    fingerprint,
    config,
    savedAt: new Date().toISOString(),
    label,
  }
  const store = readStore()
  store[fingerprint] = entry
  writeStore(store)
  return entry
}

export function listMappingProfiles(): SavedMappingProfile[] {
  return Object.values(readStore()).sort((a, b) =>
    b.savedAt.localeCompare(a.savedAt),
  )
}
